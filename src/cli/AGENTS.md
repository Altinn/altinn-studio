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

### Bundled app-development skill

`resources/agent/skills/app-development/SKILL.md` ships with studioctl. Keep its commands and workflows current when
changing studioctl's user-facing flags, output, or behavior.

### Shared .NET libraries

Libraries shared between the .NET projects in this area live under [`common/`](common/AGENTS.md) and are
part of `studioctl.slnx`, so `make test` covers them.

### Container images

Image references live in the CLI, not in a config file. Three of them follow the environment they
mirror instead of a pinned build — localtest follows main, and the PDF and workflow engine services
follow what tt02 runs — so a runtime change reaches local environments without a studioctl release.
The rest are pinned and bumped by hand.

Invariants:

- A following image is re-pulled whenever the environment starts, and keeps the local copy when the
  registry is unreachable, so `env up` still works offline.
- `env up` returns early on a converged environment, so a new build arrives on the next `env down` +
  `env up`, and a running container keeps the build it started with.
- A moving tag does not identify a build, so reporting reads the container, not the configuration:
  the build it runs, plus the reference only where that reference still resolves to that build.
  The commit is stamped on each image as `org.opencontainers.image.revision`.
- The container spec studioctl generates is a contract with an older client: a developer's studioctl
  is older than the image it pulls. See the service's own `AGENTS.md`.
- `STUDIOCTL_IMAGE_*` pins one reference for a session. It replaced a home-directory override file,
  which an update deletes.

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
