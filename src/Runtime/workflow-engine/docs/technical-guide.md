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
    - [Deferral (Durable Yield)](#deferral-durable-yield)
    - [Concurrency Model](#concurrency-model)
    - [Heartbeat \& Stale Recovery](#heartbeat--stale-recovery)
    - [Cancellation](#cancellation)
    - [Resume](#resume)
    - [Abandon](#abandon)
    - [Nudge](#nudge)
    - [Failure-Storm Throttling](#failure-storm-throttling)
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

## Deferral (Durable Yield)

Some work is "start now, confirm eventually": an eFormidling shipment, a payment capture, a signing
order. The outcome arrives on someone else's schedule, and the only honest thing a step can say is
*"I ran fine; the answer isn't ready yet."* That is a **deferral** — not a failure, and not a retry.

```csharp
return ExecutionResult.Defer(TimeSpan.FromMinutes(5), "delivery not confirmed yet");
```

The engine parks the step in `Waiting` and schedules its next execution through the workflow's
`backoff_until` — the same durable timer `StartAt` rides on. A parked workflow holds **no lease, no
worker slot and no HTTP slot**; it is simply a row the fetch gate will not claim until its timer
elapses. `Waiting` is non-terminal and counts as *active*: consumers must never read a parked
workflow as settled.

The reason string is persisted as the step's `lastDeferReason` (overwritten on every deferral,
cleared on resume) and surfaced wherever the wait is visible: the step on workflow status reads,
and `waitingReason` on a `Waiting` collection head — populated only while the head is parked, so a
consumer never sees a stale reason. Phrase it for a reader: it is the one place a waiting step gets
to say, in its own words, what it is waiting for.

Deferrals are kept rigorously separate from errors:

| | Retryable error | Deferral |
| --- | --- | --- |
| Status | `Requeued` | `Waiting` |
| `ErrorHistory` | Appends an entry | Records nothing |
| `RequeueCount` | Incremented | **Reset to 0** |
| Metric | `engine.steps.execution.requeued` | `engine.steps.execution.deferred` |
| Bounded by | `RetryStrategy` | The step's wait budget |

Resetting `RequeueCount` is deliberate: retries bound *consecutive errors between* deferrals, not
errors across the step's whole lifetime. A poll that fails transiently, recovers, and then polls for
another six hours should not arrive at hour six with its retry budget already spent.

### Two vocabularies, on purpose

`Defer`/`Deferred` is what a **command returns**; `Waiting` is the **state the engine puts the step
in**. The same split already exists for failures — a command returns `RetryableError`, the engine
records `Requeued` — and it is worth keeping: the command describes its own outcome, the engine
describes what it did about it. So counters count the event (`engine.steps.execution.deferred`) while
the gauge measures the state (`engine.workflows.waiting`).

### Three separate clocks

Each bounds a different thing, and none of them substitutes for another:

| Clock | Bounds | Anchored at | Default | A command reads |
| --- | --- | --- | --- | --- |
| `command.maxExecutionTime` | One execution attempt | Attempt start | 100s | `ExecutionDeadline` |
| `RetryStrategy` | A run of consecutive *errors* | `Step.LastDeferredAt`, else the previous step | 24h / unlimited retries | `Step.RequeueCount` |
| `command.waitBudget` | Cumulative time spent *waiting* | `Step.FirstDeferredAt` | 24h | `Step.DeferCount` + `WaitDeadline` |

Each clock is observable from `CommandExecutionContext`, one field per clock, so a command can pace
itself against the same limits the engine will enforce instead of guessing at them. Both deadlines are
absolute instants rather than remaining durations: a duration starts aging the moment it is computed,
and a command that receives one across a network boundary (as the Altinn app callback does) cannot tell
how much has already been spent.

Two persisted anchors, because they measure different spans and collapsing them breaks one of the two.
`FirstDeferredAt` never moves once set, so the budget measures the whole wait. `LastDeferredAt` moves
with each deferral, so an error run that begins after a long wait still gets its full retry allowance.
Anchoring retries on `UpdatedAt` instead looks equivalent and is not: `UpdatedAt` advances on *every*
write-back, including each failed attempt, which slides the retry deadline forward one backoff at a
time and stops `MaxDuration` binding at all — a deferred step whose command starts failing would then
retry forever, never reaching a terminal status and never raising a failure metric.

**Total allowed duration.** There is no workflow-level lifetime cap; the clocks above are all
per-step. A step's worst case after a deferral is `waitBudget + RetryStrategy.MaxDuration` (48h on
defaults), and a workflow's is that summed over its steps — up to `MaxStepsPerWorkflow` of them.
A parked workflow also blocks its dependents and holds its collection head for the whole time, is
never purged by retention (it is `Incomplete`), protects its already-finished dependencies from being
purged, and counts toward `BackpressureThreshold`. Size budgets accordingly, and note that `resume`
clears both anchors — a resumed step starts its budget over. Its `StateOut` is deliberately kept:
only a deferring step can produce state and later fail (a completed step never re-executes), and a
resumed poller should replay from what it last recorded rather than from the previous step's output.

### The wait budget

`command.waitBudget` (default `EngineSettings.DefaultStepWaitBudget` = 24h, rejected at enqueue above
`MaxStepWaitBudget` = 14d) caps total waiting, measured from the step's **first** deferral
(`Step.FirstDeferredAt`, persisted), so it survives restarts and re-fetches. The cap is deliberately
small: real polls resolve in minutes to hours, an instance pinned for two weeks should fail loudly
rather than wait on — and the cap is one side of the callback-token lifetime invariant documented on
`EngineSettings.MaxStepWaitBudget` (tokens minted at enqueue never refresh, so worst-case workflow
lifetime must stay below the signing code's remaining validity).

It is a **cumulative allowance, not a poll interval.** The command chooses the delay before each
re-check; the budget caps the sum of those delays. A step deferring 5 minutes at a time under the 24h
default therefore polls ~288 times — it does not sit idle for a day between checks.

The budget bounds waiting; it does not shorten the last poll. A deferral asking for longer than the
budget has left is **clamped to land exactly on the deadline**, so the step always spends its whole
budget and always gets one final execution before expiring. (Rejecting the overshooting deferral
instead would forfeit the remainder of the budget, and would make `Defer(24h)` under a 24h budget fail
without ever having waited.) A deferral *at or past* the deadline is what fails the step — with a
distinct classification:

```text
engine.workflows.execution.failed{reason="wait_expired"}
```

Keep `wait_expired` out of the default ops alert: it means the awaited external outcome never arrived,
not that the engine or the command broke. Route it to the team that owns the integration. A
non-positive delay, by contrast, is a command bug and fails the step under the ordinary `execution`
reason. A *positive but negligible* delay is the same class of mistake handled gently: it is clamped
up to `MinStepDeferDelay` (1s), because there is no honest threshold below which "wait a moment" means
"wait no time at all", and a spinning park would hammer the callback target for the whole budget.

### Deferral is stateful across attempts

A deferring step is handed **its own** `StateOut` back as the next attempt's `StateIn` — see
`ResolveStateIn`. Without that, a command that yields state would have it persisted and then silently
discarded on every re-execution, so each poll would restart from whatever the *previous step* left
behind. A polling command therefore resumes from what it last recorded, and the state channel needs no
special-casing for waiting.

`DeferCount` and `FirstDeferredAt` are exposed on `StepStatusResponse`. A command reads `DeferCount`
from `CommandExecutionContext.Step` and `WaitDeadline` from the context itself, so it can back off its
own cadence adaptively — or give up early, deliberately, instead of being failed anonymously when the
budget expires. `WaitDeadline` is an absolute instant rather than a remaining duration: a duration
starts aging the moment it is computed, and a command that receives it across a network boundary (as
the Altinn app callback does) cannot tell how much has already been spent.
`engine.steps.wait.duration` records the budget a step actually consumed, once per deferring step at
the moment it resolves — the only signal that shows budgets being *approached* rather than blown, so
compare its upper percentiles against the configured budget when sizing one.

### Push as an optimization of pull

The step's own cadence is always the source of truth. When an external signal *does* arrive early, use
[Nudge](#nudge) to collapse the remaining wait — the step then re-executes and decides for itself
whether the outcome is ready. A lost signal therefore costs latency, never correctness.

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
    - **not yet started or parked** (Enqueued/Requeued/Waiting) — finalized as `Canceled` the next time the processor fetches it, without executing any step. A pending cancellation bypasses the fetch gate's backoff check, so a workflow parked behind a retry backoff or a deferred step's wait timer is claimed on the next fetch cycle rather than when its timer elapses. (Unsettled dependencies still gate the fetch: a cancelled dependent is finalized once its dependency settles.)

In all cases the database flag guarantees the workflow _will_ be canceled; `canceledImmediately` only reports whether the interrupt was delivered in-process during the call. A `202` response means this call requested the cancellation; a `200` means cancellation was already pending (idempotent re-request).

## Resume

Terminal workflows (Failed, Canceled, DependencyFailed, Abandoned) can be resumed for re-processing:

```http
POST /api/v1/{namespace}/workflows/{workflowId}/resume?cascade=false
```

1. Resets the workflow to `Enqueued`, clearing `CancellationRequestedAt`, `BackoffUntil`, `ThrottledUntil` (an explicit resume wins over the [namespace circuit breaker](#failure-storm-throttling)), `HeartbeatAt`, and `ReclaimCount`
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

## Nudge

A parked workflow — `Requeued` between retry attempts, or `Waiting` on a [deferral](#deferral-durable-yield) —
can be told to stop waiting:

```http
POST /api/v1/{namespace}/workflows/{workflowId}/nudge
```

This clears `backoff_until` — and `throttled_until`, so an explicit nudge always wins over the
[namespace circuit breaker](#failure-storm-throttling) — and signals the processor, so the workflow
is claimed on the next fetch cycle instead of when its timer would have elapsed. The workflow is
**re-executed, not skipped**: the
step runs again and reaches its own conclusion. Nudging a poller that still has nothing to report
simply produces another deferral.

This is the engine's push channel. It exists so an external signal (a webhook, an event) can
*accelerate* a poll, never to carry it: the step's own cadence remains the source of truth, so a lost
nudge costs one poll interval of latency and nothing else. Never build a flow whose correctness
depends on the nudge arriving.

## Failure-Storm Throttling

Operations guide for the per-namespace failure-storm circuit breaker (design and rationale in the
[failure-throttling ADR](../../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md);
configuration and state-machine behavior under
[Throttling (namespace circuit breaker)](#throttling-namespace-circuit-breaker)).

**Observability.**

- `GET /api/v1/throttles` lists every namespace breaker (open, recovering, or lingering closed);
  `GET /api/v1/{namespace}/throttle` fetches one. Both work whether or not throttling is enabled.
- The dashboard shows a **Throttled Namespaces** panel (Live tab, above Scheduled) whenever any
  breaker state exists, with force-open/force-close actions behind a two-click confirm.
- Metrics (all tagged with `namespace`): `engine.throttle.tripped` (trips and re-trips, including
  force-opens), `engine.throttle.extended` (window extensions after unanimous canary failure),
  `engine.throttle.released` (workflows released in recovery cohorts),
  `engine.throttle.closed` (closes, including force-closes),
  `engine.throttle.handler_parked` (workflows parked cooperatively by the handler), and the gauge
  `engine.throttle.breakers.open` (breakers currently open, untagged).
- Trip/extend/release/close events are logged at Warning/Information by `NamespaceThrottleService`.

**Manual overrides — one-shot interventions, not standing policy.**

- `POST /api/v1/{namespace}/throttle/open` force-opens the breaker: an immediate trip regardless of
  the detection thresholds — state `Open` with the initial window, fresh canaries, the rest of the
  `Requeued` population parked. It does **not** prevent canary-driven recovery.
- `POST /api/v1/{namespace}/throttle/close` force-closes it: state `Closed` and every
  `throttled_until` stamp in the namespace cleared immediately, releasing the parked population to
  the normal retry schedule. It means "release now", not "never throttle": the next sweep re-trips
  if the trip condition still holds. The state row lingers through the normal closed grace period.
- Both overrides run through the sweep's advisory lock (blocking), so they never interleave with a
  running sweep cycle. Both return `409 Conflict` when `Throttling.Enabled` is `false`: with the
  feature disabled the workflow fetch ignores `throttled_until` entirely, so an override would be
  inert.

**Per-workflow overrides.** The existing [nudge](#nudge) and [resume](#resume) operations clear
`throttled_until` along with `backoff_until`: an operator's explicit poke at a single workflow
always wins over the breaker, without touching the namespace's breaker state.

**Response (202 Accepted):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "nudgedAt": "2026-03-19T10:03:00+00:00"
}
```

Returns `200 OK` with a null `nudgedAt` when the workflow was parked but already due (idempotent —
the goal state already held), `409 Conflict` when it is not parked at all, and `404 Not Found` when it
does not exist. The dashboard's *Retry now* / *Check now* buttons drive the same operation through
`POST /dashboard/nudge`.

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

### Nudge Workflow

```http
POST /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479/nudge
```

**Response (202 Accepted):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "nudgedAt": "2026-03-19T10:03:00+00:00"
}
```

Clears the pending backoff of a parked (`Requeued` or `Waiting`) workflow so it runs on the next fetch
cycle — see [Nudge](#nudge). Returns `200 OK` with a null `nudgedAt` when it was already due,
`409 Conflict` when the workflow is not parked, and `404 Not Found` when it doesn't exist.

### List Namespace Throttles

Lists the [failure-storm circuit breaker](#failure-storm-throttling) state of every namespace that currently has one. Purely observational — works whether or not throttling is enabled. Returns `204 No Content` when no breaker state exists.

```http
GET /api/v1/throttles
```

**Response (200 OK):**

```json
[
    {
        "namespace": "ttd/broken-app",
        "state": "Open",
        "trippedAt": "2026-03-19T10:00:00+00:00",
        "currentWindow": "00:10:00",
        "canaryCount": 3,
        "lastEvaluatedAt": "2026-03-19T10:05:00+00:00",
        "lastRequeuedCount": 120,
        "lastActiveCount": 150,
        "updatedAt": "2026-03-19T10:05:00+00:00"
    }
]
```

### Get Namespace Throttle

The same breaker state for a single namespace. `404 Not Found` when the namespace has no breaker state row.

```http
GET /api/v1/{namespace}/throttle
```

### Force-Open Throttle

Trips the namespace's breaker immediately, regardless of the detection thresholds — a one-shot intervention that does not prevent canary-driven recovery (see [Failure-Storm Throttling](#failure-storm-throttling)). Force-opening an already-open breaker re-trips it with the initial window and fresh canaries.

```http
POST /api/v1/{namespace}/throttle/open
```

**Response (202 Accepted):** the resulting breaker state (same shape as **Get Namespace Throttle**). `409 Conflict` when throttling is disabled — with `Throttling.Enabled = false` the workflow fetch ignores `throttled_until` entirely, so the override would be inert.

### Force-Close Throttle

Closes the namespace's breaker immediately and clears every `throttled_until` stamp in the namespace — "release now", not "never throttle": the next sweep re-trips if the trip condition still holds. The state row lingers through the normal closed grace period.

```http
POST /api/v1/{namespace}/throttle/close
```

**Response (202 Accepted):** the resulting breaker state. `200 OK` when the breaker was already closed (idempotent replay, stragglers still cleared), `404 Not Found` when the namespace has no breaker state, `409 Conflict` when throttling is disabled.

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

### Throttling (namespace circuit breaker)

Per-namespace failure-storm throttling (see the failure-throttling ADR). Ships dark: with
`Enabled: false` (the default) the sweep does not run and the fetch query's throttle gate is
switched off by a parameter, so `throttled_until` has no bearing on which workflows are fetched
and the schema is fully inert.

The sweep (`NamespaceThrottleService`) runs the whole state machine every `SweepInterval` under a
Postgres advisory lock (single writer across replicas; a replica that finds the lock held skips
its cycle): trip when a namespace's `Requeued` population exceeds both thresholds, park that
population behind `throttled_until` (jittered ±20% per row and clamped per stamp to each
workflow's retry deadline, so throttling never costs a final attempt), keep a small rotating
canary set on the normal retry schedule, extend the window ×2 on unanimous canary failure, and —
once any canary progresses (judged by requeue-count comparison, never timing; a canary observed
mid-attempt is indeterminate and keeps the breaker waiting) — release the parked horde
oldest-first in doubling cohorts with a jittered smear. A failed recovery re-trips keeping the
grown window; a cleared breaker lingers for a grace period (5 sweep intervals) during which
stragglers are cleared. Each cycle every replica refreshes an in-memory snapshot of the tripped
breakers (`IThrottleStateView`), which expires fail-open — it reads as empty once older than 3
sweep intervals, so a replica whose sweep loop has died loses its power to park; on top of that
snapshot the workflow handler cooperates by parking newly failing workflows in an open namespace
immediately, without waiting for the next sweep. Operational tooling — the observability and
force-open/force-close endpoints, the dashboard panel, and the nudge/resume interplay — is
described under [Failure-Storm Throttling](#failure-storm-throttling).

| Setting                            | Default | Description                                             |
| ---------------------------------- | ------- | ------------------------------------------------------- |
| `Throttling.Enabled`               | false   | Master switch for the namespace circuit breaker         |
| `Throttling.MinRequeuedWorkflows`  | 50      | Absolute floor of `Requeued` workflows before tripping  |
| `Throttling.MinRequeuedRatio`      | 0.5     | Fraction of active workflows that must be `Requeued`    |
| `Throttling.SweepInterval`         | 30s     | Throttle sweep cadence (detect → throttle → probe → release) |
| `Throttling.CanaryCount`           | 3       | Canary workflows kept on the normal retry schedule      |
| `Throttling.InitialWindow`         | 10m     | Throttle window at first trip                           |
| `Throttling.MaxWindow`             | 1h      | Cap on the exponentially growing window                 |

Window growth (×2), release cohort growth (×2), and jitter (±20%) are named constants on
`ThrottlingSettings`, deliberately not configuration.

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
