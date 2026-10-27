# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in Altinn/altinn-studio. Use the `gh` CLI for all operations.

- **Close**: `gh issue close <number> --reason completed --comment "..."`, or `--reason "not planned"` for `wontfix` (see `triage-labels.md`)

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

A `(#123)` at the end of a commit subject is the PR number. To find the originating issue, read the PR body for `Closes #n` / `Part of #n`, or run `gh pr view 123 --json closingIssuesReferences`.
