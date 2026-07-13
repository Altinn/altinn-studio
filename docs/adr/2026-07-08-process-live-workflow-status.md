# Surface live workflow-engine status in the process state

- Status: Proposed
- Deciders: Team (App runtime + frontend)
- Date: 08.07.2026

## Result

A1: Enrich the process state returned to the frontend with a live `workflow` annotation
(`idle` | `processing` | `failed`, plus `targetTask` and `failure`) resolved from the v9
workflow engine on every read, while keeping the Storage-committed `currentTask` as the
routing anchor. The frontend renders the committed task but suppresses/replaces its actions
based on the annotation, and polls until the annotation settles.

## Problem context

An Altinn 3 (v9) app instance has **two sources of truth** for where the process is:

1. **Committed state** — Storage's `Instance.Process` (`currentTask`, `ended`, …). It only
   ever reflects *terminal, committed* transitions, because the workflow engine flips it
   atomically at the single `SaveProcessStateToStorage` commit step. It **lags** the engine.
2. **Live engine state** — the workflow engine's per-workflow/per-step status
   (enqueued/processing/requeued/completed/failed/…). This is the real, current status of a
   transition in flight.

Before this decision the frontend only ever saw the committed clock: the process state it reads
(`GET .../process`, or the process embedded in the enriched instance) enriched the persisted
`ProcessState` with authorization and static BPMN metadata but never consulted the engine, and
the serialized contract had no field for runtime status.

Consequences of the frontend seeing only the lagging clock:

- **Post-timeout background retries.** `process/next` blocks server-side polling the engine for
  ~100s; on timeout it returns **504**, but the engine keeps retrying (long-lived). The user is
  left on Task_1 with an active *Submit* button while the engine is committing Task_2.
- **`ResumeRequired` limbo.** A workflow that failed terminally needs `POST process/resume`, but
  via a read it is **indistinguishable** from a healthy active task (`currentTask` set, `ended`
  null). The only way to discover it is to *attempt* an action and read the error.
- **Concurrent sessions / reload.** Another session advances the instance; this one keeps
  offering the old task's actions until it happens to act.

In every case the frontend offers the user the wrong options because it cannot tell
*in-progress* / *failed* / *settled* apart. The one channel that did carry live status — the
`processNextState` / `workflowFailure` extensions on a failed `process/next` response — was
ignored by the frontend entirely, and is only present as an *action* result, never on a read.

We want a read the frontend can poll that reflects the **real** status of the instance.

## Decision drivers

- D1: The frontend must be able to distinguish *settled* / *in-progress* / *failed* from a
  **read** (not only by attempting an action), so it never offers actions that will collide with
  an in-flight transition or that are invalid on a failed one.
- D2: Correctness over cleverness. Avoid introducing a second cache of a truth that can drift
  out of sync with the engine.
- D3: Don't break the routing/rendering model. Rendering a task's form requires that task's
  data/permissions/validation context to actually exist; we must not render a task the engine
  is only *heading toward*.
- D4: Keep the consumer contract small and stable. Don't leak engine implementation details;
  don't overwhelm consumers with states that make no behavioural difference to them.
- D5: Nice to have: pave the way to eventually drop the synchronous block-and-wait compatibility
  layer in `process/next` and go fully asynchronous.
- D6: No regression for the existing synchronous flow, telemetry, or the resume/reject paths.

Given constraint from the team: **the workflow engine runtime is always up** — a v9 app is
100% codependent on Storage and the engine; if the engine is down, the app is down. Calls to the
engine are designed to be cheap, and if a call turns out not to be cheap that is a cause to
optimise the engine, not to avoid calling it. This removes availability/latency as a driver
against calling the engine on the read path.

## Alternatives considered

- A1: **Live-enrich the process response unconditionally.** The process-state enrichment queries
  the engine on every read and adds a `workflow` annotation next to the (unchanged) committed
  `currentTask`. Frontend polls it.
- A2: **Persisted marker.** Write a "pending → Task_X" / "resume required" marker onto the
  instance at enqueue and clear it on terminal completion via the engine callback; the read stays
  cheap and Storage-authoritative.
- A3: **Separate live status endpoint.** Leave the process read untouched; add
  `GET .../process/status` that the frontend polls only when it has a reason to.
- A4: **Live engine state drives routing.** The enriched `currentTask` reflects where the engine
  is heading; the frontend routes forward immediately.

## Pros and cons

### A1: Live-enrich unconditionally (chosen)

- Good, because it satisfies D1: every read reflects live truth, so cold reloads, concurrent
  sessions and post-504 background retries are all covered for free.
- Good, because it satisfies D2: the engine remains the single source of truth; nothing is
  cached that can drift.
