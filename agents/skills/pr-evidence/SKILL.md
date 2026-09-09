---
name: pr-evidence
description: Capture screenshots, browser clips and terminal recordings for a pull request and attach them with gh. Use when a change has a visible or terminal-observable result that the pull request should show.
---

# Pull request evidence

How to capture screenshots, browser clips and terminal recordings and attach them to a pull request. The Agent
instructions say when evidence is expected; this skill says how to produce it.

## What to capture

| Change                                         | Default evidence                              |
| ---------------------------------------------- | --------------------------------------------- |
| Layout, styling or a visible state             | One focused PNG screenshot                    |
| Visual bug fix                                 | Before and after PNGs, same viewport and data |
| Interaction or transition                      | Browser GIF of 5 to 15 seconds                |
| CLI output or interactive terminal behavior    | asciinema recording rendered to GIF           |
| Longer interaction that is unreadable as a GIF | MP4 (WebM converted with ffmpeg)              |

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
time: a single command whose output lands at once renders as one static frame. Script the demonstration so the viewer
sees each command line before its output and give the output time to be read.

```sh
cat > demo.sh <<'DEMO'
step() { printf '\033[1;34m$ %s\033[0m\n' "$*"; sleep 1; "$@"; sleep 2; }
step studioctl app run --help
step studioctl app list
DEMO
asciinema rec --window-size 100x30 --idle-time-limit 3 --command 'bash demo.sh' terminal.cast
agg --cols 100 --rows 30 --font-size 14 --theme monokai terminal.cast terminal.gif
media-preview terminal.gif                                # check that the frames differ
```

For an interactive demonstration omit `--command`, perform the steps, and exit the shell. `agg --help` lists speed,
theme and font options; Liberation Mono is installed and covers Norwegian characters.

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
