# syntax=docker/dockerfile:1.6

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY frontend/ .
RUN yarn build

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim AS runtime
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
    FLEET_PORT=8080

VOLUME ["/data"]
EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "altinn_fleet.main:app", "--host", "0.0.0.0", "--port", "8080"]
