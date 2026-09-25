#!/usr/bin/env bash
# Smoke-tests the shared developer and pull request evidence tooling inside a freshly built Agent image.
#
#   docker run --rm --init --ipc=host --security-opt seccomp=unconfined --entrypoint bash \
#     -v "$PWD/agents/smoke.sh:/smoke.sh:ro" <image> /smoke.sh <minimal|full|desktop> [KEEP_DIR]
#
# With KEEP_DIR (a writable mount), the produced media is copied there for inspection.
#
# Runs as the image's `agent` user. Every variant records a terminal fixture with colors, cursor
# movement and Norwegian characters and renders it to a GIF. The full variant also drives
# Chromium through playwright-cli, converts the recording and inspects it with the helpers, in a
# directory whose name contains a space. Chromium needs the host IPC namespace and an unconfined
# seccomp profile under Docker; inside a Sandbox it runs on a real kernel and needs neither.
set -euo pipefail

variant="${1:?usage: smoke.sh <minimal|full|desktop> [KEEP_DIR]}"
keep="${2:-}"
work="$(mktemp -d "${TMPDIR:-/tmp}/smoke with space.XXXXXX")"
cd "$work"
fail() { echo "smoke: $*" >&2; exit 1; }
finish() {
    [ -n "$keep" ] && cp -- *.gif *.jpg *.png *.cast *.webm "$keep"/ 2>/dev/null
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

[ "$variant" = minimal ] && finish

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
<script>if (location.search) document.title = 'smoke ' + decodeURIComponent(location.search.slice(1));</script>
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
[ "$variant" = desktop ] || finish

# The desktop image boots this stack from systemd units; CI runs the image under Docker, where
# there is no init, so the same three processes are started here from the same configuration.
echo "## desktop"
. /etc/agent-desktop.conf
export DISPLAY="$AGENT_DESKTOP_DISPLAY"
for unit in agent-desktop-display agent-desktop-session; do
    systemctl is-enabled "${unit}.service" >/dev/null || fail "${unit}.service is not enabled"
done
grep -qxF 'panel_layer = top' /etc/xdg/tint2/tint2rc \
    || fail "the panel would sit underneath maximized windows"

# The access units are the image's and ship disabled; agentd enables them when an Agent declares
# `access: [{type: vnc}]`. Everything they name belongs here, so this is where it is checked.
test -f /etc/agent-access.d/vnc.conf || fail "the image declares no VNC access capability"
declared_units="$(sed -n 's/^units=//p' /etc/agent-access.d/vnc.conf)"
test -n "$declared_units" || fail "the VNC access descriptor declares no units"
for unit in $declared_units agent-vnc.service; do
    test -f "/etc/systemd/system/$unit" || fail "$unit is declared but not installed"
    # `is-enabled` exits non-zero for a disabled unit, which is the answer we want, so the value is
    # captured rather than piped: under `pipefail` the pipeline would report the success as failure.
    state="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
    case "$state" in
        disabled | static) ;;
        *) fail "$unit is $state; it must ship disabled so the platform decides when it runs" ;;
    esac
done
for setting in port=5900 web-port=6080; do
    grep -qxF "$setting" /etc/agent-access.d/vnc.conf \
        || fail "the VNC access descriptor must declare $setting"
done
grep -qxF "ExecStart=/usr/lib/systemd/systemd-socket-proxyd \${AGENT_DESKTOP_SOCKET}" \
    /etc/systemd/system/agent-vnc.service \
    || fail "the VNC bridge does not proxy to the display socket the image declares"

# systemd's RuntimeDirectory= makes this directory for the unit; there is no systemd here.
sudo -n install -d -m 0755 -o agent -g agent "$(dirname "$AGENT_DESKTOP_SOCKET")"
Xtigervnc "$AGENT_DESKTOP_DISPLAY" -geometry "$AGENT_DESKTOP_GEOMETRY" -depth 24 \
    -rfbport -1 -rfbunixpath "$AGENT_DESKTOP_SOCKET" -rfbunixmode 0600 \
    -SecurityTypes None -AlwaysShared -desktop Altinn-Agent >xvnc.log 2>&1 &
display_server=$!
trap 'kill "$server" "$display_server" ${session:-} ${bus:-} 2>/dev/null' EXIT
for _ in $(seq 1 100); do xdpyinfo >/dev/null 2>&1 && break; sleep 0.1; done
xdpyinfo >/dev/null 2>&1 || fail "the X and VNC server never came up"
# The session bus the accessibility tree is read over, started with the unit's own command at the
# address the image points every Session to.
systemctl is-enabled agent-desktop-dbus.service >/dev/null || fail "the desktop session bus is not enabled"
bus_command="$(sed -n 's/^ExecStart=//p' /etc/systemd/system/agent-desktop-dbus.service)"
test "$DBUS_SESSION_BUS_ADDRESS" = "$(sed -n 's/.*--address=\([^ ]*\).*/\1/p' <<<"$bus_command")" \
    || fail "DBUS_SESSION_BUS_ADDRESS does not name the bus agent-desktop-dbus.service starts"
