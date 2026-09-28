#!/usr/bin/env bash
# Smoke-tests the shared developer and pull request evidence tooling inside a freshly built Agent image.
#
#   docker run --rm --init --ipc=host --security-opt seccomp=unconfined --entrypoint bash \
#     -v "$PWD/agents/smoke.sh:/smoke.sh:ro" <image> /smoke.sh <minimal|full> [KEEP_DIR]
#
# With KEEP_DIR (a writable mount), the produced media is copied there for inspection.
#
# Runs as the image's `agent` user. Every variant records a terminal fixture with colors, cursor
# movement and Norwegian characters and renders it to a GIF. The full variant also drives
# Chromium through playwright-cli, converts the recording and inspects it with the helpers, in a
# directory whose name contains a space. Chromium needs the host IPC namespace and an unconfined
# seccomp profile under Docker; inside a Sandbox it runs on a real kernel and needs neither.
set -euo pipefail

variant="${1:?usage: smoke.sh <minimal|full> [KEEP_DIR]}"
keep="${2:-}"
work="$(mktemp -d "${TMPDIR:-/tmp}/smoke with space.XXXXXX")"
cd "$work"
fail() { echo "smoke: $*" >&2; exit 1; }
finish() {
    [ -n "$keep" ] && cp -- *.gif *.png *.cast *.webm "$keep"/ 2>/dev/null
    echo "smoke: $variant ok"
    exit 0
}

echo "## versions"
gh --version | head -1
gh stack --version
asciinema --version
agg --version
nvim --version | head -1
typos --version
hunspell -v | head -1
studioctl version
test "$(id -un)" = agent || fail "expected to run as agent, got $(id -un)"
foreign="$(find /home/agent ! -user agent)"
test -z "$foreign" || fail "entries under /home/agent not owned by agent:"$'\n'"$foreign"

echo "## editor"
nvim --headless \
    "+lua assert(vim.g.colors_name == 'habamax'); assert(vim.o.number); assert(vim.o.cursorline); assert(vim.o.termguicolors)" \
    +quit
for specification in \
    example.cs:cs \
    example.js:javascript \
    example.jsx:javascriptreact \
    example.ts:typescript \
    example.tsx:typescriptreact \
    example.csproj:xml \
    example.json:json \
    example.xml:xml; do
    filename="${specification%:*}"
    expected="${specification#*:}"
    touch "$filename"
    nvim --headless "$filename" \
        "+lua assert(vim.bo.filetype == '$expected', vim.bo.filetype); assert(vim.bo.syntax == '$expected', vim.bo.syntax)" \
        +quit
    echo "$filename: $expected syntax"
done

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
jq -e '.disk.checks[] | select(.id == "appmgr_binary" and .level == "ok")' <<<"$doctor" >/dev/null \
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

echo "## runtime directory"
# Nothing in a Sandbox creates a per-user runtime directory, and without one the containers tools
# resolve their credentials under a root-owned path and fail with a permission error rather than
# running unauthenticated. Both the image's directory and the tmpfiles rule that recreates it in a
# booted Agent are checked, because only the second one survives systemd mounting /run.
test "${XDG_RUNTIME_DIR:-}" = /run/user/1000 \
    || fail "XDG_RUNTIME_DIR is ${XDG_RUNTIME_DIR:-unset}, expected /run/user/1000"
test -d "$XDG_RUNTIME_DIR" || fail "$XDG_RUNTIME_DIR does not exist"
test "$(stat -c '%U:%G %a' "$XDG_RUNTIME_DIR")" = "agent:agent 700" \
    || fail "$XDG_RUNTIME_DIR is $(stat -c '%U:%G %a' "$XDG_RUNTIME_DIR"), expected agent:agent 700"
sudo -n rm -rf "$XDG_RUNTIME_DIR"
sudo -n systemd-tmpfiles --create /usr/lib/tmpfiles.d/agent.conf
test "$(stat -c '%U:%G %a' "$XDG_RUNTIME_DIR")" = "agent:agent 700" \
    || fail "the tmpfiles rule does not recreate $XDG_RUNTIME_DIR for a booted Agent"
touch "$XDG_RUNTIME_DIR/probe" && rm -f "$XDG_RUNTIME_DIR/probe"
echo "$XDG_RUNTIME_DIR: $(stat -c '%U:%G %a' "$XDG_RUNTIME_DIR"), writable"

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

echo "## terminal recording"
asciinema rec --headless --quiet --window-size 80x24 --title 'smoke' \
    --command 'printf "\033[1;34m$ demo\033[0m\n"; sleep 0.4; printf "\033[1;32mgrønn\033[0m \033[34mblå\033[0m æøå ÆØÅ\n"; sleep 0.4; printf "linje 1\nlinje 2\033[1A\033[5Cinnskutt\n\n"; sleep 0.4; printf "█▓▒░ ✓ ✗\n"; sleep 0.4' \
    terminal.cast
