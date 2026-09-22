---
name: pr-evidence
description: Help pull request reviewers understand changes to the agentctl and agentd developer experience through terminal recordings. Use when a change affects CLI output, provisioning progress or TUI workflows.
---

# Show the change to reviewers

Demonstrate the scenario, the relevant change and its result so a reviewer can understand the experience without
running it locally. Explain the premise and starting state in the recording or PR caption.

- Keep artifacts under `/home/agent/code/.artifacts/<task>/<run>/`, outside the checkout. No capture report is required.
- Keep each attachment within 10 MiB. There is no fixed duration limit, but GIFs should be brief enough to follow
  without seeking. Split longer demonstrations into focused clips.
- Capture actual behavior from the tested revision, using test data without secrets.

## Record

Prepare incidental setup before recording. Prefer familiar command names on `PATH` and a sensible working directory;
avoid cluttering the demonstration with full binary paths, custom environment variables or a custom `HOME`. If such
configuration is part of the behavior being demonstrated, show it and explain why it matters.

Set terminal capabilities on the recorder so the demonstrated program inherits them. The prefix below removes
`NO_COLOR` and replaces an inherited `TERM=dumb`; it runs before capture, keeping setup out of the demonstration.
Omit the override when demonstrating behavior under those settings. From the artifact directory:

```sh
env -u NO_COLOR TERM=xterm-256color COLORTERM=truecolor \
  asciinema rec --window-size 120x36 --command 'agentctl tui' terminal.cast
agg --font-size 14 terminal.cast terminal.gif
agg --select 50% terminal.cast frame.gif
```

For a scripted CLI demonstration, replace `agentctl tui` with `bash demo.sh` and have the script display the commands
it runs. Pause before execution and after output so a human can follow along. For a TUI, pause on relevant states
before moving on. `--idle-time-limit` can compress long waits, but preserve enough time to read.

For containerized programs, forward the capabilities with `podman run -e TERM -e COLORTERM ...` and ensure
`NO_COLOR` is unset inside the container. For missing picker glyphs, try `agg --font-family 'JetBrains Mono'`.
Keep the application's presentation faithful to the tested revision. Inspect representative frames with the image
viewer, using `agg --select` at relevant positions to check readability beyond the GIF's first frame.

## Attach

From the artifact directory, use local image references in the PR body; `gh --attach` uploads files and rewrites
those references to hosted URLs. Pass one `--attach` per file. For example, after pushing the branch:

```sh
gh pr create --repo Altinn/altinn-studio --base main --head <branch> \
  --title 'fix: ...' --body-file pr-body.md --attach ./result.gif
gh pr edit <number> --attach ./result.gif
```

If an upload fails, inspect the PR before retrying: partial success can create or update the PR despite a nonzero
exit. Retry missing attachments with `gh pr edit`, rather than repeating creation. Uploads need repository write
access and a token recognized by `gh` as a personal access or OAuth token.

Read the body back with `gh pr view <number> --json body -q .body` and confirm attachments have hosted URLs.
