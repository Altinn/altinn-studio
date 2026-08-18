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
- **Deferral (durable yield)**: A command may return `ExecutionResult.Defer(delay)` — "ran fine, the awaited outcome isn't available yet, re-execute me after `delay`". The step parks in the non-terminal `Waiting` status (no lease, no worker slot; scheduled via the workflow's `backoff_until`), records no error history, and resets its retry counter. `Waiting` is in the **Incomplete/active** status set: consumers must never read a parked workflow as settled. The deferral's reason is persisted (`Step.LastDeferReason` — overwritten on every deferral, cleared on resume) and surfaced on status reads (`lastDeferReason` on the step, `waitingReason` on a `Waiting` collection head) so consumers can show what a parked step is waiting for. Vocabulary: `Defer`/`Deferred` is what the *command* returns, `Waiting` is the *state* the engine puts the step in — the same split as `RetryableError` → `Requeued`.
- **Wait budget**: total waiting is bounded by `command.waitBudget` (default `EngineSettings.DefaultStepWaitBudget` = 24h, capped at enqueue by `MaxStepWaitBudget` = 14d — deliberately small, and load-bearing for the callback-token lifetime invariant documented on that setting), anchored at the first deferral (`Step.FirstDeferredAt`). It is a **cumulative allowance, not a poll interval** — the command picks each delay, the budget caps their sum. A deferral asking for longer than the budget has left is **clamped to the deadline**, not rejected, so the step spends its whole budget and always gets one final check; a deferral at/past the deadline fails it with the `wait_expired` reason (distinct from `execution` in `engine.workflows.execution.failed` — keep it out of the default ops alert). A delay below `MinStepDeferDelay` (1s) is clamped **up**, so a miscomputed delay cannot spin. `engine.steps.wait.duration` records the budget actually consumed, once per deferring step.
- **The three clocks stay orthogonal**, and none substitutes for another: `command.maxExecutionTime` bounds one attempt, `RetryStrategy` bounds a run of consecutive *errors* (re-anchored on each deferral via `Step.LastDeferredAt` — never on `UpdatedAt`, which advances every attempt and would stop `MaxDuration` binding at all), and the wait budget bounds *waiting*. Worst-case step lifetime after a deferral is therefore `waitBudget + RetryStrategy.MaxDuration`, not the budget alone.
- **Nudge**: `POST /api/v1/{namespace}/workflows/{id}/nudge` clears a parked workflow's `backoff_until` (`Requeued` or `Waiting`) and signals the processor, so it runs on the next fetch cycle instead of when its timer elapses. The workflow is re-executed, not skipped. This is the engine's push channel: external signals may *accelerate* a poll but are never load-bearing — a lost nudge costs latency, never correctness. `POST /dashboard/nudge` is the dashboard face of the same operation, and `resume` also applies to `Waiting`.
- **Mailboxes**: a mailbox (`engine.mailboxes`) is a durable inbox external messages can be delivered into, minted on demand by the app and addressed by its engine-generated uuidv7 id — the reply address the app embeds in an outbound message. It is minted idempotently on `(namespace, idempotencyKey)`, carries the exchange's one absolute `deadline` (stamped at mint as `createdAt + timeout`, capped by `EngineSettings.MaxMailboxTimeout`), and holds two gapless counters: `nextIdx` for the deliveries log and `nextSeq` for the receivers log. Closing is terminal and idempotent, and records _why_ (`request` or `deadline`) rather than leaving it to be inferred. **The mailbox row is its own serialization point**: every mutation that acts on an existing mailbox takes its row lock as the first act of its transaction, before reading anything it decides on. The mint is the one exception, and cannot be otherwise — the row is what it creates, so the unique index on `(namespace, idempotency_key)` serializes it instead. The compound lock order **mailbox row → workflow row** is a design invariant of the whole feature, not something this code exercises: no mailbox operation touches a workflow row yet, and the steps that add the wake and the closure release are the ones that must hold to it. An open-mailboxes-per-collection cap (`MaxOpenMailboxesPerCollection`) bounds what one instance's exchanges can cost — a **best-effort** guard, not an exact bound: it is evaluated against the mint's snapshot, so concurrently in-flight mints can each see room and overshoot it slightly (bounded by that concurrency, never runaway). A mailbox minted without a `collectionKey` is uncapped, since the cap is per collection. Metrics: `engine.mailboxes.created` and `engine.mailboxes.closed` (tagged `reason`), both counting state changes rather than requests, so idempotent replays do not inflate them.
- **Heartbeat & stale recovery**: `HeartbeatService` proves worker liveness. Stale workflows (expired heartbeat) are automatically reclaimed by another worker. Poisoned workflow protection after configurable max reclaim attempts.
- **Cancellation**: Cross-pod cancellation propagation via DB polling. `CancellationWatcherService` detects pending cancellations for in-flight workflows. For workflows nobody is executing, the fetch gate claims any row with a pending cancellation regardless of its backoff timer (the handler cancels before executing anything), so a cancel that races a retry/deferral write-back never sits out the timer — unsettled dependencies still gate the fetch.
- **Write buffer**: `WorkflowWriteBuffer` batches enqueue operations via a channel-based work queue with configurable batch size, queue depth, and flush concurrency.
- **Telemetry**: OpenTelemetry via OTLP to Grafana LGTM stack. `Metrics.Source` for activities, counters/histograms/gauges for workflow/step lifecycle and resource utilization.

## API Endpoints (provided by Core)

- `GET /api/v1/namespaces` — list distinct namespaces
- `POST /api/v1/{namespace}/workflows` — enqueue workflows, supports batch with dependency graphs
- `GET /api/v1/{namespace}/workflows` — cursor-paginated list of workflows. Optional filters: `status` (repeatable, case-insensitive — `Enqueued`, `Processing`, `Requeued`, `Completed`, `Failed`, `Canceled`, `DependencyFailed`, `Abandoned`, `Waiting`; omitting it returns all statuses), `label` (repeatable, `key:value`), `collectionKey`, `cursor`, `pageSize` (default 25, max 100). Returns a `PaginatedResponse` (`data`, `pageSize`, `totalCount`, `nextCursor`) or `204 No Content` when nothing matches
- `GET /api/v1/{namespace}/workflows/{workflowId:guid}` — get single workflow with all steps
- `GET /api/v1/{namespace}/workflows/{workflowId:guid}/dependency-graph` — get the connected dependency graph reachable from the workflow (nodes + edges)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/cancel` — request cancellation (idempotent)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/resume` — resume a terminal workflow for re-processing (optional `?cascade=true` to also resume dependents in `DependencyFailed`)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/nudge` — clear a parked (`Requeued`/`Waiting`) workflow's pending backoff so it is re-executed on the next fetch cycle. 202 Accepted when this call cleared a backoff, idempotent 200 (null `nudgedAt`) when the workflow was parked but already due, 409 when it is not parked, 404 when missing
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/abandon` — write off an unsuccessful terminal workflow (`Failed`, `Canceled`, `DependencyFailed` → `Abandoned`). Abandoned workflows no longer condemn dependents evaluated after the marking; dependents already in `DependencyFailed` stay put. Atomically releases the enqueue idempotency key, so replaying the same fingerprint creates a fresh workflow instead of deduplicating onto the write-off. Compare-and-set: 202 Accepted when this call wrote off the workflow, 409 on any other non-`Abandoned` state (including a concurrently resumed workflow), idempotent 200 with the original `abandonedAt` when already abandoned, 404 when missing
- `GET /api/v1/{namespace}/collections` — list all collections in the namespace (ordered by most recently updated; heads as bare IDs), or `204 No Content` when none exist
- `GET /api/v1/{namespace}/collections/{key}` — get a single workflow collection by key, including head workflow statuses
- `POST /api/v1/{namespace}/mailboxes` — mint a mailbox (see Mailboxes below). Body: `idempotencyKey` (unique per namespace), `timeout` (positive, capped by `MaxMailboxTimeout`), optional `collectionKey`. Both keys are max 200 characters and may not be empty or whitespace. 201 Created on a fresh mint, idempotent 200 with the existing mailbox on a replayed key, 400 for a key that is empty or too long or an out-of-range timeout, 429 when the collection already holds `MaxOpenMailboxesPerCollection` open mailboxes (a best-effort guard — see Mailboxes below)
- `GET /api/v1/{namespace}/mailboxes/{mailboxId:guid}` — get a mailbox: status, deadline, both log counters, and the unconsumed-delivery count. 404 when it does not exist in the namespace
- `DELETE /api/v1/{namespace}/mailboxes/{mailboxId:guid}` — close a mailbox for deliveries. Terminal and idempotent: 202 Accepted when this call closed it, idempotent 200 with the original `disposedAt`/`disposedReason` when it was already closed (by an earlier call or by its deadline), 404 when it does not exist
- Health endpoints: `/health`, `/health/ready`, `/health/live`
- Dashboard SSE/REST endpoints under `/dashboard/*` (see Dashboard docs)

## Docker Compose

Infrastructure-only (no engine host). Supporting services for local development.

| Container           | Port             | Purpose                                    |
| ------------------- | ---------------- | ------------------------------------------ |
| `postgres`          | 9543             | Database                                   |
| `pgadmin`           | 5050             | PostgreSQL admin UI                        |
| `lgtm`              | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `blackbox-exporter` | —                | Prometheus blackbox exporter               |
| `postgres-exporter` | 9187             | Prometheus PostgreSQL exporter             |
| `wiremock`          | 6060             | Mock app callbacks                         |

## Code Style & Documentation

CSharpier formatting enforced at build time. Use the `/format` skill for details and commands.

Use docstrings to document all public types and members. Extend this to private members where necessary to explain complex logic or add clarity.

Be extremely sparse with inline comments. If a pattern is not self-describing, it likely needs refactoring. The exception is complex order-dependent logic in the various hot processing loops.

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
