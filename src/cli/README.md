# studioctl

`studioctl` is the CLI for local development of Altinn Studio apps.

Designer is the easiest path for app development in Altinn Studio, but some work still requires local code changes.
Historically, that local setup has required manual cloning, separate localtest setup, and container tooling details.
`studioctl` is intended to remove that friction and give app developers one entrypoint.

## Goals

- Keep local development closer to the Designer developer experience
- Hide Docker/Podman and localtest setup details as much as possible
- Reduce copy/paste setup guides and environment-specific manual steps

## Quick start (app developers)

Install `studioctl`:

```sh
curl -sSL https://altinn.studio/designer/api/v1/studioctl/install.sh | sh
```

Windows (PowerShell):

```powershell
iwr https://altinn.studio/designer/api/v1/studioctl/install.ps1 -useb | iex
```

The install flow also installs `app-manager` and localtest resources by default.
If no terminal prompt is available, the installer uses the recommended writable user location.
It stops running apps and localtest before replacement, and restarts `app-manager` if it was running.

Pin to a specific version:

```sh
curl -sSL https://altinn.studio/designer/api/v1/studioctl/install.sh | sh -s -- --version v0.1.0-preview.1
```

Log in, clone, start localtest, and run the app:

```sh
studioctl auth login --env dev
studioctl app clone --env dev <org>/<repo>
cd <repo>
studioctl env up
studioctl app run
```

`studioctl auth login` uses a PAT with `read:user` and `repo` scopes.
`studioctl app run` wraps `dotnet run --project <app>/App` and auto-detects the app directory.
`studioctl run` is a short alias for the same operation.

## Core commands

- `studioctl auth login`: login with PAT for `prod`, `dev`, or `staging`
- `studioctl app clone`: clone `org/repo` from the selected Altinn Studio environment
- `studioctl app run`: run app locally
- `studioctl env up`: start localtest
- `studioctl env down`: stop localtest
- `studioctl env status`: show runtime/container status
- `studioctl env logs`: stream logs from localtest containers
- `studioctl run`: alias for `studioctl app run`
- `studioctl doctor`: diagnose prerequisites and environment issues

## Install from source (for contributors)

```sh
cd src/cli
make user-install
```

That installs `studioctl`, `app-manager`, and localtest resources into your user setup.
It uses the same upgrade-safe flow as the release install scripts.

Development loop:

```sh
make build
make lint-fix
make fmt
make lint
make test
```
