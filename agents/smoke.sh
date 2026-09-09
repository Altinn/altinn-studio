#!/usr/bin/env bash
# Smoke-tests the pull request evidence tooling inside a freshly built Agent image.
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
asciinema --version
agg --version
test "$(id -un)" = agent || fail "expected to run as agent, got $(id -un)"
foreign="$(find /home/agent ! -user agent)"
test -z "$foreign" || fail "entries under /home/agent not owned by agent:"$'\n'"$foreign"

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

echo "## playwright"
browsers=(/opt/ms-playwright/chromium-*)
test "${#browsers[@]}" -eq 1 || fail "expected exactly one Chromium build, found: ${browsers[*]}"
cli_playwright="$(node -p "require('/usr/local/lib/node_modules/@playwright/cli/package.json').dependencies.playwright")"
global_playwright="$(node -p "require('playwright/package.json').version")"
test "$cli_playwright" = "$global_playwright" \
    || fail "playwright-cli depends on playwright $cli_playwright but $global_playwright is installed"

cat > fixture.html <<'HTML'
<!doctype html><meta charset="utf-8"><title>smoke</title>
<style>body{font:32px sans-serif;margin:40px}button{font-size:28px;padding:12px 24px}</style>
<h1>Skjema for søknad om støtte</h1>
<button id="b" onclick="document.getElementById('o').textContent='Sendt inn ✓'">Send inn</button>
<p id="o">Ikke sendt</p>
HTML

# playwright-cli blocks file: URLs, so the fixture is served over loopback.
node -e 'require("http").createServer((q,r)=>{r.setHeader("content-type","text/html; charset=utf-8");r.end(require("fs").readFileSync(process.argv[1]))}).listen(8321,"127.0.0.1")' fixture.html &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
sleep 1

export PLAYWRIGHT_CLI_SESSION=smoke
playwright-cli open --browser chromium http://127.0.0.1:8321/
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
