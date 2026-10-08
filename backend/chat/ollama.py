import asyncio
import json

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from typing import Literal

from .config import Settings

MAX_UPSTREAM_BYTES = 256 * 1024


class OllamaMessage(BaseModel):
    model_config = ConfigDict(strict=True)
    role: Literal["assistant"]
    content: str = Field(min_length=1, max_length=16000)


class OllamaAnswer(BaseModel):
    model_config = ConfigDict(strict=True)
    done: Literal[True]
    message: OllamaMessage


class OllamaModel(BaseModel):
    model_config = ConfigDict(strict=True)
    name: str = Field(min_length=1)


class OllamaTags(BaseModel):
    model_config = ConfigDict(strict=True)
    models: list[OllamaModel]


class Ollama:
    def __init__(self, client: httpx.AsyncClient, settings: Settings):
        self.client = client
        self.settings = settings

    async def request(self, method: str, path: str, payload=None):
        try:
            return await asyncio.wait_for(
                self._request(method, path, payload), timeout=self.settings.request_timeout,
            )
        except asyncio.TimeoutError as exc:
            raise HTTPException(504, "Przekroczono czas oczekiwania na Ollama.") from exc

    async def _request(self, method: str, path: str, payload=None):
        try:
            async with self.client.stream(
                method, self.settings.base_url + path, json=payload,
                timeout=self.settings.request_timeout,
            ) as response:
                if response.status_code == 404:
                    raise HTTPException(503, "Usługa Ollama lub wybrany model jest niedostępny.")
                if response.status_code != 200:
                    raise HTTPException(502, "Usługa Ollama zwróciła błąd. Spróbuj ponownie.")
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    if len(body) + len(chunk) > MAX_UPSTREAM_BYTES:
                        raise HTTPException(502, "Odpowiedź Ollama przekracza dozwolony rozmiar.")
                    body.extend(chunk)
                return json.loads(body)
        except httpx.TimeoutException as exc:
            raise HTTPException(504, "Przekroczono czas oczekiwania na Ollama.") from exc
        except (httpx.NetworkError, httpx.ProxyError) as exc:
            raise HTTPException(503, "Nie można połączyć się z lokalną usługą Ollama.") from exc
        except (httpx.ProtocolError, httpx.DecodingError, ValueError) as exc:
            raise HTTPException(502, "Nieprawidłowa odpowiedź usługi Ollama.") from exc

    async def chat(self, model: str, messages: list[dict], schema=None):
        payload = {
            "model": model, "messages": messages, "stream": False,
            "options": {"temperature": 0, "num_predict": 768, "num_ctx": 16384},
        }
        if schema is not None:
            payload["format"] = schema
            payload["options"]["num_predict"] = 256
        data = await self.request("POST", "/api/chat", payload)
        try:
            answer = OllamaAnswer.model_validate(data)
            content = answer.message.content.strip()
            if not content:
                raise ValueError("Empty content")
            return content
        except (ValidationError, ValueError) as exc:
            raise HTTPException(502, "Nieprawidłowa odpowiedź modelu Ollama.") from exc

    async def health(self):
        data = await self.request("GET", "/api/tags")
        try:
            tags = OllamaTags.model_validate(data)
        except ValidationError as exc:
            raise HTTPException(502, "Nieprawidłowa lista modeli Ollama.") from exc
        names = {item.name for item in tags.models}

        def available(model):
            return (model if ":" in model else model + ":latest") in names

        models = {
            "answer": {"name": self.settings.model, "available": available(self.settings.model)},
            "verifier": {
                "name": self.settings.verify_model,
                "available": available(self.settings.verify_model),
            },
        }
        if not all(model["available"] for model in models.values()):
            raise HTTPException(503, "W Ollama brakuje skonfigurowanego modelu czatu lub weryfikacji.")
        return {"status": "ready", "models": models}
