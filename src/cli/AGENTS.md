# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Overview

A CLI tool (`studioctl`) to improve developer experience for developing and interacting with Altinn Studio apps locally. Replaces manual clone/setup workflow with a single unified interface.

### Development

See @Makefile

```sh
# 1. Make your changes

make build     # 2. Build
make lint-fix  # 3. Lint autofix
make fmt       # 4. Formatting
make lint      # 5. Lint
make test      # 6. Unit tests
```

### Principles

- Handle errors
- Avoid nolint, the bar should be high
- Respect fieldalignment lints (`make lint-fix` auto-corrects struct field ordering)

### Shared .NET libraries

Libraries shared between the .NET projects in this area live under [`common/`](common/AGENTS.md) and are
part of `studioctl.slnx`, so `make test` covers them.

### Container images

All images are declared in `internal/config/images.go`; `config.DefaultImages()` is the only
source. Three follow the environment they mirror instead of a pinned build, so a platform
change reaches local environments without a studioctl release:

| Image | Tag | Moved by |
| --- | --- | --- |
| `runtime-localtest` | `latest` | `deploy-runtime-localtest.yaml`, every push to main |
| `runtime-pdf3-worker` | `tt02` | the ring-tagging job in `deploy-runtime-pdf3.yaml` |
| `runtime-workflow-engine-app` | `tt02` | the ring-tagging job in `deploy-runtime-workflow-engine-app.yaml` |

`ImageSpec.Floating` marks them, selecting `resource.PullAlwaysAllowStale`
(`components/pullPolicyFor`): re-pull on every apply, keep the local image when the registry
is unreachable. The rest stay `PullIfNotPresent` and are bumped by hand.

- **A running environment is not re-reconciled.** `env up` returns early once converged
  (`runLocaltestUp`), so a new build arrives on the next `env down` + `env up`.
- **The tag no longer identifies the build.** `env status` and `doctor` print the digest the
  container runs — that is what a bug report needs.
- **studioctl's container spec is a contract with an older client.** A developer's studioctl
  is older than the image it pulls, so the environment variables, ports and probe paths in
  `components/workflow_engine.go` must keep working across builds. See
  `src/Runtime/workflow-engine-app/AGENTS.md`.
- `STUDIOCTL_IMAGE_*` overrides one reference for a session, for reproducing a report against
  a specific build. It replaced a home-directory override file, which migration
  `008-remove-image-config-file` deletes on update.

### Changelog & releases

- **Every PR with a user-visible studioctl change** (new commands/flags, behavior changes,
  fixes, bumps of the pinned images) **must add an entry to `CHANGELOG.md`** under `## [Unreleased]`,
  using the Keep a Changelog categories (Added/Changed/Fixed/…). CI enforces this:
  `.github/workflows/cli-changelog.yaml` fails PRs that change studioctl code without a new
  `[Unreleased]` entry. For changes with no user-visible effect (refactors, test-only or
  CI-only work), apply the `skip-changelog` label instead. The structure of any changed
  changelog is validated separately (`.github/workflows/changelog.yml`).
- Releases are changelog-promotion PRs: move `[Unreleased]` into a new `## [<version>] - <date>`
  section and label the PR `release/studioctl`; merging it triggers
  `.github/workflows/release-studioctl.yaml`. Use `src/tools/releaser`
  (`go run . prepare -component studioctl -version vX.Y.Z-preview.N`) or promote manually,
  and validate with `go run . validate-changelog` / `resolve-version`.

### Local dev flows (build/serve from source)

By default `env up` pulls release images from GHCR and `run` serves the app's bundled
frontend. Two independent switches let you build/serve from the local checkout instead;
see @README.md for the full contributor walkthrough.

- **Locally built environment images** — `STUDIOCTL_INTERNAL_DEV=true studioctl env up`,
  run from inside the monorepo. Truthy is `1`/`true` (`config.IsTruthyEnv`). This flips
  `env up` from `ReleaseMode` to `DevMode`, building the `localtest`, `pdf3`, and
  `workflow-engine` images from local Dockerfiles. Detection lives in
  `detectImageMode`/`resolveDevImageMode` (`internal/cmd/env/localtest/env.go`): it requires
  a detected Studio repo root with `src/Runtime/localtest/Dockerfile`, else it warns and
  falls back to release images. This is the same switch CI uses, so a dev-mode run exercises
  the real app⇄services contract.
- **Locally served frontend** — `studioctl run --dev-frontend` (also `app run` / `app env`).
  Sets `AppSettings__AppFrontendAssetBaseUrl` (see `internal/cmd/app/env.go`) to the
  `frontendDevServer` component URL, host-bridged to host port `8080` where
  `src/App/frontend`'s Vite dev server (`yarn start`) listens. The
  `app-frontend.local.altinn.cloud` host must resolve — `studioctl env hosts add` writes it;
  `env up` does not touch the hosts file.
- The topology/host wiring for both lives in `internal/envtopology/` (`topology.yaml`,
  `ComponentFrontendDevServer`) and `internal/cmd/env/localtest/components/topology.go`.
