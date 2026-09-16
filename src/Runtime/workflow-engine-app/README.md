# Workflow Engine App

Altinn-specific host for the [Workflow Engine](../workflow-engine/README.md). This is the deployable web application that composes `WorkflowEngine.Core` with the `AppCommand` — an HTTP callback command targeting Altinn apps.

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker](https://docs.docker.com/get-docker/)

### Running locally

This project uses localtest as its local harness. Start localtest with the workflow-engine route bound to the host, then run the app:

```sh
make run
```

Or run the steps separately:

```sh
studioctl env up --dev-workflow-engine
dotnet run --project src/WorkflowEngine.App
```

To include the localtest monitoring stack, start localtest with:

```sh
studioctl env up --dev-workflow-engine --monitoring
```

The database is migrated automatically on startup.

### Ports & URLs

| Service    | URL                               | Notes                       |
| ---------- | --------------------------------- | --------------------------- |
| Engine API | http://localhost:9090             | Swagger UI at `/swagger`    |
| Dashboard  | http://localhost:9090             | Real-time monitoring at `/` |
| Localtest  | http://local.altinn.cloud:8000    | Platform and app callbacks  |
| PostgreSQL | localhost:9543                    | Localtest workflow database |
| Public API | http://workflow-engine.local.altinn.cloud:8000 | Proxied through localtest |

### Running tests

```sh
dotnet test
```

No Docker Compose setup needed — tests use Testcontainers for PostgreSQL and WireMock.

## The image studioctl runs

`studioctl env up` runs this service as a container from the
`ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:tt_ring1` tag. That tag is moved by the
ring-tagging job in
[`deploy-runtime-workflow-engine-app`](../../../.github/workflows/deploy-runtime-workflow-engine-app.yaml)
whenever a build is handed to the `tt_ring1` runtime ring, so the local environment runs the same
build tt02 serves. Nothing needs updating in `studioctl` when this service changes: `env up`
re-pulls the tag, and a change reaching tt02 reaches every local environment on its next start.

`studioctl env status` and `studioctl doctor` print the image reference together with the digest of
the build behind it, which is how you tell which build a local environment actually ran.

> Passing `--dev-workflow-engine` instead **disables** that container and routes the engine binding
> to a local host process (so you can run it yourself with `dotnet run`). In that mode no image is
> pulled.

To run a specific build instead of the one tt02 has — to reproduce a report against an older build,
say — point studioctl at it for the session:

```sh
STUDIOCTL_IMAGE_WORKFLOW_ENGINE=ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:a45a743b78 \
  studioctl env up
```

### How the image is built

The [`deploy-runtime-workflow-engine-app`](../../../.github/workflows/deploy-runtime-workflow-engine-app.yaml)
workflow builds and pushes the image on every push to `main` that touches the engine source,
`Dockerfile`, packages, or infra paths. **The immutable tag is the first 10 characters of the
triggering commit SHA** (`${GITHUB_SHA::10}`); `tt_ring1` is a moving tag pointing at one of those
builds.

To find the build behind the moving tag, list recent runs and read the `headSha` of the newest one
whose `tag-workflow-engine-app` job completed for `tt_ring1`:

```sh
gh run list --workflow deploy-runtime-workflow-engine-app.yaml -L 15 \
  --json headSha,displayTitle,event,headBranch,conclusion,createdAt,databaseId
```

> The GHCR org package API requires a `read:packages` token scope, so listing tags directly via
> `gh api /orgs/altinn/packages/...` will 403 with the default token.

### Keeping the local environment working

The deployment config for this service — environment variables, probe paths, ports — ships with the
image, in `infra/kustomize/base/deployment.yaml`. Locally it does not: studioctl builds the
container spec itself (`src/cli/internal/cmd/env/localtest/components/workflow_engine.go`), and the
studioctl a developer has installed is older than the image it now pulls.

So a change that is atomic in a cluster is not atomic locally. Renaming a setting, moving the
readiness route, or requiring a new environment variable will break `env up` for everyone who has
not updated studioctl. Keep the previous spelling working for at least one studioctl release, and
change studioctl in the same pull request as the engine change that needs it.

## Further reading

- [Workflow Engine README](../workflow-engine/README.md) — core engine documentation
- [Technical guide](../workflow-engine/docs/technical-guide.md) — architecture, API reference, configuration
- [Batch enqueue & dependency graphs](../workflow-engine/docs/batch-enqueue.md)