$bus_command >bus.log 2>&1 &
bus=$!
for _ in $(seq 1 50); do test -S "${DBUS_SESSION_BUS_ADDRESS#unix:path=}" && break; sleep 0.1; done
/usr/local/libexec/agent-desktop-session >session.log 2>&1 &
session=$!
for _ in $(seq 1 150); do desktop windows 2>/dev/null | grep -qi tint2 && break; sleep 0.1; done

geometry="$(xdpyinfo | awk '/dimensions:/ { print $2 }')"
test "$geometry" = "$AGENT_DESKTOP_GEOMETRY" \
    || fail "display is $geometry, expected $AGENT_DESKTOP_GEOMETRY"
# xdotool cannot type ÆØÅ under a layout that does not carry those characters: it loses the shift
# level when it has to bind one itself, and Norwegian form input is full of them.
layout="$(setxkbmap -query | awk '/^layout/ { print $2 }')"
test "$layout" = no || fail "keyboard layout is $layout, expected the Norwegian layout"
test -S "$AGENT_DESKTOP_SOCKET" || fail "the VNC server has no Unix socket at $AGENT_DESKTOP_SOCKET"
# -rfbport -1 is what turns TCP off; the default is port 5900 plus the display number on every
# interface, so a regression here would publish the desktop rather than merely fail to hide it.
rfb_listeners="$(ss -ltnH | awk '{ split($4, a, ":"); port = a[length(a)] + 0; if (port >= 5900 && port <= 5999) print }')"
test -z "$rfb_listeners" || fail "the desktop opened an RFB TCP listener:"$'\n'"$rfb_listeners"
desktop windows | grep -qi tint2 || fail "the desktop panel is not running"

echo "## desktop capture"
desktop display
# The same locally signed HTTPS fixture the Playwright section served, loaded by the desktop's own
# browser: it proves that browser trusts the Agent-managed CA without disabling verification.
chromium --user-data-dir="$work/browser" https://localhost:8321/ >chromium.log 2>&1 &
for _ in $(seq 1 300); do desktop windows | grep -qi chromium && break; sleep 0.1; done
desktop windows | grep -qi chromium || fail "the desktop browser never opened a window"
# The desktop browser exposes its page and its own controls to `desktop tree`, with click boxes.
for _ in $(seq 1 50); do desktop tree chrom 2>/dev/null | grep -q '^ *document web "smoke" @' && break; sleep 0.2; done
desktop tree chrom >tree.txt || true
grep -q '^ *document web "smoke" @' tree.txt || fail "desktop tree does not show the page"$'\n'"$(cat tree.txt)"
grep -q '^ *entry ".*" value=".*localhost:8321' tree.txt \
    || fail "desktop tree does not show the browser's address bar"
# The headed playwright-cli browser the skill steers page work to is in the tree as well, including
# from a project whose own playwright-cli configuration sets launch arguments: that configuration
# replaces any other one, so the accessibility switch has to arrive by another route.
mkdir -p headed/.playwright
printf '{"browser":{"launchOptions":{"args":["--lang=nb"]}}}\n' >headed/.playwright/cli.config.json
(cd headed && PLAYWRIGHT_CLI_SESSION=smoke-headed playwright-cli open --browser chromium --headed \
    'https://localhost:8321/?headed' >/dev/null)
for _ in $(seq 1 50); do desktop tree chromium 2>/dev/null | grep -q '"smoke headed" @' && break; sleep 0.2; done
desktop tree chromium | grep -q '^ *document web "smoke headed" @' \
    || fail "the headed playwright-cli browser is missing from desktop tree"
(cd headed && PLAYWRIGHT_CLI_SESSION=smoke-headed playwright-cli close >/dev/null)
shot="$(desktop --json screenshot)"
echo "$shot"
path="$(jq -r .path <<<"$shot")"
test "$(jq -r .width <<<"$shot")" = 1456 || fail "screenshot is not 1456 pixels wide"
test "$(jq -r .height <<<"$shot")" = 819 || fail "screenshot is not 819 pixels high"
test "$(jq -r .frames <<<"$shot")" -ge 2 || fail "the capture did not wait for the screen to settle"
test "$(jq -r .bytes <<<"$shot")" -gt 20000 || fail "the screenshot is too small to hold a page"
cp "$path" desktop.jpg
! desktop zoom 0 0 400 200 --out zoom.png >/dev/null 2>&1 || fail "zoom accepted a non-JPEG path"
desktop zoom 0 0 400 200 --out zoom.jpg
IFS=, read -r zoom_width zoom_height < <(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height -of csv=p=0 zoom.jpg)
test "$zoom_width" = 400 && test "$zoom_height" = 200 \
    || fail "zoom wrote ${zoom_width}x${zoom_height}, expected 400x200"

