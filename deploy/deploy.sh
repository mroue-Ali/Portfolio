#!/usr/bin/env bash
#
# Deploy the portfolio. Run as `ali` on the server:
#
#   ~/apps/Portfolio/deploy/deploy.sh
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
docker compose --profile build run --rm frontend

echo "==> Database migrations"
# `run` honours depends_on, so this waits for the db healthcheck before starting
# and exits when alembic does. Alembic owns the schema (AUTO_CREATE_TABLES=0);
# this is a no-op once the database is at head.
docker compose run --rm api alembic upgrade head

echo "==> Starting services"
docker compose up -d

echo "==> Publishing static files"
# --delete so a renamed hashed asset does not leave its predecessor behind.
sudo rsync -a --delete "$REPO/frontend/dist/" "$WEBROOT/"
sudo chown -R www-data:www-data "$WEBROOT"

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
