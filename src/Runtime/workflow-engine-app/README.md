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

`studioctl env up` runs this service from the `tt02` tag of its GHCR image, moved whenever a build is
deployed to the ring tt02 serves. Local environments therefore run the build tt02 runs, and nothing
needs updating in studioctl when this service changes. `--dev-workflow-engine` routes the binding to
a local host process instead and pulls no image.

Since that tag moves, `studioctl env status` and `studioctl doctor` print the digest of the build a
container is running — that, not the tag, is what a report about local behavior should name. To
reproduce one against a specific build, set `STUDIOCTL_IMAGE_WORKFLOW_ENGINE` to its immutable tag,
the first 10 characters of the commit that built it.

### Keeping the local environment working

In a cluster this service's configuration ships with the image. Locally studioctl supplies it, and
the studioctl a developer has installed is older than the image it pulls. So a change that is atomic
in a cluster is not atomic locally: renaming a setting, moving the readiness route or requiring a new
variable breaks `env up` for everyone who has not updated. Keep the previous spelling working for at
least one studioctl release, and change studioctl in the same pull request.

## Further reading

- [Workflow Engine README](../workflow-engine/README.md) — core engine documentation
- [Technical guide](../workflow-engine/docs/technical-guide.md) — architecture, API reference, configuration
- [Batch enqueue & dependency graphs](../workflow-engine/docs/batch-enqueue.md)
