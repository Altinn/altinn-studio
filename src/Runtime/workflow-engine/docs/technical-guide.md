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
    - [Mailboxes](#mailboxes)
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
_"I ran fine; the answer isn't ready yet."_ That is a **deferral** — not a failure, and not a retry.

```csharp
return ExecutionResult.Defer(TimeSpan.FromMinutes(5), "delivery not confirmed yet");
```

The engine parks the step in `Waiting` and schedules its next execution through the workflow's
`backoff_until` — the same durable timer `StartAt` rides on. A parked workflow holds **no lease, no
worker slot and no HTTP slot**; it is simply a row the fetch gate will not claim until its timer
elapses. `Waiting` is non-terminal and counts as _active_: consumers must never read a parked
workflow as settled.

The reason string is persisted as the step's `lastDeferReason` (overwritten on every deferral,
cleared on resume) and surfaced wherever the wait is visible: the step on workflow status reads,
and `waitingReason` on a `Waiting` collection head — populated only while the head is parked, so a
consumer never sees a stale reason. Phrase it for a reader: it is the one place a waiting step gets
to say, in its own words, what it is waiting for.

Deferrals are kept rigorously separate from errors:

|                | Retryable error                   | Deferral                          |
| -------------- | --------------------------------- | --------------------------------- |
| Status         | `Requeued`                        | `Waiting`                         |
| `ErrorHistory` | Appends an entry                  | Records nothing                   |
| `RequeueCount` | Incremented                       | **Reset to 0**                    |
| Metric         | `engine.steps.execution.requeued` | `engine.steps.execution.deferred` |
| Bounded by     | `RetryStrategy`                   | The step's wait budget            |

Resetting `RequeueCount` is deliberate: retries bound _consecutive errors between_ deferrals, not
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

| Clock                      | Bounds                          | Anchored at                                   | Default                 | A command reads                    |
| -------------------------- | ------------------------------- | --------------------------------------------- | ----------------------- | ---------------------------------- |
| `command.maxExecutionTime` | One execution attempt           | Attempt start                                 | 100s                    | `ExecutionDeadline`                |
| `RetryStrategy`            | A run of consecutive _errors_   | `Step.LastDeferredAt`, else the previous step | 24h / unlimited retries | `Step.RequeueCount`                |
| `command.waitBudget`       | Cumulative time spent _waiting_ | `Step.FirstDeferredAt`                        | 24h                     | `Step.DeferCount` + `WaitDeadline` |

Each clock is observable from `CommandExecutionContext`, one field per clock, so a command can pace
itself against the same limits the engine will enforce instead of guessing at them. Both deadlines are
absolute instants rather than remaining durations: a duration starts aging the moment it is computed,
and a command that receives one across a network boundary (as the Altinn app callback does) cannot tell
how much has already been spent.

Two persisted anchors, because they measure different spans and collapsing them breaks one of the two.
`FirstDeferredAt` never moves once set, so the budget measures the whole wait. `LastDeferredAt` moves
with each deferral, so an error run that begins after a long wait still gets its full retry allowance.
Anchoring retries on `UpdatedAt` instead looks equivalent and is not: `UpdatedAt` advances on _every_
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
without ever having waited.) A deferral _at or past_ the deadline is what fails the step — with a
distinct classification:

```text
engine.workflows.execution.failed{reason="wait_expired"}
```

Keep `wait_expired` out of the default ops alert: it means the awaited external outcome never arrived,
not that the engine or the command broke. Route it to the team that owns the integration. A
non-positive delay, by contrast, is a command bug and fails the step under the ordinary `execution`
reason. A _positive but negligible_ delay is the same class of mistake handled gently: it is clamped
up to `MinStepDeferDelay` (1s), because there is no honest threshold below which "wait a moment" means
"wait no time at all", and a spinning park would hammer the callback target for the whole budget.

### Deferral is stateful across attempts

A deferring step is handed **its own** `StateOut` back as the next attempt's `StateIn` — see
`ResolveStateIn`. Without that, a command that yields state would have it persisted and then silently
discarded on every re-execution, so each poll would restart from whatever the _previous step_ left
behind. A polling command therefore resumes from what it last recorded, and the state channel needs no
special-casing for waiting.

`DeferCount` and `FirstDeferredAt` are exposed on `StepStatusResponse`. A command reads `DeferCount`
from `CommandExecutionContext.Step` and `WaitDeadline` from the context itself, so it can back off its
own cadence adaptively — or give up early, deliberately, instead of being failed anonymously when the
budget expires. `WaitDeadline` is an absolute instant rather than a remaining duration: a duration
starts aging the moment it is computed, and a command that receives it across a network boundary (as
the Altinn app callback does) cannot tell how much has already been spent.
`engine.steps.wait.duration` records the budget a step actually consumed, once per deferring step at
the moment it resolves — the only signal that shows budgets being _approached_ rather than blown, so
compare its upper percentiles against the configured budget when sizing one.

