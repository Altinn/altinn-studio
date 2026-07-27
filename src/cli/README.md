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

The install flow also installs `studioctl-server` and localtest resources by default.
If no terminal prompt is available, the installer uses the recommended writable user location.
It stops running apps, localtest, and `studioctl-server` before replacement.
`studioctl-server` starts later when a command needs it.

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

`studioctl auth login` opens Designer for Ansattporten login and stores a Designer API key locally.
For agents and automations, pass an existing Studio/Designer API key on standard input:

```sh
studioctl auth login --env dev --with-token < token.txt
```

`studioctl app run` wraps `dotnet run --project <app>/App` and auto-detects the app directory.
`studioctl run` is a short alias for the same operation.
`studioctl app env --json` prints the local harness environment used by v9 app startup when running from an IDE.

## Core commands

- `studioctl auth login`: login with Ansattporten or `--with-token` for `prod`, `dev`, `staging`, or `local`
- `studioctl apps search`: search app repositories in Altinn Studio
- `studioctl app clone`: clone `org/repo` from the selected Altinn Studio environment
- `studioctl app run`: run app locally
- `studioctl app env`: print local app harness environment as KEY=value text (`--json` for JSON output)
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

That installs `studioctl`, `studioctl-server`, and localtest resources into your user setup.
It uses the same upgrade-safe flow as the release install scripts.

Development loop:

```sh
make build
make lint-fix
make fmt
make lint
make test
```

## Running a fully local build (contributors)

By default `studioctl env up` pulls pre-built release images from GHCR and
`studioctl run` serves the released app frontend bundled into the app image. When you
are changing the runtime/platform services or the app frontend themselves, you can build
and serve everything from your local checkout instead.

### Build the environment images from local source

Set `STUDIOCTL_INTERNAL_DEV=true` and run `env up` from **inside your altinn-studio
checkout**:

```sh
cd altinn-studio          # anywhere inside the monorepo working tree
STUDIOCTL_INTERNAL_DEV=true studioctl env up
```

In this mode studioctl builds the `localtest`, `pdf3`, and `workflow-engine` images from
the Dockerfiles in your working tree instead of pulling release images. It confirms this
with a `Building and starting localtest environment (dev mode)...` message, and the first
run is slower because the images are built locally.

Requirements and behaviour:

- The current directory must be within a Studio repo checkout. studioctl detects the repo
  root and expects `src/Runtime/localtest/Dockerfile` to exist.
- If `STUDIOCTL_INTERNAL_DEV` is set but no Studio repo is detected (or the Dockerfile is
  missing), studioctl prints a warning and falls back to release images.
- Truthy values are `1` and `true` (case-insensitive); anything else is treated as unset.
- This is the same switch CI uses to build the engine/platform services from the PR source,
  so a local dev-mode run exercises the same app⇄services contract as CI.

To go back to release images, simply run `studioctl env up` again without the variable
(after `studioctl env down`).

### Serve the app against the frontend dev server

To run your app against a locally served **app frontend** (`src/App/frontend`) instead of
the released bundle, start the frontend dev server and pass `--dev-frontend`:

```sh
# 1. Start the app frontend dev server (listens on host port 8080)
cd src/App/frontend
yarn                       # only when dependencies changed
yarn start

# 2. In another terminal, run your app pointed at that dev server
cd <your-app-repo>
studioctl run --dev-frontend
```

`--dev-frontend` sets `AppSettings__AppFrontendAssetBaseUrl` to
`http://app-frontend.local.altinn.cloud:8000`, which the localtest ingress host-bridges to
the dev server on host port `8080`. The `app-frontend.local.altinn.cloud` hostname must
resolve on your machine — ensure the studioctl-managed hosts entries are present with:

```sh
studioctl env hosts add      # env up does not modify the hosts file for you
```

The same flag works on `studioctl app run --dev-frontend` and on
`studioctl app env --dev-frontend --json`, the latter being useful to feed the environment
into an IDE run configuration.

> Related: `studioctl env up --dev-workflow-engine` routes the workflow-engine component to
> a host process instead of a container, for the equivalent loop on that service.

The two switches are independent and compose: run `STUDIOCTL_INTERNAL_DEV=true studioctl
env up` for locally built services and `studioctl run --dev-frontend` for a locally served
frontend, together or separately.
