#!/usr/bin/env bash
#
# Deploy the portfolio. Run as `ali` on the server:
#
#   ~/apps/Portfolio/deploy/deploy.sh
#
# Idempotent — safe to run when nothing has changed.

set -euo pipefail

REPO=/home/ali/apps/Portfolio
WEBROOT=/var/www/mroueali.com

# nvm is a shell function, not an executable, so a non-interactive shell has no
# node on PATH until this is sourced.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$REPO"

echo "==> Pulling"
git pull --ff-only

echo "==> Backend dependencies"
cd "$REPO/backend"
./venv/bin/pip install --quiet --upgrade -r requirements.txt

echo "==> Database migrations"
# Alembic owns the schema (AUTO_CREATE_TABLES=0). This is a no-op when the
# database is already at head.
./venv/bin/alembic upgrade head

echo "==> Frontend build"
cd "$REPO/frontend"
npm ci
npm run build      # tsc -b && vite build -> frontend/dist

echo "==> Publishing static files"
# --delete so a renamed hashed asset does not leave its predecessor behind.
sudo rsync -a --delete "$REPO/frontend/dist/" "$WEBROOT/"
sudo chown -R www-data:www-data "$WEBROOT"

echo "==> Restarting the API"
sudo systemctl restart portfolio-api

# systemd reports "started" the moment the process spawns, which is before
# uvicorn has bound the port. Poll the health endpoint instead — it round-trips
# to MySQL, so a green answer means the whole stack is actually up.
echo "==> Health"
for i in $(seq 1 15); do
    if curl -fsS --max-time 3 http://127.0.0.1:8000/health; then
        echo
        echo "==> Deployed."
        exit 0
    fi
    sleep 1
done

echo
echo "!! API did not come up. Last 40 log lines:" >&2
journalctl -u portfolio-api -n 40 --no-pager >&2
exit 1
