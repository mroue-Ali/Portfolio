"""
CMS accounts from the command line.

Bootstrapping a login has to work before there is a UI to log into, and
resetting a forgotten password has to work when nobody can sign in at all —
both are things only someone with shell access to the server should be able to
do, which is exactly what a CLI is.

    python -m app.accounts list
    python -m app.accounts create ali --role admin --email you@example.com
    python -m app.accounts passwd ali
    python -m app.accounts deactivate ali

Omitting --password prompts, and falls back to generating one and printing it
once when there is no terminal to prompt on (a Docker build step, CI).
"""

import argparse
import getpass
import secrets
import string
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import User
from .security import hash_password

ALPHABET = string.ascii_letters + string.digits


def generate_password(length: int = 16) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def _find(db: Session, username: str) -> User:
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        sys.exit(f"No account named {username!r}.")
    return user


def _resolve_password(supplied: str | None, *, confirm: bool) -> tuple[str, bool]:
    """Returns the password and whether it was generated (so it gets printed)."""
    if supplied:
        return supplied, False
    if not sys.stdin.isatty():
        return generate_password(), True
    first = getpass.getpass("Password: ")
    if not first:
        sys.exit("Empty password.")
    if confirm and getpass.getpass("Repeat: ") != first:
        sys.exit("Passwords did not match.")
    return first, False


def ensure_bootstrap_admin(db: Session) -> User | None:
    """
    Creates the first administrator when `users` is empty.

    Called by the seed so a fresh checkout ends up with something to log in as.
    Returns None once any account exists — it never touches a populated table.
    """
    if db.scalar(select(User.id).limit(1)) is not None:
        return None

    password = settings.bootstrap_password or generate_password()
    user = User(
        username=settings.bootstrap_username,
        name="Administrator",
        role="admin",
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if not settings.bootstrap_password:
        print(f"\n  Created administrator {user.username!r}")
        print(f"  Password: {password}")
        print("  Shown once. Change it after signing in.\n")
    return user


def cmd_list(args, db: Session) -> None:
    accounts = list(db.scalars(select(User).order_by(User.id)))
    if not accounts:
        print("No accounts yet. Run: python -m app.accounts create <username>")
        return
    for user in accounts:
        state = "active" if user.is_active else "disabled"
        last = user.last_login_at.isoformat(" ", "seconds") if user.last_login_at else "never"
        print(f"{user.id:>3}  {user.username:<20} {user.role:<7} {state:<9} last login: {last}")


def cmd_create(args, db: Session) -> None:
    if db.scalar(select(User).where(User.username == args.username)):
        sys.exit(f"{args.username!r} already exists.")
    password, generated = _resolve_password(args.password, confirm=True)
    user = User(
        username=args.username,
        email=args.email,
        name=args.name,
        role=args.role,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    print(f"Created {user.username!r} ({user.role}).")
    if generated:
        print(f"Password: {password}")


def cmd_passwd(args, db: Session) -> None:
    user = _find(db, args.username)
    password, generated = _resolve_password(args.password, confirm=True)
    user.password_hash = hash_password(password)
    db.commit()
    print(f"Password updated for {user.username!r}.")
    if generated:
        print(f"Password: {password}")


def _set_active(db: Session, username: str, active: bool) -> None:
    user = _find(db, username)
    user.is_active = active
    db.commit()
    print(f"{user.username!r} is now {'active' if active else 'disabled'}.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.accounts", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="show every account")

    create = sub.add_parser("create", help="add an account")
    create.add_argument("username")
    create.add_argument("--password", help="prompted for, or generated, when omitted")
    create.add_argument("--role", choices=("admin", "editor"), default="admin")
    create.add_argument("--email", default="")
    create.add_argument("--name", default="")

    passwd = sub.add_parser("passwd", help="set an account's password")
    passwd.add_argument("username")
    passwd.add_argument("--password")

    for name, help_text in (("deactivate", "block sign-in"), ("activate", "allow sign-in")):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("username")

    args = parser.parse_args()
    handlers = {"list": cmd_list, "create": cmd_create, "passwd": cmd_passwd}

    with SessionLocal() as db:
        if args.command in handlers:
            handlers[args.command](args, db)
        else:
            _set_active(db, args.username, active=args.command == "activate")


if __name__ == "__main__":
    main()
