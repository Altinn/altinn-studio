---
name: pr-evidence
description: Capture screenshots, browser clips and terminal recordings for a pull request and attach them with gh. Use when a change has a visible or terminal-observable result that the pull request should show.
---

# Pull request evidence

Show the visible behavior relevant to the change. Use screenshots for static results, GIFs for short interactions,
and MP4 for longer sequences where playback controls help. Before/after captures can help explain a fix.

- Keep artifacts under `/home/agent/code/.artifacts/<task>/<run>/`, outside the checkout. No capture report is required.
- Keep each attachment within 10 MiB. There is no fixed duration limit, but GIFs should be brief enough to follow
  without seeking. Leave enough pauses to read commands, see state changes and understand the result.
- Capture actual behavior from the tested revision, using test data without secrets. Inspect images or representative
  clip frames for readability and faithful presentation before uploading.

Read only the relevant recipe: [browser](references/browser.md) or [terminal](references/terminal.md).

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
