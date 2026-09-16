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

`studioctl env up` runs this service from
`ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:tt02`. The ring-tagging job in
[`deploy-runtime-workflow-engine-app`](../../../.github/workflows/deploy-runtime-workflow-engine-app.yaml)
moves that tag whenever a build is handed to `tt_ring1`, the ring tt02 serves, so local
environments run the build tt02 runs. Nothing needs updating in `studioctl` when this service
changes.

`studioctl env status` and `studioctl doctor` print the reference and the digest of the build
behind it — how you tell which build a local environment actually ran.

> `--dev-workflow-engine` disables that container and routes the engine binding to a local
> host process instead, pulling no image.

To reproduce a report against a specific build, point studioctl at it for the session:

```sh
STUDIOCTL_IMAGE_WORKFLOW_ENGINE=ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:a45a743b78 \
  studioctl env up
```

### How the image is built

The same workflow builds and pushes on every push to `main` touching the engine source,
`Dockerfile`, packages, or infra paths. **The immutable tag is the first 10 characters of the
triggering commit SHA** (`${GITHUB_SHA::10}`); `tt02` is a moving tag onto one of those builds.
To find the build behind it, read the `headSha` of the newest run whose `tag-workflow-engine-app`
job completed for `tt_ring1`:

```sh
gh run list --workflow deploy-runtime-workflow-engine-app.yaml -L 15 \
  --json headSha,displayTitle,event,headBranch,conclusion,createdAt,databaseId
```

> Listing GHCR tags directly (`gh api /orgs/altinn/packages/...`) 403s without a
> `read:packages` scope.

### Keeping the local environment working

In a cluster this service's config — environment variables, probe paths, ports — ships with
the image in `infra/kustomize/base/deployment.yaml`. Locally studioctl builds the container
spec (`src/cli/internal/cmd/env/localtest/components/workflow_engine.go`), and a developer's
studioctl is older than the image it pulls.

So a change that is atomic in a cluster is not atomic locally: renaming a setting, moving the
readiness route or requiring a new variable breaks `env up` for anyone who has not updated.
Keep the previous spelling working for at least one studioctl release, and change studioctl in
the same pull request.

## Further reading

- [Workflow Engine README](../workflow-engine/README.md) — core engine documentation
- [Technical guide](../workflow-engine/docs/technical-guide.md) — architecture, API reference, configuration
- [Batch enqueue & dependency graphs](../workflow-engine/docs/batch-enqueue.md)
