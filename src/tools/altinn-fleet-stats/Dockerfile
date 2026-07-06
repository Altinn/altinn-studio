# syntax=docker/dockerfile:1.6@sha256:ac85f380a63b13dfcefa89046420e1781752bab202122f8f50032edf31be0021

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS frontend-builder
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY frontend/ .
RUN yarn build

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim@sha256:423ed6ab25b1921a477529254bfeeabf5855151dc2c3141699a1bfc852199fbf AS runtime
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
