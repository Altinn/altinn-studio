# Workflow Engine — Technical Guide

This document is aimed at internal developers who need to understand, integrate with, or extend the Workflow Engine.

## Table of Contents

- [Workflow Engine — Technical Guide](#workflow-engine--technical-guide)
    - [Table of Contents](#table-of-contents)
    - [Overview](#overview)
    - [Architecture](#architecture)
    - [Project Structure](#project-structure)
    - [Hosting Model](#hosting-model)
    - [Workflow Lifecycle](#workflow-lifecycle)
    - [Command System](#command-system)
    - [Retry \& Error Handling](#retry--error-handling)
    - [Concurrency Model](#concurrency-model)
    - [Heartbeat \& Stale Recovery](#heartbeat--stale-recovery)
    - [Cancellation](#cancellation)
    - [Resume](#resume)
    - [Abandon](#abandon)
    - [Dependency Graphs](#dependency-graphs)
    - [Telemetry \& Observability](#telemetry--observability)
    - [Dashboard](#dashboard)
    - [API Reference](#api-reference)
    - [Health Checks](#health-checks)
    - [Configuration](#configuration)
    - [Testing](#testing)
    - [Creating a New Host](#creating-a-new-host)
    - [The App Layer: `WorkflowEngine.App`](#the-app-layer-workflowengineapp)

---

## Overview

The Workflow Engine is an asynchronous workflow orchestration service. It accepts workflow requests, queues them in PostgreSQL, and executes each step sequentially with at-least-once delivery, automatic retries, idempotency, and distributed tracing. Failed workflows are always left in an explicit error state — never silently lost.

Built on .NET 10, PostgreSQL, and OpenTelemetry.

## Architecture

The engine is a **reusable class library**, not a standalone application. Hosts compose it via extension methods and add their own domain-specific commands.

```
┌──────────────────────────────────────────────────┐
│                Host Application                  │
│            (e.g. WorkflowEngine.App)             │
│                                                  │
│  Program.cs:                                     │
│    builder.AddWorkflowEngine(connectionString)   │
│    builder.Services.AddCommand<AppCommand>()     │
│    app.UseWorkflowEngine()                       │
└──────────────────────┬───────────────────────────┘
                       │ references
┌──────────────────────▼───────────────────────────┐
│              WorkflowEngine.Core                 │
│                                                  │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Processor  │  │ Executor │  │  Endpoints   │  │
│  │ (bg loop)  │──│          │  │  (API/Dash)  │  │
│  └─────┬──────┘  └────┬─────┘  └──────────────┘  │
│        │              │                          │
│  ┌─────▼──────┐  ┌────▼─────┐  ┌──────────────┐  │
│  │   Data     │  │ Commands │  │  Telemetry   │  │
│  │ (Postgres) │  │ Registry │  │ (OTel/OTLP)  │  │
│  └────────────┘  └──────────┘  └──────────────┘  │
│                                                  │
│  ┌────────────┐  ┌──────────┐                    │
│  │ Resilience │  │  Models  │                    │
│  │ (Limiter)  │  │          │                    │
│  └────────────┘  └──────────┘                    │
└──────────────────────────────────────────────────┘
```

- **Database is the single source of truth** — no in-memory queue. The processor fetches work from PostgreSQL using `FOR UPDATE SKIP LOCKED`.
- **Horizontal scaling** — multiple engine instances can run against the same database. Row-level locking prevents double-processing.
- **Pluggable commands** — the engine knows nothing about what it's executing. Commands are registered via DI and looked up by type string.

## Project Structure

| Project                     | Purpose                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `WorkflowEngine.Core`       | Processing loop, HTTP endpoints, executor, host composition extensions                |
| `WorkflowEngine.Commands`   | Built-in commands (WebhookCommand). Host-specific commands live in their own projects |
| `WorkflowEngine.Models`     | Domain models: `Workflow`, `Step`, `CommandDefinition`, status enums, exceptions      |
| `WorkflowEngine.Data`       | EF Core persistence, `IEngineRepository`, PostgreSQL implementation                   |
| `WorkflowEngine.Resilience` | `IConcurrencyLimiter` (DB/HTTP/Worker semaphore pools), `RetryStrategy`               |
| `WorkflowEngine.Telemetry`  | OpenTelemetry counters, histograms, observable gauges, activity source                |
| `WorkflowEngine.TestKit`    | Reusable integration test infrastructure: fixtures, API client, test helpers          |

## Hosting Model

Two extension methods compose the engine into a host:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.AddWorkflowEngine(connectionString);        // registers all core services
builder.Services.AddCommand<MyCustomCommand>();     // host-specific commands

var app = builder.Build();
await app.UseWorkflowEngine();                      // middleware, endpoints, migrations
await app.RunAsync();
```

`AddWorkflowEngine()` registers core services, health checks, OpenTelemetry, OpenAPI, HttpClientFactory, and the built-in WebhookCommand.

`UseWorkflowEngine()` configures the middleware pipeline, maps API and dashboard endpoints, and applies EF Core migrations.

## Workflow Lifecycle

```
                    ┌──────────┐
                    │ Enqueued │
                    └────┬─────┘
                         │ processor picks up
                    ┌────▼──────┐
              ┌─────│Processing │───────┐
              │     └─────┬─────┘       │
              │           │             │
         all steps    step fails   cancellation
          succeed    (exhausted)    requested
              │           │             │
        ┌─────▼───┐   ┌───▼───┐   ┌─────▼────┐
        │Completed│   │Failed │   │ Canceled │
        └─────────┘   └───────┘   └──────────┘
```

Additional states:

- **DependencyFailed** — a dependency workflow failed
- **Requeued** — a retryable error occurred; the workflow returns to the queue with a backoff delay
- **Abandoned** — an unsuccessful terminal workflow whose failure a caller explicitly wrote off. See [Abandon](#abandon).

Terminal workflows (Failed, Canceled, DependencyFailed, Abandoned) can be **resumed** back to Enqueued via the resume API. See [Resume](#resume).

### Processing Loop

The `WorkflowProcessor` (`BackgroundService`) runs continuously:

1. Check available worker slots
2. `FetchAndLockWorkflows()` — atomic PostgreSQL query using `FOR UPDATE SKIP LOCKED`
3. For each workflow, spawn a fire-and-forget task through `WorkflowHandler`
4. `WorkflowHandler` iterates steps in order, calling `WorkflowExecutor.Execute()` for each
5. On completion/failure, update status and release the worker slot

Stale workflows (crashed workers) are automatically reclaimed — see [Heartbeat & Stale Recovery](#heartbeat--stale-recovery).

## Command System

Commands define what happens when a step is executed.

### ICommand Interface

```csharp
public interface ICommand
{
    string CommandType { get; }           // e.g. "webhook", "app"
    Type? CommandDataType { get; }        // typed payload schema
    Type? WorkflowContextType { get; }    // typed workflow context

    CommandValidationResult Validate(object? data, object? context);
    Task<ExecutionResult> Execute(CommandExecutionContext context, CancellationToken ct);
}
```

Base classes `Command<TData, TContext>` and `Command<TData>` provide typed overrides.

### Built-in: WebhookCommand

Executes HTTP requests (GET or POST). Response classification:

| Response      | Classification | Action             |
| ------------- | -------------- | ------------------ |
| 2xx           | Success        | Next step          |
| 408, 429, 5xx | Retryable      | Retry with backoff |
| Other 4xx     | Critical       | Fail immediately   |

### Registration

```csharp
builder.Services.AddCommand<WebhookCommand>();   // done by Core automatically
builder.Services.AddCommand<AppCommand>();       // host adds its own
```

The `CommandRegistry` maps type strings to `ICommand` singletons. Commands validate their data at **enqueue time** — invalid requests are rejected before anything is persisted.

### ExecutionResult

| Result                                    | Meaning                      |
| ----------------------------------------- | ---------------------------- |
| `ExecutionResult.Success()`               | Step completed               |
| `ExecutionResult.RetryableError(message)` | Transient failure — retry    |
| `ExecutionResult.CriticalError(message)`  | Permanent failure — no retry |

### State Passing

Each step's `StateOut` becomes the next step's `StateIn`:

```
Step 1 (validate) → StateOut: {"validated": true}
Step 2 (sign)     → StateIn:  {"validated": true}  →  StateOut: {"signed": true}
Step 3 (confirm)  → StateIn:  {"signed": true}
```

### State Inheritance Across Dependencies

State normally stays within one workflow: the first step receives the workflow's own `state` from the
enqueue request, and later steps receive the previous step's `StateOut`. A workflow can instead opt in to
starting from a dependency's **final** state with `inheritStateFrom` on the enqueue request:

```jsonc
{
    "workflows": [
        { "ref": "main", "operationId": "op-main", "state": "{...}", "steps": [ ... ] },
        {
            "ref": "side",
            "operationId": "op-side",
            "dependsOn": ["main"],
            "inheritStateFrom": "main", // batch ref or persisted database ID
            "steps": [ ... ]
        }
    ]
}
```

Rules:

- `inheritStateFrom` is **mutually exclusive** with `state`, and must reference one of the workflow's own
  `dependsOn` entries — only a dependency is guaranteed to be terminal before the workflow starts.
- Resolution happens when the workflow starts executing: if the source workflow `Completed`, its final
  state (last step-produced `StateOut`, falling back to its initial state) becomes this workflow's
  initial state. The persisted `initial_state` column is never rewritten; resolution is deterministic on
  retries because a terminal workflow's state is immutable.
- If the source did **not** complete successfully (e.g. it was `Abandoned` and this workflow was released
  anyway), the workflow runs with a null initial state.
- A transient lookup failure requeues the workflow (with a backoff) instead of failing it.
- The resolved source id is exposed as `inheritStateFromWorkflowId` in workflow status responses.

One deliberate semantic difference from intra-workflow state chaining: within a workflow, a step whose
predecessors never produced any `StateOut` receives **null** — not the workflow's initial state. The
inheritance fallback is different: a `Completed` source whose steps never produced state hands the
inheritor the source's **initial state** ("the workflow started with state X and nothing changed it, so
its final state is X"). So for a stateless-step source, an inheriting workflow sees the source's initial
state where a step appended to the source itself would have seen null. If your inheriting steps must
behave exactly like appended steps, ensure the source's steps always emit `StateOut` (commands that pass
state through unchanged, as the app callback commands do, make the two views identical).

The canonical use is a fire-and-forget side chain (`IsHead = false`, see
[workflow-collections.md](workflow-collections.md)) that continues from the main workflow's evolved state
without blocking the collection frontier.

## Retry & Error Handling

### RetryStrategy

Per-step, configurable:

| Field          | Purpose                                      |
| -------------- | -------------------------------------------- |
| `BackoffType`  | `Exponential`, `Linear`, or `Constant`       |
| `BaseInterval` | Initial delay                                |
| `MaxRetries`   | Max retry count (optional)                   |
| `MaxDelay`     | Cap on individual delay (optional)           |
| `MaxDuration`  | Total deadline from first attempt (optional) |

**Default**: Exponential, 1s base, 5m max delay, 24h deadline.

### Backoff Calculation

| Type        | Formula                  | Example (1s base)                      |
| ----------- | ------------------------ | -------------------------------------- |
| Constant    | `base`                   | 1s, 1s, 1s...                          |
| Linear      | `base × iteration`       | 1s, 2s, 3s...                          |
| Exponential | `base × 2^(iteration-1)` | 1s, 2s, 4s, 8s... (capped at MaxDelay) |

### Failure Outcomes

When a workflow fails:

1. Step marked `Failed` with error details recorded in `ErrorHistory`
2. Workflow marked `Failed`
3. Dependent workflows marked `DependencyFailed`
4. All visible via API, dashboard, and telemetry

## Concurrency Model

Three independent semaphore pools via `IConcurrencyLimiter`:

| Pool          | Default | Purpose                              |
| ------------- | ------- | ------------------------------------ |
| Workers       | 400     | Concurrent workflow processing tasks |
| DB Operations | 90      | PostgreSQL connection slots          |
| HTTP Calls    | 400     | Outbound HTTP requests               |

When `ActiveWorkflowCount` ≥ `BackpressureThreshold` (default: 500,000), the engine returns HTTP 429 on enqueue requests.

## Heartbeat & Stale Recovery

If a worker crashes mid-processing, the `HeartbeatService` enables recovery:

1. Workers update `HeartbeatAt` for all in-flight workflows on a regular interval (default: 10s)
2. The processor detects stale workflows where the heartbeat has expired (default threshold: 30s)
3. Stale workflows are reclaimed — reset to `Enqueued` and retried
4. After `MaxReclaimCount` (default: 5) reclaim attempts, the workflow is marked `Failed`

This enables safe horizontal scaling: if Instance A crashes, Instance B reclaims its work.

## Cancellation

```http
POST /api/v1/{namespace}/workflows/{workflowId}/cancel
```

1. Sets `CancellationRequestedAt` in the database (durable, atomic — this is the source of truth)
2. `CancellationWatcherService` polls for pending cancellations
3. In-flight workflows receive a cancellation token signal
4. `WorkflowHandler` catches the cancellation and marks the workflow `Canceled`

Cancellation is **idempotent** — multiple calls return the original timestamp.

### Immediate vs. distributed cancellation

Setting the database flag always succeeds atomically, but _when_ the workflow actually stops depends on where it is running. The `canceledImmediately` field in the response distinguishes the two paths:

- **Immediate (`canceledImmediately: true`)** — the pod that received the cancel request is the same pod currently executing the workflow. Its `CancellationTokenSource` is triggered synchronously before the response returns, aborting the running step's in-flight work (e.g. the outbound HTTP call) right away. Sub-second, bounded only by how promptly the command honors its token.
- **Distributed (`canceledImmediately: false`)** — the flag is set, but the workflow isn't in the receiving pod's in-flight set. It is either:
    - **running on another pod** — picked up by that pod's `CancellationWatcherService` on its next tick (`CancellationWatcherInterval`, default 2s), or
    - **not yet started** (Enqueued/Requeued) — finalized as `Canceled` the next time the processor fetches it, without executing any step.

In all cases the database flag guarantees the workflow _will_ be canceled; `canceledImmediately` only reports whether the interrupt was delivered in-process during the call. A `202` response means this call requested the cancellation; a `200` means cancellation was already pending (idempotent re-request).

## Resume

Terminal workflows (Failed, Canceled, DependencyFailed, Abandoned) can be resumed for re-processing:

```http
POST /api/v1/{namespace}/workflows/{workflowId}/resume?cascade=false
```

1. Resets the workflow to `Enqueued`, clearing `CancellationRequestedAt`, `BackoffUntil`, `HeartbeatAt`, and `ReclaimCount`
2. Resets all non-completed steps to `Enqueued`
3. The processor picks up the workflow on its next cycle

When `cascade=true`, all transitively dependent workflows in `DependencyFailed` state are also resumed. This is useful when a parent workflow's failure cascaded to its children — resuming the parent with cascade fixes the entire chain.

**Response (202 Accepted):** the workflow is back in `Enqueued`; the processor picks it up on its next cycle.

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "resumedAt": "2026-03-19T10:02:00+00:00",
    "cascadeResumed": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

Returns 404 if the workflow does not exist, or 409 if it is not in a resumable state (e.g. `Completed` or `Processing`).

## Abandon

An unsuccessful terminal workflow (`Failed`, `Canceled`, `DependencyFailed`) can be **abandoned** — its failure is explicitly written off by a caller:

```http
POST /api/v1/{namespace}/workflows/{workflowId}/abandon
```

Dependency edges carry two things: sequencing (a dependent waits until its dependencies are terminal) and outcome gating (a failed dependency condemns dependents to `DependencyFailed`). Abandoning removes only the gating, prospectively:

- **New work can build past it.** A workflow enqueued afterwards with a dependency on the abandoned workflow runs normally — `Abandoned` is terminal but not a failure for dependency evaluation.
- **Existing consequences stand.** Dependents already in `DependencyFailed` stay put as historical record; they expressed a success-required dependency that was never satisfied, and the dependency-recovery sweep only releases them when every dependency is `Completed`. If a written-off casualty should also be built past, abandon it too.
- **It is not a tombstone.** An abandoned workflow can still be resumed; if it then completes, parked `DependencyFailed` dependents recover via the sweep as usual.
- **The enqueue fingerprint is released.** Abandoned means the action may be retried: atomically with the transition, the idempotency key of the request that created the workflow is deleted, so replaying the same fingerprint — even with an identical body — creates and runs a fresh workflow (`201 Created`) instead of deduplicating onto the write-off or conflicting. For batch enqueues the key covers the whole batch, so abandoning any member releases the fingerprint for all of them (the surviving members themselves are untouched).

The canonical use is superseding a failed predecessor: mark the failed workflow `Abandoned`, then enqueue its replacement with an ordinary dependency on it (consuming the collection head as usual). The graph stays fully connected — the write-off lives in the node's state, not in special edge semantics.

**Response (202 Accepted):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "abandonedAt": "2026-03-19T10:02:00+00:00"
}
```

The transition is a compare-and-set from the three source states: 202 Accepted when this call wrote off the workflow, 404 if the workflow does not exist, 409 if it is in any other non-`Abandoned` state — including when a concurrent resume revived it first, which is exactly the race the CAS exists to catch. Abandoning an already-abandoned workflow is an idempotent 200 that reports the original `abandonedAt`.

## Dependency Graphs

### Within a Single Request (DAG)

Use `ref` + `dependsOn` for arbitrary dependency graphs:

```json
{
  "workflows": [
    { "ref": "A", "operationId": "op-a", "steps": [...] },
    { "ref": "B", "operationId": "op-b", "dependsOn": ["A"], "steps": [...] },
    { "ref": "C", "operationId": "op-c", "dependsOn": ["A"], "steps": [...] },
    { "ref": "D", "operationId": "op-d", "dependsOn": ["B", "C"], "steps": [...] }
  ]
}
```

The engine resolves refs via topological sort (Kahn's algorithm), detects cycles, and inserts atomically. When a workflow fails, dependents are marked `DependencyFailed`.

### Across Requests

Reference previously-enqueued workflows by database ID:

```json
{ "ref": "new-workflow", "dependsOn": ["local-ref", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"] }
```

## Telemetry & Observability

OpenTelemetry data exported via OTLP, designed for Grafana (Tempo + Prometheus).

### Metrics

| Type       | Examples                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Counters   | `engine.workflows.request.received`, `.execution.success`, `.failed`, `.requeued`, `.reclaimed`  |
| Histograms | `engine.workflows.time.queue`, `.time.service`, `.time.total` (also per step)                    |
| Gauges     | `engine.workflows.active`, `.scheduled`, `.failed`; `engine.slots.workers.*`, `.db.*`, `.http.*` |

### Traces

Activity source `WorkflowEngine` with spans for workflow handling, step execution, command callbacks, and resource acquisition. Workflows carry W3C `DistributedTraceContext` for cross-service correlation.

## Dashboard

Real-time monitoring UI (vanilla JS, no build step), embedded in `WorkflowEngine.Core`.

- SSE streams for engine health and active workflows
- Visual step pipeline with status colors
- Step detail modal (command, retry strategy, trace ID, errors)
- State evolution viewer
- Grafana Tempo click-through links
- Paginated query interface with namespace/status/label filters

## API Reference

### Enqueue Workflows

```http
POST /api/v1/{namespace}/workflows?idempotencyKey=process-next-abc123&collectionKey=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Request:**

```json
{
    "labels": {
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": "50001234",
        "instanceGuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "context": {
        "actor": { "orgId": "12345678901" },
        "lockToken": "lock-token-from-app",
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": 50001234,
        "instanceGuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "workflows": [
        {
            "ref": "validate-and-sign",
            "operationId": "process-task-2",
            "steps": [
                {
                    "operationId": "validate-form",
                    "command": {
                        "type": "app",
                        "data": { "commandKey": "ValidateFormData" }
                    }
                },
                {
                    "operationId": "generate-pdf",
                    "command": {
                        "type": "app",
                        "data": { "commandKey": "GeneratePdf" }
                    },
                    "retryStrategy": {
                        "backoffType": "Exponential",
                        "baseInterval": "00:00:02",
                        "maxDelay": "00:05:00",
                        "maxDuration": "01:00:00"
                    }
                },
                {
                    "operationId": "notify-complete",
                    "command": {
                        "type": "webhook",
                        "data": {
                            "uri": "https://hooks.example.com/workflow-done",
                            "method": "POST"
                        }
                    }
                }
            ]
        }
    ]
}
```

**Response (201 Created):**

```json
{
    "workflows": [
        {
            "ref": "validate-and-sign",
            "databaseId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "namespace": "ttd:my-app"
        }
    ]
}
```

**Response (200 OK — duplicate idempotency key):**

Same shape. The original workflow is returned, no new workflow is created. This dedup guarantee lasts for the key row's lifetime: it ends when retention purges the key, or immediately when a workflow it created is [abandoned](#abandon) — the abandon releases the fingerprint so the request can be retried as new work.

**Response (400 Bad Request — validation failure):**

```json
{
    "message": "Command validation failed for step 'validate-form': commandKey is required"
}
```

### Get Single Workflow

```http
GET /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Response (200 OK):**

```json
{
    "databaseId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "collectionKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "operationId": "process-task-2",
    "idempotencyKey": "process-next-abc123",
    "namespace": "ttd:my-app",
    "createdAt": "2026-03-19T10:00:00+00:00",
    "updatedAt": "2026-03-19T10:00:05+00:00",
    "overallStatus": "Completed",
    "labels": {
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": "50001234",
        "instanceGuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "steps": [
        {
            "databaseId": "c1d2e3f4-a5b6-7890-cdef-123456789abc",
            "operationId": "validate-form",
            "processingOrder": 0,
            "updatedAt": "2026-03-19T10:00:02+00:00",
            "command": { "type": "app" },
            "status": "Completed",
            "retryCount": 0
        },
        {
            "databaseId": "d2e3f4a5-b6c7-8901-defg-23456789abcd",
            "operationId": "generate-pdf",
            "processingOrder": 1,
            "updatedAt": "2026-03-19T10:00:04+00:00",
            "command": { "type": "app" },
            "status": "Completed",
            "retryCount": 1,
            "retryStrategy": {
                "backoffType": "Exponential",
                "baseInterval": "00:00:02",
                "maxDelay": "00:05:00",
                "maxDuration": "01:00:00"
            }
        },
        {
            "databaseId": "e3f4a5b6-c7d8-9012-efgh-3456789abcde",
            "operationId": "notify-complete",
            "processingOrder": 2,
            "updatedAt": "2026-03-19T10:00:05+00:00",
            "command": { "type": "webhook" },
            "status": "Completed",
            "retryCount": 0
        }
    ]
}
```

### List Workflows

```http
GET /api/v1/{namespace}/workflows
```

Supports the following optional query parameters (all repeatable params can be supplied multiple times):

| Parameter       | Repeatable | Description                                                                                                                                                                                                                    |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`        | Yes        | Filter by workflow status. Case-insensitive. One of `Enqueued`, `Processing`, `Requeued`, `Completed`, `Failed`, `Canceled`, `DependencyFailed`, `Abandoned`. Omit to return all statuses; an unrecognized value returns `400 Bad Request`. |
| `label`         | Yes        | Filter by label, formatted as `key:value`. Entries without a `:` are ignored.                                                                                                                                                  |
| `collectionKey` | No         | Filter to a single collection.                                                                                                                                                                                                 |
| `cursor`        | No         | Pagination cursor — pass the `nextCursor` from the previous response to fetch the next page.                                                                                                                                   |
| `pageSize`      | No         | Items per page. Defaults to 25, clamped to the range 1–100.                                                                                                                                                                    |

Filter by status — e.g. all failed workflows (combine values to widen the set):

```http
GET /api/v1/ttd:my-app/workflows?status=Failed&status=DependencyFailed
```

Filter by labels (repeated `label` param, `key:value` format):

```http
GET /api/v1/ttd:my-app/workflows?label=org:ttd&label=app:my-app
```

Find all workflows for a specific collection via collectionKey:

```http
GET /api/v1/ttd:my-app/workflows?collectionKey=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Or combine filters — e.g. all failed workflows for a specific instance owner:

```http
GET /api/v1/ttd:my-app/workflows?status=Failed&label=instanceOwnerPartyId:50001234
```

**Response (200 OK):** a cursor-paginated `PaginatedResponse` wrapping `WorkflowStatusResponse` items (each the same shape as the single workflow GET above). Returns `204 No Content` when no workflows match.

```json
{
    "data": [
        /* WorkflowStatusResponse items */
    ],
    "pageSize": 25,
    "totalCount": 142,
    "nextCursor": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

Paginate by passing `nextCursor` back as `?cursor=`. A `null` `nextCursor` indicates the last page.

### Cancel Workflow

```http
POST /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancel
```

**Response (202 Accepted):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "cancellationRequestedAt": "2026-03-19T10:01:00+00:00",
    "canceledImmediately": true
}
```

`canceledImmediately` reports whether the interrupt was delivered synchronously (the receiving pod was running the workflow) or whether it will be applied via the distributed path — see [Immediate vs. distributed cancellation](#immediate-vs-distributed-cancellation). Returns `200 OK` instead when cancellation was already pending (idempotent replay), `409 Conflict` when the workflow is already terminal, and `404 Not Found` when it doesn't exist.

### Resume Workflow

```http
POST /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479/resume?cascade=true
```

**Response (202 Accepted):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "resumedAt": "2026-03-19T10:02:00+00:00",
    "cascadeResumed": []
}
```

### List Collections

Lists all collections in the namespace, ordered by most recently updated. Each entry carries its head workflow IDs as bare GUIDs (not status-enriched — use **Get Collection** below for head statuses).

```http
GET /api/v1/{namespace}/collections
```

**Response (200 OK):** an array of collection summaries. Returns `204 No Content` when the namespace has no collections.

```json
[
    {
        "key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "namespace": "ttd:my-app",
        "heads": ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
        "createdAt": "2026-03-19T10:00:00+00:00",
        "updatedAt": "2026-03-19T10:00:05+00:00"
    }
]
```

### Get Collection

```http
GET /api/v1/{namespace}/collections/{key}
```

**Response (200 OK):** a single collection with its head workflow statuses, or `404 Not Found` when the key is unknown in the namespace.

```json
{
    "key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "namespace": "ttd:my-app",
    "heads": [{ "databaseId": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "status": "Completed" }],
    "createdAt": "2026-03-19T10:00:00+00:00",
    "updatedAt": "2026-03-19T10:00:05+00:00"
}
```

## Health Checks

```
GET /health        — basic health
GET /health/ready  — readiness (includes DB + engine status)
GET /health/live   — liveness
```

| Flag                      | Health Result |
| ------------------------- | ------------- |
| `Running + Healthy`       | Healthy       |
| `QueueFull` or `Disabled` | Degraded      |
| `Unhealthy` or `Stopped`  | Unhealthy     |

Response includes worker counts, connection pool utilization, and queue depths.

## Configuration

All via `EngineSettings` (bound from `appsettings.json`):

### Processing

| Setting                     | Default                  | Description                            |
| --------------------------- | ------------------------ | -------------------------------------- |
| `MaxWorkflowsPerRequest`    | —                        | Max workflows in a single enqueue call |
| `MaxStepsPerWorkflow`       | —                        | Max steps per workflow                 |
| `MaxLabels`                 | —                        | Max label key-value pairs              |
| `DefaultStepCommandTimeout` | 100s                     | Per-step execution timeout             |
| `DefaultStepRetryStrategy`  | Exponential(1s, 5m, 24h) | Default retry strategy                 |

### Heartbeat & Recovery

| Setting                       | Default | Description                                |
| ----------------------------- | ------- | ------------------------------------------ |
| `HeartbeatInterval`           | 10s     | Worker liveness proof interval             |
| `StaleWorkflowThreshold`      | 30s     | Time before a workflow is considered stale |
| `MaxReclaimCount`             | 5       | Reclaim attempts before marking as failed  |
| `CancellationWatcherInterval` | 2s      | Cross-pod cancellation poll interval       |

### Concurrency

| Setting                             | Default | Description                          |
| ----------------------------------- | ------- | ------------------------------------ |
| `Concurrency.MaxWorkers`            | 400     | Concurrent workflow processing tasks |
| `Concurrency.MaxDbOperations`       | 90      | DB connection pool limit             |
| `Concurrency.MaxHttpCalls`          | 400     | Outbound HTTP request limit          |
| `Concurrency.BackpressureThreshold` | 500,000 | Active workflow count before 429     |

### Write Buffer

| Setting                        | Default | Description                |
| ------------------------------ | ------- | -------------------------- |
| `WriteBuffer.MaxBatchSize`     | 100     | Workflows per batch insert |
| `WriteBuffer.MaxQueueSize`     | 10,000  | Channel buffer size        |
| `WriteBuffer.FlushConcurrency` | 10      | Concurrent batch flushers  |

## Testing

### TestKit

`WorkflowEngine.TestKit` provides reusable infrastructure:

- **`EngineAppFixture<TProgram>`** — shared fixture with PostgreSQL (Testcontainers), WireMock, and `WebApplicationFactory`
- **`EngineApiClient`** — typed HTTP client with `WaitForWorkflowStatusAsync`, `PollUntilAsync`
- **`TestHelpers`** — builders for workflows, steps, and enqueue requests
- **`TelemetryCollector`** — in-process OpenTelemetry collector for assertions

### Running Tests

```sh
dotnet test
```

No Docker Compose needed — Testcontainers manages all container lifecycle.

### Example

```csharp
[Collection("AppTests")]
public class MyTests(AppTestFixture fixture)
{
    [Fact]
    public async Task Workflow_completes_successfully()
    {
        var request = fixture.Helpers.CreateEnqueueRequest(/* ... */);
        var response = await fixture.Client.EnqueueWorkflow(request, TestContext.Current.CancellationToken);

        var completed = await fixture.Client.WaitForWorkflowStatusAsync(
            response.WorkflowId,
            WorkflowStatus.Completed,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(WorkflowStatus.Completed, completed.Status);
    }
}
```

## Creating a New Host

### 1. Create the Project

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <ProjectReference Include="path/to/WorkflowEngine.Core/WorkflowEngine.Core.csproj" />
  </ItemGroup>
</Project>
```

### 2. Define Your Command

```csharp
public sealed class MyCommand : Command<MyCommandData>
{
    public override string CommandType => "my-command";

    public override CommandValidationResult Validate(MyCommandData? data)
    {
        if (string.IsNullOrWhiteSpace(data?.Target))
            return CommandValidationResult.Invalid("target is required");
        return CommandValidationResult.Valid();
    }

    public override async Task<ExecutionResult> Execute(
        CommandExecutionContext context, CancellationToken ct)
    {
        var response = await httpClient.PostAsync(data.Target, content, ct);

        return response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.RetryableError($"HTTP {response.StatusCode}");
    }
}
```

### 3. Compose in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException("Missing connection string");

builder.AddWorkflowEngine(connectionString);
builder.Services.AddCommand<MyCommand>();

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();
```

### 4. Write Tests

```csharp
public class MyTestFixture : EngineAppFixture<Program>
{
    protected override void ConfigureBuilder(IWebHostBuilder builder)
    {
        // Add test-specific configuration
    }
}
```

---

## The App Layer: `WorkflowEngine.App`

The `workflow-engine-app` project is the Altinn-specific host. It adds `AppCommand` — an HTTP callback command targeting Altinn apps.

### AppCommand

- **Type string**: `"app"`
- **Data**: `AppCommandData` — `{ commandKey, payload? }`
- **Context**: `AppWorkflowContext` — `{ actor, lockToken, org, app, instanceOwnerPartyId, instanceGuid }`
- **Execution**: HTTP POST to a templated URL expanded from the workflow context

### Error Classification

| HTTP Response | Classification      |
| ------------- | ------------------- |
| 2xx           | Success             |
| 408, 418, 429 | Retryable           |
| 5xx           | Retryable           |
| Other 4xx     | Critical — no retry |

### State Passing

AppCommand reads `{ "state": "..." }` from the response body and stores it as `step.StateOut`. The next step receives it as `state` in its callback payload.

### Configuration

```json
{
    "AppCommandSettings": {
        "ApiKey": "your-api-key",
        "CommandEndpoint": "http://host/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks"
    }
}
```

Placeholders are expanded from `AppWorkflowContext` at execution time.

### Callback Authentication

Callbacks into an Altinn app are secured with a JWT that the **app** mints and the **engine** relays — the engine never issues credentials of its own:

1. **At enqueue time**, the app mints a short-lived JWT signed with a `WorkflowEngineCallback` app-code. The `jti` claim is set to the instance guid, and the token's lifetime is bound to the signing code's expiry.
2. The token rides through the engine opaquely in `AppWorkflowContext.CallbackToken`. The engine stores it and **replays it on every callback** in the `Authorization: Bearer` header.
3. **On each callback**, the app validates the token's signature and lifetime against its `WorkflowEngineCallback` codes, and checks that `jti` matches the `instanceGuid` in the route — so a token can only act on its own instance.

Because the callback bearer token shares the `Authorization` header with platform (JwtCookie) auth, a selector-policy scheme routes only callback requests to the `WorkflowEngineCallback` scheme and everything else to the default scheme, avoiding collisions.

Data writes performed during callbacks run as `StorageAuthenticationMethod.ServiceOwner()`. This is why an app's `policy.xml` must grant ServiceOwner write rights on all tasks.
