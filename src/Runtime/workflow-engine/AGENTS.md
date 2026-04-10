# Workflow Engine

Reusable class library for async workflow processing. Provides the core engine, processing loop, HTTP endpoints, and all supporting infrastructure. Runtimes (e.g. `workflow-engine-app`) reference this as a library and compose it into their own host.

## Projects

| Project                     | Purpose                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `WorkflowEngine.Core`       | Core engine class library: processing loop, HTTP endpoints, executor, extensions                        |
| `WorkflowEngine.Commands`   | Command plugin system (Webhook). Runtime-specific commands (e.g. AppCommand) live in their host project |
| `WorkflowEngine.Models`     | Domain models: `Workflow`, `Step`, `EngineRequest`, status enums                                        |
| `WorkflowEngine.Data`       | EF Core persistence, `IEngineRepository`, Postgres via `EnginePgRepository`                             |
| `WorkflowEngine.Resilience` | `IConcurrencyLimiter` (DB/HTTP semaphore pools), retry strategies                                       |
| `WorkflowEngine.Telemetry`  | `Metrics` class (OpenTelemetry counters, histograms, activity source)                                   |
| `WorkflowEngine.TestKit`    | Reusable integration test infrastructure: fixtures, API client, test helpers                            |

## Architecture

- **Command pattern**: `ICommand` → `Command<TData, TContext>` / `Command<TData>` abstract bases. `CommandDefinition` is the inert data record (type, operationId, data JSON). `CommandRegistry` is a DI-based string-keyed dictionary from `ICommand` singletons.
- **Class library**: `WorkflowEngine.Core` is a class library (`Microsoft.NET.Sdk`), not an executable. Hosts compose it with two extension methods:
    - `AddWorkflowEngine(connectionString)` on `WebApplicationBuilder` — registers all core services, auth, DB, telemetry, OpenAPI, health checks, and built-in `WebhookCommand`
    - `UseWorkflowEngine()` on `WebApplication` — configures middleware pipeline, endpoints, dashboard, and applies DB migrations
    - Host-specific commands are added via `builder.Services.AddCommand<T>()`
- **Database-first processing**: `WorkflowProcessor` is a `BackgroundService` that fetches work from PostgreSQL using `FOR UPDATE SKIP LOCKED`. No in-memory queue — the database is the single source of truth.
- **Concurrency**: `IConcurrencyLimiter` manages three independent semaphore pools: Workers, DB connections, and HTTP calls.
- **Retry**: Per-step `RetryStrategy` with configurable backoff (exponential, linear, constant). Default: 1s base, 5m max delay, 24h total.
- **Heartbeat & stale recovery**: `HeartbeatService` proves worker liveness. Stale workflows (expired heartbeat) are automatically reclaimed by another worker. Poison workflow protection after configurable max reclaim attempts.
- **Cancellation**: Cross-pod cancellation propagation via DB polling. `CancellationWatcherService` detects pending cancellations for in-flight workflows.
- **Write buffer**: `WorkflowWriteBuffer` batches enqueue operations via a channel-based work queue with configurable batch size, queue depth, and flush concurrency.
- **Telemetry**: OpenTelemetry via OTLP to Grafana LGTM stack. `Metrics.Source` for activities, counters/histograms/gauges for workflow/step lifecycle and resource utilization.

## API Endpoints (provided by Core)

- `GET /api/v1/namespaces` — list distinct namespaces
- `POST /api/v1/{namespace}/workflows` — enqueue workflows, supports batch with dependency graphs
- `GET /api/v1/{namespace}/workflows` — paginated list of active workflows (optional page, pageSize, correlationId, label filters)
- `GET /api/v1/{namespace}/workflows/{workflowId:guid}` — get single workflow with all steps
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/cancel` — request cancellation (idempotent)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/resume` — resume a terminal workflow for re-processing
- Health endpoints: `/health`, `/health/ready`, `/health/live`
- Dashboard SSE/REST endpoints under `/dashboard/*` (see Dashboard docs)

## Docker Compose

Infrastructure-only (no engine host). Supporting services for local development.

| Container           | Port             | Purpose                                    |
| ------------------- | ---------------- | ------------------------------------------ |
| `postgres`          | 5433             | Database                                   |
| `pgadmin`           | 5050             | PostgreSQL admin UI                        |
| `lgtm`              | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `blackbox-exporter` | —                | Prometheus blackbox exporter               |
| `postgres-exporter` | 9187             | Prometheus PostgreSQL exporter             |
| `wiremock`          | 6060             | Mock app callbacks                         |

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

The dashboard UI is embedded directly in `WorkflowEngine.Core`. Static files (`wwwroot/`) are compiled as embedded resources and served by `MapDashboardUI()` alongside the data endpoints from `MapDashboardEndpoints()`. In development, a `PhysicalFileProvider` serves files from disk for live editing without rebuilds.

For module structure and code patterns, see `src/WorkflowEngine.Core/wwwroot/AGENTS.md`.
For full behavioral spec (sections, endpoints, card anatomy, filtering, modals, URL sync), see `src/WorkflowEngine.Core/wwwroot/DASHBOARD_SPEC.md`.
