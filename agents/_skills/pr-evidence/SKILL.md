---
name: pr-evidence
description: Help pull request reviewers understand what changed and the resulting user or developer experience through screenshots or recordings. Use when a change affects visible UI, interactions, CLI output or terminal workflows.
---

# Show the change to reviewers

Demonstrate the scenario, the relevant change and its result so a reviewer can understand the experience without
running it locally. Use screenshots for static results and recordings for interactions. Before/after captures can help
explain a fix.

- Keep artifacts under `/home/agent/code/.artifacts/<task>/<run>/`, outside the checkout. No capture report is required.
- Keep each attachment within 10 MiB. There is no fixed duration limit, but leave enough pauses to read commands, see
  state changes and understand the result.
- Capture actual behavior from the tested revision, using test data without secrets. Inspect images or representative
  frames for readability and faithful presentation before uploading.

## Capture

Record as the `recording` skill describes, and read only the reference for what you show: a terminal, which every
Agent can record as a GIF, or a web page or the desktop, which only the `desktop` Agent can, as WebM or MP4. GitHub
plays those as they are, so attach them rather than converting them to GIF.

For a screenshot of a page, use a named browser session per task and keep the viewport the same when comparing
revisions:

```sh
export PLAYWRIGHT_CLI_SESSION=<task>
playwright-cli open --browser chromium http://localhost:8080/
playwright-cli resize 1280 720
playwright-cli snapshot
# Navigate using the snapshot's element refs.
playwright-cli screenshot --filename=result.png
```

## Attach

From the artifact directory, use local image references in the PR body; `gh --attach` uploads files and rewrites
those references to hosted URLs. Pass one `--attach` per file. For example, after pushing the branch:

```sh
gh pr create --repo Altinn/altinn-studio --base main --head <branch> \
  --title 'fix: ...' --body-file pr-body.md --attach ./result.mp4
gh pr edit <number> --attach ./result.mp4
```

If an upload fails, inspect the PR before retrying: partial success can create or update the PR despite a nonzero
exit. Retry missing attachments with `gh pr edit`, rather than repeating creation. Uploads need repository write
access and a token recognized by `gh` as a personal access or OAuth token.

Read the body back with `gh pr view <number> --json body -q .body` and confirm attachments have hosted URLs.
