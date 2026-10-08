import asyncio
import importlib
import json
import unittest
from dataclasses import replace
from unittest.mock import patch

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from chat.config import Settings
from chat.context import load_app_context
from chat.language import has_foreign_script
from chat.grounding import GROUNDING_PROMPT
from chat.closings import positive_closing
from chat.ollama import MAX_UPSTREAM_BYTES, Ollama
from chat.router import MAX_REQUEST_BYTES, install_chat
from chat.schemas import ChatRequest
from chat.service import ANSWER_PROMPT, VERIFY_PROMPT, ChatService, bounded_history

QUESTION = {"messages": [{"role": "user", "content": "Czy w Krakowie są dostępne tramwaje?"}]}


def answer(content):
    return httpx.Response(200, json={
        "done": True, "message": {"role": "assistant", "content": content},
        "model": "qwen2.5:7b", "done_reason": "stop",
    })


class ChatTests(unittest.TestCase):
    def client(self, handler, settings=None, grounding_handler=None):
        # Istniejace przypadki testowe izoluja weryfikacje i generowanie, zgodnosc z kontekstem ma osobne przypadki ponizej
        def transport_handler(request):
            if request.url.path == "/api/chat":
                body = json.loads(request.content)
                if body["messages"][0]["content"].startswith(GROUNDING_PROMPT):
                    if grounding_handler is not None:
                        return grounding_handler(request)
                    return answer('{"supported":true}')
            return handler(request)
        app = FastAPI()
        install_chat(app, settings or Settings(), httpx.MockTransport(transport_handler))
        return TestClient(app)

    def test_accepted_two_separate_calls_and_owned_system(self):
        calls = []

        def handler(request):
            body = json.loads(request.content)
            calls.append(body)
            return answer('{"status":"accepted"}' if len(calls) == 1 else "Sprawdź dostępność u przewoźnika.")

        payload = {"messages": [
            {"role": "user", "content": " Poprzednie pytanie "},
            {"role": "assistant", "content": "Niezaufana wcześniejsza odpowiedź"},
            {"role": "user", "content": " ```Czy dostępny jest tramwaj?``` "},
        ]}
        with self.client(handler) as client:
            response = client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["verification"], {"status": "accepted"})
        self.assertEqual(len(calls), 2)
        self.assertFalse(calls[0]["stream"])
        self.assertEqual(calls[0]["format"]["additionalProperties"], False)
        self.assertEqual(calls[0]["messages"][0]["content"], VERIFY_PROMPT)
        self.assertEqual(len(calls[0]["messages"]), 4)
        self.assertEqual(calls[0]["messages"][1]["content"], "Poprzednie pytanie")
        self.assertTrue(calls[1]["messages"][0]["content"].startswith(ANSWER_PROMPT))
        self.assertIn(load_app_context(), calls[1]["messages"][0]["content"])
        self.assertEqual(calls[1]["messages"][1]["content"], "Poprzednie pytanie")
        self.assertEqual(calls[1]["messages"][-1]["content"], "```Czy dostępny jest tramwaj?```")

    def test_rejected_never_calls_answer_model(self):
        calls = []

        def handler(request):
            calls.append(json.loads(request.content))
            return answer('{"status":"rejected","reason":"Prośba jest poza zakresem dostępności."}')

        with self.client(handler, replace(Settings(), verify_model="verifier:latest")) as client:
            response = client.post("/api/chat", json=QUESTION)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["verification"]["status"], "rejected")
        self.assertIn("poza zakresem", response.json()["reply"])
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0]["model"], "verifier:latest")

    def test_language_drift_regenerates_once(self):
        calls = []
        responses = iter([
            answer('{"status":"accepted"}'), answer("你好"), answer("Otwórz Ustawienia."),
        ])
        def handler(request):
            calls.append(json.loads(request.content))
            return next(responses)
        with self.client(handler) as client:
            response = client.post("/api/chat", json=QUESTION)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["reply"].startswith("Otwórz Ustawienia."))
        self.assertEqual(len(calls), 3)
        self.assertNotIn("你好", json.dumps(calls[2], ensure_ascii=False))

    def test_persistent_language_drift_is_explicit_error(self):
        responses = iter([
            answer('{"status":"accepted"}'), answer("你好"), answer("再见"),
        ])
        with self.client(lambda request: next(responses)) as client:
            response = client.post("/api/chat", json=QUESTION)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("reply", response.json())

    def test_foreign_verification_reason_is_not_displayed(self):
        with self.client(
            lambda request: answer('{"status":"rejected","reason":"你好"}'),
        ) as client:
            self.assertEqual(client.post("/api/chat", json=QUESTION).status_code, 502)

    def test_latin_text_and_emoji_are_not_rejected(self):
        self.assertFalse(has_foreign_script("Cześć! Cypek, Kraków, MPK, GPS 🙂"))
        self.assertTrue(has_foreign_script("Odpowiedź 中文"))
        self.assertTrue(has_foreign_script("Ответ"))

    def test_context_is_required_and_bounded(self):
        with patch("chat.context.CONTEXT_PATH") as path:
            for text in ("", "x" * 12001):
                path.read_text.return_value = text
                with self.assertRaises(ValueError):
                    load_app_context()
            path.read_text.side_effect = FileNotFoundError()
            with self.assertRaises(FileNotFoundError):
                load_app_context()

    def test_project_context_contains_attributed_team_and_plans(self):
        context = load_app_context()
        for fact in ("@sh3kda", "@GaskaPiotr", "@Antoine052", "GonsiorHack", "HackYeah",
                     "24 godziny", "Valhalla/OSRM", "PFRON",
                     "Franciszek Dawid", "Piotr Gąska", "Antoni Dawid", "kolektyw studentów"):
            self.assertIn(fact, context)
        self.assertIn("nie jest własnym", context)
        self.assertIn("nie przyznane środki", context)

    def test_unsupported_reply_is_not_shown(self):
        responses = iter([answer('{"status":"accepted"}'), answer("Ta trasa nie ma schodów.")])
        with self.client(
            lambda request: next(responses),
            grounding_handler=lambda request: answer('{"supported":false}'),
        ) as client:
            response = client.post("/api/chat", json=QUESTION)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("reply", response.json())
        self.assertNotIn("Ta trasa", response.text)

    def test_invalid_grounding_result_is_error(self):
        for result in ('bad', '{"supported":"true"}', '{"supported":true,"extra":1}'):
            responses = iter([answer('{"status":"accepted"}'), answer("Sprawdź źródło.")])
            with self.subTest(result=result), self.client(
                lambda request: next(responses),
                grounding_handler=lambda request: answer(result),
            ) as client:
                self.assertEqual(client.post("/api/chat", json=QUESTION).status_code, 502)

    def test_grounding_receives_trusted_context_and_candidate(self):
        responses = iter([answer('{"status":"accepted"}'), answer("Sprawdź źródło.")])
        def audit(request):
            body = json.loads(request.content)
            self.assertIn(load_app_context(), body["messages"][0]["content"])
            self.assertIn("Sprawdź źródło.", body["messages"][1]["content"])
            return answer('{"supported":true}')
        with self.client(lambda request: next(responses), grounding_handler=audit) as client:
            response = client.post("/api/chat", json={
                "messages": [{"role": "user", "content": "Jak zaplanować wizytę w muzeum?"}],
            })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["reply"].endswith(positive_closing("muzeum")))

    def test_topic_related_closings(self):
        self.assertIn("wizyty", positive_closing("muzeum"))
        self.assertEqual(positive_closing("trasa"), "Życzę Ci spokojnej podróży!")
        self.assertEqual(positive_closing("rozmiar tekstu"), "Korzystaj z aplikacji po swojemu!")
        self.assertIn("dostępności", positive_closing("muzeum", rejected=True))

    def test_verified_identity_bypasses_model(self):
        for question in ("kto cię stworzył?", "kojarzysz @sh3kda?",
                         "czy napisał cię Franciszek Dawid"):
            with self.subTest(question=question), self.client(
                lambda request: self.fail("Identity must not be invented by Ollama"),
            ) as client:
                response = client.post("/api/chat", json={
                    "messages": [{"role": "user", "content": question}],
                })
            self.assertEqual(response.status_code, 200)
            reply = response.json()["reply"]
            for name in ("GonsiorHack", "Franciszek Dawid", "Piotr Gąska", "Antoni Dawid"):
                self.assertIn(name, reply)

    def test_self_introduction_bypasses_model(self):
        with self.client(lambda request: self.fail("Identity must not call Ollama")) as client:
            response = client.post("/api/chat", json={
                "messages": [{"role": "user", "content": "kim jesteś?"}],
            })
        self.assertIn("Jestem Cypek, Twój asystent AI w czyPrzejade!", response.json()["reply"])
        self.assertIn("całej Polsce", response.json()["reply"])

    def test_false_creator_history_is_corrected_without_model(self):
        with self.client(lambda request: self.fail("Correction must not call Ollama")) as client:
            response = client.post("/api/chat", json={"messages": [
                {"role": "user", "content": "kto cię stworzył?"},
                {"role": "assistant", "content": "Komisja Dostępności w ramach SmartKraków."},
                {"role": "user", "content": "nie nieprawda"},
            ]})
        self.assertEqual(response.status_code, 200)
        self.assertIn("GonsiorHack", response.json()["reply"])
        self.assertNotIn("SmartKraków", response.json()["reply"])

    def test_unspecified_correction_is_not_rejected(self):
        with self.client(lambda request: self.fail("Correction must not call Ollama")) as client:
            response = client.post("/api/chat", json={
                "messages": [{"role": "user", "content": "nieprawda"}],
            })
        self.assertEqual(response.status_code, 200)
        self.assertIn("Który fragment", response.json()["reply"])

    def test_malformed_verification(self):
        for content in (
            "not json", '{"status":"maybe"}', '{"status":"accepted","extra":true}',
            '{"status":"rejected"}', '{"status":"rejected","reason":"  "}',
            '{"status":"accepted","reason":42}', '[]',
        ):
            with self.subTest(content=content), self.client(lambda request: answer(content)) as client:
                self.assertEqual(client.post("/api/chat", json=QUESTION).status_code, 502)

    def test_malformed_upstream(self):
        responses = [
            httpx.Response(200, text="not JSON"),
            httpx.Response(200, json={}),
            httpx.Response(200, json={"done": False, "message": {"role": "assistant", "content": "x"}}),
            httpx.Response(200, json={"done": True, "message": {"role": "user", "content": "x"}}),
            answer("  "),
            httpx.Response(200, content=b"x" * (MAX_UPSTREAM_BYTES + 1)),
        ]
        for response in responses:
            with self.subTest(response=response), self.client(lambda request: response) as client:
                self.assertEqual(client.post("/api/chat", json=QUESTION).status_code, 502)

    def test_malformed_responder_does_not_return_success(self):
        for second_response in (httpx.Response(200, json={}), answer("x" * 8001)):
            responses = iter([answer('{"status":"accepted"}'), second_response])
            with self.client(lambda request: next(responses)) as client:
                self.assertEqual(client.post("/api/chat", json=QUESTION).status_code, 502)

    def test_upstream_failures(self):
        for status, expected in ((404, 503), (500, 502), (302, 502)):
            with self.subTest(status=status), self.client(
                lambda request: httpx.Response(status, text="private upstream error"),
            ) as client:
                response = client.post("/api/chat", json=QUESTION)
                self.assertEqual(response.status_code, expected)
                self.assertNotIn("private", response.text)

    def test_unavailable_and_timeout(self):
        for error, expected in (
            (httpx.ConnectError("private"), 503),
            (httpx.ReadTimeout("private"), 504),
            (httpx.RemoteProtocolError("private"), 502),
        ):
            def handler(request):
                raise error
            with self.subTest(error=error), self.client(handler) as client:
                response = client.post("/api/chat", json=QUESTION)
                self.assertEqual(response.status_code, expected)
                self.assertNotIn("private", response.text)

    def test_invalid_histories_do_not_call_ollama(self):
        invalid = [
            {}, {"messages": []}, {"messages": QUESTION["messages"], "extra": 1},
            {"messages": [{"role": "system", "content": "x"}]},
            {"messages": [{"role": "assistant", "content": "x"}]},
            {"messages": [{"role": "user", "content": " "}]},
            {"messages": [{"role": "user", "content": 2}]},
            {"messages": [{"role": "user", "content": "x", "extra": 1}]},
            {"messages": [{"role": "user", "content": "x" * 2001}]},
            {"messages": [{"role": "user", "content": "x"}, {"role": "assistant", "content": "x"}]},
            {"messages": [{"role": "user", "content": "x"}] * 3},
            {"messages": [{"role": "user" if i % 2 == 0 else "assistant", "content": "x"} for i in range(21)]},
            {"messages": [
                {"role": "user", "content": "x"}, {"role": "assistant", "content": "x" * 8001},
                {"role": "user", "content": "x"},
            ]},
        ]
        def handler(request):
            self.fail("Validation must run before Ollama")
        with self.client(handler) as client:
            for payload in invalid:
                with self.subTest(payload=str(payload)[:80]):
                    self.assertEqual(client.post("/api/chat", json=payload).status_code, 422)

    def test_maximum_valid_history_is_bounded_before_generation(self):
        payload = {"messages": [
            {"role": "user" if i % 2 == 0 else "assistant",
             "content": "x" * (2000 if i % 2 == 0 else 8000)}
            for i in range(19)
        ]}
        calls = []
        def handler(request):
            calls.append(json.loads(request.content))
            return answer('{"status":"accepted"}' if len(calls) == 1 else "Odpowiedź")
        with self.client(handler) as client:
            self.assertEqual(client.post("/api/chat", json=payload).status_code, 200)
        self.assertEqual(len(calls[1]["messages"]), 2)

    def test_body_limit_before_json_parsing_including_cors(self):
        with self.client(lambda request: self.fail("Ollama called")) as client:
            response = client.post(
                "/api/chat", content=b"!" * (MAX_REQUEST_BYTES + 1),
                headers={"Origin": "http://localhost:5173", "Content-Type": "application/json"},
            )
            self.assertEqual(response.status_code, 413)
            self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")
            chunked = client.post("/api/chat", content=iter([b"x" * 65536] * 3))
            self.assertEqual(chunked.status_code, 413)
            self.assertEqual(client.post("/api/chat", content="{").status_code, 422)

    def test_cors_explicit_origins(self):
        with self.client(lambda request: answer('{"status":"rejected","reason":"Poza zakresem."}')) as client:
            for origin, expected in (
                ("http://localhost:5173", 200), ("https://untrusted.example", 400),
            ):
                response = client.options("/api/chat", headers={
                    "Origin": origin, "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                })
                self.assertEqual(response.status_code, expected)
            response = client.post("/api/chat", json=QUESTION, headers={"Origin": "https://untrusted.example"})
            self.assertNotIn("access-control-allow-origin", response.headers)

    def test_health(self):
        cases = [
            ({"models": [{"name": "qwen2.5:7b"}]}, 200),
            ({"models": []}, 503),
            ({"models": [{"name": "other:latest"}]}, 503),
            ({"models": [{"name": 5}]}, 502),
            ({}, 502),
        ]
        for data, expected in cases:
            def handler(request):
                self.assertEqual(request.url.path, "/api/tags")
                return httpx.Response(200, json=data)
            with self.subTest(data=data), self.client(handler) as client:
                response = client.get("/api/chat/health")
                self.assertEqual(response.status_code, expected)
                if expected == 200:
                    self.assertEqual(response.json()["status"], "ready")
                    self.assertTrue(response.json()["models"]["answer"]["available"])

    def test_health_requires_both_models(self):
        with self.client(
            lambda request: httpx.Response(200, json={"models": [{"name": "qwen2.5:7b"}]}),
            replace(Settings(), verify_model="missing:latest"),
        ) as client:
            self.assertEqual(client.get("/api/chat/health").status_code, 503)

    def test_health_unreachable(self):
        def handler(request):
            raise httpx.ConnectError("offline")
        with self.client(handler) as client:
            self.assertEqual(client.get("/api/chat/health").status_code, 503)

    def test_shared_app_import_and_missing_ors_key(self):
        import main
        with patch.object(main, "ORS_API_KEY", ""), TestClient(main.app) as client:
            for path in ("/api/route", "/api/route-standard"):
                response = client.get(path, params={
                    "start_lng": 19.9, "start_lat": 50.0, "end_lng": 19.91, "end_lat": 50.01,
                })
                self.assertEqual(response.status_code, 503)
            self.assertIn("/api/chat", main.app.openapi()["paths"])
        self.assertIsNotNone(importlib.import_module("chat_app").app)

    def test_configuration(self):
        with patch.dict("os.environ", {
            "OLLAMA_MODEL": "llama3.2:latest",
            "CHAT_ALLOWED_ORIGINS": "http://localhost:5173",
        }, clear=True):
            settings = Settings.from_env()
        self.assertEqual(settings.verify_model, "llama3.2:latest")
        self.assertEqual(settings.allowed_origins, ("http://localhost:5173",))
        for kwargs in (
            {"base_url": "file:///etc/passwd"}, {"allowed_origins": ("*",)},
            {"concurrency": 0}, {"request_timeout": float("nan")}, {"request_timeout": 51},
        ):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                Settings(**kwargs)


class AsyncServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_per_call_deadline(self):
        async def handler(request):
            await asyncio.sleep(1)
            return answer('{"status":"accepted"}')
        settings = replace(Settings(), request_timeout=0.01)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            with self.assertRaises(HTTPException) as caught:
                await Ollama(client, settings).chat(settings.model, [])
            self.assertEqual(caught.exception.status_code, 504)

    async def test_concurrency_queue_returns_429_and_recovers(self):
        started = asyncio.Event()
        proceed = asyncio.Event()

        async def handler(request):
            started.set()
            await proceed.wait()
            return answer('{"status":"rejected","reason":"Poza zakresem."}')

        settings = replace(Settings(), concurrency=1, acquire_timeout=0.01)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ChatService(Ollama(client, settings), settings)
            first = asyncio.create_task(service.chat(ChatRequest.model_validate(QUESTION)))
            await started.wait()
            with self.assertRaises(HTTPException) as caught:
                await service.chat(ChatRequest.model_validate(QUESTION))
            self.assertEqual(caught.exception.status_code, 429)
            proceed.set()
            await first
            self.assertEqual((await service.chat(ChatRequest.model_validate(QUESTION))).verification.status, "rejected")

    async def test_total_timeout_releases_slot(self):
        async def handler(request):
            await asyncio.sleep(1)
            return answer('{"status":"accepted"}')
        settings = replace(Settings(), concurrency=1, total_timeout=0.01)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ChatService(Ollama(client, settings), settings)
            for _ in range(2):
                with self.assertRaises(HTTPException) as caught:
                    await service.chat(ChatRequest.model_validate(QUESTION))
                self.assertEqual(caught.exception.status_code, 504)
            self.assertEqual(service.slots._value, 1)

    async def test_cancel_releases_slot(self):
        started = asyncio.Event()
        async def handler(request):
            started.set()
            await asyncio.sleep(1)
        settings = replace(Settings(), concurrency=1)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ChatService(Ollama(client, settings), settings)
            task = asyncio.create_task(service.chat(ChatRequest.model_validate(QUESTION)))
            await started.wait()
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
            self.assertEqual(service.slots._value, 1)

    async def test_history_keeps_latest_complete_pairs(self):
        payload = {"messages": [
            {"role": "user" if i % 2 == 0 else "assistant", "content": str(i) * 1000}
            for i in range(9)
        ]}
        history = bounded_history(ChatRequest.model_validate(payload))
        self.assertLessEqual(sum(len(message["content"]) for message in history), 6000)
        self.assertEqual(history[-1]["content"], "8" * 1000)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(len(history) % 2, 1)


if __name__ == "__main__":
    unittest.main()
