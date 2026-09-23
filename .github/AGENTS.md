# AGENTS.md — GitHub CI (`.github`)

GitHub Actions workflows (`workflows/`) and composite actions (`actions/`).
Rules by topic; each is what the existing workflows already do.

## Pull request triggers and drafts

**CI does not run while a pull request is a draft.** Marking it ready runs
everything once.

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review, converted_to_draft, closed]
    paths:
      - 'src/<area>/**'
      - '.github/workflows/<this-workflow>.yaml'
      - '!**/AGENTS.md'

jobs:
  build:
    if: ${{ github.event_name != 'pull_request' || (github.event.action != 'closed' && !github.event.pull_request.draft) }}
```

Guard every job that does work, rather than filtering at `on:`. Listing
`ready_for_review` _without_ the guard is the one combination that is strictly
wrong: the workflow then runs on every draft push and again on ready. Teardown
work goes in a separate job keyed on `github.event.action == 'closed'` — see
[`apps-storybook-preview.yaml`](workflows/apps-storybook-preview.yaml).

A few workflows run on drafts deliberately, for example
[`pr-labeler.yml`](workflows/pr-labeler.yml) and
[`approve-pr.yaml`](workflows/approve-pr.yaml) (PR metadata, not CI),
[`lint-pr.yaml`](workflows/lint-pr.yaml) (title check, seconds, useful early),
and `release-*` (`types: [closed]` only).

## Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref || github.run_id }}
  cancel-in-progress: true
```

The `||` chain keys on the PR, then the ref, then the run id, so unrelated
dispatches never cancel each other. Workflows that deploy or publish set
`cancel-in-progress: false`, or `${{ github.event_name == 'pull_request' }}`
when they do both.

## Path filters

Scope `paths` to what the workflow tests, always including its own file, and
exclude `'!**/AGENTS.md'`.

## Runners

`ubuntu-latest` for short checks; `self-hosted-ubuntu` (the image in
[`src/ci/github-runner`](../src/ci/github-runner/Dockerfile)) when the baked-in
toolchains or the local cache help. Jobs serving fork PRs pick per event:

```yaml
runs-on: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.repo.fork == true && 'ubuntu-latest' || 'self-hosted-ubuntu' }}
```

Every job sets `timeout-minutes` — a normal run plus headroom, not an hour.

## Permissions, pinning and checkout

- Pin third-party actions to a full SHA with the version in a trailing comment
  (`actions/checkout@3d3c42e… # v7.0.1`); Renovate moves them.
- Declare `permissions:` explicitly, narrowest that works, default
  `contents: read`. Never give a PR-triggered job `packages: write` or any
  other write scope over shared infrastructure.
- `actions/checkout` uses `persist-credentials: false` unless the job pushes,
  and `fetch-depth: 1` unless it needs history.

## Caching

Three mechanisms, by content type:

1. **GitHub Actions cache** (10GB/repo, LRU-evicted). Shared entries are seeded
   on main by [`workflows/cache-warm.yml`](workflows/cache-warm.yml) (weekdays
   06:00 UTC + dispatch) and restored-only by PR jobs — PR-ref saves are
   invisible to other PRs and evict the shared entries (letting PR jobs save
   freely is what blew the quota; see #20121). Two bounded exceptions save
   wherever they run:
   - _Run-handoff caches_ (LocalTest image tar, focused node_modules, studioctl
     dev-home): content-addressed archives one job builds and sibling jobs in
     the same run require; the nightly cypress cron seeds them on main.
   - _setup-node's built-in yarn cache_ saves only on a primary-key miss, i.e.
     one entry per lockfile-changing PR. Go outgrew that same behavior
     (Renovate churn) and uses
     [`actions/setup-go-cached`](actions/setup-go-cached/action.yaml) instead.
2. **BuildKit registry cache** (ghcr/ACR `:buildcache` refs, no quota) for
   docker image layers. Every build reads via `--cache-from` (public refs need
   no auth). Writes happen only from trusted main contexts: `cache-warm.yml`
   for the LocalTest images, each `deploy-*` workflow for its own images (ACR
   refs need `image-manifest=true`). Never grant `packages: write` to a
   PR-triggered job.
3. **The runner image**
   ([`src/ci/github-runner`](../src/ci/github-runner/Dockerfile)): anything
   identical on every run (Go/Node/Rust/.NET toolchains, Chrome, Cypress,
   cargo-machete) is baked in, not downloaded or cached per job.

Couplings to keep in sync:

| When changing…                                                                 | Also update…                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Go modules (add/remove)                                                        | The `go-modules` matrix in cache-warm **and** the workflow's `setup-go-cached` step — the matrix must cover every (module, runner environment) combination the PR workflows use — keys are scoped per runner environment and image. |
| Yarn caching                                                                   | Single scheme: `setup-node` with `cache: 'yarn'` + `cache-dependency-path: yarn.lock` (the root lockfile), seeded by cache-warm's `yarn` job.                                                                                       |
| ghcr `localtest-*-cache` refs                                                  | Hardcoded in [`core.go`](../src/cli/internal/cmd/env/localtest/components/core.go) and [`pdf.go`](../src/cli/internal/cmd/env/localtest/components/pdf.go); written only by cache-warm.                                             |
| Cypress (`src/App/frontend/package.json`) or Rust (root `Cargo.toml`) versions | Nothing by hand — `deploy-github-runners.yaml` bakes them into the runner image; workflows fall back (`npx cypress install` / rustup) on drift until it rebuilds.                                                                   |
| rust-cache                                                                     | One `shared-key: rust`; cache-warm is the only saver (`save-if: false` in the PR workflows).                                                                                                                                        |

Prefer `restore-keys` prefixes on hash-keyed caches (dependency-bump PRs get
partial hits from the latest main entry) but never on content-addressed ones (a
partial restore is silently stale). A new heavy per-run download belongs in the
runner image, not in a workflow step.
