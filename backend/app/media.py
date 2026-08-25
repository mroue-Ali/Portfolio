"""
Uploaded images: where they go, and what is allowed in.

Files land in `MEDIA_ROOT` on disk and are served back at `/media/<name>`, which
is what the CMS stores in `projects.image` and `about_content.portrait_image`.
Deliberately not `frontend/public`: that directory is copied into the bundle at
build time, so anything dropped there at runtime would exist on the dev machine
and nowhere else.

Two things are checked, because neither is enough alone. The declared content
type and the extension come from the browser and can say anything; the first
bytes of the file cannot. Rasters are sniffed for their magic number, and SVG —
which is a script-capable document, not an image — is parsed and rejected if it
carries anything executable. `main.py` also serves `/media` under a
`default-src 'none'` CSP, so an SVG that slipped past this can still not do
anything when opened directly.

Names are rewritten on the way in: a slug of the original (so the file is
recognisable in a directory listing) plus a random suffix (so two uploads called
`screenshot.png` cannot collide, and so a guessed name cannot overwrite one).
"""

import re
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from .config import settings

#: extension -> (content type, magic prefixes). Empty prefixes mean "not sniffable".
ALLOWED: dict[str, tuple[str, tuple[bytes, ...]]] = {
    ".png": ("image/png", (b"\x89PNG\r\n\x1a\n",)),
    ".jpg": ("image/jpeg", (b"\xff\xd8\xff",)),
    ".jpeg": ("image/jpeg", (b"\xff\xd8\xff",)),
    ".webp": ("image/webp", (b"RIFF",)),
    ".gif": ("image/gif", (b"GIF87a", b"GIF89a")),
    ".avif": ("image/avif", (b"\x00\x00\x00",)),
    ".svg": ("image/svg+xml", ()),
}

#: Anything that would make an SVG do something rather than draw something.
SVG_FORBIDDEN = re.compile(
    rb"<script|<foreignobject|<use[^>]+href\s*=\s*[\"']\s*http|javascript:|\son\w+\s*=",
    re.IGNORECASE,
)

SLUG = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True)
class StoredFile:
    filename: str
    url: str
    size: int
    content_type: str
    uploaded_at: datetime


def media_root() -> Path:
    root = Path(settings.media_root)
    root.mkdir(parents=True, exist_ok=True)
    return root


def url_for(filename: str) -> str:
    return f"{settings.media_url}/{filename}"


def _slugify(name: str) -> str:
    stem = SLUG.sub("-", Path(name).stem.lower()).strip("-")
    return (stem or "image")[:48]


def _reject(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail=detail)


def _check_svg(data: bytes) -> None:
    head = data.lstrip()[:512].lower()
    if not (head.startswith(b"<svg") or head.startswith(b"<?xml") or head.startswith(b"<!doctype svg")):
        raise _reject("That file is not an SVG.")
    if SVG_FORBIDDEN.search(data):
        raise _reject("That SVG contains scripting and was not stored.")


def _check_raster(data: bytes, extension: str, prefixes: tuple[bytes, ...]) -> None:
    if prefixes and not any(data.startswith(prefix) for prefix in prefixes):
        raise _reject(f"That file does not look like a {extension.lstrip('.').upper()}.")


async def save(upload: UploadFile) -> StoredFile:
    """Validates an uploaded image and writes it to the media directory."""
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in ALLOWED:
        raise _reject(
            "Unsupported file type. Use " + ", ".join(sorted(ALLOWED)) + "."
        )

    content_type, prefixes = ALLOWED[extension]
    limit = settings.max_upload_mb * 1024 * 1024

    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise _reject(f"That file is larger than {settings.max_upload_mb} MB.")
    if not data:
        raise _reject("That file is empty.")

    if extension == ".svg":
        _check_svg(data)
    else:
        _check_raster(data, extension, prefixes)

    filename = f"{_slugify(upload.filename or '')}-{secrets.token_hex(4)}{extension}"
    path = media_root() / filename
    path.write_bytes(data)

    return StoredFile(
        filename=filename,
        url=url_for(filename),
        size=len(data),
        content_type=content_type,
        uploaded_at=datetime.now(UTC),
    )


def listing() -> list[StoredFile]:
    """Everything in the media directory, newest first."""
    files = []
    for path in media_root().iterdir():
        extension = path.suffix.lower()
        if not path.is_file() or extension not in ALLOWED:
            continue
        stat = path.stat()
        files.append(
            StoredFile(
                filename=path.name,
                url=url_for(path.name),
                size=stat.st_size,
                content_type=ALLOWED[extension][0],
                uploaded_at=datetime.fromtimestamp(stat.st_mtime, UTC),
            )
        )
    return sorted(files, key=lambda f: f.uploaded_at, reverse=True)


def delete(filename: str) -> None:
    """
    Removes one file.

    The name is resolved inside the media directory and rejected if it lands
    anywhere else — `../../.env` is a filename as far as a request is concerned.
    """
    root = media_root().resolve()
    path = (root / filename).resolve()
    if path.parent != root or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No such file.")
    path.unlink()
