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
`studioctl app clone` also accepts Studio repository URLs, with or without the `.git` extension, and
selects the environment from the URL (for example `https://dev.altinn.studio/repos/<org>/<repo>.git`).
For agents and automations, pass an existing Studio/Designer API key on standard input:

```sh
studioctl auth login --env dev --with-token < token.txt
```

`studioctl app run` wraps `dotnet run --project <app>/App` and auto-detects the app directory.
`studioctl run` is a short alias for the same operation.
`studioctl app env --json` prints the local harness environment used by v9 app startup when running from an IDE.
`studioctl app maskinporten set` stores the Maskinporten client an app uses for local runs - to send a
Fiks Arkiv test shipment, say - asking for the environment, client id and key, or reading the client as JSON
from `--file` or a pipe. studioctl provisions it to the app the way Studio does when
the app is deployed, so the app never reads Maskinporten credentials from its own configuration; a running
app picks up a stored client without a restart. A section pasted out of a v8 app's appsettings file, name
and all, is accepted as input.

## Core commands

- `studioctl auth login`: login with Ansattporten or `--with-token` for `prod`, `dev`, `staging`, or `local`
- `studioctl apps search`: search app repositories in Altinn Studio
- `studioctl app clone`: clone `org/repo` or a Studio repository URL from the selected or inferred environment
- `studioctl app run`: run app locally
- `studioctl app env`: print local app harness environment as KEY=value text (`--json` for JSON output)
- `studioctl app maskinporten`: store the Maskinporten client the app uses for local runs (`set`, `show`, `remove`)
- `studioctl agent skills`: list, locate, and install Agent Skills distributed with studioctl
- `studioctl env up`: start the local environment (`-r localtest`, the default, or `-r localtest-v2`)
- `studioctl env down`: stop the local environment
- `studioctl env status`: show runtime/container status
- `studioctl env logs`: stream logs from the environment's containers
- `studioctl run`: alias for `studioctl app run`
- `studioctl doctor`: diagnose prerequisites and environment issues

## Which images the environment runs

`studioctl env up` keeps the local environment close to the real thing: the newest localtest
build, and the PDF and workflow engine builds deployed to tt02. It checks all three for a
newer build every time it starts the environment; a running environment keeps what it started
with until `env down` and `env up`. If the registry cannot be reached, it starts on the images
already on your machine.

`studioctl env status` shows each container's image and the build it is running — worth quoting in
a bug report, since the tags that follow tt02 move whenever a new build is deployed.

To run a specific build instead, set the matching variable for the session (the `localtest` runtime;
`localtest-v2` runs the images its embedded manifest pins, see below):

```sh
STUDIOCTL_IMAGE_WORKFLOW_ENGINE=ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:a45a743b78 \
  studioctl env up
```

## localtest-v2: the platform's own services

`studioctl env up -r localtest-v2` runs the production platform services instead of localtest's
emulation of them: Register, Profile, Authentication, the PDP, Access
Management, Storage, Events, the Resource Registry and Notifications, built from the
[localtest-research](https://github.com/ivarne-agent/localtest-research) repository with small
local stand-ins for Azure, plus a localtest app for the test-user login and the token helpers, a
shared Postgres, and the same PDF generator and workflow engine as `localtest`. Apps run exactly as
before: `studioctl run` gives them the same platform URLs. The localtest app's container serves
`http://local.altinn.cloud:8000` (the only published port), forwarding each platform prefix to the
component behind it and `/{org}/{app}` to the app. studioctl-server registers every app it discovers
there, one started by `studioctl run` or from an IDE, and the front door deploys it to the platform
the way Altinn Studio does: application metadata and texts to Storage, the authorization policy to
the PDP, and the app's `testData.json` users to the Register; the Resource Registry and Access
Management then pick up the app's resource, policy subjects and test users. While localtest-v2 is
up, apps listen on every interface, because the front door reaches them from its container as
`host.docker.internal:<port>`. `studioctl run` waits until the front door has registered the app,
and `studioctl run --dev-frontend` also routes `http://app-frontend.local.altinn.cloud:8000` to a
frontend dev server on the host's port 8080 for as long as the run lasts.

Optional component groups are off by default: `--with dialogporten` adds Dialogporten and its adapter,
which turns instances into dialogs; `--with receipt` the platform receipt for archived instances;
`--with correspondence` Correspondence (with Dialogporten's WebApi and Redis, which it depends on);
`--with arbeidsflate` the Altinn inbox on `http://af.local.altinn.cloud:8000` (with Dialogporten's
GraphQL host, WebApi and Redis; `studioctl env hosts add` adds the hostname); `--with everything` all
of them. A group starts its own containers and what they depend on; `--without <group>` leaves out
a group's own containers. A request for a component whose group is off answers `503` with the
`env up` command that starts it.

Only one runtime runs at a time. `env up` records which one it started, and `env down`, `env status`,
`env logs` and `env reset` act on that one unless `-r` says otherwise.

The localtest-v2 images are pinned to one build in the embedded manifest; `--latest` follows every
build on the research repository's main branch. To run a container from source, pass the Dockerfile or
the directory holding it (default: the current directory); studioctl builds it and runs it instead:

```sh
cd ~/code/localtest-research/localtest/components/storage
studioctl env up -r localtest-v2 --dev-storage                  # or --dev-storage=<path>
```

The conventions the runtime follows (the manifest, the front door, service discovery, ports, the
certificate, the volumes) are in the research repository's `localtest/CONVENTIONS.md`.

Not in localtest-v2 yet: the monitoring stack and pgAdmin (`env up` refuses `--monitoring` and
`--pgadmin` there), container-mode apps (`run --mode container` is refused while localtest-v2 is up),
and `doctor` checks.

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

Requirements and behavior:

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
