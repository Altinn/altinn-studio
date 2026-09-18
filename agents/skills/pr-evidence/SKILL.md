---
name: pr-evidence
description: Capture screenshots, browser clips and terminal recordings for a pull request and attach them with gh. Use when a change has a visible or terminal-observable result that the pull request should show.
---

# Pull request evidence

How to capture screenshots, browser clips and terminal recordings and attach them to a pull request. The Agent
instructions say when evidence is expected; this skill says how to produce it.

## What to capture

| Change                                         | Default evidence                           |
| ---------------------------------------------- | ------------------------------------------ |
| Layout, styling or a visible state             | One focused PNG screenshot                 |
| Visual bug fix                                 | Before and after PNG images, same viewport |
| Interaction or transition                      | Browser GIF of 5 to 15 seconds             |
| CLI output or interactive terminal behavior    | asciinema recording rendered to GIF        |
| Longer interaction that is unreadable as a GIF | MP4 (WebM converted with ffmpeg)           |

One or two images or one short clip should explain the result. Backend-only changes keep using test output and text.
Before and after captures come from the actual base and changed revisions, not from mocked states.

## Artifacts

Keep captures outside the checkout, one directory per task and run:

```text
/home/agent/code/.artifacts/<task>/<run>/
  capture.md        revisions, commands, viewport or terminal size, the scenario shown
  before.png after.png
  browser.webm interaction.gif
  terminal.cast terminal.gif
  pr-body.md
```

`capture.md` makes the evidence reproducible: which commit each capture came from, how the app or command was started,
which test data was used. Never capture real personal data or secrets; use the repository's test users and fixtures.

## Browser: screenshots

Browser capture needs `playwright-cli`; when it is not on `PATH`, this computer has no browser and the pull request
gets terminal or textual evidence instead. Use one named session per task so parallel work does not share a browser,
and a fixed viewport so before and after images line up.

```sh
export PLAYWRIGHT_CLI_SESSION=<task>
playwright-cli open --browser chromium http://localhost:8080/   # only Chromium is installed
playwright-cli resize 1280 720
playwright-cli snapshot                                   # find element refs
playwright-cli click e12
playwright-cli screenshot --filename=after.png            # whole page at 1280x720
playwright-cli screenshot e7 --filename=after-panel.png   # one element
playwright-cli close
```

`playwright-cli --help` lists every command; the `playwright-cli` skill has references for sessions, storage state,
request mocking and video.

## Browser: clips

Record to WebM, then convert to GIF. For a scripted scenario, write the steps as Playwright code and run it against the
session so pauses and typing speed are deliberate:

```sh
playwright-cli open --browser chromium http://localhost:8080/
playwright-cli resize 1280 720
playwright-cli video-start browser.webm
playwright-cli run-code --filename=scenario.js
playwright-cli video-stop
video-to-gif --fps 12 browser.webm interaction.gif
media-preview interaction.gif                             # writes interaction.gif.preview.png
```

`scenario.js` exports an async function taking `page`, for example:

```js
async (page) => {
  await page.getByRole('textbox', { name: 'Search' }).pressSequentially('skatt', { delay: 80 });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.waitForTimeout(1500);
};
```

Standalone Playwright scripts also work: `node capture.js` with `require('playwright')` resolves the image's global
package and reuses the installed Chromium.

`video-to-gif` trims with `--start` and `--duration`, scales with `--width` and fails when the result exceeds 8 MB.
GitHub accepts images and GIFs up to 10 MB. When a GIF cannot stay readable within that, convert to MP4 instead:

```sh
ffmpeg -i browser.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an interaction.mp4
```

Look at the result before attaching it: read the PNG, or the contact sheet `media-preview` writes for a clip.

## Terminal

Record the demonstrated commands, not the whole coding session. A GIF only shows something when output appears over
time. Script CLI demonstrations so each command and its output can be read. For a TUI, record the program directly
and pause on focused fields, placeholders and picker states before typing or moving on.

```sh
run=/home/agent/code/.artifacts/<task>/<run>
mkdir -p "$run"
cols=120 rows=36 cast="$run/terminal.cast" gif="$run/terminal.gif"
render() {
  agg --cols "$cols" --rows "$rows" --font-size 14 --theme dracula \
    --font-family 'JetBrains Mono' "$@"
}
env -u NO_COLOR TERM=xterm-256color COLORTERM=truecolor \
  asciinema rec --window-size "${cols}x${rows}" --idle-time-limit 2 \
  --command 'agentctl tui' "$cast"
render "$cast" "$gif"
for position in 20 50 80; do
  render --select "$position%" "$cast" "$run/frame-$position.gif"
done
```

Replace `agentctl tui` with `bash demo.sh` for a scripted CLI flow, or omit `--command` to record a shell. Keep the
clip under 15 seconds; `--idle-time-limit` collapses waits. Explicitly overriding `NO_COLOR` and `TERM=dumb` preserves
the real terminal styling. The image's JetBrains Mono font renders picker glyphs such as `◂` and `▸`.

Do not judge an animated GIF by its first frame. Inspect its contact sheet with `media-preview` and the three rendered
stills. Confirm the cast header names `xterm-256color`, the states differ, and focus color, dim text, cursor, picker
glyphs, alignment and clipping match the live terminal. Aim below 8 MB; GitHub accepts GIFs up to 10 MB.

## Attaching to the pull request

Write the body with local Markdown image references, then run `gh` from the artifact directory. Attachments are
uploaded first and the matching references are rewritten to the hosted URLs.

```sh
cd /home/agent/code/.artifacts/<task>/<run>
gh pr create --repo Altinn/altinn-studio --base main --head <branch> \
  --title 'fix: preserve selection when filtering' --body-file pr-body.md \
  --attach ./before.png --attach ./after.png
gh pr edit <number> --body-file pr-body.md --attach ./interaction.gif
```

Each `--attach` takes one file; add `#caption` after the path to set the alt text. Up to 50 files per command.

Failure behavior matters:

- If no attachment uploads, `gh` stops before creating or editing the pull request.
- If some upload and some fail, the pull request is created or edited with the successful ones and `gh` exits nonzero.
  Read the pull request back, then retry only the missing files with `gh pr edit --attach`; do not run `gh pr create`
  again.
- Uploading needs a token `gh` recognizes as a personal access token or OAuth token and write access to the target
  repository. The inert `GITHUB_TOKEN` in a GitHub-enabled Agent satisfies the first; an Agent without a token binding
  cannot attach files.

Finish by reading the pull request body (`gh pr view <number> --json body -q .body`) and confirming every image
reference is a hosted `github.com` URL rather than a local path.
