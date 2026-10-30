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

For an interaction, record the scenario with pauses long enough to follow each action and read its result. Size the
video to the viewport, since it is otherwise scaled to fit 800 by 800 pixels. `--cursor` draws a pointer that travels
to each action, so the reviewer sees what is clicked:

```sh
playwright-cli video-start browser.webm --size 1280x720 --cursor
playwright-cli run-code --filename=scenario.js
playwright-cli video-stop
video-to-gif browser.webm result.gif
media-preview result.gif
playwright-cli close
```

`scenario.js` supplies an async Playwright function taking `page`. Navigate to the starting page before
`video-start`, and only click or type after it, so that nothing changes on screen without a visible cause.
`playwright-cli video-chapter` adds a title card between steps when the steps need naming. Use `playwright-cli --help` for commands or the
`playwright-cli` skill for more involved automation. Standalone Playwright scripts are also an option.

`video-to-gif` supports `--start`, `--duration`, `--width` and `--fps`. Trim irrelevant waits or reduce dimensions/frame
rate without sacrificing readability. For longer interactions, prefer MP4:

```sh
ffmpeg -i browser.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an result.mp4
```

Inspect the screenshot or the contact sheet produced by `media-preview` before attaching.
