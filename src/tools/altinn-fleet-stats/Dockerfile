# syntax=docker/dockerfile:1.28@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS frontend-builder
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock* ./
# Agent Sandboxes mount their CA bundle here; this step's Node downloads trust it.
RUN if [ -r /run/agent/tls/ca-bundle.pem ]; then \
      export NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem; \
    fi; \
    yarn install --frozen-lockfile --network-timeout 600000
COPY frontend/ .
RUN yarn build

# ---------- Stage 2: runtime ----------
FROM python:3.14-slim@sha256:a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170 AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# git for cloning apps, ca-certificates for HTTPS, tini for proper PID 1 handling
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ ./
COPY --from=frontend-builder /backend/static ./static

# Default config (overridable via env)
ENV FLEET_DATA_DIR=/data \
    FLEET_ENV=prod \
    FLEET_HOST=0.0.0.0 \
    FLEET_PORT=9091

VOLUME ["/data"]
EXPOSE 9091

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "altinn_fleet.main:app", "--host", "0.0.0.0", "--port", "9091"]
