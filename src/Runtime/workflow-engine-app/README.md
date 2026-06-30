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

## Updating the studioctl image tag

`studioctl env up --dev-workflow-engine` pulls a prebuilt engine image from GHCR. The tag is pinned in [`src/cli/internal/config/config.yaml`](../../cli/internal/config/config.yaml):

```yaml
image: ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app
tag: "5b68c250a0"
```

### How the image is built

The [`deploy-runtime-workflow-engine-app`](../../../.github/workflows/deploy-runtime-workflow-engine-app.yaml) workflow builds and pushes the image on every push to `main` that touches the engine source, `Dockerfile`, packages, or infra paths. **The tag is the first 10 characters of the triggering commit SHA** (`${GITHUB_SHA::10}`).

### Finding the right tag

After your changes land on `main`, find the build and update the pin:

```sh
# 1. List recent builds (most recent first). Look for event=push, headBranch=main.
gh run list --workflow deploy-runtime-workflow-engine-app.yaml -L 15 \
  --json headSha,displayTitle,event,headBranch,conclusion,createdAt,databaseId

# 2. Confirm the image was actually pushed for that run. The overall run may show
#    "waiting" (deploy/tag jobs gate on environment approval) — that does NOT mean
#    the image is missing. Check the build job specifically:
gh run view <databaseId> \
  --jq '.jobs[] | select(.name | test("Push|OCI")) | {name, status, conclusion}'

# 3. The tag is the first 10 chars of that run's headSha.
```

Pin to the **latest** successful build on `main` (matches `main` HEAD) unless you deliberately need an older artifact. Note that follow-up infra/chore commits also retrigger the workflow and produce new tags, so the newest tag is not always the PR you have in mind — verify the `headSha`.

> The GHCR org package API requires a `read:packages` token scope, so listing tags directly via `gh api /orgs/altinn/packages/...` will 403 with the default token. Rely on the **build job conclusion** (step 2) as proof the image exists.

## Further reading

- [Workflow Engine README](../workflow-engine/README.md) — core engine documentation
- [Technical guide](../workflow-engine/docs/technical-guide.md) — architecture, API reference, configuration
- [Batch enqueue & dependency graphs](../workflow-engine/docs/batch-enqueue.md)
