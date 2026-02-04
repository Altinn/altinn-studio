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

Then run the API on the host:

```sh
dotnet run --project src/WorkflowEngine.Api
```

The database is migrated automatically on startup (EF Core). No manual migration step needed.

To run everything in Docker, including the API itself:

```sh
docker compose --profile app up -d
```

### Ports & URLs

| Service    | URL                                            | Notes                                                   |
|------------|------------------------------------------------|---------------------------------------------------------|
| Engine API | [http://localhost:8080](http://localhost:8080) | Swagger UI at [/swagger](http://localhost:8080/swagger) |
| Grafana    | [http://localhost:3000](http://localhost:3000) | Dashboards, logs, traces, metrics                       |
| PgAdmin    | [http://localhost:5050](http://localhost:5050) | Db password: postgres123                                |
| PostgreSQL | `localhost:5432`                               |                                                         |

### Authentication

All workflow endpoints require an API key via header. The development key is configured in `appsettings.json` under `ApiSettings:ApiKeys`.

### App command callbacks

Details regarding where and how to send app command callbacks are configured in `appsettings.json` under `AppCommandSettings`.

### API endpoints

See swagger for a [full list](http://localhost:8080/swagger) of endpoints. The main ones so far:

```
POST /api/v1/workflow/{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}/next
GET  /api/v1/workflow/{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}/status
```

## Migrations

Migrations are applied automatically on startup. To add a new migration after modifying entities:

```sh
dotnet ef migrations add <Name> \
  --project src/WorkflowEngine.Data \
  --startup-project src/WorkflowEngine.Api
```

## Further reading

- [Architectural overview](docs/architecture.md)
- [Performance testing](docs/performance.md)