- Good, because it satisfies D4: the annotation is a small, closed enum derived from data the
  app already fetches.
- Good, because with the always-up/cheap engine constraint, the usual downside (coupling the
  read path to engine availability/latency) does not apply here.
- Neutral: adds an engine round-trip to each process/instance read. Accepted per the team
  constraint; see the read-path efficiency decisions below.

### A2: Persisted marker

- Good, because reads stay cheap and Storage-authoritative without touching the engine.
- Bad, because it violates D2: it is a second copy of the truth. The failure mode is precisely
  the class of bug we are fixing — the marker goes stale when the client gives up but the engine
  finishes in the background, and the "reliably clear after a background give-up" path is a
  footgun.
- Bad, because a first-class field would require a change to the cross-team Storage `Instance`
  model; app-owned alternatives (`DataValues`, a dedicated data element) are hacks.

### A3: Separate live status endpoint

- Good, because it keeps the hot read path unchanged.
- Bad, because it only partially satisfies D1: the frontend must *know when* to poll, so a cold
  reload into a post-504 state still needs at least one probe baked into load — i.e. it collapses
  back toward A1 anyway, with an extra endpoint to maintain.
- Neutral: the "keep reads cheap" motivation is weak once the engine call is cheap and always
  available (D-constraint).

### A4: Live engine state drives routing

- Good, because it is maximally real-time.
- Bad, because it violates D3: it would render Task_2's form before Task_2's data/permissions/
  validation context is committed, producing broken or unauthorized renders during the in-flight
  window.

## The contract

The enriched process state (`AppProcessState`) gains a nested annotation; `currentTask`, `ended`,
`processTasks`, `actions` etc. are **unchanged**.

```jsonc
{
  "currentTask": { "elementId": "Task_1", "altinnTaskType": "data", /* … unchanged … */ },
  "ended": null,
  "processTasks": [ /* … unchanged … */ ],
  "workflow": {
    "status": "idle" | "processing" | "failed",
    "targetTask": "Task_2",            // omitted when idle / unknown
    "failure": {                       // present only when status == "failed"
      "kind": "StepFailed | DependencyFailed | EngineFault | Timeout"
    }
  }
}
```

- `workflow` is always present on an enriched read. `idle` is the common case (no active/failed
  workflow for the current task) and means "render normally".
- `targetTask` is the BPMN element id of the task the in-flight/failed transition targets
  (resolved from the `processNextTargetId` label stamped at enqueue, flow suffix stripped).
  Omitted when `idle` or unresolvable.
- `failure` carries only the coarse `kind` classification. The raw failure detail (the engine's
  last recorded error message) is **never serialized to clients**: it originates from
  exception/callback messages and can carry internal infrastructure text (platform response
  bodies, exception messages from app-authored hooks). It remains available server-side — the
  callback controller logs every command failure and the engine persists the step error history —
  so nothing is lost for diagnostics.
- We intentionally do **not** expose retry counts, workflow ids, collection keys, or raw engine
  statuses. `processing` covers the first attempt and every automatic retry — the consumer
  behaviour (wait) is identical, so the distinction is noise (D4).

State mapping (engine → exposed):

| Engine collection-head status                         | Exposed `status` |
| ----------------------------------------------------- | ---------------- |
| No active or failed head / `Completed` / `Abandoned`  | `idle`           |
| `Enqueued` / `Processing` / `Requeued`                | `processing`     |
| `Failed` / `Canceled` / `DependencyFailed`            | `failed`         |

`Abandoned → idle`: an abandoned workflow was written off (e.g. by a bpmn-allowed reject) and no
longer blocks the current task; the user can act normally.

## Design decisions that follow

Backend:

- **The engine stays the single source of truth (D2).** No new persisted state anywhere; the
  annotation is recomputed from the engine on every read. The status resolver
  (`ResolveWorkflowTaskStatus`) is a presentation projection alongside the process engine's
  control-flow lookup (`GetCurrentTaskWorkflowState`); it resolves off the **collection heads**,
  so concurrent branches collapse to the single processing/failed signal the consumer needs.
- **The read path never fails on a status hiccup.** Enrichment degrades to `idle` (render
  normally) on any non-cancellation error, logging a warning — basic instance rendering must not
  couple to a transient engine blip; the next poll recovers the true status. Cancellation
  propagates.
