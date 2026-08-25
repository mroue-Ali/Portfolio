"""
Sign-in and account management.

`/api/auth/login` is the only unauthenticated route here; everything else needs
the token it hands back. Account CRUD is admin-only, and carries two rules the
UI cannot be trusted to enforce: nobody may delete or deactivate themselves
(that is how you lock yourself out), and the last remaining admin may not be
demoted or removed (that is how *everybody* gets locked out).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _admin_count(db: Session, *, excluding: int | None = None) -> int:
    stmt = select(func.count(models.User.id)).where(
        models.User.role == "admin", models.User.is_active.is_(True)
    )
    if excluding is not None:
        stmt = stmt.where(models.User.id != excluding)
    return db.scalar(stmt) or 0


def _unique_or_409(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="That username is already taken."
        ) from exc


@router.post("/login", response_model=schemas.TokenResponse, summary="Sign in")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Username or email, plus password.

    Every failure returns the same 401: telling an attacker which half was
    wrong tells them which usernames exist.
    """
    identifier = payload.username.strip()
    user = db.scalar(
        select(models.User).where(
            or_(models.User.username == identifier, models.User.email == identifier)
        )
    )

    invalid = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if user is None or not security.verify_password(payload.password, user.password_hash):
        raise invalid
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    token, expires_in = security.create_token(user)
    user.last_login_at = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(user)

    return schemas.TokenResponse(
        access_token=token, expires_in=expires_in, user=schemas.UserOut.model_validate(user)
    )


@router.get("/me", response_model=schemas.UserOut, summary="Current account")
def me(user: models.User = Depends(security.require_user)):
    """Also the token check: the CMS calls this on load to see if it is still signed in."""
    return user


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change your own password",
)
def change_password(
    payload: schemas.PasswordChange,
    user: models.User = Depends(security.require_user),
    db: Session = Depends(get_db),
):
    if not security.verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect."
        )
    user.password_hash = security.hash_password(payload.new_password)
    db.commit()


# --------------------------------------------------------------------------- #
# Accounts (admins only)
# --------------------------------------------------------------------------- #

users = APIRouter(
    prefix="/users",
    tags=["auth:users"],
    dependencies=[Depends(security.require_admin_user)],
)


@users.get("", response_model=list[schemas.UserOut], summary="List accounts")
def list_users(db: Session = Depends(get_db)):
    return list(db.scalars(select(models.User).order_by(models.User.id)))


@users.post(
    "",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create account",
)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    user = models.User(
        password_hash=security.hash_password(data.pop("password")), **data
    )
    db.add(user)
    _unique_or_409(db)
    db.refresh(user)
    return user


@users.patch("/{user_id}", response_model=schemas.UserOut, summary="Update account")
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    actor: models.User = Depends(security.require_admin_user),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Account not found.")

    fields = payload.model_dump(exclude_unset=True)
    password = fields.pop("password", None)

    demoting = fields.get("role") == "editor" or fields.get("is_active") is False
    if demoting and user.role == "admin" and _admin_count(db, excluding=user.id) == 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="This is the last active administrator.",
        )
    if user.id == actor.id and fields.get("is_active") is False:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate yourself."
        )

    for field, value in fields.items():
        setattr(user, field, value)
    if password:
        user.password_hash = security.hash_password(password)

    _unique_or_409(db)
    db.refresh(user)
    return user


@users.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete account"
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: models.User = Depends(security.require_admin_user),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Account not found.")
    if user.id == actor.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account."
        )
    if user.role == "admin" and _admin_count(db, excluding=user.id) == 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="This is the last active administrator."
        )
    db.delete(user)
    db.commit()


router.include_router(users)