echo "## desktop input"
# Norwegian text through the whole path: the batch parser, xdotool, the keyboard layout, the page.
desktop batch --no-screenshot <<'BATCH'
key ctrl+l
type https://localhost:8321/?søk=Blåbær ÆØÅ
key Return
wait 2
BATCH
desktop zoom 0 40 1456 40 --out address.jpg
# The fixture puts the decoded query in its title, so this fails if any character was lost,
# changed case or arrived through the wrong layout.
title="$(desktop windows | grep -i chromium)"
case "$title" in
    *"smoke søk=Blåbær ÆØÅ"*) ;;
    *) fail "the desktop browser did not receive the Norwegian text typed into it: $title" ;;
esac

halted="$(desktop batch --no-screenshot <<'BATCH' || true
click 100 100
not-a-command
type this must never run
BATCH
)"
grep -q 'Not executed: an earlier computer action in this turn failed.' <<<"$halted" \
    || fail "a failing batch did not halt the actions after it"
test "$(grep -c 'Not executed' <<<"$halted")" -eq 1 \
    || fail "the halted batch skipped the wrong number of actions"
# A failure inside xdotool, rather than in the helper's own argument checks, halts a batch too.
halted="$(desktop batch --no-screenshot <<'BATCH' || true
focus 0xdeadbeef
type this must never run
BATCH
)"
grep -q 'Not executed' <<<"$halted" || fail "a batch carried on after xdotool failed"$'\n'"$halted"
# A bare `type` is refused rather than typing its own name.
! desktop batch --no-screenshot <<<'type' >/dev/null 2>&1 || fail "a bare type line was accepted"

desktop batch <<'BATCH' >trailing.txt
wait 0.2
BATCH
grep -qE '\.jpg \(1456x819' trailing.txt || fail "a batch did not end with a screenshot"

echo "## desktop in a browser"
# Started the way the image's own unit starts it, since there is no systemd here to do it: the
# unit's command with the unit's environment and nothing else. A service inherits none of the
# image's ENV, so a variable the unit forgets to declare has to fail here too — NODE_PATH already
# did once, and only a shell that happened to have it hid the failure.
viewer_command="$(sed -n 's/^ExecStart=//p' /etc/systemd/system/agent-vnc-web.service)"
viewer_environment="$(sed -n 's/^Environment=//p' /etc/systemd/system/agent-vnc-web.service)"
env -u NODE_PATH -u AGENT_NOVNC_HOST -u AGENT_NOVNC_PORT \
    AGENT_DESKTOP_SOCKET="$AGENT_DESKTOP_SOCKET" $viewer_environment \
    $viewer_command >novnc.log 2>&1 &
viewer=$!
trap 'kill "$server" "$display_server" ${session:-} ${bus:-} ${viewer:-} 2>/dev/null' EXIT
for _ in $(seq 1 100); do
    curl -s --noproxy '*' -o /dev/null "http://127.0.0.1:6080/vnc.html" && break
    sleep 0.1
done
test "$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' http://127.0.0.1:6080/vnc.html)" = 200 \
    || fail "the browser viewer does not serve noVNC"
test "$(curl -s --noproxy '*' --path-as-is -o /dev/null -w '%{http_code}' 'http://127.0.0.1:6080/../../etc/passwd')" = 404 \
    || fail "the browser viewer served a path outside its directory"
for malformed in '%' '%00'; do
    test "$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:6080/$malformed")" = 400 \
        || fail "the browser viewer did not refuse the malformed path /$malformed"
done
kill -0 "$viewer" 2>/dev/null || fail "a malformed path took the browser viewer down"
# The page is worthless without the bridge, so assert the RFB stream reaches a WebSocket client
# from the viewer's own origin, and that a page from any other origin is refused: the desktop has
# no VNC password, so the bridge is the screen, keyboard and pointer.
cat >ws-probe.js <<'PROBE'
const WebSocket = require('ws');
const [url, origin] = process.argv.slice(2);
const socket = new WebSocket(url, ['binary'], { origin });
const timer = setTimeout(() => { console.error('no RFB greeting within 10s'); process.exit(1); }, 10000);
socket.on('message', (data) => {
    clearTimeout(timer);
    const greeting = Buffer.from(data).toString('latin1');
    console.log(`websockify greeting: ${JSON.stringify(greeting)}`);
    socket.close();
    process.exit(/^RFB \d{3}\.\d{3}\n$/.test(greeting) ? 0 : 1);
});
socket.on('unexpected-response', (_request, response) => {
    console.error(`refused with ${response.statusCode}`);
    process.exit(2);
});
socket.on('error', (error) => { console.error(error.message); process.exit(1); });
PROBE
node ws-probe.js ws://127.0.0.1:6080/websockify http://127.0.0.1:6080 \
    || fail "the browser viewer does not bridge the desktop"
status=0
node ws-probe.js ws://127.0.0.1:6080/websockify https://example.com || status=$?
test "$status" = 2 || fail "the browser viewer bridged a page from another origin to the desktop"

media-preview desktop.jpg
finish