### Push as an optimization of pull

The step's own cadence is always the source of truth. When an external signal _does_ arrive early, use
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

## Nudge

A parked workflow — `Requeued` between retry attempts, or `Waiting` on a [deferral](#deferral-durable-yield) —
can be told to stop waiting:

```http
POST /api/v1/{namespace}/workflows/{workflowId}/nudge
```

This clears `backoff_until` and signals the processor, so the workflow is claimed on the next fetch
cycle instead of when its timer would have elapsed. The workflow is **re-executed, not skipped**: the
step runs again and reaches its own conclusion. Nudging a poller that still has nothing to report
simply produces another deferral.

This is the engine's push channel. It exists so an external signal (a webhook, an event) can
_accelerate_ a poll, never to carry it: the step's own cadence remains the source of truth, so a lost
nudge costs one poll interval of latency and nothing else. Never build a flow whose correctness
depends on the nudge arriving.

**Response (202 Accepted):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "nudgedAt": "2026-03-19T10:03:00+00:00"
}
```

Returns `200 OK` with a null `nudgedAt` when the workflow was parked but already due (idempotent —
the goal state already held), `409 Conflict` when it is not parked at all, and `404 Not Found` when it
does not exist. The dashboard's _Retry now_ / _Check now_ buttons drive the same operation through
`POST /dashboard/nudge`.

## Mailboxes

A **mailbox** is a durable inbox that external messages can be delivered into: an address of its own,
minted on demand, that an app can hand to a counterparty as the place to reply to. It is not a
workflow — it holds no steps, runs nothing, and consumes no worker — and it lives in its own tables
rather than as columns on `engine.workflows`.

```http
POST /api/v1/{namespace}/mailboxes
```

The engine, not the caller, owns the id: a caller identifies its mint attempt by an
`idempotencyKey` unique within the namespace, and replaying that key returns the mailbox it already
minted instead of forking a second one. That matters because the id is typically published — embedded
in an outbound message as the reply address — before the step that minted it has finished, so a
retried step must land back on the same mailbox. The id is unguessable but is **not a secret**;
integrity of anything delivered into the mailbox is the sender's envelope's job, not the id's.

### The deadline is stamped once, at mint

The required `timeout` is not a per-operation budget. The engine converts it, once, into the
mailbox's single absolute `deadline` (`createdAt + timeout`) and everything about the mailbox's
lifetime is measured against that instant — it never moves, and no later operation re-arms it.
`EngineSettings.MaxMailboxTimeout` caps how far out a caller may put it; the derivation of that cap
is written down on the setting itself, and pinned by `CallbackTokenLifetimeInvariantTests`.

### Two counters, and what they mean

Every mailbox carries two gapless positions:

| Counter   | Meaning                                          |
| --------- | ------------------------------------------------ |
| `nextIdx` | the next position the deliveries log will assign |
| `nextSeq` | the next position the receivers log will assign  |

Read together they answer the operational question a mailbox exists to raise:
`unconsumedDeliveries` — how many messages arrived at positions no receiver was ever enqueued for. It
is derived from the counters rather than counted from rows, which is exact because both logs are
gapless and neither is pruned piecemeal.

### Deliveries: a gapless log

```http
POST /api/v1/{namespace}/mailboxes/{mailboxId}/deliveries
```

Each message delivered into a mailbox becomes a **delivery** at the next position in its log. The
position is the delivery's whole identity — `(mailboxId, idx)` is its primary key — because that pair
is exactly what the receiver enqueued at the matching position will read it by: one key lookup, no
join, no search. Positions are assigned under the mailbox's row lock, which is what makes them
gapless: position _n_ exists whenever position _n + 1_ does.

The engine stores the payload verbatim and never parses it. Any structure, envelope, or signature
inside it belongs to the sender and the receiver.

**Acceptance is not consumption.** A message with no receiver enqueued for its position simply sits
there until one arrives, so an early delivery is first-class and there is no "too early" answer. That
is why `409` is unambiguous: it always means _too late_.

| Outcome                                 | Response                                       |
| --------------------------------------- | ---------------------------------------------- |
| Appended at a new position              | `202 Accepted` with the assigned `idx`         |
| `idempotencyKey` already delivered      | `200 OK` — the original `idx` and `acceptedAt` |
| No such mailbox in this namespace       | `404 Not Found`                                |
| Mailbox closed (by request or deadline) | `409 Conflict` — too late, dead-letterable     |
| Payload over `MaxMailboxPayloadSize`    | `413 Content Too Large`                        |
| Log at `MaxMailboxLogLength`            | `429 Too Many Requests`                        |

#### Accepted versus kept

The idempotency lookup runs **before** the refusals, and the order is load-bearing: what the engine
kept, it keeps answering for. A resend of a message that was accepted while the mailbox was open
replays as `200` even after the mailbox has closed or its log has filled — reporting it as `409`
would have a forwarder dead-letter a message that is sitting at its position waiting to be read. The
converse holds too: what the engine refused, it keeps refusing, and no refusal becomes a replay.

A refused delivery **stores nothing at all**, which is why its `idempotencyKey` stays free: the same
key may be offered again the moment the reason for the refusal is gone. There is no key to release
afterwards, because a refusal never claimed one.

### Receive workflows

A workflow declares at enqueue that it consumes one message from a mailbox:

```json
{
    "operationId": "Task_1 [archive reply 2]",
    "mailbox": { "id": "018f4e…" },
    "steps": [{ "command": { "type": "app-command", "data": {} } }]
}
```

The block names a mailbox and nothing else. The **position** the workflow consumes is not the
caller's to choose: the engine assigns it under the mailbox's row lock, in arrival order, so the
receivers log is gapless for the same reason the deliveries log is. A caller able to pick its own
position could pick one twice, or skip one, and the pairing between the two logs is the whole
rendezvous.

Three constraints hold. The delivery lands in the **first** step and nowhere else — later steps are
ordinary. A workflow carries at most one such block, which is the shape of the field rather than a
rule anyone has to check. And a receiver may not also carry `startAt`: a receiver that has to wait is
born `Held`, and a held row has no schedule, so honoring both would mean quietly ignoring one of the
caller's two instructions. There is no per-receiver timeout either — the mailbox's deadline bounds the
whole exchange.

#### Three births, decided under the mailbox's row lock

Inside the enqueue flush, the engine locks the mailbox row — for the requests that are actually new,
see [serialization point](#the-mailbox-row-is-its-own-serialization-point) — assigns
`seq = nextSeq++`, and decides the state the workflow is born in:

| At the assigned position                        | Born                                          |
| ----------------------------------------------- | --------------------------------------------- |
| A delivery already sits there (`seq < nextIdx`) | `Enqueued`, runnable, with that message       |
| No delivery, and the mailbox is closed          | `Enqueued`, runnable, with the closing signal |
| Neither                                         | `Held`, and its registration marked held      |

The first row wins over the second, which is the case that looks wrong and is not: **an accepted
delivery outranks closure.** A receiver enqueued against a closed mailbox still gets the message
waiting at its position, so a saga replaying after the deadline drains the backlog it was promised
instead of dropping it. Enqueueing against a closed mailbox is therefore accepted, never refused —
which is what makes a close racing an in-flight relay self-resolving, with no "mailbox was closed"
error branch anywhere in the app's saga.

Two refusals remain, both decided under the same lock and both leaving nothing behind — including the
request's idempotency key, so the same request may be made again once the reason is gone:

| Outcome                                | Response                |
| -------------------------------------- | ----------------------- |
| No such mailbox in this namespace      | `400 Bad Request`       |
| Receivers log at `MaxMailboxLogLength` | `429 Too Many Requests` |

The same _accepted versus kept_ rule the delivery endpoint follows applies here: a replayed
idempotency key is answered with the receiver it already created, even once the log it filled is
full.

#### `Held`, and what releases it

`Held` means born parked. The workflow is durable and visible from the moment it is created, and it
has not started: it is **absent from the fetch gate's status list**, so no worker ever claims it, and
it holds no lease, no heartbeat, and no backoff. It has no timer of its own, deliberately — the
release is transactional with its cause, and the mailbox's deadline is what bounds the wait.

`Held` is non-terminal and counts as active, so the dependency gate holds dependents back with no
gate changes and retention never purges a receiver that is still waiting. The cost of that is stated
plainly: a held receiver consumes admission budget for as long as its mailbox stays open.

The receiver's position lives in `engine.mailbox_receivers` rather than on the workflow, keyed by
`(mailbox_id, seq)` for the release's read and `UNIQUE (workflow_id)` for the executor's. The
workflow row carries one nullable column, `mailbox_id` — the executor's discriminator and the marker
ops reads a held row by.

**Every receiver registers, whatever state it was born in.** The registry is positional, not a queue
of waiters: the position is the address the executor reads its delivery by, so a receiver born
runnable needs it recorded exactly as much as one that parked — and leaving it out would have the
executor find no position for a receiver whose message is sitting at that position, and hand it the
closing signal instead — the one thing
[the frozen-meaning rule](#the-receivers-meaning-is-frozen-before-it-can-run) forbids outright.

`held_at` is the row's one structural distinction, and it is load-bearing twice. Stamped, the receiver
parked, and the unreleased subset of those is exactly the set the wake and the closure release walk.
Null, it was born runnable and `released_at` carries its birth instant, so no release will ever match
it — the release statement's two guards each exclude it independently.

Metric: `engine.mailboxes.receivers.created`, tagged `birth` (`delivered`/`closed`/`held`) — the one
number that separates "the relay is running" from "the relay is parked".

### The rendezvous: exactly two things release a parked receiver

A held receiver waits for one of exactly two events, and each of them is written in the same
transaction as its cause:

- **the wake** — a delivery lands at the receiver's position, inside the delivery's own transaction;
- **the closure release** — the mailbox closes, by request or at its deadline, inside the close's own
  transaction.

Both run the same statement, which releases `Held` → `Enqueued` with a null backoff (so the receiver
sorts to the front of the fetch order) and stamps `released_at` on the registry row. The wake names
one position; the closure release names none and takes every parked receiver the mailbox has. Both
skip a row that already carries a stamp, and both require the workflow to still be `Held` — two
independent guards, and between them what makes a registry holding every receiver safe to run these
over: a born-runnable row is already stamped and already `Enqueued`, so either guard alone is enough
to pass it by.

**The wake is transactional with the delivery insert, and that is the design's load-bearing
property.** A held receiver has no timer of its own, so a state in which the message is durable while
its wake is lost would park the receiver until the mailbox's deadline with its answer sitting one row
away. Sharing the transaction makes that state one the database cannot hold. It is verified by
transaction id (`xmin`) rather than by observation — a test that merely watches the two rows stays
green when the transaction is split, which is exactly the regression worth catching.

Both releases take the workflow rows while already holding the mailbox row: the compound order
**mailbox row → workflow row**, and the only compound acquisition in the feature.

After the release commits, one `NOTIFY status_changed` tells the processor there is work. The
notification is issued inside the releasing transaction, which PostgreSQL queues until commit and
drops on rollback — so it is sent exactly when the release is durable, and a post-`COMMIT` statement
that could fail on an already-committed transaction is avoided. **It remains acceleration and never
correctness**: a release that commits and is never announced is claimed on the next fetch cycle, and
nothing downstream of the release depends on the signal arriving.

Metrics: `engine.mailboxes.receivers.released`, tagged `cause` (`delivered`/`closed`) — read against
the `held` births it is the relay's balance sheet — and `engine.mailboxes.receivers.wake_latency`, the
seconds between a release and the first claim of the receiver it released. The latency is recorded
once per release: the fetch stamps the registry's `claimed_at` under `claimed_at IS NULL`, so a
receiver that fails and climbs its retry ladder reports its wake latency once rather than reporting the
ladder. A receiver born runnable is stamped like any other — `claimed_at` means what it says — but
records no sample, because `held_at IS NULL` says there was no wake to time. Without that exclusion the
histogram would fill with ordinary fetch-cycle latency in the common early-delivery case and stop
showing the sub-second gap it exists for.

### The receiver's meaning is frozen before it can run

The message is read at execution, not at enqueue — it may not exist when the receiver is created. That
late binding would be a hazard in any other engine: a step whose _input_ differs between attempts, so
an attempt that saw nothing is followed by one that sees a message. The rendezvous removes the hazard
structurally rather than by recording a verdict. A receiver becomes runnable in exactly three ways,
and each of them settles the question first:

1. **born with its message** — the enqueue flush found one at its position, open mailbox or closed;
2. **released by the wake** — inside the delivery's own transaction, so the message exists;
3. **released by closure** — the mailbox is closed, and a closed mailbox refuses every further
   delivery, so no message can ever arrive at that position.

So from the instant a receiver is fetchable, **whether a message stands at its position can never
change again**, and the executor simply looks:

```text
engine.mailbox_receivers  WHERE workflow_id = …    → the position, seq
engine.mailbox_deliveries WHERE (mailbox_id, seq)  → present → attach it
                                                     absent  → the closing signal + disposedReason
