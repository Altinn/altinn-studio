# Workflow Engine

An asynchronous workflow orchestration service for Altinn Studio. It accepts process-advancement requests for app instances, queues them internally, and executes each step sequentially with idempotency guarantees, automatic retries (exponential backoff), and distributed tracing. Step execution is carried out by issuing HTTP callbacks to the originating Altinn app.

Built on .NET 10, PostgreSQL, and OpenTelemetry.

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker](https://docs.docker.com/get-docker/)

### Running locally

Start the infrastructure (Postgres, PgAdmin, Grafana/LGTM, exporters):

```sh
docker compose up -d
```

Then run the host application:

```sh
# From the workflow-engine-app directory
dotnet run --project src/WorkflowEngine.App
```

The database is migrated automatically on startup (EF Core). No manual migration step needed.

To also include the monitoring dashboard via Docker:

```sh
docker compose --profile dashboard up -d
```

Or use the `full` profile for everything (dashboard and observability stack):

```sh
docker compose --profile full up -d
```

The dashboard's `wwwroot/` directory is bind-mounted into the container, so frontend file edits are reflected immediately without rebuilding — just refresh the browser (or let hot-reload do it automatically).

### Ports & URLs

| Service    | URL                                                             | Notes                                                   |
|------------|-----------------------------------------------------------------|---------------------------------------------------------|
| Engine API | [http://localhost:8080](http://localhost:8080)                  | Swagger UI at [/swagger](http://localhost:8080/swagger) |
| Dashboard  | [http://localhost:8090](http://localhost:8090)                  | Real-time monitoring UI                                 |
| Grafana    | [http://localhost:7070](http://localhost:7070)                  | Dashboards, logs, traces, metrics                       |
| WireMock   | [http://localhost:6060](http://localhost:6060/__admin/requests) | Mock app/webhook target                                 |
| PgAdmin    | [http://localhost:5050](http://localhost:5050)                  | Db password: postgres123                                |
| PostgreSQL | `localhost:5432`                                                |                                                         |

### Authentication

All workflow endpoints require an API key via header. The development key is configured in `appsettings.json` under `ApiSettings:ApiKeys`.

### API endpoints

See swagger for a [full list](http://localhost:8080/swagger) of endpoints. The main ones:

```
POST /api/v1/workflows          (enqueue workflows, API key required)
GET  /api/v1/workflows           (list active workflows)
GET  /api/v1/workflows/{id}      (get single workflow)
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

- [Architectural overview](docs/architecture.md)
- [Concurrency rules](docs/concurrency.md)
- [Performance testing](docs/performance.md)
- [Notes on db connections during dev cycle](docs/db-connections-notes.md)
