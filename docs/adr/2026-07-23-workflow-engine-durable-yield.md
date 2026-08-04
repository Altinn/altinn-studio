# Durable yield: a first-class "waiting" outcome for workflow-engine steps

- Status: Approved
- Deciders: Team Apps
- Date: 23.07.2026

## Result

- A1: A new non-failure command outcome (`ExecutionResult.Defer(delay)`) that parks the step in a
  non-terminal `Waiting` status and reschedules it via the existing `backoff_until` gate, bounded by
  an engine-enforced wait budget (`command.waitBudget`), with a first-class `nudge` endpoint as
  the optional push accelerator. eFormidling delivery confirmation moves onto this primitive, and the
  app-side Altinn Events receive stack it exists to serve is retired in v9.

## Problem context

Several integrations are "start now, confirm eventually": eFormidling shipments, and in the future
payments and signing. Today eFormidling has no poll loop of its own — after sending, the app publishes
a CloudEvent *to itself* through Altinn Events and abuses the Events retry machinery as its timer: the
`EventsReceiverController` returns HTTP 425 to mean "remind me later" and Events' exponential backoff
becomes the (uncontrollable) poll cadence. Expiry means the platform team manually drains a dead-letter
queue. The loop is untestable in localtest (which doesn't emulate Events delivery), the secret-code
contract is broken against rotation (#19605), and the confirmation half still drives `process/next`
from inside a webhook handler.

The workflow engine is the natural home for this work, but it lacked a way for a step to say "I ran
fine, the answer isn't ready yet." A command could only succeed or fail; polling jerry-rigged onto
`RetryableError` would increment `RequeueCount`, append persisted `ErrorHistory`, emit
`engine.steps.execution.requeued`, and eventually fire the `engine.workflows.execution.failed` ops
alert for a non-error condition.

## Decision drivers

- B1: Waiting must not be represented as failure anywhere — not in status, error history, retry
  counters, or alerting metrics.
- B2: A waiting step must not hold a worker slot, an HTTP slot, or a lease.
- B3: Waits must be bounded, with expiry as an explicit, distinctly-classified outcome instead of a
  manually-drained dead-letter queue.
- B4: Error retries and polling must stay orthogonal — a transient failure of one poll attempt uses
  the retry budget; "checked, not ready" does not.
- B5: External signals (webhooks, events) may accelerate a poll but must never be load-bearing for
  correctness.
- B6: `Waiting` must be indistinguishable from other in-flight states to consumers: it is work still
  in progress, so nothing may read a parked workflow as settled or idle-ready.
- B7: Nice to have: minimal new machinery — reuse the existing scheduler and dashboard surfaces.

## Alternatives considered

- A1: Durable yield — the deferred-outcome / `Waiting`-status / wait-budget / nudge design described
  under Result.
- A2: Park-and-callback — suspend the step indefinitely and resume it only via a new authenticated
  engine resume endpoint invoked when an external event arrives.
- A3: Status quo — keep the Altinn Events self-reminder loop (425-as-scheduling-protocol) and harden
  it (#19605).

## Pros and cons

### A1 (chosen)

- Good, because it satisfies B1–B4 directly: `Waiting` is in the incomplete (non-failure) status set,
  deferrals record no error history and reset the retry counter, wait expiry is its own
  `reason=wait_expired` metric tag, and parked workflows release their lease and worker slot.
- Good, because it satisfies B6 with one status set rather than a parallel concept: `Waiting` joins
  `Incomplete`, so the fetch gate, the retention guard that protects a parked dependent's
  dependencies, the `active` gauge, and the app-side "is this transition still running" predicates all
  pick it up from the same definition.
- Good, because it satisfies B7: `backoff_until` already implements durable scheduling (`StartAt`
  rides on it); the diff is one enum member per axis, one handler branch, one fetch-query change, and
  a wait-budget check.
- Good, because it satisfies B5: `POST .../nudge` clears a parked workflow's backoff idempotently and
  re-executes the step (never skips it), so a lost signal costs one poll interval and nothing else.
  It also gives durable timers ("defer 24h") and honest `Retry-After` handling for free.
- Bad, because worst-case confirmation latency is one poll interval (mitigated by the nudge).
- Bad, because a parked workflow keeps blocking its dependents and holding its collection head for up
  to the wait budget; `MaxStepWaitBudget` is the backstop, and callers own choosing a sane budget.

### A2

- Bad, because correctness would depend on external webhook delivery — the same fragility the current
  design suffers from (violates B5); requires a new authenticated resume surface and a liveness story
  for lost callbacks. eFormidling's integration point is pull-only anyway.

### A3

- Bad, because the poll cadence belongs to another service's retry policy, expiry is a manual
  dead-letter process (violates B3), the loop cannot run in localtest, and it keeps an app-side
  receive stack (`EventsReceiverController`, `IEventsSubscription`, `IEventSecretCodeProvider`)
  whose only first-party consumer is this loop and whose secret contract needs a redesign (#19605).

## Consequences

- Multi-phase integrations ("send, then confirm") get their shape from **staged service tasks on
  the public `IStagedServiceTask` surface**: the app declares the work steps (`Steps`) and the one
  concluding step (`FinalStep` — the only step kind that can conclude the task or auto-advance the
  process, structurally), expanded to one engine step per pipeline step at enqueue time. The
  engine's step ledger is the durable send guard — a completed step never re-runs, and a retry or
  an operational resume re-enters the pipeline at the failed step — while the per-step `StepId`
  remains the outbound idempotency key for the crash window inside one attempt (send succeeded,
  response never landed). The guard is never `DeferCount` — an attempt can send, crash before
  answering, and re-run with the count unchanged. Steps share state the way service tasks already
  do — through the instance data mutator, saved on step completion — deliberately introducing no
  new handoff channel; a typed per-step input/output relay was built and then backed out as
  machinery the feature doesn't need. eFormidling in v9 migrates onto this as a send step plus a
  polling final step (IP status mapped to Success / Defer / Critical / Retryable), idempotent per
  #18888. An earlier iteration of this decision chose a **single** task phasing itself on
  checkpointed evidence and rejected the multi-step split for forking the first-party integration
  off the API third parties get; that objection dissolved when the split itself became the public
  API.
- **Checkpoints — the interim app-managed send guard — were designed, built, and removed within
  this change.** They stored evidence as instance data values written immediately, deliberately
  outside the save-on-success unit of work; exactly that out-of-band write collides with the
  upcoming instance-lock feature, and the staged split makes the concept unnecessary: "the send
  happened" is the engine's own step-completion record, and what a step learns is ordinary
  instance data saved on its completion through the lock-holding save path — durable exactly when
  the step's completion is. Storing durable business evidence engine-side stays rejected (it
  would make the engine's database a second source of business truth and end its
  rebuildable-machinery operational posture). Evidence that must survive BPMN round trips
  (each pass is a new workflow) — e.g. eFormidling's one-shipment-per-instance ownership claim —
  is the same instance data, read on a later pass; the eFormidling claim keeps its pre-existing
  shape until its v9 migration.
- A deferral's reason travels to every surface that shows a wait: persisted on the step
  (`lastDeferReason`), projected onto a `Waiting` collection head (`waitingReason`), and annotated
  on the app's process reads (`workflow.waitingReason`) — so waiting UIs and ops read the task's
  own words instead of a generic spinner.
- The app-facing surface ships with the primitive, not after it: `ServiceTaskResult.Defer` plus the
  `ProcessStepOptions.WaitBudget` that bounds it, and the staged pipeline surface
  (`IStagedServiceTask`, with per-step `StepOptions` so the wait budget sits on the polling step
  alone). Shipping the budget alone would release a public, binary-compatible-forever knob
  configuring a wait no app could request. The primitive and its app surface ship together;
  migrating eFormidling, payment capture and signing is the next phase.
- **Deferral is stateless.** A deferring attempt saves nothing: the app echoes the incoming state
  blob back unchanged and rejects (non-retryable) a deferring handler that modified instance data,
  so every re-check starts from exactly the state the step first received. At this level of
  sharding, a step that checks-and-waits is by definition not a step that records — work that
  produces something durable belongs in its own pipeline step, completed rather than deferred.
  This reverses the earlier "stateful across attempts" decision, which existed to let a *single*
  re-entrant task accumulate what it learned between polls; the staged split removes that need. A
  `state` parameter on `Defer` stays rejected as a third state channel alongside Storage and the
  signed blob.
- Park and defer are deliberately **identical UX on a layouted service task** — both leave the
  process on the committed task (park awaits an external release, e.g. Fiks Arkiv's callback;
  defer polls, e.g. eFormidling), and an app-supplied layout owns the waiting presentation for
  both. Without a layout the split stays visible: park renders the built-in service-task waiting
  view, defer the ordinary advancing view, and `workflow.status` (`idle` vs `processing`) reports
  the truth in both. The synchronous `process/next` wait releases early (success shape, short
  grace) once the anchored chain parks in `Waiting` — safe because deferral is post-commit by
  construction, so the instance already carries the committed target task.
- The app-side Altinn Events **receive** stack is retired in v9 (`EformidlingStartup`,
  `EformidlingStatusCheckEventHandler2`'s process-advance, `EventsReceiverController`,
  `EventHandlerResolver`, `IEventsSubscription`, `IEventSecretCodeProvider` + KeyVault provider).
  The **publish** side (`IEventsClient`) stays — third parties subscribe to app events. #19605 is
  superseded rather than implemented.

## Implementation notes

Four details are load-bearing, and all four are easy to "simplify" back into bugs.

- **The wait budget clamps rather than rejects.** A deferral overshooting the remaining budget schedules
  to the deadline. Rejecting it would forfeit the unspent remainder and make `Defer(24h)` under a 24h
  budget fail without ever having waited. Expiry is therefore triggered by a deferral *at or past* the
  deadline, so every step gets one final execution.
- **Two anchors, not one.** `FirstDeferredAt` bounds the budget; `LastDeferredAt` anchors the retry
  deadline for errors after a deferral. The retry anchor cannot be `UpdatedAt` — the obvious-looking way
  to reach "the last deferral's write-back" — because that column advances on *every* write-back, so each
  failed attempt slides the deadline forward and `MaxDuration` stops binding. Under the shipped default
  (no `MaxRetries`) a deferred step whose command starts failing would retry forever.
- **`StateIn` prefers a step's own `StateOut`.** The engine hands a re-executing deferred step the
  state that step itself last returned, not the previous step's. With stateless deferral the app
  echoes the incoming blob back, so the two are identical in practice — but the preference stays
  load-bearing as the engine-side contract: it is what makes "every re-check starts from the state
  the step first received" true regardless of what a (non-app) command returns, and it is narrow by
  construction — only success-shaped outcomes write `StateOut`, so deferral is the only path that
  produces state and then re-executes.
- **Cancelling a parked workflow clears its backoff.** The in-memory cancellation watcher only reaches
  workflows a pod is executing, so without clearing `backoff_until` a cancel would sit unapplied for up
  to `MaxStepWaitBudget`. `Enqueued` is excluded: there `backoff_until` carries `StartAt`, and clearing
  it would run a scheduled workflow early rather than cancel it.
