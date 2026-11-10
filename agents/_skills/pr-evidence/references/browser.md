# Browser captures

Use a named session per task. Keep the viewport consistent when comparing revisions. Run capture commands from
the artifact directory.

```sh
export PLAYWRIGHT_CLI_SESSION=<task>
playwright-cli open --browser chromium http://localhost:8080/
playwright-cli resize 1280 720
playwright-cli snapshot
# Navigate using the snapshot's element refs.
playwright-cli screenshot --filename=result.png
```

For an interaction, record the scenario with pauses long enough to follow each action and read its result:

```sh
playwright-cli video-start browser.webm
playwright-cli run-code --filename=scenario.js
playwright-cli video-stop
video-to-gif browser.webm result.gif
media-preview result.gif
playwright-cli close
```

`scenario.js` supplies an async Playwright function taking `page`. Use `playwright-cli --help` for commands or the
`playwright-cli` skill for more involved automation. Standalone Playwright scripts are also an option.

`video-to-gif` supports `--start`, `--duration`, `--width` and `--fps`. Trim irrelevant waits or reduce dimensions/frame
rate without sacrificing readability. For longer interactions, prefer MP4:

```sh
ffmpeg -i browser.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an result.mp4
```

Inspect the screenshot or the contact sheet produced by `media-preview` before attaching.
