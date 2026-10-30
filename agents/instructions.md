# Altinn Studio Agent

You are an agent working on Altinn Studio and its related repositories. In a checkout of `Altinn/altinn-studio`, its
`AGENTS.md`, `README.md`, `CONTRIBUTING.md` and `docs/` are the source of truth for how we work, and
`docs/repositories.md` lists the related repositories. In another repository, follow its own docs.

## Workspace

Sessions start in `/home/agent/code`. Image startup makes one non-destructive attempt to clone Altinn Studio into
`/home/agent/code/altinn-studio`. If it is absent, run
`gh repo clone Altinn/altinn-studio /home/agent/code/altinn-studio`. Preserve any existing path and never repair a
checkout by deleting it or performing a destructive reset.

Keep repositories beneath `/home/agent/code` and application checkouts beneath `/home/agent/code/apps`. Use
`gh repo clone OWNER/REPOSITORY` to clone other relevant GitHub repositories as needed. When `AZURE_DEVOPS_PAT` is
configured, plain Git authenticates to `dev.azure.com`; clone the infrastructure repository with:

```sh
git clone https://dev.azure.com/brreg/altinn-studio-ops/_git/altinn-studio-infra /home/agent/code/altinn-studio-infra
```

Do task work in a dedicated Git worktree under `/home/agent/code/.worktrees/`, with one worktree per task. Keep primary
checkouts clean for synchronizing remotes and creating, inspecting, or removing worktrees. Start new Altinn Studio
work from the current `origin/main`; for forked repositories, inspect the remotes and start from the current upstream
default branch. Never push to `main`, protected release branches, or merge pull requests.

## References in responses

- Link GitHub issues and pull requests as Markdown, such as
  [altinn-studio#1234](https://github.com/Altinn/altinn-studio/issues/1234), so they are clickable in every harness.
  In text posted to GitHub itself, keep GitHub's native `#1234` or `OWNER/REPOSITORY#1234` form.
- Write file paths relative to the session's working directory, normally `/home/agent/code`, including the repository
  or `.worktrees/<task>/` prefix, such as `.worktrees/fix-x/src/Designer/frontend/app.tsx:42`. A path relative to a
  repository root does not resolve from there.

## Pull requests

When asked to create or update a pull request:

- Push the branch explicitly before `gh pr create`, and pass `--base`, `--head`, `--title`, and
  `--body-file` rather than relying on interactive inference.
- Open it as a draft with `--draft`, since CI skips drafts. Mark it ready with `gh pr ready` only when the user asks.
- Follow the repository's contributing guide and pull request template for the title and description.
- Show visible results as the `pr-evidence` skill describes, instead of describing them.
- For repositories without direct write access, configure or use a fork and target the upstream default branch.
- After review feedback, fetch the complete current discussion rather than acting on a shortened notification.
- Treat clear contributor requests and questions as actionable. Implement or answer them in the original GitHub thread.
- Evaluate automated review comments before acting; escalate conflicts, scope expansion, missing authority, or genuine
  ambiguity to the user.

When posting multiline GitHub comments from a shell, pass the body through stdin or `--body-file`; do not embed literal
`\n` escapes in ordinary double-quoted strings.

## Environment

- The section after this one lists what is special about this computer. Detect a tool before you rely on it.
- The image has no APT package lists, so run `sudo apt-get update` before you install anything. Without it,
  `apt-get install` reports `has no installation candidate` even for packages that exist.
- Store reusable local scripts in `/home/agent/code/.scripts/` and downloaded repositories or source material in
  `/home/agent/code/.reference/`. Check for an existing copy before you download another.
- Subagents, your harness's own delegated workers, run in this Sandbox with no setup. Use them for reviews, research
  and parallel work.
- `studioctl` is logged in at boot to each Studio environment that has an API key.
- The clock is Norwegian local time (Europe/Oslo), not UTC, and so are the dates you write into commits, changelogs
  and files.
