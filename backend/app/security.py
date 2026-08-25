"""
Who is allowed to write.

People sign in at `POST /api/auth/login` and get a signed JWT they send as
`Authorization: Bearer <token>`; `require_user` resolves that back to a row in
`users` on every request, so deactivating or deleting an account takes effect
immediately rather than when the token expires.

The old shared `X-Admin-Key` still opens the admin routes. It is not a login —
it has no identity attached — so it is kept only for scripts and curl, and
`require_user` (which needs a real person) refuses it.

Passwords are bcrypt hashes. Nothing here ever sees a plaintext password twice:
it arrives in the login body, is compared, and is dropped.
"""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

ADMIN_KEY_HEADER = "X-Admin-Key"

#: bcrypt silently truncates at 72 bytes; refusing longer input is clearer than
#: accepting a password whose tail does nothing.
MAX_PASSWORD_BYTES = 72


# --------------------------------------------------------------------------- #
# Passwords
# --------------------------------------------------------------------------- #


def hash_password(password: str) -> str:
    _check_length(password)
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except (ValueError, TypeError):
        # A hash this process didn't write (truncated column, hand-edited row).
        return False


def _check_length(password: str) -> None:
    if len(password.encode()) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes.",
        )


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #


def _secret() -> str:
    if not settings.jwt_secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET is not set; sign-in is disabled.",
        )
    return settings.jwt_secret


def create_token(user: User) -> tuple[str, int]:
    """Returns the encoded token and its lifetime in seconds."""
    ttl = timedelta(minutes=settings.jwt_ttl_minutes)
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=settings.jwt_algorithm), int(
        ttl.total_seconds()
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Session expired; sign in again."
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid session token."
        ) from exc


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #


def _bearer(authorization: str) -> Optional[str]:
    scheme, _, token = authorization.partition(" ")
    return token.strip() if scheme.lower() == "bearer" and token.strip() else None


def _admin_key_ok(key: str) -> bool:
    return bool(settings.admin_api_key) and secrets.compare_digest(
        key, settings.admin_api_key
    )


def optional_user(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """The signed-in user, or None. Never raises — for routes open to anonymous."""
    token = _bearer(authorization)
    if not token:
        return None
    try:
        claims = decode_token(token)
    except HTTPException:
        return None
    user = db.get(User, int(claims.get("sub", 0) or 0))
    return user if user and user.is_active else None


def require_user(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> User:
    """A real, active account. Used by anything that needs to know *who*."""
    token = _bearer(authorization)
    if not token:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = decode_token(token)
    user = db.get(User, int(claims.get("sub", 0) or 0))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Account no longer exists.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")
    return user


def require_admin_user(user: User = Depends(require_user)) -> User:
    """Managing other accounts is the one thing an editor cannot do."""
    if user.role != "admin":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Administrator access required."
        )
    return user


def require_editor(
    authorization: str = Header(default=""),
    x_admin_key: str = Header(default="", alias=ADMIN_KEY_HEADER),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Guards every content write: a signed-in account, or the legacy shared key.

    Returns the user when there is one, so routes can attribute the edit; the
    key path returns None because it carries no identity.
    """
    if _admin_key_ok(x_admin_key):
        return None
    if not _bearer(authorization):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail=f"Sign in, or send a valid {ADMIN_KEY_HEADER}.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return require_user(authorization=authorization, db=db)
