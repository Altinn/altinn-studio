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
  `src/App/frontend`'s webpack dev server (`yarn start`) listens. The
  `app-frontend.local.altinn.cloud` host must resolve — `studioctl env hosts add` writes it;
  `env up` does not touch the hosts file.
- The topology/host wiring for both lives in `internal/envtopology/` (`topology.yaml`,
  `ComponentFrontendDevServer`) and `internal/cmd/env/localtest/components/topology.go`.
