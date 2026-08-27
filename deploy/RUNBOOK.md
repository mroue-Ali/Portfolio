# Deploying mroueali.com

Run as `ali` over SSH (mobile tethering — the home WiFi blocks outbound 22).
Every step is idempotent; re-running one is safe.

## The shape of it

```
      internet
         |  443
   ┌─────▼─────────────────┐
   │ nginx + certbot       │   on the host: TLS, routing, static files
   └──┬─────────────┬──────┘
      │ /           │ /api, /media
      │             │ 127.0.0.1:8000
 /var/www/     ┌────▼──────────────────┐
 mroueali.com  │  docker compose       │
               │   api  ──►  db        │  private network, 3306 unexposed
               └───────────────────────┘
```

nginx and certbot are the only things installed on the host. No Python, no
Node — the API runs in a container and the frontend is built by a throwaway one.

nginx stays outside Docker on purpose: it is the shared entry point for every
project on this server. Each future subdomain becomes its own compose stack on
its own loopback port, with nothing here changing.

---

## 1. Configuration

```bash
cd ~/apps/Portfolio
cp deploy/env.example .env
```

Note the location: the repo **root**, beside `docker-compose.yml`. Compose reads
it for `${...}` substitution and passes it to the API container. There is no
`backend/.env` in production.

Generate four values — run each command, paste the result into the matching key:

```bash
openssl rand -base64 24
```

```bash
openssl rand -base64 24
```

Those two are `MYSQL_ROOT_PASSWORD` and `DB_PASS`.

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Those are `ADMIN_API_KEY` and `JWT_SECRET`. All four must differ.

```bash
nano ~/apps/Portfolio/.env
```

The one that is easy to miss: the password inside `DATABASE_URL` has to match
`DB_PASS`. Host stays `db` — that is the compose service name. `127.0.0.1` there
would mean the API container talking to itself.

```bash
chmod 600 ~/apps/Portfolio/.env
```

Confirm your uid is what `docker-compose.yml` assumes:

```bash
id -u
```

`1000` means nothing to change. Anything else, update `user:` on both the `api`
and `frontend` services.

```bash
mkdir -p ~/apps/portfolio-media
```

## 2. Bring up the database

If the standalone container from the earlier manual run is still there, remove
it — compose manages its own now, and no data has been written yet:

```bash
docker rm -f portfolio-mysql && docker volume rm portfolio-mysql-data
```

```bash
cd ~/apps/Portfolio && docker compose up -d db
```

Wait for the healthcheck to pass. `(healthy)` is what you are looking for:

```bash
docker compose ps
```

## 3. Schema and first account

```bash
cd ~/apps/Portfolio && docker compose build api
```

```bash
docker compose run --rm api alembic upgrade head
```

```bash
docker compose run --rm api python -m app.seed
```

`app.seed` prints the generated password exactly once. Copy it into a password
manager now, then blank `BOOTSTRAP_USERNAME`/`BOOTSTRAP_PASSWORD` in `.env`.

```bash
docker compose up -d
```

```bash
curl -s http://127.0.0.1:8000/health
```

`"database": "up"` is the answer you want.

## 4. Build the frontend

```bash
cd ~/apps/Portfolio && cp deploy/frontend.env.example frontend/.env
```

```bash
docker compose --profile build run --rm frontend
```

```bash
sudo mkdir -p /var/www/mroueali.com
```

```bash
sudo rsync -a --delete ~/apps/Portfolio/frontend/dist/ /var/www/mroueali.com/ && sudo chown -R www-data:www-data /var/www/mroueali.com
```

## 5. nginx

```bash
sudo cp ~/apps/Portfolio/deploy/mroueali.com.conf /etc/nginx/sites-available/mroueali.com
```

```bash
sudo ln -sf /etc/nginx/sites-available/mroueali.com /etc/nginx/sites-enabled/mroueali.com && sudo rm -f /etc/nginx/sites-enabled/default
```

Removing `default` matters: it holds `default_server` on port 80, so leaving it
means the welcome page answers anything nginx cannot match by name.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Check over plain HTTP before involving certificates — this works from home WiFi:

```bash
curl -I http://mroueali.com
```

## 6. HTTPS

Only once step 5 returns 200. Certbot proves control of the domain by placing a
file that nginx must already be serving.

```bash
sudo certbot --nginx -d mroueali.com -d www.mroueali.com
```

Choose redirect when asked. It rewrites the config in place, adding the 443
block and a 301 from 80.

```bash
sudo certbot renew --dry-run
```

## 7. Verify

```bash
curl -I https://mroueali.com
```

```bash
curl -s https://mroueali.com/api/content | head -c 300
```

```bash
curl -sI https://mroueali.com/admin | head -1
```

The last must be 200, not 404 — that is `try_files` doing its job. Then sign in
at `https://mroueali.com/admin`.

Confirm nothing but nginx is exposed:

```bash
curl -sS --max-time 5 http://169.58.241.120:8000/health ; echo "exit=$?"
```

A timeout or refusal is the correct result.

---

## Later deploys

```bash
~/apps/Portfolio/deploy/deploy.sh
```

Pull, build, migrate, publish, restart, health-check. Exits non-zero and prints
container logs if the API does not come back.

## When something is wrong

```bash
docker compose ps
```

```bash
docker compose logs --tail 50 api
```

```bash
sudo tail -50 /var/log/nginx/mroueali.error.log
```

```bash
curl -s http://127.0.0.1:8000/health
```

A 502 with a healthy `curl` to 8000 is nginx; a failing `curl` is the API.

Database shell:

```bash
cd ~/apps/Portfolio && docker compose exec db mysql -uportfolio -p portfolio
```

## Backups

Two things carry state — the database and the uploads. Neither is in git:

```bash
cd ~/apps/Portfolio && docker compose exec -T db mysqldump -uroot -p"$(grep ^MYSQL_ROOT_PASSWORD .env | cut -d= -f2-)" portfolio | gzip > ~/backup-$(date +%F).sql.gz
```

```bash
tar czf ~/media-$(date +%F).tar.gz -C ~/apps portfolio-media
```

## Adding a subdomain later

Wildcard DNS already resolves every subdomain here. A new project needs its own
compose stack on its own loopback port, its own file in `sites-available`, and
`sudo certbot --nginx -d sub.mroueali.com`. Nothing above changes.
