# Workflow Engine

Async workflow processing engine for Altinn Studio. Processes workflows with built-in concurrency limiting, retry strategies, and OpenTelemetry instrumentation.

## Projects

| Project                     | Purpose                                                                     |
|-----------------------------|-----------------------------------------------------------------------------|
| `WorkflowEngine.Api`        | Core engine, main processing loop, HTTP endpoints, workflow executor       |
| `WorkflowEngine.Models`     | Domain models: `Workflow`, `Step`, `EngineRequest`, status enums            |
| `WorkflowEngine.Data`       | EF Core persistence, `IEngineRepository`, Postgres via `EnginePgRepository` |
| `WorkflowEngine.Resilience` | `IConcurrencyLimiter` (DB/HTTP semaphore pools), retry strategies           |
| `WorkflowEngine.Telemetry`  | `Metrics` class (OpenTelemetry counters, histograms, activity source)       |
| `WorkflowEngine.Dashboard`  | Static file server + `/api/config` + `/api/hot-reload` for monitoring UI    |

## Architecture

- **Database-first processing**: `WorkflowProcessor` is a `BackgroundService` that fetches work from PostgreSQL using `FOR UPDATE SKIP LOCKED`. A semaphore limits the number of concurrent workers. No in-memory queue — the database is the single source of truth.
- **Concurrency**: `IConcurrencyLimiter` manages separate semaphore pools for DB (95) and HTTP (300) operations.
- **Retry**: Per-step `RetryStrategy` with exponential backoff. Default: 1s base, 5m max delay, 24h total.
- **Telemetry**: OpenTelemetry via OTLP to Grafana LGTM stack. `Metrics.Source` for activities, counters for workflow/step lifecycle.
- **Batch writes**: Steps use `HasPendingChanges` flag, flushed via `BatchUpdateWorkflowAndSteps`.

## API Endpoints

- `POST /api/v1/workflows/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}` — enqueue workflows (API key required)
- `GET /api/v1/workflows/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}` — list active workflows
- `GET /api/v1/workflows/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}/{workflowId:long}` — get single workflow
- Dashboard SSE/REST endpoints under `/dashboard/*` (see Dashboard docs)

## Docker Compose

```
docker-compose.yaml          # Profiles: "app" (engine+postgres), "dashboard" (dashboard), "full" (everything)
```

| Container           | Port             | Purpose                                             |
|---------------------|------------------|-----------------------------------------------------|
| `workflow-engine`   | 8080, 8081       | API                                                 |
| `dashboard`         | 8090             | Monitoring UI (wwwroot bind-mounted for hot-reload) |
| `postgres`          | 5432             | Database                                            |
| `pgadmin`           | 5050             | PostgreSQL admin UI                                 |
| `lgtm`              | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP          |
| `blackbox-exporter` | —                | Prometheus blackbox exporter                        |
| `postgres-exporter` | 9187             | Prometheus PostgreSQL exporter                      |
| `wiremock`          | 6060             | Mock app callbacks                                  |

**Deploy engine**: `docker compose build workflow-engine && docker compose --profile app up -d --no-deps workflow-engine`
**Deploy dashboard**: `docker compose build dashboard && docker compose --profile dashboard up -d --no-deps dashboard`

Dashboard wwwroot is bind-mounted — frontend file edits are live without rebuild (just browser refresh, or automatic via hot-reload).

## Code Style

CSharpier formatting enforced at build time. Use the `/format` skill for details and commands.

## Tests

xUnit test projects under `tests/`: Api, Models, Resilience, Data, Repository, Integration. Run with `dotnet test`.

For test conventions, scaffolding templates, and infrastructure details, use the `/test` skill.

## Dashboard

@src/WorkflowEngine.Dashboard/AGENTS.md
