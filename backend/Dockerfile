FROM python:3.12-slim

# PYTHONDONTWRITEBYTECODE: the container runs as a uid that does not own /app,
# so bytecode caching would fail on every import anyway.
# PYTHONUNBUFFERED: tracebacks reach `docker compose logs` when they happen.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copied alone, before the source, so the dependency layer is cached and a code
# change does not reinstall everything. Every wheel here is prebuilt — no
# compiler needed, which is what keeps this on `slim`.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# MEDIA_ROOT points here; docker-compose.yml bind-mounts it to the host.
# Created in the image so the mount lands on an existing directory.
RUN mkdir -p /data/media

EXPOSE 8000

# 0.0.0.0 is the container's own namespace, not the host's. The host binding is
# 127.0.0.1 and lives in docker-compose.yml.
#
# --forwarded-allow-ips=* is safe only because of that: the sole route to this
# port is nginx on the loopback, so the only source of X-Forwarded-For is a
# proxy we control. The docker bridge gateway IP is not stable enough to name.
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*"]
