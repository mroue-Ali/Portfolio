"""Settings, read once from backend/.env."""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = os.getenv("APP_NAME", "portfolio")
    database_url: str = os.getenv(
        "DATABASE_URL", "mysql+pymysql://root:root_pass@localhost:3306/portfolio"
    )
    db_name: str = os.getenv("DB_NAME", "portfolio")

    #: Legacy machine access: still accepted as X-Admin-Key on /api/admin/*.
    #: People sign in instead; this stays for scripts and the health check.
    admin_api_key: str = os.getenv("ADMIN_API_KEY", "")

    #: Signs CMS session tokens. Falls back to the admin key so an existing
    #: .env keeps working; regenerating it logs everyone out, which is the
    #: intended way to revoke every session at once.
    jwt_secret: str = os.getenv("JWT_SECRET", "") or os.getenv("ADMIN_API_KEY", "")
    jwt_algorithm: str = "HS256"

    #: How long a login lasts. Long enough to edit an afternoon of copy
    #: without re-typing a password, short enough that a stolen token expires.
    jwt_ttl_minutes: int = int(os.getenv("JWT_TTL_MINUTES", "720"))

    #: Created on `python -m app.seed` when the users table is empty.
    bootstrap_username: str = os.getenv("BOOTSTRAP_USERNAME", "admin")
    bootstrap_password: str = os.getenv("BOOTSTRAP_PASSWORD", "")

    #: Comma-separated browser origins allowed to call the API.
    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ]

    #: Where uploaded images are written. Outside the repo's frontend/public on
    #: purpose: that directory is baked into the bundle at build time, so runtime
    #: uploads have to live somewhere the running server owns.
    #: An empty value in .env means "unset", not "the filesystem root".
    media_root: str = os.getenv("MEDIA_ROOT") or str(
        Path(__file__).resolve().parent.parent / "media"
    )

    #: Path they are served from. Same origin as the site in production; the Vite
    #: dev server proxies it alongside /api.
    media_url: str = (os.getenv("MEDIA_URL") or "/media").rstrip("/")

    #: Refused above this. A screenshot that big is a mistake, not a screenshot.
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "8"))

    #: create_all() on startup. Fine until the schema needs migrations.
    auto_create_tables: bool = os.getenv("AUTO_CREATE_TABLES", "1") == "1"

    # -- the ask bar ------------------------------------------------------- #

    #: How /api/ask answers. "hybrid" (default) serves a written answer when the
    #: question matches one exactly and asks the model otherwise; "ai" always
    #: asks the model; "keyword" never does. Unset AI_PROVIDER is the same as
    #: "keyword" — the model is an upgrade, never a dependency.
    ask_mode: str = (os.getenv("ASK_MODE") or "hybrid").strip().lower()

    #: groq | gemini | openrouter | ollama. See app/ai/llm.py for the defaults
    #: each one carries and where to get a key. Empty disables the model path.
    ai_provider: str = (os.getenv("AI_PROVIDER") or "").strip().lower()
    ai_api_key: str = os.getenv("AI_API_KEY", "")

    #: Both optional: the provider's own defaults apply when they are unset.
    ai_model: str = os.getenv("AI_MODEL", "")
    ai_base_url: str = os.getenv("AI_BASE_URL", "")

    #: Picking tables is easier than answering from them, so it can run on a
    #: smaller, faster model. Empty means "same model as the answer".
    ai_router_model: str = os.getenv("AI_ROUTER_MODEL", "")

    #: Two calls per question, so this is half the visitor's wait at worst.
    ai_timeout: float = float(os.getenv("AI_TIMEOUT", "20"))
    ai_max_output_tokens: int = int(os.getenv("AI_MAX_OUTPUT_TOKENS", "700"))

    #: Ceiling on the rows handed to the answering model, in characters. The
    #: whole site is comfortably under this today; the cap is what keeps a
    #: request bounded once it isn't.
    ai_context_chars: int = int(os.getenv("AI_CONTEXT_CHARS", "24000"))

    @property
    def ai_enabled(self) -> bool:
        """Ollama runs without a key; every hosted provider needs one."""
        return bool(self.ai_provider) and (
            bool(self.ai_api_key) or self.ai_provider == "ollama"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
