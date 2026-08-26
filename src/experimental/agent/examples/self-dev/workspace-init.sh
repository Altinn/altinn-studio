#!/bin/sh
set -eu

repository=${AGENT_WORKSPACE_REPOSITORY:-Altinn/altinn-studio}
destination=${AGENT_WORKSPACE_DESTINATION:-/home/agent/code/altinn-studio}

if [ -d "$destination/.git" ]; then
    exit 0
fi

parent=${destination%/*}
mkdir -p "$parent"

# Guest boot can race the host-mediated network handshake. Wait for DNS,
# while leaving the repository operation itself as one best-effort attempt.
remaining=30
while ! /usr/bin/getent ahosts github.com >/dev/null 2>&1; do
    if [ "$remaining" -eq 0 ]; then
        echo "github.com did not become resolvable within 30 seconds" >&2
        exit 1
    fi
    remaining=$((remaining - 1))
    /usr/bin/sleep 1
done

/usr/local/bin/gh repo clone "$repository" "$destination"