test -s terminal.cast || fail "asciinema produced no cast"
grep -q 'æøå' terminal.cast || fail "cast lacks the Norwegian fixture text"
agg --cols 80 --rows 24 terminal.cast terminal.gif
head -c 6 terminal.gif | grep -q '^GIF8' || fail "agg did not write a GIF"
frames="$(grep -c '^\[' terminal.cast || true)"
test "${frames:-0}" -ge 4 || fail "cast has $frames timed events; the fixture should produce output over time"
echo "terminal.gif: $(stat -c %s terminal.gif) bytes"

[ "$variant" = full ] || finish

echo "## rust"
cargo --version
cargo machete --version

echo "## local development hosts"
systemctl is-enabled agent-full-hosts-init.service >/dev/null \
    || fail "the full-image hosts service is not enabled"
grep -qxF 'ExecStart=/home/agent/.local/bin/studioctl env hosts add' \
    /etc/systemd/system/agent-full-hosts-init.service \
    || fail "the full-image hosts service does not prepare studioctl hostnames"

echo "## container tooling"
# `podman run --init` looks this up by name; without it the flag fails instead of running.
command -v catatonit >/dev/null || fail "catatonit is missing, so podman run --init cannot work"
echo "catatonit: $(command -v catatonit)"

echo "## playwright"
browsers=(/opt/ms-playwright/chromium-*)
test "${#browsers[@]}" -eq 1 || fail "expected exactly one Chromium build, found: ${browsers[*]}"
cli_playwright="$(node -p "require('/usr/local/lib/node_modules/@playwright/cli/package.json').dependencies.playwright")"
global_playwright="$(node -p "require('playwright/package.json').version")"
test "$cli_playwright" = "$global_playwright" \
    || fail "playwright-cli depends on playwright $cli_playwright but $global_playwright is installed"
systemctl is-enabled agent-browser-ca-init.service >/dev/null \
    || fail "the Chromium CA initialization service is not enabled"

openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
    -subj '/CN=Agent smoke CA' \
    -addext 'basicConstraints=critical,CA:TRUE' \
    -addext 'keyUsage=critical,keyCertSign,cRLSign' \
    -keyout ca-key.pem -out ca.pem >/dev/null 2>&1
openssl req -newkey rsa:2048 -nodes \
    -subj '/CN=localhost' \
    -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
    -addext 'extendedKeyUsage=serverAuth' \
    -keyout fixture-key.pem -out fixture.csr >/dev/null 2>&1
openssl x509 -req -days 1 -in fixture.csr \
    -CA ca.pem -CAkey ca-key.pem -CAcreateserial -copy_extensions copy \
    -out fixture.pem >/dev/null 2>&1
AGENT_BROWSER_CA_BUNDLE="$work/ca.pem" /usr/local/libexec/agent-browser-ca-init
AGENT_BROWSER_CA_BUNDLE="$work/ca.pem" /usr/local/libexec/agent-browser-ca-init

cat > fixture.html <<'HTML'
<!doctype html><meta charset="utf-8"><title>smoke</title>
<style>body{font:32px sans-serif;margin:40px}button{font-size:28px;padding:12px 24px}</style>
<h1>Skjema for søknad om støtte</h1>
<button id="b" onclick="document.getElementById('o').textContent='Sendt inn ✓'">Send inn</button>
<p id="o">Ikke sendt</p>
HTML

# The locally signed HTTPS fixture proves Chromium trusts the Agent-managed CA without disabling
# certificate verification. playwright-cli blocks file: URLs, so it is served over loopback.
node -e 'const fs=require("fs");require("https").createServer({key:fs.readFileSync(process.argv[2]),cert:fs.readFileSync(process.argv[3])},(q,r)=>{r.setHeader("content-type","text/html; charset=utf-8");r.end(fs.readFileSync(process.argv[1]))}).listen(8321,"127.0.0.1")' fixture.html fixture-key.pem fixture.pem &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
sleep 1

export PLAYWRIGHT_CLI_SESSION=smoke
playwright-cli open --browser chromium https://localhost:8321/
playwright-cli resize 1280 720
playwright-cli screenshot --filename=before.png
playwright-cli video-start browser.webm
playwright-cli run-code "async page => { await page.waitForTimeout(500); await page.click('#b'); await page.waitForTimeout(1000); }"
playwright-cli video-stop
playwright-cli screenshot --filename=after.png
playwright-cli close

echo "## media helpers"
node -e "require('playwright'); console.log('require(\"playwright\") resolves from', process.cwd())"
for image in before.png after.png; do
    IFS=, read -r width height < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$image")
    test "$width" = 1280 && test "$height" = 720 || fail "$image is ${width}x${height}, expected 1280x720"
done
video-to-gif --fps 10 browser.webm interaction.gif
media-preview before.png interaction.gif
test -s interaction.gif.preview.png || fail "media-preview wrote no contact sheet"
media-preview "$work/missing.png" && fail "media-preview accepted a missing file"
finish