```

One statement: a unique-index probe on `workflow_id` for the position, and two primary-key probes for
the delivery and the mailbox's closure reason. **Nothing is written and nothing is locked.** There is
no resolution column and no compare-and-set, because a recorded verdict is a second source of truth
able to disagree with the log; every attempt, retry and resume re-derives the same answer from the
same rows instead. Every mailbox _mutation_ takes the mailbox's row lock as its first act — this read
is on the rendezvous path and still takes none, because there is no state left for a lock to protect
and taking it would stall a running receiver behind a delivery or a close that cannot change its
answer.

**The three rows are read at a single instant, and that is what makes the error state trustworthy.**
The frozen rule already keeps the delivery answer stable, so a split read would give the same verdict
in every legitimate case. What it would lose is the illegitimate one: under `READ COMMITTED` a read
that saw "no delivery" — a genuine bug — could then see a close committed one statement later and
report a perfectly ordinary closing signal, laundering the invariant violation through traffic that
happens all the time. One snapshot is what keeps the alarm below from being silenceable by a race.

`held_at` is deliberately not consulted. It records how the receiver was _born_, not whether a message
exists, and a receiver born runnable is exactly the one whose message is already sitting at its
position.

**A callback with no delivery therefore means exactly one thing: the mailbox is closed and no message
will ever reach this step.** It carries `disposedReason` — `deadline` or `request` — explicitly rather
than leaving it to be inferred, purely so the conclusion can be worded ("the archive never confirmed
before the deadline" reads differently from "the exchange was closed"). Both demand the same response:
conclude.

Two states would break that reading, and neither is reachable through the rendezvous, so the engine
fails the step critically rather than reporting them as "no message" — which would tell a handler to
conclude an exchange on the strength of a bug:

| What the read finds                    | Meaning                                                 |
| -------------------------------------- | ------------------------------------------------------- |
| No registration for the workflow       | The mailbox and its whole log were purged underneath it |
| No message, and the mailbox still open | The receiver is running before its truth was frozen     |

**Critical rather than retryable, and the second row is the one where that is a real choice.** A retry
would in fact often clear it: the handler is never called, so nothing has acted on the bad state, and
once the deadline sweep closes the mailbox the next attempt reads a legitimate closing signal. That is
the argument against it. An invariant violation that heals itself is one nobody ever investigates, and
the healing would put the retry ladder in the load-bearing path of a rendezvous deliberately built so
that a parked receiver needs no timer at all. The step lands `Failed` and visible instead, and the
operator's tool is the ordinary resume — which re-derives the answer from the same rows, so a receiver
resumed after the mailbox has genuinely closed proceeds exactly as it should.

#### What the app is handed

The `app` command projects the receipt onto its callback as one block, present only on a receive
workflow's first step:

```json
{
    "mailbox": {
        "id": "018f4e…",
        "seq": 1,
        "delivery": {
            "idempotencyKey": "source-message-42",
            "payload": "…",
            "acceptedAt": "2026-08-19T10:11:12Z"
        },
        "disposedReason": null
    }
}
```

`delivery` and `disposedReason` are exclusive: exactly one of them is present, which is what lets a
handler branch once. `idempotencyKey` is the forwarding source's own message id, stable across every
attempt of the step, so a handler may deduplicate its own side effects on it.

### Closing is terminal, idempotent, and says why

```http
DELETE /api/v1/{namespace}/mailboxes/{mailboxId}
```

Closing means exactly one thing: **the mailbox is closed for deliveries**. Nothing reopens it. The
close records `disposedReason` explicitly — `request` when a caller closed it, `deadline` when the
engine did — rather than leaving a consumer to infer intent from timestamps, because the two read
very differently in a conclusion written for a human ("the counterparty never answered in time"
versus "the exchange was closed").

The effecting close answers `202 Accepted`; a repeat — or a close that lost the race to the
mailbox's own deadline — answers `200 OK` reporting the **original** `disposedAt` and
`disposedReason`. That is the engine-wide convention: `202` means _this call_ effected the state
change, `200` means it had already happened. Whoever closed it first wins outright.

Closing is also a release: under the same row lock, **every** parked receiver goes `Held` →
`Enqueued` and runs the no-delivery path, so the exchange concludes through the app's own conclusion
path rather than through an engine-written status. Every one of them, not the next one — the mailbox
accepts no further deliveries, so all their truths were frozen at the same instant. A repeat close
releases nothing and cannot need to: the first close released every parked receiver that existed, and an
enqueue against a closed mailbox is born runnable rather than parked.

The response reports `unconsumedDeliveries` — accepted positions no receiver was ever enqueued for,
messages that arrived while the app was concluding or past the relay's last hop. The rows themselves
stay readable until retention, so an operator can see what turned up too late.

### The deadline is enforced by one sweep, running the same routine

A parked receiver has no timer of its own, so the mailbox's deadline is the only thing standing
between it and waiting forever. `MailboxDeadlineService` is what turns that column into a promise: a
periodic sweep that claims open mailboxes past their `deadline` and runs **exactly the routine
`DELETE` runs**, with `disposedReason = deadline`. There is no separate closure path to keep in step
with the caller-driven one, which is what makes a `DELETE` racing the sweep a first-writer-wins no-op
rather than two half-closures.

It runs on `EngineSettings.MailboxSweepInterval` — five minutes by default, deliberately coarser than
the maintenance cadence, because a deadline is a day-scale promise and a tick with nothing overdue
costs one indexed scan (`ix_mailboxes_deadline_open`). **That interval is a term in the
callback-token lifetime bound** derived on `MaxMailboxTimeout`: a receiver parks until the mailbox
actually closes, which is its deadline plus at most one cadence, so raising the interval raises the
worst case and `CallbackTokenLifetimeInvariantTests` fails loudly rather than letting a receiver park
past its token's validity.

Three properties are worth knowing:

- **The claim is the lock.** Each mailbox is claimed with `FOR UPDATE SKIP LOCKED`, which is both the
  row lock the closure routine requires and the reason a mailbox somebody else is holding — another
  pod's sweep, a delivery, a close, an enqueue — is left for the next tick instead of queued behind.
- **One transaction per mailbox, isolated.** A close that throws is contained: that mailbox stays
  open, overdue and claimable next pass, and the rest of the batch closes now. Without the isolation
  it would be a permanent wedge rather than a delay, since the candidates are ordered by deadline and
  the same mailbox would lead every batch.
- **A tick drains; the batch size bounds the statement.** Each claim-and-close pass takes at most
  `SweepBatchSize` mailboxes, and the tick repeats passes until nothing is left — so "at most one
  cadence" is true of the close and not merely of the first hundred closes. One batch per tick would
  make the real gap `ceil(overdue / SweepBatchSize)` intervals and quietly break the bound below
  during exactly the mass-timeout event that most needs it. A pass that closes nothing ends the tick,
  which is what stops a batch full of failing mailboxes spinning inside one tick instead of waiting
  for the next.
- **There is no second half.** Nothing is enqueued. The workflow that concludes the exchange already
  exists and carries the app's own steps, so closing _releases_ it rather than creating anything.

The sweep counts what it finds: `engine.mailboxes.closed` tagged `reason=deadline`, the receivers it
released through `engine.mailboxes.receivers.released`, and
`engine.mailboxes.deliveries.unconsumed`. That last one is the sweep's alone — a `DELETE` reports the
same number to a caller who can act on it, while a mailbox that aged out has no such caller.

**No leak backstop exists, and none is needed.** Every mailbox closes by its deadline, so an open
mailbox materially older than its deadline plus a sweep cadence is an invariant violation worth an
alert, not a garbage-collection policy.

### Retention

A **closed** mailbox past the retention cutoff is purged with its deliveries and receiver
registrations, in the existing maintenance sweep. Age alone is not enough: an open mailbox is an
exchange in progress whatever its timestamps say, and if it is past its deadline the closure sweep is
what owes it an answer.

The children go first, and that order is enforced by the schema rather than by the code that happens
to implement it — both child tables reference `engine.mailboxes` with `ON DELETE RESTRICT`, the only
non-cascade foreign keys in the schema, so a purge written in the wrong order raises SQLSTATE `23001`
instead of quietly taking rows with it.

Receive workflows purge independently, under the workflow sweep, and nothing waits for them: a purged
receiver leaves behind a registry row whose `workflow_id` points at nothing, which is why that
column deliberately carries no foreign key. The row is a record of a rendezvous that already
happened, and it goes when its mailbox does.

### The mailbox row is its own serialization point

Every operation that changes mailbox state takes the mailbox row's lock **before reading anything it
decides on**, and for the endpoints that act on one mailbox that is the first act of the transaction.
This is why concurrent closes collapse onto a single disposal with a single timestamp instead of each
writing its own, and it is the discipline every future mailbox operation inherits. The one compound
lock order is **mailbox row → workflow row**; nothing takes them in the reverse order, so the ordering
is acyclic by inspection.

The enqueue flush is the one operation that does not lock first, and deliberately so: it is a batch of
unrelated callers, and it locks only for the requests that can actually consume a position — which it
cannot know until the idempotency insert has told a first arrival from a replay. A replay's answer
comes from `engine.idempotency_keys` alone, so making it take the lock would stall every ordinary
workflow batched with it behind a delivery or a close, for a request that will change no mailbox
state. What matters is preserved exactly: nothing about a receiver's birth is read before the lock.

The mint takes no row lock at all, and cannot: the row is what it
creates. The unique index on `(namespace, idempotencyKey)` serializes it instead — concurrent mints
of one key contend there, exactly one inserts, and the losers are handed the winner's mailbox.

### Limits

`MaxOpenMailboxesPerCollection` bounds how many mailboxes one workflow collection may hold open at
once; a mint past it is refused with `429 Too Many Requests` rather than silently closing something,
because the engine cannot know which of the open exchanges the app considers finished. The cap is
scoped to a collection, so a mailbox minted without a `collectionKey` is not counted against it.

It is a **best-effort resource guard, not an exact bound.** The count is evaluated against the
snapshot the mint statement runs on, so mints in flight at the same instant can each see room and the
collection can settle slightly above the configured number — by at most one per concurrently in-flight
mint, never runaway, and the next sequential mint is refused as normal. Making it exact would mean
serializing every mint behind a lock, which costs more than a resource guard is worth. Do not assert
on it as an invariant.

`MaxMailboxLogLength` bounds how many positions a mailbox's logs may hold; a delivery past it is
refused with `429 Too Many Requests`. It is the only bound on what a single mailbox can cost, because
deliveries deliberately skip the admission gate an ordinary enqueue must pass — a delivery refused
for backpressure is a message an external system has already sent and may never send again.
`MaxMailboxPayloadSize` bounds one delivery's payload, measured on its UTF-8 bytes, and a payload
past it is refused with `413` rather than truncated.

Both keys are `varchar(200)`: `idempotencyKey` must be non-empty and at most 200 characters, and
`collectionKey`, when supplied, likewise. These are validated before the mint reaches the database —
an over-long value would otherwise come back as a transient-looking database error and be retried to
the command timeout instead of being answered.

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

### Mailbox metrics

| Metric                                    | Type      | Tags                                                                                     |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `engine.mailboxes.created`                | Counter   | —                                                                                        |
| `engine.mailboxes.closed`                 | Counter   | `reason` (`request`/`deadline`)                                                          |
| `engine.mailboxes.deliveries.received`    | Counter   | `outcome` (`accepted`/`duplicate`/`not_found`/`closed`/`log_full`/`too_large`/`invalid`) |
| `engine.mailboxes.deliveries.unconsumed`  | Counter   | — (recorded by the deadline sweep alone)                                                 |
| `engine.mailboxes.receivers.created`      | Counter   | `birth` (`delivered`/`closed`/`held`)                                                    |
| `engine.mailboxes.receivers.released`     | Counter   | `cause` (`delivered`/`closed`)                                                           |
| `engine.mailboxes.receivers.wake_latency` | Histogram | — (seconds from release to first claim, recorded once per release)                       |
| `engine.mailboxes.rendezvous.violations`  | Counter   | `state` (`unregistered`/`undecided`)                                                     |
| `engine.mailboxes.open.overdue`           | Gauge     | —                                                                                        |

Reading them:

- `created` and `closed` count **state changes rather than requests**, so idempotent replays do not
  inflate them.
- `deliveries.received` counts **every verdict, refusals included** — even the ones refused before the
  row lock — so a storm of oversized or misaddressed forwards is visible here and not only in HTTP
  metrics. A call that throws instead of reaching a verdict is not an outcome and increments nothing;
  that case shows up in the database and HTTP error metrics.
- `rendezvous.violations`: **alert on any value above zero.** Both states are the engine violating an
  invariant of its own rendezvous (see
  [the frozen-meaning rule](#the-receivers-meaning-is-frozen-before-it-can-run)) — a step failing
  because an app returned an error and a step failing because the engine cannot say what it was handed
  want different people woken up.
- `open.overdue` is the gauge the no-leak-backstop alert hangs on: it counts mailboxes still open past
  their `deadline` plus one `MailboxSweepInterval` of grace — the gap the sweep's own cadence entitles
  it to — so a healthy engine reads **exactly zero** and any other value means the sweep is not running
  or not draining. A mass timeout can make it briefly non-zero while one tick drains, so the alert
  wants persistence rather than a single sample. The count saturates rather than being exact — an
  unbounded `count(*)` would be at its most expensive during exactly the mass timeout the gauge exists
  to report, and the alert reads "greater than zero", so stopping early costs it nothing.

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
- Mailboxes rendered under their collections, log laid out position by position
  (`GET /dashboard/mailboxes` — payload and bounds in `src/WorkflowEngine.Core/wwwroot/DASHBOARD_SPEC.md`)

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

| Parameter       | Repeatable | Description                                                                                                                                                                                                                                 |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`        | Yes        | Filter by workflow status. Case-insensitive. One of `Enqueued`, `Processing`, `Requeued`, `Completed`, `Failed`, `Canceled`, `DependencyFailed`, `Abandoned`. Omit to return all statuses; an unrecognized value returns `400 Bad Request`. |
| `label`         | Yes        | Filter by label, formatted as `key:value`. Entries without a `:` are ignored.                                                                                                                                                               |
| `collectionKey` | No         | Filter to a single collection.                                                                                                                                                                                                              |
| `cursor`        | No         | Pagination cursor — pass the `nextCursor` from the previous response to fetch the next page.                                                                                                                                                |
| `pageSize`      | No         | Items per page. Defaults to 25, clamped to the range 1–100.                                                                                                                                                                                 |

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

