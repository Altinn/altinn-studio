---
name: pr-evidence
description: Record agentctl and agentd behavior with asciinema, render it to a GIF with agg and attach it to a pull request with gh. Use when a change alters what a user sees in the terminal.
---

# Pull request evidence

Changes to `agentctl` output, provisioning progress or the TUI are shown in the pull request as a terminal recording.
Backend-only changes keep using test output and text.

## Artifacts

Keep captures outside the checkout, one directory per task and run:

```text
/home/agent/code/.artifacts/<task>/<run>/
  capture.md        the commit recorded, the commands, the terminal size, the scenario shown
  demo.cast demo.gif
  pr-body.md
```

Never capture secret values. The placeholders in this Sandbox are inert, but the recording still should not show them.

## Recording

A GIF only shows something when output changes. Script CLI demonstrations so each command and its output can be read.
For the TUI, record it directly and pause on focused fields, placeholders and picker states before typing or moving on.

```sh
run=/home/agent/code/.artifacts/<task>/<run>
mkdir -p "$run"
cols=120 rows=36 cast="$run/demo.cast" gif="$run/demo.gif"
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

Do not judge an animated GIF by its first frame. Inspect the three rendered stills with the image viewer. Confirm the
cast header names `xterm-256color`, the states differ, and focus color, dim text, cursor, picker glyphs, alignment and
clipping match the live terminal. Aim below 8 MB; GitHub accepts GIFs up to 10 MB.

## Attaching to the pull request

Write the body with a local image reference and run `gh` from the artifact directory; the file is uploaded and the
reference rewritten to the hosted URL.

```sh
cd /home/agent/code/.artifacts/<task>/<run>
gh pr create --repo Altinn/altinn-studio --base main --head <branch> \
  --title 'feat(experimental): ...' --body-file pr-body.md --attach './demo.gif#agentctl apply --wait'
gh pr edit <number> --body-file pr-body.md --attach ./demo.gif
```

- If no attachment uploads, `gh` stops before creating or editing the pull request.
- If some upload and some fail, the pull request exists with the successful ones and `gh` exits nonzero. Retry only
  the missing files with `gh pr edit --attach`; never repeat `gh pr create`.
- Uploading needs write access to the repository through the mediated `GITHUB_TOKEN`.

Finish by reading the body back (`gh pr view <number> --json body -q .body`) and confirming the reference is a hosted
`github.com` URL.
