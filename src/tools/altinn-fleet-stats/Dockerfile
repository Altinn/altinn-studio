# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS frontend-builder
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY frontend/ .
RUN yarn build

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim@sha256:229a2c5bfa27522db7815ea81f9bed70af17ccb9de9fc7ad142b1877b5830d36 AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# git for cloning apps, ca-certificates for HTTPS, tini for proper PID 1 handling,
# curl to fetch studioctl, libicu because .NET refuses to start without ICU
# (`libicu-dev` rather than a pinned libicuNN, so this survives a base image bump)
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ca-certificates tini curl libicu-dev \
    && rm -rf /var/lib/apt/lists/*

# studioctl — runs the v9 upgrade. Pinned, and the checksum is verified against
# the SHA256SUMS published with the release, so the image can't silently pick up
# a different binary. Bump STUDIOCTL_VERSION to move to a newer release.
ARG STUDIOCTL_VERSION=v0.1.0-preview.21
RUN set -eux; \
    case "$(dpkg --print-architecture)" in \
        amd64) arch=amd64 ;; \
        arm64) arch=arm64 ;; \
        *) echo "studioctl har ingen binær for $(dpkg --print-architecture)" >&2; exit 1 ;; \
    esac; \
    base="https://github.com/Altinn/altinn-studio/releases/download/studioctl/${STUDIOCTL_VERSION}"; \
    curl -fsSL "${base}/studioctl-linux-${arch}" -o /usr/local/bin/studioctl; \
    curl -fsSL "${base}/SHA256SUMS" -o /tmp/SHA256SUMS; \
    grep "studioctl-linux-${arch}$" /tmp/SHA256SUMS \
        | sed "s|studioctl-linux-${arch}|/usr/local/bin/studioctl|" \
        | sha256sum -c -; \
    chmod 0755 /usr/local/bin/studioctl; \
    studioctl --version; \
    # The CLI alone is not enough: `app upgrade` starts studioctl-server, which
    # ships separately in the resources archive and is expected under
    # $HOME/.config/altinn-studio/bin. Without it the upgrade dies with
    # "studioctl-server binary not found".
    res="studioctl-resources-linux-${arch}.tar.gz"; \
    curl -fsSL "${base}/${res}" -o "/tmp/${res}"; \
    grep "${res}$" /tmp/SHA256SUMS | sed "s|${res}|/tmp/${res}|" | sha256sum -c -; \
    mkdir -p /root/.config/altinn-studio/bin; \
    tar -xzf "/tmp/${res}" -C /root/.config/altinn-studio/bin; \
    rm "/tmp/${res}" /tmp/SHA256SUMS; \
    test -x /root/.config/altinn-studio/bin/studioctl-server/studioctl-server

# .NET SDK — the upgrade pipeline compiles each app after migrating it.
# This is not optional polish: measured across all 632 production apps on
# Altinn.App 8.x, 110 of them upgraded with no warning from studioctl and then
# failed to compile. Without this step the tool would report success for
# roughly one app in six that a developer cannot actually build.
# Costs ~700 MB in the image; set SKIP_DOTNET=1 to build a slimmer image where
# the build step reports "skipped" instead.
ARG DOTNET_CHANNEL=10.0
ARG SKIP_DOTNET=0
ENV DOTNET_ROOT=/usr/share/dotnet \
    PATH=/usr/share/dotnet:$PATH \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    NUGET_PACKAGES=/data/.nuget
RUN set -eux; \
    if [ "$SKIP_DOTNET" = "1" ]; then echo "hopper over .NET SDK"; exit 0; fi; \
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh; \
    chmod +x /tmp/dotnet-install.sh; \
    /tmp/dotnet-install.sh --channel "$DOTNET_CHANNEL" --install-dir "$DOTNET_ROOT"; \
    rm /tmp/dotnet-install.sh; \
    dotnet --version

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
