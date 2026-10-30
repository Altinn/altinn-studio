# Workflow engine technical guide

How the workflow engine behaves and why, for developers who integrate with it or change it. The settings, models and
metrics are defined in the code, and this guide links to them rather than repeating them.

## Overview

The engine queues workflows in PostgreSQL and runs each workflow's steps in order. Delivery is at least once. A step
that fails is retried, and a workflow that cannot finish is left in an explicit error state, never lost.

- **The database is the only queue.** The processor claims work with `FOR UPDATE SKIP LOCKED`, so several engine
  instances can run against one database without processing a workflow twice.
- **Commands are pluggable.** The engine knows nothing about what a step does. A host registers commands, and the
  engine looks them up by type string.

### Hosting model

The engine is a class library. A host composes it into a web application and adds its own commands:

```csharp
builder.AddWorkflowEngine(connectionString);    // core services, health checks, OpenTelemetry, OpenAPI
builder.Services.AddCommand<MyCommand>();       // the host's commands
var app = builder.Build();
await app.UseWorkflowEngine();                  // middleware, endpoints, migrations
```

A new host references `WorkflowEngine.Core`, implements its commands on `Command<TData>` or
`Command<TData, TContext>`, and composes them as above. Its tests derive a fixture from `EngineAppFixture<TProgram>`
in `WorkflowEngine.TestKit`, which starts PostgreSQL and WireMock with Testcontainers. [Tests](test.md) describes the
conventions. [The app layer](#the-app-layer-workflowengineapp) is the host for Altinn apps.

## Workflow lifecycle

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

The other states:

- **Requeued**: a step hit a retryable error, and the workflow waits out a backoff before the next attempt.
- **Waiting**: a step [deferred](#deferral-durable-yield), and the workflow waits for its next check.
- **Held**: a mailbox [receive workflow](#held-and-what-releases-it) waits for its message.
- **DependencyFailed**: a workflow it depends on failed.
- **Abandoned**: a caller [wrote off](#abandon) its failure.

Failed, Canceled, DependencyFailed and Abandoned are terminal, and a caller can [resume](#resume) any of them.

The `WorkflowProcessor` claims as many workflows as it has free worker slots and hands each to `WorkflowHandler`,
which runs the steps in order through `WorkflowExecutor`. A crashed worker's workflows are
[reclaimed](#heartbeat--stale-recovery).

## Command system

A command defines what a step does. It validates its data and context at enqueue, so the engine refuses an invalid
request before it stores anything. A command returns one of four results:

| Result           | The engine                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `Success`        | Moves to the next step                                                                   |
| `RetryableError` | Requeues the workflow with backoff, under the step's `RetryStrategy`                     |
| `CriticalError`  | Fails the step and the workflow without a retry                                          |
| `Defer`          | Parks the step in `Waiting` until a later check. See [Deferral](#deferral-durable-yield) |

A result carries the step's output state. The engine stores it as the step's `StateOut`, and the next step receives
it as its `StateIn`. A command that knows which domain object a step works on names it for the traces through
`GetTelemetryAttributes`, as [domain attributes on spans](#domain-attributes-on-spans) describes.

The built-in `WebhookCommand` makes a GET or POST request. It treats 2xx as success, 408, 429 and 5xx as retryable,
and any other 4xx as critical.

## Retry & error handling

Each step has a `RetryStrategy`: exponential, linear or constant backoff from a base interval, an optional cap on
each delay and on the number of retries, and an optional `MaxDuration` deadline. A step without one gets the
engine's `DefaultStepRetryStrategy`.

A collection head reports `failedAttempts`: how many consecutive attempts of its current step have failed and been
scheduled for retry. It holds steady while a retry runs, so a consumer can tell a failing head from a slow one without
reading each workflow. With it comes `firstFailedAt`, when the first of those failures happened, which the step keeps
as `FirstFailedAt`. Against the collection's `currentTime` it says how long the step has been failing on the engine's
clock. Both reset when the step defers or is resumed.

When a step exhausts its retries, the engine records the error in the step's `ErrorHistory`, marks the step and the
workflow `Failed`, and marks the workflows that depend on it `DependencyFailed`.

## Deferral (durable yield)

Some work starts now and is confirmed later: an eFormidling shipment, a payment capture, a signing order. The step can
only say "I ran fine, and the answer is not ready yet". That is a **deferral**, neither a failure nor a retry.

```csharp
return ExecutionResult.Defer(TimeSpan.FromMinutes(5), "delivery not confirmed yet");
```

The engine parks the step in `Waiting` and schedules the next check through the workflow's `backoff_until`, the same
durable timer that `StartAt` uses. A parked workflow holds no lease, worker slot or HTTP slot. `Waiting` is
non-terminal and counts as active, so a consumer must never read a parked workflow as settled.

The engine stores the reason as the step's `lastDeferReason` and shows it on status reads, and as `waitingReason` on a
collection head only while the head is parked, so it is never stale. Write it for a person: it is where a waiting step
says what it is waiting for.

The engine keeps deferrals apart from errors:

|                | Retryable error | Deferral               |
| -------------- | --------------- | ---------------------- |
| Status         | `Requeued`      | `Waiting`              |
| `ErrorHistory` | Appends         | Records nothing        |
| `RequeueCount` | Incremented     | **Reset to 0**         |
| Bounded by     | `RetryStrategy` | The step's wait budget |

The reset is deliberate. Retries bound consecutive errors between deferrals, so a poll that fails once, recovers and
polls for six more hours does not reach hour six with its retry budget spent.

`Defer` is what a **command returns**, and `Waiting` is the **state the engine puts the step in**. Failures have the
same split: a command returns `RetryableError`, and the engine records `Requeued`. So a counter counts the event
(`step.execution.deferred`) and a gauge measures the state (`workflow.waiting`).

### Three separate clocks

| Clock                      | Bounds                        | Anchored at                                   | A command reads                                       |
| -------------------------- | ----------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `command.maxExecutionTime` | One execution attempt         | The attempt's start                           | `ExecutionDeadline`                                   |
| `RetryStrategy`            | A run of consecutive _errors_ | `Step.LastDeferredAt`, else the previous step | `Step.RequeueCount`                                   |
| `command.waitBudget`       | Total time spent _waiting_    | `Step.FirstDeferredAt`                        | `Step.DeferCount`, `WaitDeadline`, `IsFinalWaitCheck` |

`CommandExecutionContext` exposes each clock, so a command can pace itself against the limits the engine enforces.
Both deadlines are absolute instants. A remaining duration starts aging once it is computed, and a command that
receives one across a network, as the Altinn app callback does, cannot tell how much has passed.

The two anchors measure different spans. `FirstDeferredAt` never moves, so the budget measures the whole wait.
`LastDeferredAt` moves with each deferral, so an error run after a long wait gets its full retry allowance. Anchoring
retries on `UpdatedAt` looks equivalent and is not: every failed attempt advances it, so the retry deadline would
slide forward and `MaxDuration` would never bind. A deferred step whose command started failing would retry forever
and never raise a failure metric.

**No clock bounds a whole workflow.** A step's worst case after a deferral is its wait budget plus its retry
`MaxDuration`, summed over a workflow's steps. All that time the workflow blocks its dependents, holds its collection
head, counts toward `BackpressureThreshold`, and keeps retention from purging it and its finished dependencies. A
resume clears both anchors, so the budget starts over. The step keeps its `StateOut`, so a resumed poller continues
from what it last recorded.

### The wait budget

`command.waitBudget` caps a step's total waiting, from its persisted first deferral. A step without one gets
`DefaultStepWaitBudget`, and enqueue rejects one above `MaxStepWaitBudget`. The cap is small on purpose. Real polls
resolve in minutes or hours, an instance pinned for weeks should fail loudly, and the cap is one side of the
callback-token lifetime invariant that `MaxStepWaitBudget` documents.

The budget is a **total allowance, not a poll interval**. The command chooses each delay, and the budget caps their
sum: a step that defers 5 minutes at a time under a 24-hour budget polls about 288 times.

The engine clamps a deferral that asks for more than the budget has left so that it lands on the deadline. The step
always spends its whole budget and gets one final execution. Rejecting the deferral would forfeit the rest of the
budget, and `Defer(24h)` under a 24-hour budget would fail without waiting.

The engine judges expiry by when an attempt **started**, so it and the command agree on which run is the last. An
attempt that started before the deadline and returns after it runs once more at once, as the final check. A command
reads `IsFinalWaitCheck` (`isFinalWaitCheck` on the app callback) and gives up on it, rather than comparing
`WaitDeadline` with its own clock. The cost is at most one attempt past the budget.

A deferral from an attempt that started at or past the deadline fails the step with the reason `wait_expired`. That
means the external outcome never arrived, not that anything broke, so it belongs to the team that owns the integration
and stays out of the default ops alert. A non-positive delay is a command bug and fails the step as `execution`. The
engine clamps a tiny positive delay up to `MinStepDeferDelay`, since a spinning park would hammer the callback target
for the whole budget.

### Deferral is stateful across attempts

`ResolveStateIn` hands a deferring step **its own** `StateOut` as the next attempt's `StateIn`, so a poller continues
from what it last recorded instead of from what the previous step left. A command can read `DeferCount` and
`WaitDeadline` to adapt its cadence, and give up deliberately when `IsFinalWaitCheck` is set. `step.wait.duration`
records the budget a step used once it resolves. It is the only signal that shows budgets being approached rather
than exceeded, so compare its upper percentiles with the budget when you size one.

The step's own cadence is the source of truth. When an external signal arrives early, [nudge](#nudge) the workflow to
cut the wait short. The step runs again and decides for itself, so a lost signal costs latency, never correctness.

## Concurrency model

`IConcurrencyLimiter` keeps three independent pools of slots: workers, database operations and outbound HTTP calls.
When the active workflow count reaches `BackpressureThreshold`, enqueue answers `429`.

Five buffered write paths take no database slot: the workflow enqueue buffer, the status write-back buffer, and the
three [mailbox write buffers](#the-three-write-paths-are-batched). Each holds one connection per flush in flight, so
their flush concurrencies bound them instead of `MaxDbOperations`, and the `slot.db.*` gauges do not count them. The
write-back buffer flushes one batch at a time. The Npgsql pool is sized to `MaxDbOperations`, so the flushes draw from
the same pool as the slot holders. Everything else takes a slot, mailbox work included: the deadline sweep's scan and
closes, and every mailbox read.

## Heartbeat & stale recovery

A worker updates `HeartbeatAt` on its in-flight workflows at every `HeartbeatInterval`. When a heartbeat is older than
`StaleWorkflowThreshold`, the processor reclaims the workflow: it resets it to `Enqueued` and runs it again. After
`MaxReclaimCount` reclaims the workflow fails. If one engine instance crashes, another reclaims its work.

The engine recovers a workflow whose write-back the database refused in the same way. Its worker lets go of it
without changing its status, so the row stays `Processing` until the reclaim takes it.

## Cancellation

A cancel request sets `CancellationRequestedAt` in the database. That durable, atomic flag is the source of truth.
`CancellationWatcherService` polls for pending cancellations, signals the cancellation token of in-flight workflows,
and `WorkflowHandler` marks them `Canceled`. Cancellation is idempotent: a repeat returns the original timestamp.

### Immediate vs. distributed cancellation

The flag guarantees that the workflow will be canceled. When it stops depends on where it runs, and
`canceledImmediately` in the response says which path the call took:

- **`true`**: the pod that received the request runs the workflow. It cancels the token before it answers, which
  aborts the running step's in-flight work, such as its HTTP call, as fast as the command honors the token.
- **`false`**: the pod does not run the workflow. If another pod runs it, that pod's `CancellationWatcherService`
  picks it up on its next tick. If the workflow is not running yet or is parked (`Enqueued`, `Requeued` or
  `Waiting`), the processor marks it `Canceled` the next time it fetches it, without running a step. A pending
  cancellation bypasses the fetch's backoff check, so a workflow behind a retry backoff or a wait timer is claimed on
  the next fetch cycle. Unsettled dependencies still gate the fetch, so a canceled dependent is finalized once its
  dependency settles.

`200 OK` means a cancellation was already pending, and `409 Conflict` that the workflow is already terminal.

## Resume

A caller resumes a terminal workflow (Failed, Canceled, DependencyFailed or Abandoned) to process it again. The engine
resets the workflow and its unfinished steps to `Enqueued`, and clears the cancellation flag, the backoff, the
heartbeat, the reclaim count and `throttled_until`. An explicit resume wins over the
[namespace circuit breaker](#failure-storm-throttling). The processor picks the workflow up on its next cycle.

With `cascade=true`, the engine also resumes every workflow that transitively depends on it and is in
`DependencyFailed`, so resuming the failed parent fixes the whole chain.

`409 Conflict` means the workflow is not in a resumable state, such as `Completed` or `Processing`.

## Abandon

A caller abandons an unsuccessful terminal workflow (Failed, Canceled or DependencyFailed) to write off its failure.

A dependency edge carries two things: sequencing (a dependent waits until its dependencies are terminal) and outcome
gating (a failed dependency condemns its dependents to `DependencyFailed`). Abandoning removes only the gating, and
only from now on:

- **New work can build past it.** A workflow enqueued later with a dependency on the abandoned one runs normally.
  `Abandoned` is terminal, but not a failure for dependency evaluation.
- **Existing consequences stand.** Dependents already in `DependencyFailed` stay as a record. They required success,
  and the dependency-recovery sweep releases them only when every dependency is `Completed`. To build past one of
  them as well, abandon it too.
- **It is not a tombstone.** A caller can still resume an abandoned workflow. If it then completes, the sweep
  recovers its `DependencyFailed` dependents as usual.
- **It releases the enqueue fingerprint.** Abandoning means the action may be retried, so the engine deletes the
  idempotency key of the request that created the workflow in the same transaction. Replaying that request, even with
  an identical body, creates and runs a fresh workflow (`201 Created`). A batch enqueue has one key for the whole
  batch, so abandoning any member releases it for all of them. The other members are untouched.

The canonical use is to supersede a failed predecessor: abandon it, then enqueue its replacement with an ordinary
dependency on it. The graph stays connected, and the write-off lives in the node's state, not in the edges.

The transition is a compare-and-set from the three source states, so `409 Conflict` also catches a concurrent resume
that revived the workflow first. Abandoning an abandoned workflow answers `200 OK` with the original `abandonedAt`.

## Nudge

A caller nudges a parked workflow, `Requeued` between retries or `Waiting` on a [deferral](#deferral-durable-yield),
to stop it waiting. The engine clears `backoff_until` and `throttled_until` and signals the processor, which claims
the workflow on its next fetch cycle. An explicit nudge wins over the
[namespace circuit breaker](#failure-storm-throttling). The step **runs again rather than being skipped**, and decides
for itself. A poller with nothing to report defers again.

Nudge is the engine's push channel. It lets an external signal, such as a webhook or an event, speed up a poll, never
carry it. The step's own cadence stays the source of truth, so a lost nudge costs one poll interval and nothing else.
Never build a flow whose correctness depends on a nudge arriving.

`200 OK` with a null `nudgedAt` means the workflow was parked but already due, so the goal state already held.
`409 Conflict` means it is not parked.

## Fail

A caller fails a parked workflow, `Requeued` or `Waiting`, when it has decided not to wait for the retries or the wait
budget to run out. The transition is a compare-and-set to `Failed`. The engine clears the backoff and marks the parked
step `Failed`, with the request's `reason` as a non-retryable entry in its error history, or a default text without
one. Consumers see what an exhausted retry would have produced: the app surfaces it through its normal failure path,
dependents settle as `DependencyFailed`, and [resume](#resume) brings it back. The engine never fails a step out from
under its worker. A workflow the processor claimed first is left alone, and the caller [cancels](#cancellation) it
instead.

Fail is not cancel. Canceling a parked workflow withdraws the work and leaves the step parked under a `Canceled`
workflow. Failing it rules on the step's outcome, and the step reads as failed everywhere. Fail when the outcome is
known to be bad and people should see a failure. Cancel when the work is no longer wanted.

`409 Conflict` means the workflow is not parked, including when it is already `Failed`. A manual failure looks the
same as one the engine produced, so unlike [abandon](#abandon) there is no idempotent replay, and a client that must
retry the call reads the workflow's status first. `400 Bad Request` means the reason is blank or too long. The engine
counts the failure with the reason `manual`, which stays out of the default ops alert.

## Failure-storm throttling

The per-namespace circuit breaker keeps one failing app from flooding the engine with retries. The
[failure-throttling ADR](../../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md) records the design and
why. It ships off: with `Throttling.Enabled` false the sweep does not run and the fetch ignores `throttled_until`.

`NamespaceThrottleService` runs the state machine every `Throttling.SweepInterval` under a PostgreSQL advisory lock,
so one replica writes at a time.

- **Trip.** When a namespace's `Requeued` population passes both thresholds, the sweep parks it behind
  `throttled_until`, jittered and clamped to each workflow's retry deadline, so throttling never costs a final attempt.
- **Probe.** A few canaries stay on the normal retry schedule. When all of them fail, the window doubles up to
  `MaxWindow`. The sweep judges a canary by its requeue count, never by timing, and a canary caught mid-attempt keeps
  the breaker waiting.
- **Recover.** Once a canary progresses, the sweep releases the parked workflows oldest first, in doubling cohorts, and
  clears the breaker only when a cohort comes back empty. A short cohort proves nothing, since the release skips rows
  that a concurrent cancellation or fetch has locked. A failed recovery trips again with the grown window.
- **Linger.** A cleared breaker's row stays for a grace period, while the sweep clears stragglers.

Each replica refreshes a snapshot of the tripped breakers (`IThrottleStateView`) every cycle, and `WorkflowHandler`
uses it to park a newly failing workflow at once, without waiting for the sweep. The snapshot fails open: once it is a
few sweep intervals old it reads as empty, so a replica whose sweep loop has died stops parking.

The manual overrides are one-shot interventions, not standing policy. [Force-trip](#force-trip-throttle) does not
prevent recovery through the canaries, and [force-clear](#force-clear-throttle) means "release now", not "never
throttle". Both take the sweep's advisory lock, and both answer `409 Conflict` while throttling is disabled, since the
fetch would ignore what they wrote. For one workflow, [nudge](#nudge) and [resume](#resume) clear `throttled_until`
without touching the breaker. The dashboard's _Throttled Namespaces_ panel shows the breakers and offers the
overrides.

## Mailboxes

A **mailbox** is a durable inbox for external messages. An app mints one on demand and hands its address to a
counterparty as the place to reply. A mailbox is not a workflow: it holds no steps, runs nothing and takes no worker,
and it lives in tables of its own. The app side of an exchange is in
[workflow engine integration](../../../App/backend/docs/workflow-engine-integration.md#mailboxes).

The engine owns the id. A caller identifies its mint with an `idempotencyKey`, unique per namespace, and a replay
returns the mailbox already minted, so a retried step lands on the mailbox whose id has already gone out as a reply
address. The id is unguessable but **not a secret**. The sender's envelope protects a message's integrity, not the id.

The required `timeout` becomes the mailbox's one absolute `deadline` (`createdAt + timeout`) at mint. The deadline
never moves, and no later operation re-arms it. `MaxMailboxTimeout` caps it, for the reason its doc comment derives.

### Two counters, and what they mean

A mailbox has two gapless logs, deliveries and receivers, with the counters `nextIdx` and `nextSeq`. Together they
give `unpairedDeliveries`: messages at positions no receiver was ever enqueued for. The counters give it exactly,
because both logs are gapless and neither is pruned piecemeal.

Pairing is about the two logs, **not about processing**. A receiver that fails, or that a dependency condemns, still
pairs its position. Its terminal state records that position, and a resume reads the message still standing there.

### Deliveries: a gapless log

The engine appends each message at the next position, under the mailbox's row lock, which keeps the log gapless.
`(mailboxId, idx)` is the primary key and the delivery's whole identity: the receiver at that position reads it with
one key lookup. The engine stores the payload verbatim and never parses it.

**Acceptance is not consumption.** A message with no receiver yet waits at its position, so an early delivery is
normal, and `409` always means _too late_.

#### Accepted versus kept

The idempotency lookup runs **before** the refusals, because what the engine kept, it keeps answering for. An accepted
message replays `200` even after the mailbox has closed or its log has filled. A `409` would make the forwarder
dead-letter a message that is waiting to be read. A refusal **stores nothing**, not even the key, so the caller can
offer the same key again once the reason is gone.

### Receive workflows

A workflow declares at enqueue, with a `mailbox` block, that its **first** step consumes one message from a mailbox.
The block names only the mailbox. The engine assigns the position, so the receivers log stays gapless: a caller that
chose its own could take a position twice or skip one, and the pairing of the two logs is the whole rendezvous. A
receiver cannot carry `startAt`, because a waiting receiver is `Held`, which has no schedule. It has no timeout of its
own either. The mailbox's deadline bounds the exchange.

#### Three enqueue outcomes, decided under the mailbox's row lock

The enqueue flush locks the mailbox row for the requests that are new (see
[the serialization point](#the-mailbox-row-is-its-own-serialization-point)), assigns `seq = nextSeq++`, and decides the
status:

| At the assigned position                        | Created                                       |
| ----------------------------------------------- | --------------------------------------------- |
| A delivery already sits there (`seq < nextIdx`) | `Enqueued`, runnable, with that message       |
| No delivery, and the mailbox is closed          | `Enqueued`, runnable, with the closing signal |
| Neither                                         | `Held`, and its registration marked held      |

The first row beats the second, which looks wrong and is not: **an accepted delivery outranks closure.** A saga that
replays after the deadline drains the backlog it was promised, and a close that races a relay in flight resolves
itself, with no "mailbox was closed" branch in the app.

The flush refuses an unknown mailbox with `400` and a full receivers log with `429`, and stores nothing for either,
not even the idempotency key. A replayed key still gets the receiver it already created, even once the log is full.

#### `Held`, and what releases it

`Held` means parked from creation: durable, visible and never started. The fetch never claims it, so it holds no
lease, heartbeat, backoff or timer. Its release commits with its cause, and the mailbox's deadline bounds the wait. It
is non-terminal and counts as active, so dependents wait and retention keeps it. The cost is admission budget for as
long as the mailbox stays open.

`engine.mailbox_receivers` holds the position, keyed `(mailbox_id, seq)` for the release and `UNIQUE (workflow_id)`
for the executor. The workflow row's nullable `mailbox_id` marks a receiver.

**Every receiver registers, whatever status it was created in.** The position is the address the executor reads the
delivery by, so an unregistered runnable receiver would get the closing signal while its message stands at its
position, which [the frozen-meaning rule](#the-receivers-meaning-is-frozen-before-it-can-run) forbids. `held_at` set
means the receiver parked, and the unreleased rows are exactly the ones the releases walk. `held_at` null means it was
created runnable, and `released_at` holds the creation time so that no release matches it.

### The rendezvous: exactly two things release a parked receiver

- **The wake**: a delivery lands at the receiver's position, in the transaction that writes the delivery.
- **The closure release**: the mailbox closes, by request or at its deadline, in the transaction that writes the
  close.

Both move the receiver from `Held` to `Enqueued` with a null backoff, so it sorts to the front of the fetch, and stamp
`released_at`. The wake names one position, and the closure release takes every parked receiver. Two guards, skip rows
already stamped and require the workflow to still be `Held`, make it safe to run them over a registry that holds every
receiver.

**The wake sharing the delivery's transaction is the design's load-bearing property.** A held receiver has no timer,
so "message stored, wake lost" would park it until the deadline with its answer one row away. Sharing the transaction
makes that state impossible. The tests check it by transaction id (`xmin`), because a test that only watches the two
rows stays green when someone splits the transaction.

Both releases lock workflow rows while they hold the mailbox row. **Mailbox row, then workflow row** is the feature's
only compound lock order. The releasing transaction issues one `NOTIFY status_changed`, which PostgreSQL sends only on
commit. **It only speeds things up**: a release that commits without it is claimed on the next fetch cycle.

### The receiver's meaning is frozen before it can run

The executor reads the message when the step runs, since it may not exist at enqueue. That would normally make a step
whose input differs between attempts. The rendezvous rules that out by construction. A receiver becomes runnable in
exactly three ways, and each settles the question first:

1. **Created with its message**: the enqueue flush found one at its position, open mailbox or closed.
2. **Released by the wake**: in the transaction that wrote the delivery, so the message exists.
3. **Released by closure**: a closed mailbox refuses every delivery, so no message can ever arrive.

So once a receiver can be fetched, **whether a message stands at its position never changes again**. The executor
reads the position, the delivery and the closure reason in one statement, in one snapshot. It **writes nothing and
locks nothing**. A recorded verdict would be a second source of truth that could disagree with the log, and a lock
would only stall a running receiver behind a change that cannot alter its answer. Every attempt, retry and resume
derives the same answer from the same rows. The single snapshot matters: under `READ COMMITTED`, a split read that
wrongly saw "no delivery" could see a close commit one statement later and pass a bug off as an ordinary closing
signal.

**A callback without a delivery therefore means one thing: the mailbox is closed and no message will ever reach this
step.** Its `disposedReason`, `deadline` or `request`, only changes the wording. Either way the handler concludes.

The rendezvous cannot reach two states, so the engine fails the step as critical when it finds one, rather than
telling a handler to conclude because of a bug. Each also counts on `mailbox.rendezvous.violations`.

| What the read finds                    | Meaning                                                 |
| -------------------------------------- | ------------------------------------------------------- |
| No registration for the workflow       | The mailbox and its whole log were purged underneath it |
| No message, and the mailbox still open | The receiver is running before its truth was frozen     |

A retry would often clear the second, since the next attempt after the sweep closes the mailbox reads a legitimate
closing signal. That is why it is critical: a violation that heals itself is never investigated, and the retry ladder
would become load-bearing in a rendezvous built so that a parked receiver needs no timer. The operator resumes the
failed step, which derives the answer again from the same rows.

#### What the app is handed

The `app` command adds a `mailbox` block to the first step's callback, with the position and either the `delivery` or
the `disposedReason`, never both, so a handler branches once. The delivery's `idempotencyKey` is the forwarding
source's message id, the same on every attempt, so a handler can deduplicate its own side effects on it.

### Closing is terminal, idempotent, and says why

A close means **the mailbox is closed for deliveries**, and nothing reopens it. It records `disposedReason`, `request`
for a caller and `deadline` for the engine, rather than leaving intent to be inferred from timestamps.

Closing also releases **every** parked receiver at once, without a delivery, so the exchange concludes through the
app's own conclusion path rather than a status the engine writes. They all go together because the mailbox accepts no
further deliveries, so all their answers froze at the same moment. A repeat close has nothing to release, and a
receiver enqueued later against a closed mailbox is created runnable.

The close reports `unpairedDeliveries`: messages that came while the app was concluding, or after the relay's last
hop. They stay readable until retention.

### The deadline is enforced by one sweep, running the same routine

A parked receiver has no timer, so the deadline is all that keeps it from waiting forever. `MailboxDeadlineService`
claims open mailboxes past their `deadline` and runs **exactly the routine a close request runs**, with
`disposedReason = deadline`. A close request that races the sweep is then a no-op for whichever writes second, never
two half-closures.

**`MailboxSweepInterval` is a term in the callback-token lifetime bound** derived on `MaxMailboxTimeout`. A receiver
parks until its deadline plus at most one interval, so raising the interval raises the worst case, and
`CallbackTokenLifetimeInvariantTests` fails rather than letting a receiver park past its token's validity.

- **The claim is the lock.** `FOR UPDATE SKIP LOCKED` takes the row lock the close needs, and leaves a mailbox someone
  else holds for the next tick.
- **One transaction per mailbox.** A close that throws leaves only that mailbox open. Otherwise one failure would wedge
  the sweep, since it orders candidates by deadline and that mailbox would lead every batch.
- **A tick drains.** Passes repeat until nothing is overdue, so "at most one interval" holds during a mass timeout. A
  pass that closes nothing ends the tick, so failing mailboxes wait for the next tick instead of spinning.
- **Nothing is enqueued.** The workflow that concludes the exchange already exists, and closing releases it.

**There is no leak backstop, and none is needed.** An open mailbox well past its deadline is an invariant violation
that `mailbox.open.overdue` alerts on, not a matter for garbage collection.

### Retention

The maintenance sweep purges a **closed** mailbox past the retention cutoff, with its deliveries and registrations. An
open mailbox is an exchange in progress whatever its age, and the deadline sweep owes it an answer. Both child tables
reference `engine.mailboxes` with `ON DELETE RESTRICT`, the schema's only non-cascading foreign keys, so a purge in the
wrong order fails instead of taking rows with it. The workflow sweep purges receive workflows on its own schedule, so
a registry row's `workflow_id` can point at nothing, which is why it has no foreign key.

### The three write paths are batched

Minting, closing and delivering each go through a buffer. A background loop drains the queue into a batch, and one
flush answers the batch over one connection. A delivery batch is bounded by payload size as well as count.

Each request gets the verdict it would have got alone. Two requests in one batch that name the same mint key, the same
mailbox to close, or the same message key on the same mailbox and namespace are decided once, and the second gets the
answer it would have got had it lost the race.

**The engine does not retry a mailbox flush.** A failed flush answers **every** request in it with `500`, and the
caller retries with the same idempotency key, which reads back either what the failed attempt committed or a fresh
verdict. The status write-back flush does retry, because a lost write-back costs a lease expiry and a re-run workflow,
while a lost mailbox flush costs only a replay. A retry here would also hold one of the few flush permits for the
whole command timeout. A flush takes no database slot (see [concurrency model](#concurrency-model)).

Canceling a call abandons the wait, not the work. A caller who gives up before its batch reaches the database writes
nothing, and one who gives up later gets a cancellation while the write commits. Replaying the idempotency key tells
the caller which happened.

#### The saving arrives with the batches

A delivery flush that accepts anything issues five statements whatever its size: lock, idempotency lookup, counter
bump, insert and receiver release, plus a `NOTIFY` when it woke a receiver. A single-message write needs four, since
it can bump the counter and insert in one statement. So below a mean batch of about 1.25 batching issues **more**
statements per delivery, one more at a batch of 1, and only above it fewer. That follows from the statement counts on
any machine.

The batch size is the arrival rate times the flush latency, so the load, not the build, decides which side an engine
is on. `mailbox_buffer.flushed ÷ mailbox_buffer.batches` shows it (see [mailbox metrics](#mailbox-metrics)).

### The mailbox row is its own serialization point

Every operation that changes a mailbox takes the mailbox row's lock **before it reads anything it decides on**, as its
transaction's first act. That is why concurrent closes collapse into one, and every new mailbox operation must keep to
it. The close and delivery flushes lock every mailbox in the batch in one `SELECT … FOR UPDATE ORDER BY m.id`.
PostgreSQL sorts before it locks, so concurrent flushes take contested rows in one order and cannot deadlock. The
enqueue flush uses the same order. Sorting the ids in C# would prove nothing, since .NET orders `Guid` differently from
PostgreSQL's `uuid`.

Two deliberate exceptions:

- **The enqueue flush locks late.** It locks only for requests that take a position, which it knows only once the
  idempotency insert has told a first arrival from a replay. Locking earlier would stall every ordinary workflow in
  the batch behind a delivery or a close. It still reads nothing that decides a receiver's outcome before the lock.
- **The mint takes no row lock**, since it creates the row. The unique index on `(namespace, idempotencyKey)`
  serializes concurrent mints of one key, and the losers get the winner's mailbox.

### Limits

`MaxOpenMailboxesPerCollection` limits a collection's open mailboxes. The engine refuses a mint past it with `429`
rather than closing something, since it cannot know which exchange the app considers finished. The cap is a
**best-effort guard, not an exact bound**: concurrent mints each check their own snapshot and can overshoot by one
each. Making it exact would serialize every mint, so do not assert on it as an invariant.

`MaxMailboxLogLength` (`429`) is the only limit on what one mailbox can cost, because deliveries skip the admission
check an ordinary enqueue passes. A delivery refused for backpressure is a message the sender may never send again.
`MaxMailboxPayloadSize` (`413`) refuses a large payload rather than truncating it. The engine validates the keys
before the database, where an over-long key would fail like a transient error and be retried until the timeout.

The delivery queue **waits rather than refuses** when full, so `MaxMailboxLogLength` stays the only capacity refusal on
the delivery path, and queue depth is a latency signal.

## Dependency graphs

Within one enqueue request, workflows name each other with `ref` and depend on each other with `dependsOn`, in any
acyclic graph. The engine refuses a request with a cycle, a duplicate `ref` or a `ref` that names nothing, and stores
the whole request atomically. A
`dependsOn` entry can also name an earlier workflow by its database id. When a workflow fails, the engine marks its
dependents `DependencyFailed`.

The dependency graph read returns every workflow connected to the requested one through dependency or link relations,
in either direction. The dashboard's chain views draw from the same graph.

## Primary and auxiliary workflows

A primary workflow is one the process waits on. An auxiliary workflow runs beside the process. It never blocks or
moves it, and its failure means that work was lost and must be run again, not that the instance is stuck.

The per-workflow `isHead` directive on enqueue encodes the category: `true` or unset is primary, and `false` is
auxiliary. The engine stores it as given and returns it on status reads. An auxiliary workflow never joins the
collection's heads, and its dependency edges never consume them, so no later enqueue waits on it. With
`dependsOnHeads`, the default, it still waits for the current heads before it runs. Nothing waits on an auxiliary
workflow, so its failure shows only on `workflow.execution.failed`, through the `is_head` attribute (see
[alerting](#alerting-on-terminal-failures)).

The collection's head frontier (`heads` on collection responses) is a different thing: the workflows the next enqueue
will depend on now. A primary workflow leaves the frontier once a later workflow depends on it, and stays primary.

| Layer                      | Primary workflow    | Auxiliary workflow |
| -------------------------- | ------------------- | ------------------ |
| English (docs, UI, prose)  | primary workflow    | auxiliary workflow |
| Norwegian (UI text)        | hovedflyt           | sideflyt           |
| Code identifiers           | `Primary…`          | `Auxiliary…`       |
| JSON and query enum values | `Primary`           | `Auxiliary`        |
| JSON property keys         | `primary`           | `auxiliary`        |
| Encoding                   | `isHead` true/unset | `isHead` false     |

Do not call the concept visible or invisible, side effect, side chain, non-critical or fire-and-forget. Keep "head"
for the frontier and the `isHead` directive.

## Telemetry & observability

The engine reports traces, metrics and logs through OpenTelemetry over OTLP, and exports them only when the deployment
sets `OTEL_EXPORTER_OTLP_ENDPOINT`. The per-signal endpoint variables do not turn exporting on. Without the endpoint
the engine sends nothing and logs no export errors: it never falls back to the SDK's default endpoint, and no setting
turns telemetry on or off. Every deployment and the compose stack set the variable, and the hosts' launch profiles
leave it to the shell. The activity source and the meter are both named `WorkflowEngine`, and are registered whether
or not anything is exported. [`Metrics.cs`](../src/WorkflowEngine.Telemetry/Metrics.cs) defines every instrument, and
[`TelemetryAttributes.cs`](../src/WorkflowEngine.Telemetry/TelemetryAttributes.cs) the attribute keys and values.

The deployment owns two settings. `OTEL_SERVICE_NAME` or `OTEL_RESOURCE_ATTRIBUTES` sets `service.name`: the App host
runs as `workflow-engine-app` and the TestApp as `workflow-engine-testapp`. Every deployment sets
`OTEL_METRIC_EXPORT_INTERVAL` to `15000`, where the SDK's default is 60 seconds.

`service.instance.id` is a UUID the engine generates when the process starts, so a restart gets a new one even in the
same pod. It is the one id allowed on every metric series, since it changes only when a process starts. With the
`altinn.workload.start_time` gauge, it gives a dashboard the processes reporting, each restart and, as the earliest
start per `service.version`, each deploy. A value set in `OTEL_RESOURCE_ATTRIBUTES` must still be unique per process.

The engine exports logs only at Warning and above, since the platform's pipeline drops the rest. The console still
gets every level the configuration allows.

Health probes are not traffic: the engine leaves them out of the HTTP request metrics and the traces, and leaves the
dashboard's requests out of the traces.

### Naming

The names follow the observability standard the team has proposed
([#21073](https://github.com/Altinn/altinn-studio/issues/21073)) and the OpenTelemetry semantic conventions' naming
rules.

- **A metric** is `altinn.workflow_engine.<object>.<name>`, with a singular object (`workflow`, `step`, `mailbox`) and
  snake_case for a two-word segment. A count has an annotation unit such as `{workflow}` and never ends in `_total`.
  `altinn.workload.start_time` is outside the prefix because every Studio service reports it under that name.
- **A timing histogram** ends in `.duration` and records seconds. `<object>.duration` is the whole, split into
  `<object>.queue.duration` and `<object>.processing.duration`.
- **An attribute key** the engine sets is a constant in `TelemetryAttributes`, named
  `altinn.workflow_engine.<object>.<property>`, or a semantic-convention key such as `error.type` with exactly its
  conventional meaning. A key a host sets is the host's own. Each concept has one key everywhere, and a value the
  engine chooses is lowercase snake_case.
- **Names and keys are a contract** with the _Workflow Engine_ Grafana dashboard
  ([`workflow-engine.json`](../../localtest/infra/grafana-dashboards/workflow-engine.json)) and with alerts. Use the
  constants, and treat a rename as a breaking change that updates the dashboard with it.

### Metrics carry bounded attributes, spans carry identities

A metric takes only attributes whose values are bounded across every app the engine serves, such as a reason, an
outcome or a command type. Never an id, and never a value an app builds. An operation id is bounded within one app but
not across the fleet, and each value would be a time series of its own. Ids go on spans, where an attribute costs one
span rather than one series. A metric says that something is wrong and of what class, and the spans and logs say
which workflow.

The one exception is `altinn.workflow_engine.namespace`, which is unbounded across the fleet. It is on the throttle
counters, as the [failure-throttling ADR](../../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md)
records, and on the errors counter's `workflow_handling` errors. Both count rare events.

### Alerting on terminal failures

The default ops alert is a terminal failure that the engine or the command caused:
`altinn.workflow_engine.workflow.execution.failed` with `altinn.workflow_engine.reason` in (`execution`, `poisoned`),
across **every** `altinn.workflow_engine.workflow.is_head` value. Route and prioritize on `is_head`, never filter on
it. `false` marks an [auxiliary workflow](#primary-and-auxiliary-workflows), whose terminal failure blocks nothing and
shows nowhere else. Leave three reasons out:

- `dependency_failed` mirrors an upstream failure that fired the alert itself, and a cascade resume of that failure
  revives the dependent.
- `wait_expired` means the external outcome never arrived, which is for the team that owns the integration (see
  [the wait budget](#the-wait-budget)).
- `manual` is a caller [failing a parked workflow](#fail) on purpose.

Two mailbox signals alert on any value above zero: `mailbox.rendezvous.violations` and a sustained
`mailbox.open.overdue` (see [mailbox metrics](#mailbox-metrics)).

VictoriaMetrics stores the metrics under their OpenTelemetry names, so a query quotes the dotted names and adds no
`_total`. Count with `increase_pure`, not `increase` or `rate`. A reason's first failure starts a new series, and only
`increase_pure` counts a new series' first value, so a single failure still fires the alert:

```promql
sum by ("altinn.workflow_engine.workflow.is_head") (
  increase_pure({"altinn.workflow_engine.workflow.execution.failed", "altinn.workflow_engine.reason"=~"execution|poisoned"}[5m])
) > 0
```

### Mailbox metrics

- `mailbox.created` and `mailbox.closed` count **state changes, not requests**, so replays do not inflate them.
  `mailbox.delivery.received` counts **every verdict, refusals included**, so a storm of bad forwards shows here and
  not only in the HTTP metrics.
- `mailbox.rendezvous.violations` means the engine broke an invariant of its own rendezvous (see
  [the frozen-meaning rule](#the-receivers-meaning-is-frozen-before-it-can-run)). Page on it differently from a step
  that fails because the app returned an error.
- `mailbox.open.overdue` reads **exactly zero** on a healthy engine. Anything else means the deadline sweep is not
  running or not draining. A mass timeout can raise it while one tick drains, so alert on persistence.
- **`mailbox_buffer.flushed ÷ mailbox_buffer.batches`, per operation over one window, is the mean batch size.** At 1.0
  every request flushed alone, and batching costs a statement per delivery (see
  [the saving arrives with the batches](#the-saving-arrives-with-the-batches)). Near `MaxBatchSize`, the buffer is
  saturated and that setting is the next to tune. `db.operation.success` is not a denominator for it, since it counts
  every database operation. On the `engine.mailbox_deliveries` insert, `pg_stat_statements`' `rows ÷ calls` is a
  cross-check that differs by the refusals.
- `mailbox_buffer.depth` measures latency, not capacity, since the queues wait rather than refuse. It is a coarse
  sample of a fast queue, and a queue that is plainly batching can read zero throughout. Only a sustained reading
  means anything.
- **The slot gauges do not see the buffered writes.** A [flush](#the-three-write-paths-are-batched) holds a connection
  without a slot, so `slot.db.used` under-reports by the flushes in flight, and `db.operation.success` counts once per
  flush on those paths.

### Traces

The engine processes a workflow in a trace of its own, not under the request that enqueued it. The entry span,
`WorkflowHandler.Handle`, links to that request's trace and to each dependency's. The request's server span carries
`altinn.workflow_engine.workflow.ids`, so the correlation runs both ways. A span name never carries a value from a
request, so find a step by `altinn.workflow_engine.step.operation_id`.

Every buffered write is two traces. The request's span covers the wait for a verdict, and the database work runs in a
separate `…Buffer.FlushBatch` trace, linked to every request or workflow it served. Follow the links, not the parent: a
flush belongs to no single request, which is also why its rows share one transaction, and one `xmin`, with the rest of
its batch.

#### Domain attributes on spans

The engine core treats a workflow's namespace and context as opaque, so it cannot say which domain object a step works
on. The host's command can, through `ICommand.GetTelemetryAttributes`, which returns nothing by default.
`WorkflowExecutor` calls it on every attempt before the command runs, and sets what it returns on the step's span
**and** the workflow's entry span, so a search finds the whole unit of work. It skips the call while neither span is
recorded, and logs and ignores a command that throws: telemetry never decides how a step runs.

A command returns identifiers, never personal data or secrets, and keeps the call cheap and free of I/O. The keys are
the host's own, such as the [App host](#appcommand)'s `AppTelemetryAttributes`. In TraceQL, `{span.<key>="<value>"}`
finds every engine span for one domain object.

#### Errors and exceptions

A failed span gets status Error, the failure's message, and `error.type`: the exception's full type name, or a
low-cardinality reason the engine names at the call site, or `_OTHER`. Never a value from a request. A span that later
succeeds drops both.

No span records an exception event. Every place that catches an exception without rethrowing it writes an ERROR log
in the same trace, with the stack trace, so the traces datasource's link to the logs shows it from the failed span.

### Where to look locally

`studioctl env up --monitoring` runs a collector on the host's OTLP ports, with Grafana at
<http://local.altinn.cloud:8000/grafana>. Its _Workflow Engine_ dashboard is in the _Altinn Studio_ folder, and its
_Traces_ datasource takes TraceQL. [Monitoring](docker.md#monitoring) covers how an engine on the host or in the
compose stack reaches a collector, and the [dashboard settings](#dashboard-trace-links) give the engine dashboard its
trace links.

## Dashboard

The engine serves a dashboard at its root. It reads its own read-only endpoints under `/dashboard/`, and its operator
actions call the public `/api/v1` endpoints, so the UI exercises the contract external callers use.
[Dashboard](dashboard.md) specifies it.

## API reference

The OpenAPI document at `/swagger` describes each operation, its parameters and its models, and links each operation
to its section here. This section adds the behavior a caller needs that the schema cannot show.

The workflow, collection, mailbox and namespace throttle routes start with `/api/v1/{namespace}`. The namespace is a
string the caller chooses and the engine treats as opaque. The Altinn apps use `{org}/{app}`. It is one path segment,
so its slash is percent-encoded: `ttd/my-app` is `ttd%2Fmy-app`.

Across the API, `202 Accepted` means this call made the state change, and `200 OK` means the change had already
happened. `404 Not Found` means the namespace has no such resource. Refusals carry problem details.

### Enqueue workflows

`POST /api/v1/{namespace}/workflows` stores one or more workflows and their [dependency graph](#dependency-graphs)
atomically. The `idempotencyKey` query parameter identifies the request, and the optional `collectionKey` chains it
onto a [collection](workflow-collections.md). `201 Created` means the engine stored them. `200 OK` means the key has
already enqueued this request, and returns the original workflows. That guarantee lasts until retention purges the
key, or until a workflow it created is [abandoned](#abandon). `409 Conflict` means the key was used with a different
body, `400 Bad Request` that validation failed, and `429 Too Many Requests` that the engine is at
`BackpressureThreshold`.

### List workflows

`GET /api/v1/{namespace}/workflows` lists workflows newest first, with the same items as the single read. The status,
label, collection and `role` filters combine; `role` is `Primary` or `Auxiliary` (see
[Primary and auxiliary workflows](#primary-and-auxiliary-workflows)). Pagination is by cursor: pass `nextCursor` back
as `cursor`, and a null `nextCursor` marks the last page. `includeState=false` works as on the single read.
`204 No Content` means nothing matched, and `400 Bad Request` that a status or role value is unknown.

A collection's failed auxiliary workflows are one call, drained to zero by `resume` and `abandon`. `Abandoned` is left
out of the status set on purpose: it marks a failure that has been written off.

```http
GET /api/v1/ttd%2Fmy-app/workflows?collectionKey={key}&role=Auxiliary&status=Failed&status=Canceled&status=DependencyFailed
```

### Get single workflow

`GET /api/v1/{namespace}/workflows/{workflowId}` returns a workflow and its steps. `executionStartedAt` is the start of
the most recent attempt, as the models' doc comments describe. Derive a duration from it, never from `createdAt`,
which counts queue wait as processing time. The stored value trails the worker by up to one write-back: an attempt's
`step_started` write-back is fire-and-forget, and the update buffer drops it under pressure. A duration from a settled
step is exact, and one from a `Processing` step is indicative.

`role` is `Primary` or `Auxiliary`, derived from the workflow's `isHead` directive and always present. `isHead` is the
raw directive, returned only when the enqueue request set one; read `role` instead. `includeState=false` leaves the
app's state payloads, `initialState` and every step's `stateOut`, out of the response. The default is `true`; a status
reader with no use for them, such as Studio's admin panel, passes `false`.

### List collections

`GET /api/v1/{namespace}/collections` is the per-collection health view, in a stable key order with an opaque cursor.
Each entry carries its head workflow ids without their statuses, and [get collection](#get-collection) adds those. It
also carries a `workflowCounts` rollup across all of the collection's workflows, split into primary and auxiliary.
The endpoint has three modes: list (`cursor`, `pageSize`), annotate (`key`, repeatable) and discover
(`failures=Any|Primary|Auxiliary`). [Query endpoints](workflow-collections.md#query-endpoints) has the mode rules and
the buckets. `204 No Content` means nothing matched in list or discover mode. Annotate mode always answers `200 OK`,
and lists the requested keys with no collection in `unmatchedKeys`, since retention may have purged them.

### Get collection

`GET /api/v1/{namespace}/collections/{key}` returns one collection with the status of each head, and each head's
`failedAttempts`, `firstFailedAt` and `waitingReason` as [retry](#retry--error-handling) and
[deferral](#deferral-durable-yield) describe. `404 Not Found` means the namespace has no collection with that key.

It is a frontier view by contract: auxiliary workflows never appear in it, and it carries no `workflowCounts` rollup,
since it sits on the app's hot path. Read health from [list collections](#list-collections), and a collection's
failures from [list workflows](#list-workflows) with the `collectionKey`, `status` and `role` filters.

### List namespace throttles

`GET /api/v1/throttles` lists the [circuit breaker](#failure-storm-throttling) state of every namespace that has one:
tripped, recovering, or cleared and still lingering. It works whether or not throttling is enabled. `204 No Content`
means no breaker state exists.

### Get namespace throttle

`GET /api/v1/{namespace}/throttle` returns one namespace's breaker state. `404 Not Found` means the namespace has none.

### Force-trip throttle

`POST /api/v1/{namespace}/throttle/trip` trips the breaker now, whatever the thresholds say, with the initial window
and fresh canaries, also when it is already tripped. Recovery through the canaries proceeds as usual. `202 Accepted` returns the resulting state, and
`409 Conflict` means throttling is disabled.

### Force-clear throttle

`POST /api/v1/{namespace}/throttle/clear` clears the breaker and every `throttled_until` stamp in the namespace. The
next sweep trips again if the condition still holds. The state row lingers through the grace period, so the sweep
still clears stragglers that a replica's stale snapshot parked. `202 Accepted` returns the resulting state, and
`200 OK` means the breaker was already clear. `404 Not Found` means the namespace has no breaker state, and `409 Conflict` that throttling is
disabled.

### Mint mailbox

`POST /api/v1/{namespace}/mailboxes` mints a [mailbox](#mailboxes), idempotent on `(namespace, idempotencyKey)`.
`201 Created` means this call minted it, and `200 OK` returns the one the key already minted, even when the collection
is at its cap, since a replay creates nothing. `400 Bad Request` means a key is empty or longer than 200 characters,
or the `timeout` is not positive or exceeds `MaxMailboxTimeout`. `429 Too Many Requests` means the collection holds
its maximum of open mailboxes. The cap is [best-effort](#limits), so treat it as a signal to back off, not as an exact
count.

### Get mailbox

`GET /api/v1/{namespace}/mailboxes/{mailboxId}` returns the mailbox: its status, its deadline, both
[counters](#two-counters-and-what-they-mean) and the unpaired deliveries. `404 Not Found` means the namespace has no
mailbox with that id.

### Close mailbox

`DELETE /api/v1/{namespace}/mailboxes/{mailboxId}` [closes](#closing-is-terminal-idempotent-and-says-why) the mailbox.
`202 Accepted` means this call closed it. `200 OK` means it was already closed, by a caller or by its deadline, and
reports the **original** `disposedAt` and `disposedReason`. `404 Not Found` means the namespace has no mailbox with
that id.

### Deliver to mailbox

`POST /api/v1/{namespace}/mailboxes/{mailboxId}/deliveries` appends one message to the mailbox's
[log](#deliveries-a-gapless-log), idempotent on `(mailboxId, idempotencyKey)`. Pass the source's own message id as the
key. `202 Accepted` returns the position, `idx`, and not the payload, since the position is all the caller did not
know. `200 OK` returns the delivery the key already made, at its position, even after the mailbox has closed.
`409 Conflict` means the mailbox is closed, which always means _too late_, and the detail says whether a caller or the
deadline closed it. `404 Not Found` means no such mailbox in the namespace, `413 Content Too Large` that the payload
exceeds `MaxMailboxPayloadSize`, and `429 Too Many Requests` that the log has reached `MaxMailboxLogLength`.

## Health checks

`/api/v1/health` runs every check. `/api/v1/health/ready` runs the checks tagged `ready`, which report the engine's
status, and `/api/v1/health/live` answers `200` while the process runs. The versionless `/health`, `/health/ready` and
`/health/live` redirect to them with `301`. Never point a probe at those: a probe counts a `3xx` as a pass, and the
redirect never runs the readiness check.

The engine is degraded while it is disabled, its queue is full or the database is unavailable, and unhealthy when it
is stopped or reports itself unhealthy (`Engine.HealthLevel`). The response includes worker, connection and queue counts. Probes are left out of
the HTTP request metrics and the traces.

## Configuration

`EngineSettings` holds the settings, bound from the `EngineSettings` configuration section, and
[`Defaults.cs`](../src/WorkflowEngine.Core/Constants/Defaults.cs) holds their defaults. Their doc comments say what
each one does. The engine reads them once at startup, with `IOptions<T>` rather than `IOptionsMonitor<T>`, since the
settings worth tuning, such as the slot, pool and buffer sizes, cannot change while the process runs. Tune a
deployment with environment variables in its overlay, such as `EngineSettings__Concurrency__MaxWorkers`, and restart
it.

Some settings constrain each other:

- **The callback-token lifetime.** The app mints a workflow's callback token at enqueue, and it never refreshes. So
  `MaxStepWaitBudget`, `MaxMailboxTimeout` and `MailboxSweepInterval`, with retention and the retry ladder, must keep
  a workflow's worst-case lifetime inside the token's validity. `MaxMailboxTimeout` documents the derivation, and
  `CallbackTokenLifetimeInvariantTests` fails when a change breaks it.
- **Database connections.** `Concurrency.MaxDbOperations` sets both the slot pool and the Npgsql pool size. The
  buffered write paths hold connections from that pool without a slot, up to their flush concurrencies (see
  [concurrency model](#concurrency-model)).
- **Mailbox flush concurrency.** The close buffer flushes one batch at a time, because a close locks mailbox rows and
  their receivers' workflow rows. The delivery buffer's concurrency is low on purpose, since a storm aimed at one
  mailbox queues on that mailbox's row lock anyway.
- **Throttling** ships off. The App host turns it on (see
  [its README](../../workflow-engine-app/README.md#namespace-circuit-breaker)).

### Dashboard trace links

The dashboard links each workflow to its trace once the host names a trace viewer, in one of two ways:

- `Dashboard.TraceUrlTemplate`: the URL of one trace's page, with `{traceId}` where the trace ID goes. For the .NET
  Aspire dashboard that is `http://localhost:18888/traces/detail/{traceId}`.
- The Grafana pair, `Dashboard.GrafanaUrl` and `Dashboard.GrafanaTracesDatasourceUid`. The link opens the trace in
  Grafana Explore on that Tempo datasource.

The template wins when both are set. With neither, or only half the Grafana pair, the dashboard draws no trace links.
An empty or whitespace value counts as unset, so a compose file can pass an unset variable through. The engine refuses
to start when the template is not an absolute `http` or `https` URL containing `{traceId}`. The server resolves the
settings into one template, which the dashboard reads once from `GET /dashboard/config`. A host sets them like any
other setting, such as `EngineSettings__Dashboard__TraceUrlTemplate`. studioctl sets the Grafana pair on the engine it
runs with `--monitoring`.

## The app layer: `WorkflowEngine.App`

[`workflow-engine-app`](../../workflow-engine-app/README.md) is the host for Altinn apps. It adds `AppCommand`, which
runs a step by calling back to the app.

### AppCommand

- **Type string**: `app`. The data is `AppCommandData`, and the context `AppWorkflowContext`.
- **Execution**: an HTTP POST to `AppCommandSettings.CommandEndpoint`, a URL template whose placeholders the command
  fills from the workflow context. The callback carries `executionReferenceTime`: the workflow's `startAt`, or else the
  step's creation time.
- **Classification**: 2xx is success, 408, 418, 429 and 5xx are retryable, and any other 4xx is critical.
- **State**: the command reads `state` from the response body and returns it as the step's output. The next step's
  callback receives it as `state`.
- **Validation**: the engine validates every context field at enqueue, so an invalid request never enters the queue.
- **Mailbox**: on a receive workflow's first step, the callback carries the block that
  [what the app is handed](#what-the-app-is-handed) describes. It is `null` on every other callback.
- **Telemetry**: the command names the app instance on the step's span and the workflow's entry span through
  [`GetTelemetryAttributes`](#domain-attributes-on-spans), so `{span.altinn.instance.guid="<guid>"}` in TraceQL finds
  the engine's work on an instance. Its `AppCommand.Execute` client span carries the command key. These keys are the
  host's own, in `AppTelemetryAttributes`. The
  [App host's README](../../workflow-engine-app/README.md#telemetry) says why the instance owner's party id and the
  actor stay off telemetry.

### Callback authentication

The **app** mints the JWT that secures its callbacks, and the **engine** relays it. The engine issues no credentials of
its own.

1. **At enqueue**, the app mints a short-lived JWT signed with a `WorkflowEngineCallback` app code. Its `jti` claim is
   the instance guid, and the signing code's expiry bounds its lifetime.
2. The token travels through the engine opaquely in `AppWorkflowContext.CallbackToken`. The engine stores it and
   sends it as `Authorization: Bearer` on **every callback**.
3. **On each callback**, the app validates the token's signature and lifetime against its `WorkflowEngineCallback`
   codes, and checks that `jti` matches the `instanceGuid` in the route, so a token acts only on its own instance.

The callback token shares the `Authorization` header with the platform's JwtCookie authentication, so a selector
policy scheme sends only callback requests to the `WorkflowEngineCallback` scheme and everything else to the default.

Data writes during a callback run as `StorageAuthenticationMethod.ServiceOwner()`. That is why an app's `policy.xml`
must grant the service owner write rights on all tasks.
