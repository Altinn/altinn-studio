# Failure-storm throttling: a namespace circuit breaker for the workflow engine

- Status: Accepted
- Deciders: Team Apps
- Date: 13.08.2026

## Result

- A1: A per-namespace circuit breaker, generic to the engine. A periodic sweep detects namespaces
  whose retrying (`Requeued`) workflow population exceeds both an absolute floor and a fraction of
  the namespace's active workflows, parks that population behind a new dedicated `throttled_until`
  gate (jittered, exponentially growing window), keeps a small rotating set of canary workflows on
  the normal retry schedule, and releases the parked horde in exponentially growing oldest-first
  cohorts once any canary progresses. The sweep is the sole writer of breaker state; the workflow
  handler cooperates read-only by parking newly failing workflows in an open namespace immediately.
  Tracked by #18481.

## Problem context

When a callback target breaks — the app is misconfigured, Maskinporten is down, an external API the
app depends on is unreachable — every in-flight workflow for that app fails and retries on the same
schedule. The engine's default retry strategy is exponential backoff capped at `MaxDelay` (5 minutes
in production) with no attempt limit inside a 24-hour `MaxDuration` window, so a fleet of 10 000
stuck instances settles into a steady state of ~2 000 futile callbacks per minute, sustained for up
to a day, against a target that is already struggling. The backoff calculation has no jitter and the
dispatcher orders strictly by wake time, so the retries also arrive in synchronized waves.

Nothing in the engine limits this today: no rate limiting, no circuit breaking, no per-namespace
fairness. One failing namespace can occupy every worker slot on every replica, and the only
backpressure is a global active-workflow ceiling at the enqueue API. The retry storm harms the
target (request-spam against a service trying to recover), the engine (worker slots, database
churn), and operators (log and alert noise drowning other signals).

A namespace maps 1:1 onto a callback target in the Altinn deployment: the app runtime enqueues with
namespace `{org}/{app}`, and the callback URL is templated to one host per org/app. A per-namespace
breaker is therefore a per-target breaker without the engine learning any Altinn domain concept.

## Decision drivers

- B1: The breaker must never harm healthy work. Its blast radius must be limited to workflows that
  are already failing; workflows on other tasks, other instances, or first attempts must flow
  untouched.
- B2: Detection and intervention must be cause-agnostic. Whether the cause is the platform, the app,
  or a third party, the remedy — stop hammering, probe, reopen gradually — is the same, so the
  design must not depend on classifying error causes.
- B3: The mechanism must be generic to the engine: keyed on engine primitives only, usable by any
  future deployment of the engine, with no Altinn vocabulary in the core.
- B4: Zero cost on the healthy path. No new work in the dispatch loop or the enqueue path when no
  breaker is open; breaker logic must not add per-workflow overhead in normal operation.
- B5: Legible in a year: simple calculations with tunable constants over adaptive algorithms, and a
  state machine one person can narrate.
- B6: Recovery must be automatic, gradual, and robust to individually-broken workflows; manual
  operator actions (force open/close, per-workflow nudge) must always win over the automation.
- B7: Throttling must never cost a workflow its final retry attempt within its `MaxDuration` budget.
- B8: The feature must ship dark: disabled by default, enabled per environment, and remain a
  kill-switchable leaf that can be disabled or deleted without touching workflow semantics.

## Alternatives considered

- A1: Sweep-driven namespace circuit breaker with canary-based recovery and cooperative handler, as
  described under Result.
- A2: In-process circuit breaker in the command/HTTP layer (Polly-style): each replica trips a
  breaker per callback host after N consecutive failures and short-circuits attempts.
- A3: Fairness in the dispatcher: per-namespace dequeue quotas or round-robin in the fetch query so
  one namespace cannot monopolize worker slots.
- A4: Error-signature clustering: group failures by cause (status code, message shape) and throttle
  only workflows failing with the dominant signature.
- A5: Finer scoping: key the breaker on the failing step's operation id (approximating a BPMN task)
  instead of the namespace.
