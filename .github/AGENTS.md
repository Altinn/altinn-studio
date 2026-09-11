# AGENTS.md — GitHub CI (`.github`)

GitHub Actions workflows (`workflows/`) and composite actions (`actions/`).
Guidance is organized by topic.

## Caching

Three mechanisms, by content type:

1. **GitHub Actions cache** (10GB/repo, LRU-evicted). Shared entries are seeded
   on main by [`workflows/cache-warm.yml`](workflows/cache-warm.yml) (weekdays
   06:00 UTC + dispatch) and restored-only by PR jobs — PR-ref saves are
   invisible to other PRs and evict the shared entries (letting PR jobs save
   freely is what blew the quota; see #20121). Two bounded exceptions save
   wherever they run:
   - *Run-handoff caches* (LocalTest image tar, focused node_modules, studioctl
     dev-home): content-addressed archives one job builds and sibling jobs in
     the same run require; the nightly cypress cron seeds them on main.
   - *setup-node's built-in yarn cache* saves only on a primary-key miss, i.e.
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

| When changing… | Also update… |
| --- | --- |
| Go modules (add/remove) | The `go-modules` matrix in cache-warm **and** the workflow's `setup-go-cached` step — the matrix must cover every (module, runner environment) combination the PR workflows use — keys are scoped per runner environment and image. |
| Yarn caching | Single scheme: `setup-node` with `cache: 'yarn'` + `cache-dependency-path: yarn.lock` (the root lockfile), seeded by cache-warm's `yarn` job. |
| ghcr `localtest-*-cache` refs | Hardcoded in [`core.go`](../src/cli/internal/cmd/env/localtest/components/core.go) and [`pdf.go`](../src/cli/internal/cmd/env/localtest/components/pdf.go); written only by cache-warm. |
| Cypress (`src/App/frontend/package.json`) or Rust (root `Cargo.toml`) versions | Nothing by hand — `deploy-github-runners.yaml` bakes them into the runner image; workflows fall back (`npx cypress install` / rustup) on drift until it rebuilds. |
| rust-cache | One `shared-key: rust`; cache-warm is the only saver (`save-if: false` in the PR workflows). |

Prefer `restore-keys` prefixes on hash-keyed caches (dependency-bump PRs get
partial hits from the latest main entry) but never on content-addressed ones (a
partial restore is silently stale). A new heavy per-run download belongs in the
runner image, not in a workflow step.
