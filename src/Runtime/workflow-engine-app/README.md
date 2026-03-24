# Workflow Engine App

Altinn-specific host for the [Workflow Engine](../workflow-engine/README.md). This is the deployable web application that composes `WorkflowEngine.Core` with the `AppCommand` — an HTTP callback command targeting Altinn apps.

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker](https://docs.docker.com/get-docker/)

### Running locally

Start infrastructure and the engine in Docker:

```sh
docker compose --profile app up -d
```

Or run the engine from source against Dockerized infrastructure:

```sh
# Start infrastructure only 
docker compose up -d

# Run the app
dotnet run --project src/WorkflowEngine.App
```

The database is migrated automatically on startup.

### Ports & URLs

| Service    | URL                          | Notes                            |
|------------|------------------------------|----------------------------------|
| Engine API | http://localhost:8080         | Swagger UI at `/swagger`         |
| Dashboard  | http://localhost:8080         | Real-time monitoring at `/`      |
| Grafana    | http://localhost:7070         | Metrics, logs, traces            |
| WireMock   | http://localhost:6060         | Mock app callbacks               |
| PgAdmin    | http://localhost:5050         | Password: `postgres123`          |
| PostgreSQL | localhost:5433               |                                  |

### Running tests

```sh
dotnet test
```

No Docker Compose setup needed — tests use Testcontainers for PostgreSQL and WireMock.

## Further reading

- [Workflow Engine README](../workflow-engine/README.md) — core engine documentation
- [Technical guide](../workflow-engine/docs/technical-guide.md) — architecture, API reference, configuration
- [Batch enqueue & dependency graphs](../workflow-engine/docs/batch-enqueue.md)
