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

Log in, clone, start localtest, and run the app:

```sh
studioctl auth login --env dev
studioctl app clone --env dev <org>/<repo>
cd <repo>
studioctl env up
studioctl run
```

`studioctl auth login` uses a PAT with `read:user` and `repo` scopes.
`studioctl run` wraps `dotnet run --project <app>/App` and auto-detects the app directory.

## Core commands

- `studioctl auth login`: login with PAT for `prod`, `dev`, or `staging`
- `studioctl app clone`: clone `org/repo` from the selected Altinn Studio environment
- `studioctl env up`: start localtest
- `studioctl env down`: stop localtest
- `studioctl env status`: show runtime/container status
- `studioctl env logs`: stream logs from localtest containers
- `studioctl run`: run app natively using `dotnet run`
- `studioctl doctor --checks`: diagnose prerequisites and environment issues

## Install from source (for contributors)

```sh
cd src/cli
make user-install
```

Development loop:

```sh
make build
make lint-fix
make fmt
make lint
make test
```
