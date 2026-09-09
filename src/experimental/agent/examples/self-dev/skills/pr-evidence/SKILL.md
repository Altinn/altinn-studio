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

A GIF only shows something when output appears over time. Script the demonstration so each command line is visible
before its output, and give output time to be read. `agentctl` commands that wait, such as `apply --wait`, already
produce movement.

```sh
cat > demo.sh <<'DEMO'
step() { printf '\033[1;34m$ %s\033[0m\n' "$*"; sleep 1; "$@"; sleep 2; }
step agentctl apply -f agent.yaml --wait
step agentctl get agents
DEMO
asciinema rec --window-size 120x36 --idle-time-limit 3 --command 'bash demo.sh' demo.cast
agg --cols 120 --rows 36 --font-size 14 --theme monokai demo.cast demo.gif
```

For the TUI or another interactive flow omit `--command`, perform the steps in the recorded shell, and exit it. Keep
recordings under 15 seconds of playback; `--idle-time-limit` collapses waits. `agg --help` lists speed and theme
options. Aim below 8 MB; GitHub accepts GIFs up to 10 MB.

Look at the result before attaching it: `agg` prints the frame count, and a GIF with one frame shows nothing.

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