- **Read-path efficiency.** The enriched read runs on every page load and every poll tick, so it
  is 1 engine call for the common idle *and* processing cases and 2 only for failed: (1) the
  process-next collection key is deterministically derived from the instance
  (`ProcessNextRequestFactory.CreateCollectionKey`, the single source of truth for the key
  algorithm, shared with enqueue so the two cannot drift), letting the resolver go straight to
  `GetCollection` instead of label-discovery queries; and (2) the engine includes each head's
  `labels` on the collection view (`CollectionHeadStatus.Labels`, projected from the workflow row
  at no extra query cost), so a processing transition's target task is read straight off the
  head. Only a *failed* transition lists the collection's workflows, because the failure `kind`
  classification is built from the step error history.
- **Failure classification shares the wait path's visibility rules.** The failed-case workflow
  list is filtered through the same `ScopeToCurrentChain` seam the enqueue wait and resume-target
  lookup use, so any workflow category excluded from transition-failure classification (e.g. the
  non-blocking side-effects workflows of
  `2026-07-10-workflow-engine-noncritical-side-effects.md`) is excluded here too, from one place.

Frontend:

- **Fetched status drives a state machine** in `ProcessWrapper`, layered on the committed-task
  routing: `idle` renders normally; `processing` replaces the task UI (which suppresses its
  Submit/next affordances) and polls the instance until the status settles; `failed` replaces the
  task UI with a failure state and a **Retry** button calling `POST process/resume`, then
  returns to `processing` + poll. Because the state is sourced from the fetched instance, it
  survives reloads and works cross-session.
- **Raw failure detail never reaches the citizen.** The read-path annotation ships only the
  failure `kind`; the citizen UI renders a localized generic message. Shipping unrendered detail
  "for diagnostics" would only widen exposure (any browser devtools sees the payload) while the
  same information is already logged server-side and persisted in the engine's error history. A
  first-class, app-authored *user-safe* failure message is a follow-up.
- **Polling is jittered** (~2–3s) so many clients waiting on the same engine don't synchronise
  into a thundering herd — which would otherwise peak exactly when the engine is already slow.
  After ~20s in `processing` the UI adds a "taking longer than usual" reassurance line.
- **The synchronous error path converges on the same machine.** A `process/next` response
  carrying `processNextState` (`retrying` → `processing`, `resumeRequired` → `failed`) refetches
  the live-enriched instance and lets the polled status take over, instead of a hard error toast
  — finally consuming the extensions the frontend previously ignored.
- **The processing message does not name the target task.** Task ids aren't user-facing and app
  authors rarely give them meaningful names; `targetTask` stays in the contract for diagnostics
  and other consumers.

## Consequences

- Positive: reads (and therefore reloads, concurrent sessions, and post-504 limbo) reflect the
  live truth; a terminally failed transition is discoverable and retryable from the UI instead of
  by attempting an action; no second copy of process truth exists anywhere.
- Positive (D5): because the frontend converges purely off the fetched `workflow.status`, the
  backend's synchronous block-and-wait in `process/next` becomes an implementation detail it can
  shed later — `process/next` could return `processing` immediately and the frontend converges
  via polling, with no client change.
- Negative / accepted: every enriched read costs an engine round-trip (per the always-up/cheap
  constraint; kept to a single call for idle/processing).
- Interaction with the side-effects split (`2026-07-10-workflow-engine-noncritical-side-effects.md`):
  the annotation resolves off collection heads, and side-effects workflows are `IsHead=false`, so
  a running or failed side-effects workflow never surfaces as `processing`/`failed` on a read.
  This is intentional — they are non-blocking by design and monitored via the engine instead.

### Follow-ups (not blockers)

- Whether the **end user is the right actor** to retry an engine failure at all, vs. a "received,
  we're processing it" model with ops alerting — a product decision.
- App-authored **user-safe failure message** channel (so useful, safe detail *can* be shown).
- `Abandoned → idle` mapping re-confirmed against the reject path.
- True **backoff** (not just jitter) for very long-running processing, if load warrants.
- **Collapse the *failed* read to a single call too**: a compact last-error summary on
  `CollectionHeadStatus` (engine side) would remove the second `ListWorkflows` — deferred because
  failed is the rare case and it would duplicate the step-error extraction the app already does.
- **Share the resolver core** between `ResolveWorkflowTaskStatus` and
  `GetCurrentTaskWorkflowState` (the control-flow lookup still discovers the collection via label
  queries; both could key off the deterministic collection key).

## Related

- `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md` — the workflow engine
  integration layer (enqueue/labels/callbacks, command phases, the `SaveProcessStateToStorage`
  commit boundary, waiting and failure classification).
- `docs/adr/2026-07-10-workflow-engine-noncritical-side-effects.md` — the non-blocking
  side-effects split this design deliberately does not surface (see Consequences).
- `docs/adr/2025-10-22-pdf-generation-architecture.md` — prior v9 runtime ADR.
