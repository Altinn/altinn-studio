# Workflow Engine

Async workflow processing engine for Altinn Studio. Processes workflows through an inbox queue with built-in concurrency limiting, retry strategies, and OpenTelemetry instrumentation.

## Projects

| Project                     | Purpose                                                                     |
|-----------------------------|-----------------------------------------------------------------------------|
| `WorkflowEngine.Api`        | Core engine, inbox queue, main loop, HTTP endpoints, workflow executor      |
| `WorkflowEngine.Models`     | Domain models: `Workflow`, `Step`, `EngineRequest`, status enums            |
| `WorkflowEngine.Data`       | EF Core persistence, `IEngineRepository`, Postgres via `EnginePgRepository` |
| `WorkflowEngine.Resilience` | `IConcurrencyLimiter` (DB/HTTP semaphore pools), retry strategies           |
| `WorkflowEngine.Telemetry`  | `Metrics` class (OpenTelemetry counters, histograms, activity source)       |
| `WorkflowEngine.Dashboard`  | Static file server + `/api/config` + `/api/hot-reload` for monitoring UI    |

## Architecture

- **Inbox pattern**: `Engine._inbox` is a `ConcurrentDictionary<long, Workflow>`. Main loop pulls work, executor processes steps. *Note: the in-memory inbox is being removed in favour of a database-first approach.*
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

- **CSharpier** formatting: 120 char width, 4 spaces, no tabs (`.csharpierrc.yaml`)
- Run `dotnet csharpier format <file>` before committing C# changes
- Build enforces formatting — unformatted files cause build errors

## Tests

xUnit test projects under `tests/`: Api, Models, Resilience, Data, Repository, Integration. Run with `dotnet test`.

### Conventions

- **Arrange-Act-Assert** structure with `// Arrange`, `// Act`, `// Assert` comment markers.
- Prefer `[Theory]` with `[InlineData]` or `[MemberData]` (returning `TheoryData<>`) over individual `[Fact]` tests where inputs vary but logic is the same.
- Use `[Fact]` when there is a single meaningful scenario with no parameterisation.

### Frameworks & tools

- **Verify** (`Verify.Xunit`) for snapshot-testing API responses. Volatile fields (`databaseId`, `createdAt`, `updatedAt`, `backoffUntil`, `traceId`) are scrubbed globally in `ModuleInitializer`. Snapshots live in `.snapshots/` next to the test project.
- **Testcontainers** (`Testcontainers.PostgreSql`) for real Postgres in integration and repository tests. Each fixture starts a `postgres:18` container, runs EF Core migrations, and exposes a `ResetAsync()` that truncates tables between tests.
- **WireMock** (`WireMockServer`) for mocking HTTP callbacks. Started in-process by the integration fixture with a default catch-all 200 stub; individual tests can `Reset()` and register specific stubs as needed.
- **Moq** for unit-level mocking in Api tests (setup/callback/verify pattern).

### Test infrastructure

- **Collection fixtures** share expensive resources (Postgres container, `WebApplicationFactory`) across tests in a collection. Tests opt in via `[Collection(...)]`.
- **`IAsyncLifetime`** on test classes for per-test setup/teardown (typically calls `fixture.ResetAsync()`).
- **Partial classes** split large integration test classes by concern (e.g. `EngineTests.Insert.cs`, `EngineTests.Responses.cs`, `EngineTests.Validation.cs`).

## Dashboard

@src/WorkflowEngine.Dashboard/AGENTS.md
