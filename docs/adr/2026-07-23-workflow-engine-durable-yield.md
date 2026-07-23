# Durable yield: a first-class "waiting" outcome for workflow-engine steps

- Status: Proposed
- Deciders: Team Apps
- Date: 23.07.2026

## Result

- A1: A new non-failure command outcome (`ExecutionResult.Defer(delay)`) that parks the step in a
  non-terminal `Waiting` status and reschedules it via the existing `backoff_until` gate, bounded by
  an engine-enforced wait budget (`command.maxWaitDuration`). eFormidling delivery confirmation moves
  onto this primitive, and the app-side Altinn Events receive stack it exists to serve is retired in v9.

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
- B6: Nice to have: minimal new machinery — reuse the existing scheduler and dashboard surfaces.

## Alternatives considered

- A1: Durable yield — `ExecutionResult.Deferred` + non-terminal `Waiting` status, scheduled through
  the existing `backoff_until` fetch gate, with a per-step wait budget and a `wait_expired` failure
  classification. Push (e.g. an Events webhook) becomes an optional accelerator via the existing
  skip-backoff nudge.
- A2: Park-and-callback — suspend the step indefinitely and resume it only via a new authenticated
  engine resume endpoint invoked when an external event arrives.
- A3: Status quo — keep the Altinn Events self-reminder loop (425-as-scheduling-protocol) and harden
  it (#19605).

## Pros and cons

### A1 (chosen)

- Good, because it satisfies B1–B4 directly: `Waiting` is in the incomplete (non-failure) status set,
  deferrals record no error history and reset the retry counter, wait expiry is its own
  `reason=wait_expired` metric tag, and parked workflows release their lease and worker slot.
- Good, because it satisfies B6: `backoff_until` already implements durable scheduling (`StartAt`
  rides on it); the diff is one enum member per axis, one handler branch, one fetch-query change, and
  a wait-budget check.
- Good, because it satisfies B5: `skip-backoff` extended to `Waiting` gives an idempotent nudge —
  lost signals cost only latency, never correctness. It also gives durable timers ("defer 24h") and
  honest `Retry-After` handling for free.
- Bad, because worst-case confirmation latency is one poll interval (mitigated by the nudge).

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

- eFormidling in v9 becomes: send step (idempotent per #18888) → await-delivery poll step (IP status
  mapped to Success / Defer / Critical / Retryable) → confirm-and-advance step.
- The app-side Altinn Events **receive** stack is retired in v9 (`EformidlingStartup`,
  `EformidlingStatusCheckEventHandler2`'s process-advance, `EventsReceiverController`,
  `EventHandlerResolver`, `IEventsSubscription`, `IEventSecretCodeProvider` + KeyVault provider).
  The **publish** side (`IEventsClient`) stays — third parties subscribe to app events. #19605 is
  superseded rather than implemented; any future reintroduction of an events receiver should be
  designed per its generate/validate + stable-endpoint notes.
