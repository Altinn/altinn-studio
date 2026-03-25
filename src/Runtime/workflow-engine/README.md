# Workflow Engine

An asynchronous workflow orchestration service for Altinn Studio. It accepts process-advancement requests for app instances, queues them internally, and executes each step sequentially with idempotency guarantees, automatic retries (exponential backoff), and distributed tracing. Step execution is carried out by issuing HTTP callbacks to the originating Altinn app.

Built on .NET 10, PostgreSQL, and OpenTelemetry.

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker](https://docs.docker.com/get-docker/)

### Running locally

Start the infrastructure (Postgres, PgAdmin, Grafana/LGTM, exporters, WireMock):

```sh
docker compose up -d
```

Then run the test host application:

```sh
dotnet run --project tests/WorkflowEngine.TestApp
```

The database is migrated automatically on startup (EF Core). No manual migration step needed.

The [TestApp](tests/WorkflowEngine.TestApp) is a minimal host that composes the core engine with the built-in WebhookCommand — ideal for local development and testing against the engine itself.

Alternatively, run the TestApp as a Docker container using the `core` profile:

```sh
docker compose --profile core up -d
```

The dashboard's `wwwroot/` directory is bind-mounted into the container, so frontend file edits are reflected immediately without rebuilding.

### Ports & URLs

| Service    | URL                                                             | Notes                                                   |
|------------|-----------------------------------------------------------------|---------------------------------------------------------|
| Engine API | [http://localhost:8080](http://localhost:8080)                  | Swagger UI at [/swagger](http://localhost:8080/swagger) |
| Grafana    | [http://localhost:7070](http://localhost:7070)                  | Dashboards, logs, traces, metrics                       |
| WireMock   | [http://localhost:6060](http://localhost:6060/__admin/requests) | Mock app/webhook target                                 |
| PgAdmin    | [http://localhost:5050](http://localhost:5050)                  | Db password: postgres123                                |
| PostgreSQL | `localhost:5433`                                                |                                                         |

### API endpoints

See swagger for a [full list](http://localhost:8080/swagger) of endpoints. The main ones:

```
POST /api/v1/workflows              (enqueue workflows)
GET  /api/v1/workflows              (list active workflows)
GET  /api/v1/workflows/{id}         (get single workflow with steps)
POST /api/v1/workflows/{id}/cancel  (request cancellation)
```

## Migrations

Migrations are applied automatically on startup. To add a new migration after modifying entities:

```sh
dotnet ef migrations add <Name> \
  --project src/WorkflowEngine.Data \
  --startup-project tests/WorkflowEngine.TestApp
```

## Load testing

k6 scripts for stress testing and benchmarking are available in the [`.k6/`](.k6/) directory. See the [k6 README](.k6/README.md) for setup instructions, available scripts, and configuration options.

## Further reading

- [Technical guide](docs/technical-guide.md)
- [Architectural overview](docs/architecture.md)
- [Batch enqueue & dependency graphs](docs/batch-enqueue.md)
- [Notes on db connections during dev cycle](docs/db-connections-notes.md)
