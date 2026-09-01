#!/usr/bin/env bash
#
# Deploy the portfolio. Run as `ali` on the server:
#
#   ~/apps/Portfolio/deploy/deploy.sh
#
# This is also what GitHub Actions runs on every push to main — the forced
# command in authorized_keys points here, so CI and a hand-run deploy are
# literally the same code path. That is why nothing below asks a question,
# allocates a TTY, or calls sudo: a CI session has none of those.
#
# Needs no Python and no Node on the host — everything builds in a container.
# Idempotent: safe to run when nothing has changed.

set -euo pipefail

REPO=/home/ali/apps/Portfolio
WEBROOT=/var/www/mroueali.com

cd "$REPO"

echo "==> Pulling"
git pull --ff-only

echo "==> Building the API image"
docker compose build api

echo "==> Building the frontend"
# A throwaway node container writing into ./frontend. Under the "build" profile
# so `docker compose up` never tries to keep it running.
docker compose --profile build run --rm -T frontend

echo "==> Database migrations"
# `run` honours depends_on, so this waits for the db healthcheck before starting
# and exits when alembic does. Alembic owns the schema (AUTO_CREATE_TABLES=0);
# this is a no-op once the database is at head.
docker compose run --rm -T api alembic upgrade head

echo "==> Starting services"
docker compose up -d

echo "==> Publishing static files"
# --delete so a renamed hashed asset does not leave its predecessor behind.
# No sudo: the webroot is owned by this user, and --chmod pins the modes nginx
# needs — it reads as www-data through the "other" bits. Passwordless root for
# an unattended deploy would be a far bigger grant than one owned directory.
rsync -a --delete --chmod=D755,F644 "$REPO/frontend/dist/" "$WEBROOT/"

# `up -d` returns as soon as the containers are created, which is before uvicorn
# has bound its port. Poll the health endpoint instead — it round-trips to MySQL,
# so a green answer means the whole stack is genuinely up, not merely started.
echo "==> Health"
for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 http://127.0.0.1:8000/health; then
        echo
        echo "==> Deployed."
        exit 0
    fi
    sleep 2
done

echo
echo "!! API did not come up. Recent logs:" >&2
docker compose logs --tail 40 api >&2
exit 1
