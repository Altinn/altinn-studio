# Workflow Engine

Async workflow processing engine for Altinn Studio. Processes workflows through an inbox queue with built-in concurrency limiting, retry strategies, and OpenTelemetry instrumentation.

## Projects

| Project | Purpose |
|---------|---------|
| `WorkflowEngine.Api` | Core engine, inbox queue, main loop, HTTP endpoints, workflow executor |
| `WorkflowEngine.Models` | Domain models: `Workflow`, `Step`, `EngineRequest`, status enums |
| `WorkflowEngine.Data` | EF Core persistence, `IEngineRepository`, Postgres via `EnginePgRepository` |
| `WorkflowEngine.Resilience` | `IConcurrencyLimiter` (DB/HTTP semaphore pools), retry strategies |
| `WorkflowEngine.Telemetry` | `Metrics` class (OpenTelemetry counters, histograms, activity source) |
| `WorkflowEngine.Dashboard` | Static file server + `/api/config` + `/api/hot-reload` for monitoring UI |

## Architecture

- **Inbox pattern**: `Engine._inbox` is a `ConcurrentDictionary<string, Workflow>`. Main loop pulls work, executor processes steps.
- **Concurrency**: `IConcurrencyLimiter` manages separate semaphore pools for DB (90) and HTTP (500) operations.
- **Retry**: Per-step `RetryStrategy` with exponential backoff. Default: 1s base, 5m max delay, 24h total.
- **Telemetry**: OpenTelemetry via OTLP to Grafana LGTM stack. `Metrics.Source` for activities, counters for workflow/step lifecycle.
- **Batch writes**: Steps use `HasPendingChanges` flag, flushed via `BatchUpdateWorkflowAndSteps`.

## API Endpoints

- `POST /api/v1/workflow/{org}/{app}/{partyId}/{guid}/next` — advance workflow (API key required)
- `GET /api/v1/workflow/{org}/{app}/{partyId}/{guid}/status` — query status
- Dashboard SSE/REST endpoints under `/dashboard/*` (see Dashboard docs)

## Docker Compose

```
docker-compose.yaml          # Profiles: "app" (engine+dashboard+postgres), "full" (adds observability)
```

| Container | Port | Purpose |
|-----------|------|---------|
| `workflow-engine` | 8080, 8081 | API |
| `dashboard` | 8090 | Monitoring UI (wwwroot bind-mounted for hot-reload) |
| `postgres` | 5432 | Database |
| `pgadmin` | 5050 | PostgreSQL admin UI |
| `lgtm` | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `blackbox-exporter` | — | Prometheus blackbox exporter |
| `postgres-exporter` | 9187 | Prometheus PostgreSQL exporter |
| `wiremock` | 6060 | Mock app callbacks |

**Deploy engine**: `docker compose build workflow-engine && docker compose --profile app up -d --no-deps workflow-engine`
**Deploy dashboard**: `docker compose build dashboard && docker compose --profile app up -d --no-deps dashboard`

Dashboard wwwroot is bind-mounted — frontend file edits are live without rebuild (just browser refresh, or automatic via hot-reload).

## Code Style

- **CSharpier** formatting: 120 char width, 4 spaces, no tabs (`.csharpierrc.yaml`)
- Run `dotnet csharpier format <file>` before committing C# changes
- Build enforces formatting — unformatted files cause build errors

## Tests

xUnit test projects: `*.Tests` for Api, Models, Resilience, Data. Run with `dotnet test`.

## Dashboard

@src/WorkflowEngine.Dashboard/AGENTS.md
