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

## Further reading

- [Workflow Engine README](../workflow-engine/README.md) — core engine documentation
- [Technical guide](../workflow-engine/docs/technical-guide.md) — architecture, API reference, configuration
- [Batch enqueue & dependency graphs](../workflow-engine/docs/batch-enqueue.md)
