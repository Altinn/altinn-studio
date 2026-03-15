# Workflow Engine

Reusable class library for async workflow processing. Provides the core engine, processing loop, HTTP endpoints, and all supporting infrastructure. Runtimes (e.g. `workflow-engine-app`) reference this as a library and compose it into their own host.

## Projects

| Project                        | Purpose                                                                     |
|--------------------------------|-----------------------------------------------------------------------------|
| `WorkflowEngine.Core`          | Core engine class library: processing loop, HTTP endpoints, executor, extensions |
| `WorkflowEngine.Commands`      | Command plugin system (Webhook). Runtime-specific commands (e.g. AppCommand) live in their host project |
| `WorkflowEngine.Models`        | Domain models: `Workflow`, `Step`, `EngineRequest`, status enums            |
| `WorkflowEngine.Data`          | EF Core persistence, `IEngineRepository`, Postgres via `EnginePgRepository` |
| `WorkflowEngine.Resilience`    | `IConcurrencyLimiter` (DB/HTTP semaphore pools), retry strategies           |
| `WorkflowEngine.Telemetry`     | `Metrics` class (OpenTelemetry counters, histograms, activity source)       |
| `WorkflowEngine.Dashboard`     | Static file server + `/api/config` + `/api/hot-reload` for monitoring UI    |
| `WorkflowEngine.TestKit`       | Reusable integration test infrastructure: fixtures, API client, test helpers |

## Architecture

- **Command pattern**: `ICommand` → `Command<TData, TContext>` / `Command<TData>` abstract bases. `CommandDefinition` is the inert data record (type, operationId, data JSON). `CommandRegistry` is a DI-based string-keyed dictionary from `ICommand` singletons.
- **Class library**: `WorkflowEngine.Core` is a class library (`Microsoft.NET.Sdk`), not an executable. It exposes public extension methods for host composition:
  - `AddWorkflowEngineHost()` — registers all core services
  - `AddApiKeyAuthentication()` — API key auth scheme
  - `MapEngineEndpoints()`, `MapDashboardEndpoints()`, `MapHealthEndpoints()` — endpoint mapping
  - `ApplyDatabaseMigrations()`, `ResetDatabaseConnectionsInDev()` — host lifecycle
- **Database-first processing**: `WorkflowProcessor` is a `BackgroundService` that fetches work from PostgreSQL using `FOR UPDATE SKIP LOCKED`. A semaphore limits the number of concurrent workers. No in-memory queue — the database is the single source of truth.
- **Concurrency**: `IConcurrencyLimiter` manages separate semaphore pools for DB (95) and HTTP (300) operations.
- **Retry**: Per-step `RetryStrategy` with exponential backoff. Default: 1s base, 5m max delay, 24h total.
- **Telemetry**: OpenTelemetry via OTLP to Grafana LGTM stack. `Metrics.Source` for activities, counters for workflow/step lifecycle.
- **Batch writes**: Steps use `HasPendingChanges` flag, flushed via `BatchUpdateWorkflowAndSteps`.

## API Endpoints (provided by Core)

- `POST /api/v1/workflows` — enqueue workflows (API key required)
- `GET /api/v1/workflows?namespace=` — list active workflows (optional namespace filter)
- `GET /api/v1/workflows/{workflowId:guid}?namespace=` — get single workflow (optional namespace filter)
- Dashboard SSE/REST endpoints under `/dashboard/*` (see Dashboard docs)

## Docker Compose

Infrastructure-only (no engine host). Dashboard and supporting services.

```
docker-compose.yaml          # Profiles: "dash"/"dashboard" (dashboard), "full" (everything)
```

| Container           | Port             | Purpose                                             |
|---------------------|------------------|-----------------------------------------------------|
| `dashboard`         | 8090             | Monitoring UI (wwwroot bind-mounted for hot-reload) |
| `postgres`          | 5432             | Database                                            |
| `pgadmin`           | 5050             | PostgreSQL admin UI                                 |
| `lgtm`              | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP          |
| `blackbox-exporter` | —                | Prometheus blackbox exporter                        |
| `postgres-exporter` | 9187             | Prometheus PostgreSQL exporter                      |
| `wiremock`          | 6060             | Mock app callbacks                                  |

**Deploy dashboard**: `docker compose build dashboard && docker compose --profile dashboard up -d --no-deps dashboard`

Dashboard wwwroot is bind-mounted — frontend file edits are live without rebuild (just browser refresh, or automatic via hot-reload).

## Code Style

CSharpier formatting enforced at build time. Use the `/format` skill for details and commands.

## Tests

xUnit test projects under `tests/`: Core, Models, Resilience, Data, Repository, Integration, TestKit. Run with `dotnet test`.

Integration tests use a self-contained `TestProgram.cs` host (in `tests/WorkflowEngine.Integration.Tests/`) that composes the engine from Core's public API, identical to how a real runtime would.

The `WorkflowEngine.TestKit` project provides reusable integration test infrastructure:
- `ITestProgram` — static interface for test host entry points
- `EngineAppFixture` / `EngineAppFixture<TProgram>` — shared fixture with PostgreSQL, WireMock, and WebApplicationFactory
- `EngineWebApplicationFactory<TProgram>` — generic factory that builds the test host
- `EngineApiClient` — typed HTTP client wrapper with polling helpers
- `TestHelpers` — convenience builders for workflows, steps, and enqueue requests
- `TelemetryCollector` — in-process OpenTelemetry collector for test assertions

Runtime-specific test projects (e.g. `workflow-engine-app`) can reference the TestKit and provide their own `TestProgram : ITestProgram` to get the full integration test infrastructure.

**Infrastructure**: Integration and repository tests use [Testcontainers](https://dotnet.testcontainers.org/) to automatically spin up PostgreSQL (and WireMock where needed) in Docker. No manual Docker Compose setup is required — the test fixtures handle all container lifecycle. Just run `dotnet test` and the fixtures take care of the rest.

For test conventions, scaffolding templates, and infrastructure details, use the `/test` skill.

## Dashboard

@src/WorkflowEngine.Dashboard/AGENTS.md
