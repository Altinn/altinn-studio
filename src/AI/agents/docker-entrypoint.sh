#!/bin/sh
set -eu

# studioctl-server (bundled, unmodified) serves the v8->v9 upgrade over a unix
# socket; the agents `upgrade_app_to_v9` tool POSTs to it. Start it in the
# background, then hand the container over to uvicorn (PID 1). The socket path
# must match the default the Python tool reads.
export STUDIOCTL_SERVER_UNIX_SOCKET_PATH="${STUDIOCTL_SERVER_UNIX_SOCKET_PATH:-/tmp/studioctl-server.sock}"

# Run from a writable dir: studioctl-server writes logs under ./logs.
( cd /tmp && exec dotnet /opt/studioctl-server/studioctl-server.dll ) &

exec uvicorn api.main:app --host 0.0.0.0 --port 8071