- A6: Status quo: rely on exponential backoff, `MaxDelay`, and `MaxDuration` to bound the damage.

## Pros and cons

### A1 (chosen)

- Good, because it satisfies B1 structurally: the intervention only ever touches workflows already
  in `Requeued`. Healthy instances at other process steps never enter that status and are never
  parked; new enqueues are not gated and each new workflow gets exactly one real attempt before it
  cooperates. The breaker can make almost nothing worse than it already was.
- Good, because it satisfies B2 and B5 together: the trip condition is two comparisons over one
  `GROUP BY namespace` count that an operator can reproduce by hand in psql.
- Good, because it satisfies B3: `namespace` is the engine's only universal tenancy primitive — it
  is already the unit of API routing, idempotency scoping, and dashboard slicing — and the breaker
  contract ("one key ≈ one shared failure domain") holds for any deployment that groups
  correlated-fate workflows per namespace.
- Good, because it satisfies B4: all judgment runs in a low-frequency background sweep. The dispatch
  loop gains one indexed predicate (`throttled_until`), and with throttling disabled the process
  selects the query variant without that predicate at startup, making the column fully inert.
- Good, because it satisfies B6: canaries probe recovery continuously; a quorum of one opens
  recovery (premature release self-corrects by re-tripping, while requiring unanimity would let one
  idiosyncratically-broken workflow block recovery indefinitely); canaries rotate on every window
  extension so a poison canary costs at most one window cycle; release cohorts grow exponentially
  with jitter; force-open/force-close endpoints and the existing nudge override everything.
- Good, because it satisfies B7 with one rule: every `throttled_until` stamp — sweep or handler — is
  clamped to the step's retry deadline. `MaxDuration` is wall-clock, so throttling never consumes
  retry budget; it only reduces the number of futile attempts within the same window, and the clamp
  guarantees the final attempt still happens.
- Good, because it satisfies B8: seven configuration knobs under `EngineSettings.Throttling` with
  `Enabled: false` as shipped default, and all state confined to one new column, one new table, and
  one background job.
- Bad, because detection is population-based, so a storm smaller than the absolute floor — or
  diluted below the ratio inside a very large namespace — never trips. Accepted: the residual
  hammering is bounded by the existing backoff caps, and thresholds are tunable.
- Bad, because the handler gains one read-only dependency (the open-breaker snapshot) — the first
  tendril of throttle-awareness in the execution path. Contained by the strict division: the sweep
  decides, the handler applies.

### A2

- Bad, because per-replica in-memory state cannot coordinate: N replicas each need their own failure
  streak before short-circuiting, and trip/release decisions diverge across the fleet (violates B5's
  one-narrator ambition and weakens B6).
- Bad, because short-circuiting still burns the full dispatch cycle — fetch, lease, worker slot,
  retry bookkeeping — per attempt. The win of A1 is keeping parked work out of the poller entirely
  (violates B4 under storm conditions, when it matters most).
- Bad, because "consecutive failures per host" has no view of population size, so it cannot
  distinguish one broken workflow retrying forever from ten thousand (violates B1: it would trip on
  a single stuck workflow and delay it further for no benefit).

### A3

