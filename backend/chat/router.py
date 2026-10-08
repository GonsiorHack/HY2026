import asyncio
from contextlib import asynccontextmanager

import httpx
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from .config import Settings
from .ollama import Ollama
from .schemas import ChatRequest, ChatResponse
from .service import ChatService

MAX_REQUEST_BYTES = 128 * 1024
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, response_model_exclude_none=True)
async def chat(body: ChatRequest, request: Request):
    return await request.app.state.chat_service.chat(body)


@router.get("/health")
async def health(request: Request):
    service = request.app.state.chat_service
    try:
        return await asyncio.wait_for(
            service.ollama.health(), timeout=service.settings.request_timeout,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(504, "Przekroczono czas sprawdzania usługi Ollama.") from exc


class ChatBodyLimit:
    """Buforujemy tylko tresci zapytan czatu mieszczace sie w limicie, zanim FastAPI przetworzy JSON"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["path"].rstrip("/") != "/api/chat":
            return await self.app(scope, receive, send)
        body = bytearray()
        for key, value in scope.get("headers", []):
            if key == b"content-length":
                try:
                    if int(value) > MAX_REQUEST_BYTES:
                        return await self.reject(scope, receive, send)
                except ValueError:
                    return await JSONResponse(
                        {"detail": "Nieprawidłowy rozmiar żądania."}, status_code=400,
                    )(scope, receive, send)
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            chunk = event.get("body", b"")
            if len(body) + len(chunk) > MAX_REQUEST_BYTES:
                return await self.reject(scope, receive, send)
            body.extend(chunk)
            if not event.get("more_body", False):
                break
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(body), "more_body": False}

        await self.app(scope, bounded_receive, send)

    async def reject(self, scope, receive, send):
        await JSONResponse(
            {"detail": "Wiadomość przekracza dozwolony rozmiar żądania."}, status_code=413,
        )(scope, receive, send)


def install_chat(app: FastAPI, settings: Settings | None = None, transport=None):
    settings = settings or Settings.from_env()
    previous_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(application):
        async with previous_lifespan(application):
            async with httpx.AsyncClient(
                trust_env=False, transport=transport,
                limits=httpx.Limits(max_connections=settings.concurrency + 2),
                follow_redirects=False,
            ) as client:
                application.state.chat_service = ChatService(Ollama(client, settings), settings)
                yield

    app.router.lifespan_context = lifespan
    app.include_router(router)
    app.add_middleware(ChatBodyLimit)
    # Jawne dozwolone zrodla; CORS nie zastepuje autoryzacji ani limitow ruchu
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "ngrok-skip-browser-warning"],
    )