### Mint Mailbox

Mints a [mailbox](#mailboxes). Idempotent on `(namespace, idempotencyKey)`.

```http
POST /api/v1/{namespace}/mailboxes
```

```json
{
    "idempotencyKey": "Task_1:SendToArchive",
    "timeout": "2.00:00:00",
    "collectionKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (201 Created):**

```json
{
    "id": "0195f4e2-1a3b-7c00-9d21-3f5a6b7c8d9e",
    "namespace": "ttd:my-app",
    "idempotencyKey": "Task_1:SendToArchive",
    "collectionKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timeout": "2.00:00:00",
    "deadline": "2026-03-21T10:00:00+00:00",
    "status": "Open",
    "nextIdx": 0,
    "nextSeq": 0,
    "unconsumedDeliveries": 0,
    "createdAt": "2026-03-19T10:00:00+00:00"
}
```

Returns `200 OK` with the existing mailbox when the idempotency key already minted one — answered
even when the collection is at its cap, since a replay creates nothing. `400 Bad Request` for a key
that is empty, whitespace, or over 200 characters, or a `timeout` that is not positive or exceeds
`MaxMailboxTimeout`. `429 Too Many Requests` when the collection already holds
`MaxOpenMailboxesPerCollection` open mailboxes — a best-effort guard, so treat it as a signal to back
off rather than as proof of an exact count.

### Get Mailbox

```http
GET /api/v1/{namespace}/mailboxes/{mailboxId}
```

**Response (200 OK):** the same shape as the mint returns — status, deadline, both counters, and the
unconsumed-delivery count. `404 Not Found` when no mailbox with that id exists in the namespace.

### Close Mailbox

```http
DELETE /api/v1/{namespace}/mailboxes/{mailboxId}
```

**Response (202 Accepted):**

```json
{
    "id": "0195f4e2-1a3b-7c00-9d21-3f5a6b7c8d9e",
    "namespace": "ttd:my-app",
    "idempotencyKey": "Task_1:SendToArchive",
    "timeout": "2.00:00:00",
    "deadline": "2026-03-21T10:00:00+00:00",
    "status": "Disposed",
    "disposedReason": "Request",
    "nextIdx": 0,
    "nextSeq": 0,
    "unconsumedDeliveries": 0,
    "createdAt": "2026-03-19T10:00:00+00:00",
    "disposedAt": "2026-03-19T10:04:00+00:00"
}
```

Terminal and idempotent: `202 Accepted` when this call closed the mailbox, `200 OK` when it was
already closed — reporting the **original** `disposedAt` and `disposedReason` rather than this call's.
`404 Not Found` when no mailbox with that id exists in the namespace.

### Deliver to Mailbox

Delivers one message into a [mailbox](#deliveries-a-gapless-log). Idempotent on
`(mailboxId, idempotencyKey)` — pass the source's own message id.

```http
POST /api/v1/{namespace}/mailboxes/{mailboxId}/deliveries
```

```json
{
    "idempotencyKey": "urn:altinn:message:9f2c…",
    "payload": "{\"status\":\"received\"}"
}
```

**Response (202 Accepted):**

```json
{
    "mailboxId": "0195f4e2-1a3b-7c00-9d21-3f5a6b7c8d9e",
    "idx": 0,
    "idempotencyKey": "urn:altinn:message:9f2c…",
    "acceptedAt": "2026-03-19T10:02:00+00:00"
}
```

Returns `200 OK` with the delivery the key already made, at the position it has held since — even
after the mailbox has closed, since the engine kept it. `404 Not Found` when no mailbox with that id
exists in the namespace. `409 Conflict` when the mailbox is closed, which always means _too late_ and
never _too early_; the detail says whether it closed by request or at its deadline. `413` when the
payload exceeds `MaxMailboxPayloadSize`, and `429` when the log has reached `MaxMailboxLogLength`.
The payload is not echoed back — the caller just sent it, and the only thing it could not have known
is the position.

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

### Mailboxes

| Setting                         | Default | Description                                                                                        |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `MaxMailboxTimeout`             | 21d     | Cap on a mailbox's `timeout` at mint; the derivation is written on the setting itself              |
| `MaxOpenMailboxesPerCollection` | 100     | Best-effort cap on open mailboxes per collection (`429` at mint; see [Limits](#limits))            |
| `MaxMailboxPayloadSize`         | 256 KiB | Per-delivery payload cap, measured on UTF-8 bytes (`413`)                                          |
| `MaxMailboxLogLength`           | 100     | Positions per mailbox log, deliveries and receivers alike (`429`)                                  |
| `MailboxSweepInterval`          | 5m      | Closure sweep cadence — a term in the callback-token lifetime bound derived on `MaxMailboxTimeout` |

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
