#!/usr/bin/env bash
# Smoke-tests what the Altinn Agent images add to the agentctl base image, inside a freshly built
# image. The base image, its features and their desktop are tested where they are built, in
# digdir/digdir-agents.
#
#   docker run --rm --entrypoint bash -v "$PWD/agents/smoke.sh:/smoke.sh:ro" <image> \
#     /smoke.sh <minimal|desktop>
#
# Runs as the image's `agent` user.
set -euo pipefail

variant="${1:?usage: smoke.sh <minimal|desktop>}"
case "$variant" in
    minimal | desktop) ;;
    *) echo "usage: smoke.sh <minimal|desktop>" >&2; exit 2 ;;
esac
work="$(mktemp -d)"
cd "$work"
fail() { echo "smoke: $*" >&2; exit 1; }
finish() {
    echo "smoke: $variant ok"
    exit 0
}

echo "## versions"
typos --version
hunspell -v | head -1
ilspycmd --version | head -1
sudo ilspycmd --version >/dev/null || fail "ilspycmd does not find the .NET runtime under sudo"
for tool in dotnet-counters dotnet-dump dotnet-trace; do
    echo "$tool $("$tool" --version)"
done
studioctl version
test "$(id -un)" = agent || fail "expected to run as agent, got $(id -un)"

echo "## app development"
test -d /home/agent/code/apps || fail "/home/agent/code/apps is missing"
test "$(stat -c %U:%G /home/agent/code/apps)" = agent:agent \
    || fail "/home/agent/code/apps is not owned by agent"
test -x /home/agent/.config/altinn-studio/bin/studioctl-server/studioctl-server \
    || fail "studioctl-server resource is missing"
test -f /home/agent/.config/altinn-studio/data/infra/otel-collector.yaml \
    || fail "local development resources are missing"
doctor="$(studioctl doctor --json)"
jq -e '.cli.version | startswith("v")' <<<"$doctor" >/dev/null \
    || fail "studioctl doctor did not report a CLI version"
# studioctl releases up to v0.1.0-preview.29, which STUDIOCTL_VERSION pins, name this check appmgr_binary.
jq -e '.disk.checks[] | select((.id == "server_binary" or .id == "appmgr_binary") and .level == "ok")' \
    <<<"$doctor" >/dev/null \
    || fail "studioctl doctor did not find studioctl-server"

systemctl is-enabled agent-studioctl-auth-init.service >/dev/null \
    || fail "the studioctl authentication service is not enabled"
grep -qxF 'PassEnvironment=STUDIO_PROD_API_KEY STUDIO_STAGING_API_KEY STUDIO_DEV_API_KEY' \
    /etc/systemd/system/agent-studioctl-auth-init.service \
    || fail "the studioctl authentication service does not receive the mediated API-key placeholders"
/bin/sh -n /usr/local/libexec/agent-studioctl-auth-init

auth_test="$work/studioctl auth"
mkdir -p "$auth_test"
auth_capture="$auth_test/calls"
cat >"$auth_test/getent" <<'SH'
#!/bin/sh
exit 0
SH
cat >"$auth_test/studioctl" <<'SH'
#!/bin/sh
token=$(cat)
printf '%s|%s\n' "$*" "$token" >>"$AGENT_STUDIOCTL_AUTH_CAPTURE"
SH
chmod +x "$auth_test/getent" "$auth_test/studioctl"
AGENT_STUDIOCTL_AUTH_CAPTURE="$auth_capture" \
AGENT_STUDIOCTL_AUTH_GETENT="$auth_test/getent" \
AGENT_STUDIOCTL_AUTH_STUDIOCTL="$auth_test/studioctl" \
STUDIO_PROD_API_KEY=prod-placeholder \
STUDIO_STAGING_API_KEY=staging-placeholder \
STUDIO_DEV_API_KEY=dev-placeholder \
    /usr/local/libexec/agent-studioctl-auth-init
cat >"$auth_test/expected" <<'EOF'
auth login --env prod --with-token|prod-placeholder
auth login --env staging --with-token|staging-placeholder
auth login --env dev --with-token|dev-placeholder
EOF
cmp "$auth_test/expected" "$auth_capture" \
    || fail "the studioctl authentication service did not import every environment"

: >"$auth_capture"
AGENT_STUDIOCTL_AUTH_CAPTURE="$auth_capture" \
AGENT_STUDIOCTL_AUTH_GETENT="$auth_test/getent" \
AGENT_STUDIOCTL_AUTH_STUDIOCTL="$auth_test/studioctl" \
STUDIO_STAGING_API_KEY=staging-placeholder \
    /usr/local/libexec/agent-studioctl-auth-init
cat >"$auth_test/expected" <<'EOF'
auth login --env staging --with-token|staging-placeholder
EOF
cmp "$auth_test/expected" "$auth_capture" \
    || fail "the studioctl authentication service did not ignore unconfigured environments"

: >"$auth_capture"
AGENT_STUDIOCTL_AUTH_CAPTURE="$auth_capture" \
AGENT_STUDIOCTL_AUTH_GETENT="$auth_test/getent" \
AGENT_STUDIOCTL_AUTH_STUDIOCTL="$auth_test/studioctl" \
    /usr/local/libexec/agent-studioctl-auth-init
test ! -s "$auth_capture" \
    || fail "the studioctl authentication service ran without configured environments"

echo "## timezone"
# Norwegian local time is Europe/Oslo the year round, so assert the zone rather than an offset.
# Node resolves it through ICU rather than glibc, so both are checked.
zone="$(date +%Z)"
case "$zone" in
    CET | CEST) ;;
    *) fail "system clock is $zone, expected Norwegian local time" ;;
esac
node_zone="$(node -p "Intl.DateTimeFormat().resolvedOptions().timeZone")"
test "$node_zone" = Europe/Oslo || fail "Node resolves $node_zone, expected Europe/Oslo"
echo "$(date) ($node_zone)"

[ "$variant" = minimal ] && finish

echo "## rust"
cargo --version
cargo machete --version
cargo deny --version

echo "## developer tools"
agentctl --version
agentd --version
yq --version
psql --version
hyperfine --version
socat -V | sed -n 2p
tcpdump --version | head -1
dig -v
for tool in lsof nc rsync; do
    command -v "$tool" >/dev/null || fail "$tool is missing"
done
python3 -m venv venv
venv/bin/pip --version
printf 'a: 1\n' | yq '.a' | grep -qx 1 || fail "yq did not read YAML"

echo "## local development hosts"
systemctl is-enabled agent-dev-hosts-init.service >/dev/null \
    || fail "the local development hosts service is not enabled"
grep -qxF 'ExecStart=/home/agent/.local/bin/studioctl env hosts add' \
    /etc/systemd/system/agent-dev-hosts-init.service \
    || fail "the local development hosts service does not prepare studioctl hostnames"

echo "## container tooling"
# `podman run --init` looks this up by name; without it the flag fails instead of running.
command -v catatonit >/dev/null || fail "catatonit is missing, so podman run --init cannot work"
echo "catatonit: $(command -v catatonit)"

echo "## desktop settings"
# The desktop units read the image's overrides after the base's defaults.
# shellcheck source=/dev/null
. /etc/agent-desktop.conf
shopt -s nullglob
for conf in /etc/agent-desktop.conf.d/*.conf; do
    # shellcheck source=/dev/null
    . "$conf"
done
test "$AGENT_DESKTOP_KEYBOARD" = no \
    || fail "the desktop keyboard layout is $AGENT_DESKTOP_KEYBOARD, expected the Norwegian layout"
echo "keyboard layout: $AGENT_DESKTOP_KEYBOARD"

finish
