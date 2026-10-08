import os
from dataclasses import dataclass
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Settings:
    base_url: str = "http://127.0.0.1:11434"
    model: str = "qwen2.5:7b"
    verify_model: str = "qwen2.5:7b"
    request_timeout: float = 50
    total_timeout: float = 110
    concurrency: int = 2
    acquire_timeout: float = 1
    allowed_origins: tuple[str, ...] = (
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    )

    def __post_init__(self):
        url = urlsplit(self.base_url)
        if (url.scheme not in ("http", "https") or not url.hostname
                or url.username or url.password or url.query or url.fragment):
            raise ValueError("OLLAMA_BASE_URL must be an HTTP(S) URL without credentials/query")
        if not self.model.strip() or not self.verify_model.strip():
            raise ValueError("Ollama model names cannot be empty")
        if not (0 < self.request_timeout <= 50 and 0 < self.total_timeout <= 600
                and 0 < self.acquire_timeout <= 10 and 1 <= self.concurrency <= 16):
            raise ValueError("Invalid chat timeout/concurrency configuration")
        for origin in self.allowed_origins:
            parsed = urlsplit(origin)
            if (parsed.scheme not in ("http", "https") or not parsed.netloc
                    or parsed.path or parsed.query or parsed.fragment
                    or parsed.username or parsed.password):
                raise ValueError("CHAT_ALLOWED_ORIGINS must contain explicit origins, not '*'")

    @classmethod
    def from_env(cls):
        model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
        origins = os.environ.get("CHAT_ALLOWED_ORIGINS")
        return cls(
            base_url=os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
            model=model,
            verify_model=os.environ.get("OLLAMA_VERIFY_MODEL", model),
            request_timeout=float(os.environ.get("OLLAMA_REQUEST_TIMEOUT_SECONDS", "50")),
            total_timeout=float(os.environ.get("CHAT_TOTAL_TIMEOUT_SECONDS", "110")),
            concurrency=int(os.environ.get("CHAT_MAX_CONCURRENT_REQUESTS", "2")),
            acquire_timeout=float(os.environ.get("CHAT_ACQUIRE_TIMEOUT_SECONDS", "1")),
            allowed_origins=(
                tuple(item.strip() for item in origins.split(",") if item.strip())
                if origins is not None else cls.allowed_origins
            ),
        )
