# Deploying mroueali.com

First deploy, in order, run as `ali` over SSH (mobile-data tethering — the home
WiFi blocks outbound 22). Every step is idempotent; re-running one is safe.

The stack: nginx terminates TLS and is the only thing listening publicly. It
serves the built React bundle from `/var/www/mroueali.com` and proxies `/api`
and `/media` to uvicorn on `127.0.0.1:8000`, which talks to MySQL in a Docker
container published on the loopback.

---

## 1. MySQL

Docker is already installed and `ali` is in the docker group.

```bash
openssl rand -base64 24        # copy this — it is DB_PASS below
```

`127.0.0.1:3306:3306` is the important part: without the address, Docker
publishes on `0.0.0.0` and punches through ufw, because it writes its rules into
the DOCKER chain that ufw never sees.

```bash
docker run -d --name portfolio-mysql --restart unless-stopped \
  -p 127.0.0.1:3306:3306 \
  -e MYSQL_ROOT_PASSWORD='<a different random password>' \
  -e MYSQL_DATABASE=portfolio \
  -e MYSQL_USER=portfolio \
  -e MYSQL_PASSWORD='<the password from openssl above>' \
  -v portfolio-mysql-data:/var/lib/mysql \
  mysql:8.4
```

Give it a moment, then confirm it is serving and not still initialising:

```bash
docker logs portfolio-mysql --tail 5
```

## 2. Backend

```bash
cd ~/apps/Portfolio/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

Uploads live outside the repo so `git pull` and `git clean` cannot touch them:

```bash
mkdir -p ~/apps/portfolio-media
```

Now the config. Fill in `DB_PASS`/`DATABASE_URL` from step 1 and generate the
two secrets:

```bash
cp ~/apps/Portfolio/deploy/backend.env.example ~/apps/Portfolio/backend/.env
python3 -c "import secrets; print(secrets.token_urlsafe(32))"   # ADMIN_API_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"   # JWT_SECRET
nano ~/apps/Portfolio/backend/.env
chmod 600 ~/apps/Portfolio/backend/.env
```

Create the schema, then the first CMS account:

```bash
cd ~/apps/Portfolio/backend
./venv/bin/alembic upgrade head
./venv/bin/python -m app.seed
```

`app.seed` prints the generated password exactly once. Copy it into a password
manager now, then blank `BOOTSTRAP_USERNAME`/`BOOTSTRAP_PASSWORD` in `.env`.

Check it runs before handing it to systemd — Ctrl-C when the health line looks
right:

```bash
cd ~/apps/Portfolio/backend && ./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

```bash
curl -s http://127.0.0.1:8000/health
```

`"database": "up"` is the answer you want. Anything else means step 1's
credentials and `DATABASE_URL` disagree.

## 3. systemd

```bash
sudo cp ~/apps/Portfolio/deploy/portfolio-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now portfolio-api
systemctl status portfolio-api --no-pager
```

## 4. Frontend

```bash
cp ~/apps/Portfolio/deploy/frontend.env.example ~/apps/Portfolio/frontend/.env
cd ~/apps/Portfolio/frontend
npm ci
npm run build
```

```bash
sudo mkdir -p /var/www/mroueali.com
sudo rsync -a --delete ~/apps/Portfolio/frontend/dist/ /var/www/mroueali.com/
sudo chown -R www-data:www-data /var/www/mroueali.com
```

## 5. nginx

```bash
sudo cp ~/apps/Portfolio/deploy/mroueali.com.conf /etc/nginx/sites-available/mroueali.com
sudo ln -sf /etc/nginx/sites-available/mroueali.com /etc/nginx/sites-enabled/mroueali.com
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Removing `default` matters: it holds `default_server` on port 80, so leaving it
means the welcome page answers anything nginx cannot match by name.

Check over HTTP before involving certificates — this works from home WiFi:

```bash
curl -I http://mroueali.com
```

## 6. HTTPS

Only once step 5 answers 200 over plain HTTP. Certbot proves control of the
domain by placing a file that nginx must already be serving.

```bash
sudo certbot --nginx -d mroueali.com -d www.mroueali.com
```

Choose redirect when it asks. It rewrites `mroueali.com.conf` in place, adding
the 443 block and a 301 from 80. The renewal timer installs itself:

```bash
sudo systemctl list-timers snap.certbot.renew.service certbot.timer
sudo certbot renew --dry-run
```

## 7. Verify

```bash
curl -I https://mroueali.com
curl -s https://mroueali.com/api/content | head -c 300
curl -sI https://mroueali.com/admin | head -1
```

The last one must be 200, not 404 — that is `try_files` doing its job. Then sign
in at `https://mroueali.com/admin` with the account from step 2.

Confirm the backend is *not* publicly reachable:

```bash
curl -sS --max-time 5 http://169.58.241.120:8000/health ; echo "exit=$?"
```

A timeout or refusal is the correct result.

---

## Later deploys

```bash
~/apps/Portfolio/deploy/deploy.sh
```

Pull, install, migrate, build, publish, restart, health-check. It exits non-zero
and prints the journal if the API does not come back.

## When something is wrong

```bash
journalctl -u portfolio-api -n 50 --no-pager    # API tracebacks
sudo tail -50 /var/log/nginx/mroueali.error.log # 502s and upstream failures
docker logs portfolio-mysql --tail 50           # database
curl -s http://127.0.0.1:8000/health            # is it the API or nginx?
```

A 502 with a healthy `curl` to 8000 is nginx; a failing `curl` is the API.

## Adding a subdomain later

The wildcard DNS record already resolves every subdomain to this server, so a
new project needs only its own file in `sites-available`, its own port on
127.0.0.1, and `sudo certbot --nginx -d sub.mroueali.com`. Nothing here changes.
