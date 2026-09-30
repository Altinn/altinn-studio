#!/bin/sh
set -eu

getent_command=${AGENT_STUDIOCTL_AUTH_GETENT:-/usr/bin/getent}
sleep_command=${AGENT_STUDIOCTL_AUTH_SLEEP:-/usr/bin/sleep}
studioctl_command=${AGENT_STUDIOCTL_AUTH_STUDIOCTL:-/home/agent/.local/bin/studioctl}

if [ -z "${STUDIO_PROD_API_KEY:-}${STUDIO_STAGING_API_KEY:-}${STUDIO_DEV_API_KEY:-}" ]; then
    exit 0
fi

# Guest boot can race the host-mediated network handshake. Wait for DNS before asking studioctl
# to validate the mediated API-key placeholders against their matching Designer environments.
remaining=30
while ! "$getent_command" ahosts altinn.studio >/dev/null 2>&1; do
    if [ "$remaining" -eq 0 ]; then
        echo "altinn.studio did not become resolvable within 30 seconds" >&2
        exit 1
    fi
    remaining=$((remaining - 1))
    "$sleep_command" 1
done

login() {
    environment=$1
    api_key=$2
    if [ -z "$api_key" ]; then
        return
    fi
    printf '%s\n' "$api_key" \
        | "$studioctl_command" auth login --env "$environment" --with-token
}

login prod "${STUDIO_PROD_API_KEY:-}"
login staging "${STUDIO_STAGING_API_KEY:-}"
login dev "${STUDIO_DEV_API_KEY:-}"
