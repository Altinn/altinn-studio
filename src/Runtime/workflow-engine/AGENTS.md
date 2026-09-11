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
- **Deferral (durable yield)**: A command may return `ExecutionResult.Defer(delay)` — "ran fine, the awaited outcome isn't available yet, re-execute me after `delay`". The step parks in the non-terminal `Waiting` status (no lease, no worker slot; scheduled via the workflow's `backoff_until`), records no error history, and resets its retry counter. `Waiting` is in the **Incomplete/active** status set: consumers must never read a parked workflow as settled. The deferral's reason is persisted (`Step.LastDeferReason` — overwritten on every deferral, cleared on resume) and surfaced on status reads (`lastDeferReason` on the step, `waitingReason` on a `Waiting` collection head) so consumers can show what a parked step is waiting for. Vocabulary: `Defer`/`Deferred` is what the _command_ returns, `Waiting` is the _state_ the engine puts the step in — the same split as `RetryableError` → `Requeued`.
- **Wait budget**: total waiting is bounded by `command.waitBudget` (default `EngineSettings.DefaultStepWaitBudget` = 24h, capped at enqueue by `MaxStepWaitBudget` = 14d — deliberately small, and load-bearing for the callback-token lifetime invariant documented on that setting), anchored at the first deferral (`Step.FirstDeferredAt`). It is a **cumulative allowance, not a poll interval** — the command picks each delay, the budget caps their sum. A deferral asking for longer than the budget has left is **clamped to the deadline**, not rejected, so the step spends its whole budget and always gets one final check; a deferral at/past the deadline fails it with the `wait_expired` reason (distinct from `execution` in `engine.workflows.execution.failed` — keep it out of the default ops alert). A delay below `MinStepDeferDelay` (1s) is clamped **up**, so a miscomputed delay cannot spin. `engine.steps.wait.duration` records the budget actually consumed, once per deferring step.
- **The three clocks stay orthogonal**, and none substitutes for another: `command.maxExecutionTime` bounds one attempt, `RetryStrategy` bounds a run of consecutive _errors_ (re-anchored on each deferral via `Step.LastDeferredAt` — never on `UpdatedAt`, which advances every attempt and would stop `MaxDuration` binding at all), and the wait budget bounds _waiting_. Worst-case step lifetime after a deferral is therefore `waitBudget + RetryStrategy.MaxDuration`, not the budget alone.
- **Nudge**: `POST /api/v1/{namespace}/workflows/{id}/nudge` clears a parked workflow's `backoff_until` (`Requeued` or `Waiting`) and signals the processor, so it runs on the next fetch cycle instead of when its timer elapses. The workflow is re-executed, not skipped. This is the engine's push channel: external signals may _accelerate_ a poll but are never load-bearing — a lost nudge costs latency, never correctness. The dashboard's _Retry now_ / _Check now_ buttons call this endpoint directly, and `resume` also applies to `Waiting`.
- **Fail**: `POST /api/v1/{namespace}/workflows/{id}/fail` is a caller's way to give up on a parked workflow (`Requeued` or `Waiting`) instead of waiting for its retries or wait budget to run out. A compare-and-set to `Failed` with the backoff cleared, and a non-retryable `ErrorEntry` — the request's optional `reason`, at most 500 characters — appended to the parked step, so the failure reads exactly like an exhausted retry everywhere (the app side surfaces it through its normal failure path, dependents settle as `DependencyFailed`, `resume` brings it back). Fail is not cancel: cancel withdraws the work and leaves a parked step where it was under a `Canceled` workflow, fail rules on the step's outcome. A workflow the fetch gate claimed first is left alone (409) — an in-flight step is never failed out from under its worker — and so is one already `Failed`: a manual failure is indistinguishable from an engine one, so there is no idempotent replay. Counted as `reason="manual"` on `engine.workflows.execution.failed` and `engine.steps.execution.failed`; keep it out of the default ops alert. The dashboard's _Fail_ button calls this endpoint with a fixed reason naming the dashboard.
- **Mailboxes (request–reply)**: a mailbox (`engine.mailboxes`) is a durable FIFO inbox external messages are delivered into (`engine.mailbox_deliveries`), consumed by **receive workflows** — ordinary workflows declaring `mailbox: { id }` at enqueue, each consuming exactly one position from the mailbox's gapless log and parked as `Held` until the rendezvous releases them (registry: `engine.mailbox_receivers`). The mechanism — mint, deliveries, births, the rendezvous, the closure sweep, retention, limits, settings, metrics — is specified in [`docs/technical-guide.md#mailboxes`](docs/technical-guide.md#mailboxes); the app-side relay saga lives in [the app-lib's `Internal/WorkflowEngine/AGENTS.md`](../../App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md). Invariants to hold — several look wrong at first sight and are not, so do not "fix" them in passing:
    - **Lock discipline**: every mutation of an existing mailbox takes the mailbox row lock before reading anything it decides on; the one compound order is **mailbox row → workflow row**, never the reverse. The close and delivery flushes take that lock over every distinct mailbox their batch names, in one `SELECT … FOR UPDATE` whose `ORDER BY m.id` — not any C# pre-sort — is what makes concurrent flushes deadlock-free, since PostgreSQL sorts before it locks and .NET `Guid` comparison is not `uuid` ordering. Same total order as the enqueue flush's own lock. The enqueue flush locks late and the mint not at all — both deliberate (see the guide's serialization-point section) — but nothing about a receiver's birth is read before the lock. The deadline sweep is not batched: it keeps its own claim and transaction per mailbox, entering the shared closure core with one row.
    - **Batched writes, per-request verdicts**: mint, close and delivery each flush through a `BatchBuffer` (one transaction per flush for close and delivery), and HTTP semantics are unchanged — every verdict is still decided for one request, including the intra-batch fold that answers a repeat as though it had lost the race to its primary. The delivery fold keys on `(mailboxId, namespace, idempotencyKey)`; folding on the bare pair would answer a foreign-namespace request `Duplicate`, inventing a delivery for a mailbox the caller cannot see. A flush takes no `IConcurrencyLimiter` DB slot (so `engine.slots.db.used` no longer reflects the three endpoints' writes, though the deadline sweep and the mailbox reads still take slots) and is not internally retried, so one fault answers its whole batch with a 500 and callers converge by replaying their idempotency key. **The statement saving is load-dependent** — a delivery flush issues a fixed five statements, so at a batch of 1 it costs one statement per delivery more than the bespoke single-message path it replaced, and the saving arrives only once batches form (measured; see [the guide](docs/technical-guide.md#the-saving-arrives-with-the-batches)). Never write it up as unconditional. Nor can `engine.mailbox_buffer.depth` show whether batching is happening: it is a 5 s sample of a queue that drains between flushes, and read 0 throughout a storm accepting 3.86 messages per flush. What does show it is `engine.mailbox_buffer.flushed` (requests) over `engine.mailbox_buffer.batches` (flushes) — the two are recorded together at the one point a batch is known answered, so their ratio is the mean batch size and the crossover is a number an operator can watch.
    - **`Held` is active, timerless, and unfetchable**: absent from the fetch gate's status list, in the **Incomplete/active** set (dependents stay gated, retention never purges it, admission budget is consumed), no lease, no backoff, no timer. Its only exits are the wake and the closure release, each written in the same transaction as its cause — a property proved by transaction id (`xmin`) in tests, never by observation. `NOTIFY` is issued inside the releasing transaction and stays acceleration, never correctness.
    - **An accepted delivery outranks closure**: enqueuing against a closed mailbox is accepted, and a receiver whose position already holds a message is born with it even after closure, so a saga replaying past the deadline drains the backlog instead of dropping it.
    - **Accepted versus kept**: the delivery idempotency lookup runs before the refusals, so a kept message replays `200` even after the mailbox closed — reporting `409` would have a forwarder dead-letter a message waiting to be read. A refusal stores nothing, so its key stays free. The same rule holds on the receiver-enqueue path.
    - **Every receiver registers, not only the parked ones** — the position is the address the executor reads its delivery by; `held_at` null-versus-stamped is the load-bearing distinction, and the release statement's two guards each independently exclude born-runnable rows.
    - **The executor's rendezvous read is lock-free and one snapshot**, re-derived on every attempt and retry — no recorded verdict exists to disagree with the log. The two states the rendezvous cannot produce (`Unregistered`, `Undecided`) fail the step **critically, never retryably** — a retry would launder the invariant violation — and count `engine.mailboxes.rendezvous.violations`: alert on any value above zero.
    - **One closure routine**: `DELETE` and the deadline sweep run the same code, making racing closures first-writer-wins no-ops. The sweep's per-mailbox transaction isolation is load-bearing rather than defensive (a close that threw and escaped would lead every subsequent batch and wedge the sweep), and a tick drains — `SweepBatchSize` bounds the statement, not the tick.
    - **`MailboxSweepInterval` is a term in the callback-token lifetime bound** derived on `MaxMailboxTimeout` and pinned by `CallbackTokenLifetimeInvariantTests` — never retune either alone.
    - **Retention takes only closed mailboxes, children first** — enforced by `ON DELETE RESTRICT`, the schema's only non-cascade FKs; `mailbox_receivers.workflow_id` deliberately carries no FK (the registry row of a purged receiver records a rendezvous that already happened). An overdue **open** mailbox belongs to the sweep, and `engine.mailboxes.open.overdue` reading anything but zero is an alert, not a GC gap.
- **Heartbeat & stale recovery**: `HeartbeatService` proves worker liveness. Stale workflows (expired heartbeat) are automatically reclaimed by another worker. Poisoned workflow protection after configurable max reclaim attempts.
- **Cancellation**: Cross-pod cancellation propagation via DB polling. `CancellationWatcherService` detects pending cancellations for in-flight workflows. For workflows nobody is executing, the fetch gate claims any row with a pending cancellation regardless of its backoff timer (the handler cancels before executing anything), so a cancel that races a retry/deferral write-back never sits out the timer — unsettled dependencies still gate the fetch.
- **Write buffers**: `WorkflowWriteBuffer` batches enqueue operations via a channel-based work queue with configurable batch size, queue depth, and flush concurrency. The three mailbox write paths batch the same way, through the shared `BatchBuffer<TItem, TResult>` base — `MailboxMintBuffer`, `MailboxCloseBuffer`, `MailboxDeliveryBuffer`, configured under `mailboxBuffers` — with the semantics recorded in the mailbox invariants above and in [the guide](docs/technical-guide.md#the-three-write-paths-are-batched). The mailbox queues are bounded and **wait** when full — a caller is delayed, never refused.
- **Telemetry**: OpenTelemetry via OTLP to Grafana LGTM stack. `Metrics.Source` for activities, counters/histograms/gauges for workflow/step lifecycle and resource utilization.

## API Endpoints (provided by Core)

- `GET /api/v1/namespaces` — list distinct namespaces
- `POST /api/v1/{namespace}/workflows` — enqueue workflows, supports batch with dependency graphs. A workflow may declare `mailbox: { id }` to make it a receive workflow — see [Receive workflows](docs/technical-guide.md#receive-workflows) in the technical guide for the birth rules and refusals
- `GET /api/v1/{namespace}/workflows` — cursor-paginated list of workflows. Optional filters: `status` (repeatable, case-insensitive — `Enqueued`, `Processing`, `Requeued`, `Completed`, `Failed`, `Canceled`, `DependencyFailed`, `Abandoned`, `Waiting`, `Held`; omitting it returns all statuses), `label` (repeatable, `key:value`), `collectionKey`, `cursor`, `pageSize` (default 25, max 100). Returns a `PaginatedResponse` (`data`, `pageSize`, `totalCount`, `nextCursor`) or `204 No Content` when nothing matches
- `GET /api/v1/{namespace}/workflows/{workflowId:guid}` — get single workflow with all steps
- `GET /api/v1/{namespace}/workflows/{workflowId:guid}/dependency-graph` — get the connected dependency graph reachable from the workflow (nodes + edges)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/cancel` — request cancellation (idempotent)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/resume` — resume a terminal workflow for re-processing (optional `?cascade=true` to also resume dependents in `DependencyFailed`)
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/nudge` — clear a parked (`Requeued`/`Waiting`) workflow's pending backoff so it is re-executed on the next fetch cycle. 202 Accepted when this call cleared a backoff, idempotent 200 (null `nudgedAt`) when the workflow was parked but already due, 409 when it is not parked, 404 when missing
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/fail` — fail a parked (`Requeued`/`Waiting`) workflow by caller decision, recording the optional body `reason` (≤ 500 characters) as the parked step's final non-retryable error entry. 202 Accepted when this call failed it, 409 when it is not parked (including already `Failed` — no idempotent replay), 404 when missing, 400 for a blank or over-long reason
- `POST /api/v1/{namespace}/workflows/{workflowId:guid}/abandon` — write off an unsuccessful terminal workflow (`Failed`, `Canceled`, `DependencyFailed` → `Abandoned`). Abandoned workflows no longer condemn dependents evaluated after the marking; dependents already in `DependencyFailed` stay put. Atomically releases the enqueue idempotency key, so replaying the same fingerprint creates a fresh workflow instead of deduplicating onto the write-off. Compare-and-set: 202 Accepted when this call wrote off the workflow, 409 on any other non-`Abandoned` state (including a concurrently resumed workflow), idempotent 200 with the original `abandonedAt` when already abandoned, 404 when missing
- `GET /api/v1/{namespace}/collections` — list all collections in the namespace (ordered by most recently updated; heads as bare IDs), or `204 No Content` when none exist
- `GET /api/v1/{namespace}/collections/{key}` — get a single workflow collection by key, including head workflow statuses
- `POST /api/v1/{namespace}/mailboxes` — mint a mailbox, idempotent on `idempotencyKey` per namespace (201 fresh, 200 replay, 429 at the per-collection cap)
- `GET /api/v1/{namespace}/mailboxes/{mailboxId:guid}` — status, deadline, both log counters, and the unpaired-delivery count
- `DELETE /api/v1/{namespace}/mailboxes/{mailboxId:guid}` — close for deliveries and release every parked receiver, in one transaction; terminal and idempotent (202 effected, 200 replay with the original disposal)
- `POST /api/v1/{namespace}/mailboxes/{mailboxId:guid}/deliveries` — deliver one message (202 appended, idempotent 200 on a replayed key, 409 always means _too late_). Full status tables for all four endpoints are in the [technical guide's API reference](docs/technical-guide.md#api-reference)
- Health endpoints: `/api/v1/health` (all checks), `/api/v1/health/ready` (checks tagged `ready`), `/api/v1/health/live`. The versionless `/health`, `/health/ready` and `/health/live` are **301 redirects to `/api/v1/health`** for convenience — never point a probe at them, because a 3xx counts as a pass and the redirect never evaluates the readiness check
- `GET /dashboard/mailboxes` — mailboxes grouped under named collections, each log laid out position by position; a bounded fetch rather than a field on the live SSE stream. Payload and bounds in `src/WorkflowEngine.Core/wwwroot/DASHBOARD_SPEC.md`
- Dashboard SSE/REST endpoints under `/dashboard/*` (see Dashboard docs) — read-only projections; the dashboard's workflow actions go through the `/api/v1` endpoints above

## Docker Compose

Supporting services for local development. Without a profile, compose starts those alone and the
engine runs on the host against them; the one profile, `core`, adds an engine host built from this
folder. `make dev` / `make run` / `make stop` / `make reset` wrap the compose invocations — use the
`/docker` skill for the details.

| Container                 | Port             | Purpose                                    |
| ------------------------- | ---------------- | ------------------------------------------ |
| `workflow-engine-testapp` | 9090             | Engine host, `core` profile only           |
| `postgres`                | 9543             | Database                                   |
| `pgadmin`                 | 5050             | PostgreSQL admin UI                        |
| `lgtm`                    | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `blackbox-exporter`       | —                | Prometheus blackbox exporter               |
| `postgres-exporter`       | 9187             | Prometheus PostgreSQL exporter             |
| `wiremock`                | 6060             | Mock app callbacks                         |

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
