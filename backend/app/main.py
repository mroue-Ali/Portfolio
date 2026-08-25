"""The application object: middleware, routers, and startup checks."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from . import media
from . import models  # noqa: F401  (registers the tables on Base.metadata)
from .config import settings
from .database import Base, engine
from .routers import admin, auth, public, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_create_tables:
        Base.metadata.create_all(engine)
    yield


app = FastAPI(
    title=f"{settings.app_name} API",
    version="0.1.0",
    summary="Content API for the portfolio site, and the CMS that edits it.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(uploads.router)


@app.middleware("http")
async def lock_down_media(request: Request, call_next):
    """
    Uploaded files are data, never code.

    An SVG is a document the browser will happily run scripts from, and it is
    served from the same origin as the site — so anything under /media comes back
    unable to load or execute anything, and unable to be re-interpreted as a
    different type than it was stored as. `media.py` refuses scripted SVGs on the
    way in; this is the second lock on the same door.
    """
    response = await call_next(request)
    if request.url.path.startswith(f"{settings.media_url}/"):
        response.headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# Created up front so the mount has something to serve on a fresh checkout.
app.mount(settings.media_url, StaticFiles(directory=media.media_root()), name="media")


@app.get("/", tags=["meta"])
async def root():
    return {"status": "ok", "app": settings.app_name, "docs": "/docs"}


@app.get("/health", tags=["meta"])
async def health():
    """Liveness plus a real round trip to MySQL, so it fails when the DB is down."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "up"
    except Exception as exc:  # surfaced, not raised: health should always answer
        db_status = f"down: {exc.__class__.__name__}"
    return {
        "status": "ok",
        "database": db_status,
        "auth_configured": bool(settings.jwt_secret),
        # Not a round trip — that would cost tokens on every probe. Just whether
        # the ask bar has a model to reach for, and what it does when it doesn't.
        "ask": {
            "mode": settings.ask_mode,
            "provider": settings.ai_provider if settings.ai_enabled else None,
        },
    }