- Bad, because it solves a different problem: fairness caps a namespace's *share* of workers but the
  futile retries still run at that share forever — the target keeps getting hammered and the retry
  budget keeps burning (fails the core goal; B2's remedy never happens).
- Bad, because it puts per-namespace grouping into the hottest query in the system permanently, paid
  on every fetch whether or not anything is wrong (violates B4).
- It remains a legitimate future feature for noisy-neighbor isolation — orthogonal to, not competing
  with, failure throttling.

### A4

- Bad, because the engine's persisted error data cannot support it: an `ErrorEntry` is timestamp,
  free-text message, nullable status code, and a retryable flag — and the status code is null for
  every app callback today. Clustering free text is exactly the fragile cleverness B5 forbids.
- Bad, because the intervention would be identical anyway: whatever the cause, the remedy is parking
  the failing population and probing. Cause knowledge changes nothing the breaker does, so its
  precision is spent on nothing.
- Grouping by status code once the data exists is a compatible later refinement of A1's detection,
  not a competing design.

### A5

- Bad as the v1 key, because shared causes fragment: a platform outage (Maskinporten) fails every
  service task at once, splitting one storm into many per-task pools that can each sit under the
  absolute floor while the namespace-level count screams (violates B1's protective intent in the
  scenario that actually produces the largest storms).
- Bad, because the concern it addresses is already structurally absent from A1: the namespace is the
  *detection* scope, not the blast radius — only already-`Requeued` workflows are parked, so a
  failing service task never throttles healthy steps (see B1).
- Bad, because per-key canary bookkeeping and a per-task ratio denominator ("active workflows
  currently at that step"?) multiply state and edge cases (violates B5).
- The one real residual — detection dilution inside very large mixed namespaces — is tunable via
  thresholds first, and `(namespace, failing-step operation id)` remains the named refinement axis
  if production shows it is needed. BPMN vocabulary stays out of the engine either way.

### A6

- Bad, because the steady state it accepts is the problem statement: thousands of synchronized,
  futile callbacks per minute for up to 24 hours against a struggling target, with operators' only
  tools being manual cancellation at scale.

## Consequences

- **Schema.** One new nullable column `engine.workflows.throttled_until` (a scheduling gate parallel
  to `backoff_until`, never a replacement — `backoff_until` stays purely the retry/schedule clock);
  the fetch query gains `AND (throttled_until IS NULL OR throttled_until <= now())`, and the hot
  partial index is extended via the established concurrent-swap migration pattern. One new table
  `engine.namespace_throttles` (namespace PK, breaker state, tripped-at, current window, canary ids
  with their requeue counts at selection, evaluation stats). One supporting partial index for the
  per-namespace count of incomplete workflows.
- **The sweep decides, the handler applies.** A new periodic background job (following the existing
  `DbMaintenanceService` shape, but under a Postgres advisory lock — single writer across replicas,
  one narrator for the state machine) runs detect → throttle → probe → release and is the only
  writer of `engine.namespace_throttles`. It publishes the set of open breakers; each replica's
  workflow handler holds a read-only in-memory snapshot (refreshed per sweep cycle, expiring
  fail-open if refresh stops) and, on a
  retryable failure in an open namespace, parks the workflow immediately with
  `throttled_until = now + window`, jittered and deadline-clamped — the same rule the sweep applies.
  The handler never writes breaker state and never judges.
- **Detection.** Trip requires both `MinRequeuedWorkflows` (absolute floor, default 50) and
  `MinRequeuedRatio` (fraction of the namespace's active workflows, default 0.5). The dual condition
  keeps small-but-broken apps and large-but-noisy apps from tripping.
- **Recovery.** Quorum of one canary opens recovery; cohorts release oldest-first (fair, and
  nearest-deadline-first) with jitter, doubling per sweep; canaries rotate on every window
  extension. Failed recovery re-trips and the window memory persists in the state row.
- **Configuration.** Seven knobs under `EngineSettings.Throttling`: `Enabled` (default false),
  `MinRequeuedWorkflows`, `MinRequeuedRatio`, `SweepInterval` (30 s), `CanaryCount` (3),
  `InitialWindow` (10 min), `MaxWindow` (1 h) — validated at startup. Window growth factor (×2),
  release cohort growth factor (×2, starting at canary scale), and jitter fraction (±20 %) are
  named constants, deliberately not configuration: they interact multiplicatively, and no operator
  can predict an altered combination's emergent behavior without reading the code. No per-namespace
  configuration: engine config is restart-only by design, and transient incidents are served by the
  runtime force-open/force-close endpoints instead.
- **Prerequisites shipped separately** (each valuable alone): `AppCommand` passes the HTTP status
  code into `ExecutionResult` so app-callback error entries carry it (today only `WebhookCommand`
  does), and the retry delay calculation gains jitter so retry waves de-synchronize with or without
  a breaker.
- **Observability.** Trip/extend/release events logged and emitted as metrics tagged with the
  namespace, a dashboard panel listing open breakers, and manual override endpoints. The namespace
  label's worst case is a platform-wide cause tripping one breaker per namespace, so its
  cardinality bound is the number of namespaces the deployment serves — accepted deliberately:
  series only materialize for namespaces that trip, the tagged metrics are incident-grade counters
  (per trip/extension/cohort, never per workflow), and unlabeled aggregates would leave operators
  unable to tell *who* is throttled without leaving the metrics view.
- **Explicitly deferred, with promotion triggers.** Gating fresh enqueues (promote if high-volume
  machine-to-machine producers make first attempts alone a hammer; mechanism would be a jittered
  delayed `StartAt`, not a 429). Failure-velocity counters for faster detection (promote if
  sweep-time counts prove too slow in practice). Detection keyed on `(namespace, failing-step
  operation id)` (promote if large-namespace dilution shows up in production metrics). Command-
  reported failure-domain keys, e.g. webhook target host (promote when a deployment mixes unrelated
  targets in one namespace).

## Implementation notes

Six details are load-bearing, and each is easy to "simplify" back into a defect.

- **The deadline clamp is per-stamp, not per-trip.** Every write of `throttled_until` — initial
  parking, window extension, handler cooperation — independently clamps to that step's retry
  deadline. Clamping only at trip time would let a later extension overshoot a deadline that was
  fine earlier, silently stealing the final attempt (B7).
- **Throttle effects live only in `throttled_until`.** The handler must not express cooperation by
  inflating its computed backoff: effects in the dedicated column are identifiable and undoable
  (release, nudge, straggler cleanup can target `throttled_until IS NOT NULL`), whereas an inflated
  `backoff_until` is indistinguishable from a legitimate long retry and cannot be recalled after
  recovery.
- **A closed breaker lingers.** A replica's snapshot can be stale by up to one sweep interval, so a
  handler may park a workflow into a namespace whose breaker just closed — and nothing would ever
  release it. The state row therefore persists in a closed state for a grace period during which
  the sweep clears any non-null `throttled_until` in that namespace. Deleting the row at close is
  the natural-looking simplification that creates orphans.
- **The handler's snapshot fails open, never closed.** The snapshot carries its publication time and
  reads as empty once older than a few sweep intervals: a replica whose sweep loop has died must
  lose its power to park, not keep exercising a frozen view (which would otherwise stamp workflows
  into a long-closed namespace after the grace-period row is gone, with nothing left to clear them).
  A missing or stale snapshot merely returns parking duty to the sweep — the authoritative writer —
  at the cost of one sweep's cooperation latency. The failure direction is asymmetric by design: a
  failing sweep is loud (error metric, cycle-level backoff) and its absence is safe, because nothing
  re-stamps elapsing windows, so throttling decays rather than ratchets. The closed-state grace
  period exceeds the staleness bound so stragglers parked at the edge are still cleared.
- **Canary outcomes are judged by progress, not liveness.** A canary observed with an increased
  requeue count has failed; one that left `Requeued` for a settled or advanced state with its count
  unchanged has progressed; one that is currently executing is *neither* — being leased proves
  nothing about the target, and in a hang-until-timeout storm an in-flight probe is the failure
  mode's signature, so counting it as progress would release cohorts into a hanging target that
  cannot even feed the re-trip signal until its attempts time out. The sweep waits for the attempt
  to record its result. Comparing against the requeue count recorded at selection is what makes the
  judgment race-free. Canaries need no exemption from handler cooperation: a verdict takes one probe
  (a failure is in the requeue count the moment the canary requeues, and parking it afterwards just
  stops a proven-failing probe from hammering out the rest of the window), and rotation atomically
  unparks the replacements.
- **Disabled means inert, not dormant.** With `Enabled: false` the sweep does not run *and* the
  fetch query variant without the `throttled_until` predicate is selected at startup (configuration
  is restart-only, so the choice is per-process-lifetime and the SQL stays a compile-time constant).
  Merely stopping the sweep would leave previously parked workflows waiting out their windows after
  the kill switch is thrown.
