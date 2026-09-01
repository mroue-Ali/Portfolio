# Deploying mroueali.com

Run as `ali` over SSH. The home ISP drops outbound port 22, so from home WiFi
use 2222; port 22 works over mobile tethering and is what GitHub Actions uses.

```bash
ssh -p 2222 ali@169.58.241.120
```

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

## 8. Wiring up CI/CD

One-time, and only after 1-7 are green. 8.1 and 8.2 run on the server
(tethered); 8.3 runs from the laptop, where `gh` is already signed in.

### 8.1 Let the deploy write the webroot without root

`deploy.sh` used to `sudo rsync` into `/var/www`. An unattended deploy cannot
type a sudo password, and passwordless root is a much larger grant than this
needs — so the webroot simply belongs to `ali` now. nginx still reads it as
`www-data` through the world-readable bits that `--chmod=D755,F644` pins.

```bash
sudo chown -R ali:ali /var/www/mroueali.com && sudo chmod 755 /var/www/mroueali.com
```

Prove it before CI depends on it — this must succeed with no password prompt:

```bash
~/apps/Portfolio/deploy/deploy.sh
```

### 8.2 A key that can only deploy

Generate the pair on your laptop, then paste the **public** half here. The
`command=` prefix is the point: this key runs `deploy.sh` and cannot do
anything else — no shell, no file copy, no port forward. A leaked secret in
GitHub buys an attacker one deploy of your own repo, not the server.

```bash
nano ~/.ssh/authorized_keys
```

Add it as a single line, public key and trailing comment included:

```
command="/home/ali/apps/Portfolio/deploy/deploy.sh",no-agent-forwarding,no-port-forwarding,no-pty,no-user-rc,no-X11-forwarding ssh-ed25519 AAAA...  github-actions
```

Your everyday key stays on its own line, unrestricted. Then read out the host
key — GitHub pins it so the runner cannot be talked into handing the deploy key
to an impostor on port 22:

```bash
echo "mroueali.com $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
```

### 8.3 The four secrets

From the laptop, in the repo. `SSH_KEY` is the private half from 8.2,
`SSH_KNOWN_HOSTS` is the line 8.2 printed.

```bash
gh secret list
```

All four must be present: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`.

### 8.4 What is deliberately not automated

nginx config, certificates, `.env`, and `frontend/.env` are never touched by a
deploy. They are server state, they hold secrets, and a bad automated edit to
any of them takes the site down in a way a `git revert` cannot fix. Change
those by hand, from this runbook.

Rolling back is a git operation, because the deploy is:

```bash
git revert HEAD && git push
```

Migrations are the exception — `alembic upgrade head` does not un-apply itself.
A revert that undoes a schema change needs a downgrade written for it.

---

## Later deploys

Pushing to `main` deploys. GitHub Actions opens one SSH connection and the
server runs `deploy.sh`: pull, build, migrate, publish, restart, health-check.
A failed health check exits non-zero, prints container logs, and turns the
Actions run red — so a broken deploy is visible without watching for it.

The same script by hand, when you want to deploy without a commit:

```bash
~/apps/Portfolio/deploy/deploy.sh
```

Watch a run:

```bash
gh run watch
```

---

## SSH itself

sshd here runs as a plain service, not socket-activated: `ssh.socket` is disabled
and `ssh.service` is enabled. That is deliberate. Under socket activation this
host handed sshd a listening socket that accepted no IPv4 — sshd logged only
`Server listening on :: port 22`, never `0.0.0.0`, so every connection to the
IPv4 address got an instant RST while `systemctl status` reported green. Ports
come from `/etc/ssh/sshd_config.d/altport.conf`, which names `Port 22` and
`Port 2222` outright, because naming any Port disables the implicit 22.

The first thing to check if SSH ever stops answering — from the Contabo VNC
console, since you will not have SSH:

```bash
ss -tlnp | grep :22
```

Both `0.0.0.0:22` and `[::]:22` must be listed. Only `[::]` means the IPv4
listener is gone again; do not re-enable `ssh.socket`.

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
