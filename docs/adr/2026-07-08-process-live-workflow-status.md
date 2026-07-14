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
      "kind": "stepFailed | dependencyFailed | engineFault | timeout",
      "workflowId": "…",               // support reference; omitted when unknown
      "occurredAt": "…"                // when the failure was recorded; omitted when unknown
    }
  }
}
```

- `workflow` is present on every enriched read **unless the consumer opts out** with
  `?includeWorkflowStatus=false` (on `GET …/process` and the enriched-instance read), in which
  case it is omitted entirely — "not resolved" stays distinguishable from `idle`, and the read
  does not touch the engine. The opt-out exists for bulk/machine-to-machine consumers (e.g.
  service-owner dashboards enumerating instances) that don't need liveness and shouldn't inherit
  the engine as a read dependency; it is deliberately **not** inferred from the caller's identity
  (an org token polling for `processing` to settle is a legitimate consumer).
- `idle` is the common case (no active/failed workflow for the current task) and means "render
  normally".
- `targetTask` is the BPMN element id of the task the in-flight/failed transition targets
  (resolved from the `processNextTargetId` label stamped at enqueue, flow suffix stripped).
  Omitted when `idle` or unresolvable.
- `failure` carries the coarse `kind` classification plus the safe structured facts a support
  dialogue needs: the failed workflow's id (`workflowId` — the **support reference** operations
  can look up in the engine) and when the failure was recorded (`occurredAt`). The raw failure
  detail (the engine's last recorded error message) is **never serialized to clients**: it
  originates from exception/callback messages and can carry internal infrastructure text
  (platform response bodies, exception messages from app-authored hooks). It remains available
  server-side — the callback controller logs every command failure and the engine persists the
  step error history, keyed by the support reference — so nothing is lost for diagnostics.
- Beyond the support-reference fields we intentionally do **not** expose retry counts, collection
  keys, or raw engine statuses. `processing` covers the first attempt and every automatic retry —
  the consumer behaviour (wait) is identical (D4). Two presentation-only concessions exist, both
  resolved from the same single `GetCollection` call: the `retrying` hint (true while the head is
  `Requeued`, i.e. parked between automatic retry attempts, omitted otherwise) and the `progress`
  step counts (`completed`/`total` of the transition's workflow steps — the engine's collection
  heads carry `stepsCompleted`/`stepsTotal`, nullable on the wire so the contract stays additive).
  Neither changes what a consumer should do, but they let the waiting UI explain a long wait
  honestly and show movement; the step *identities* stay internal.

State mapping (engine → exposed):

| Engine collection-head status                         | Exposed `status`                    |
| ----------------------------------------------------- | ----------------------------------- |
| No active or failed head / `Completed` / `Abandoned`  | `idle`                              |
| `Enqueued` / `Processing`                             | `processing`                        |
| `Requeued`                                            | `processing` (+ `retrying: true`)   |
| `Failed` / `Canceled` / `DependencyFailed`            | `failed`                            |

`Abandoned → idle`: an abandoned workflow was written off (e.g. by a bpmn-allowed reject) and no
longer blocks the current task; the user can act normally.

## Design decisions that follow

Backend:

- **The engine stays the single source of truth (D2).** No new persisted state anywhere; the
  annotation is recomputed from the engine on every read. The status resolver
  (`ResolveWorkflowTaskStatus`) is a presentation projection alongside the process engine's
  control-flow lookup (`GetCurrentTaskWorkflowState`); it resolves off the **collection heads**,
  so concurrent branches collapse to the single processing/failed signal the consumer needs.
- **Engine communication errors fail the read, loudly.** A v9 app is codependent on the engine
  (the given constraint), so an error *talking* to it is a systemic fault: masking it as `idle`
  would silently re-introduce the exact stale-state bug this decision fixes, and hide the outage
  from standard error-rate telemetry. Enrichment therefore propagates communication errors (a 500
  on the read); only **definitive negative findings** — no collection for the deterministic key,
  no active or failed head — resolve to `idle`. A 5s resolution budget bounds the lookup so a
  slow engine fails the read fast (as an actionable `TimeoutException`) instead of holding it for
  the HTTP client's full timeout; caller cancellation propagates as cancellation. An earlier
  iteration degraded every error to `idle` with a warning log; it was reviewed away as
  unobservable — a persistent outage would show every instance as idle-with-actions while only
  emitting warnings nobody alerts on.
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
  task UI with an **error page**. Because the state is sourced from the fetched instance, it
  survives reloads and works cross-session.
- **The failed state offers no user Retry — recovery is ops-driven.** By the time the engine
  reports `failed` it has already exhausted its automatic retry budget, so inviting the citizen
  to retry would be dishonest (it would almost always fail again) and shifts an operational
  problem onto the wrong actor. The failed screen is an error page: a localized generic message,
  a contact-support pointer, and an expandable details section (the same widget as the
  unknown-error page) containing only **safe structured facts** — a localized label for the
  failure `kind`, the failed step, when it failed, and the failed workflow id as a **support
  reference**. Operations resume the workflow via the (unchanged) `POST process/resume`
  endpoint, and the failed state's slow poll (~10–12s jittered) is the recovery mechanism: the
  page converges on its own once the resume settles, no reload needed.
- **Raw failure detail never reaches the citizen.** The read-path annotation ships only the
  failure `kind` plus the safe support-reference fields (`workflowId`, `occurredAt`); the citizen
  UI renders a localized generic message. Shipping unrendered detail "for diagnostics" would only
  widen exposure (any browser devtools sees the payload) while the same information is already
  logged server-side and persisted in the engine's error history, keyed by the support reference.
  A first-class, app-authored *user-safe* failure message is a follow-up — the path to richer
  citizen-facing detail. The same rule applies to the synchronous action responses: a failed
  `process/next`/`resume` ships a stable generic `detail` derived from the failure kind, and its
  `workflowFailure` extension is stripped of the recorded error message (the controller logs the
  raw text instead). The instantiation / process-start recovery contract
  (`WorkflowInitializationProblemDetails`) is a separate, machine-facing channel and is
  deliberately unchanged.
- **Polling is jittered** (~2–3s) so many clients waiting on the same engine don't synchronise
  into a thundering herd — which would otherwise peak exactly when the engine is already slow.
- **The waiting screen escalates honestly as the wait grows** (spinner + predefined text per the
  #18935 design discussion; every string is an app-overridable text resource): a "Steg x av y"
  indicator showing live progress through the transition's workflow steps (from the annotation's
  `progress`, omitted when an older engine reports no counts), the `retrying` explanation when the
  engine reports the transition parked between automatic retries (replacing the generic
  reassurance), a "taking longer than usual" line after ~20s, and after ~60s an info alert that
  the user's data is durably stored and the page can safely be closed — the processing continues
  server-side either way, and a transition can legitimately be stuck retrying for hours.
- **Transient poll failures don't tear down the UI.** With the hard-fail backend semantics, an
  engine blip now surfaces as failed instance reads — but a client holding renderable data must
  not flash the full error page over a single failed poll. `InstanceProvider` tolerates up to 3
  consecutive failed refetch cycles (each already retried internally; ~30–45s of continuous
  failure) before escalating to the error page, counted in cycles rather than wall-clock so a
  backgrounded tab (polling pauses) doesn't escalate on its first refetch after refocus. From the
  second failed cycle the processing view adds an honest "trouble reaching the server" line. The
  initial load (no data yet) still fails straight to the error page, and the escalated state is
  **sticky with auto-recovery**: the error page's own subscribers refetch the errored query
  (flipping it to pending), so without stickiness the UI would flip-flop between spinner and
  error page in an endless refetch loop — a pre-existing bug this change fixes; a later
  successful fetch clears the state and restores the UI.
- **The synchronous error path converges on the same machine.** Both a blocked `process/next`
  (409 carrying `processNextState`: `retrying` → `processing`, `resumeRequired` → `failed`) and a
  terminally failed or timed-out one (500/504 carrying `workflowFailure`) refetch the
  live-enriched instance and let the polled status take over, instead of a hard error toast —
  finally consuming the extensions the frontend previously ignored.
- **Settling converges the URL, not just the data.** A transition can settle while the session's
  URL is still parked on the pre-transition task (a mid-transition reload, an ops resume, a
  concurrent session). The poll converges the data on its own; when the busy status clears and
  the committed task no longer matches the URL, the page navigates onto the committed task —
  mirroring what the same-session `process/next` flow does — instead of stranding the user on the
  stale task's "not available" error. A URL that is stale *on arrival* (an old deep link, no
  observed busy status) keeps the navigation error and its manual button.
- **The processing message does not name the target task.** Task ids aren't user-facing and app
  authors rarely give them meaningful names; `targetTask` stays in the contract for diagnostics
  and other consumers. The "Steg x av y" indicator shows only *numbers* — progress through the
  transition's workflow steps (`completed + 1` of `total`) — never the internal step or task
  identities, and is omitted when the engine didn't report counts.

## Consequences

- Positive: reads (and therefore reloads, concurrent sessions, and post-504 limbo) reflect the
  live truth; a terminally failed transition is discoverable from a read — surfaced to the citizen
  as an honest error page with a support reference, and recovered by ops resuming the workflow
  (the page converges via the failed-state poll); no second copy of process truth exists anywhere.
- Positive (D5): because the frontend converges purely off the fetched `workflow.status`, the
  backend's synchronous block-and-wait in `process/next` becomes an implementation detail it can
  shed later — `process/next` could return `processing` immediately and the frontend converges
  via polling, with no client change.
- Negative / accepted: every enriched read costs an engine round-trip (per the always-up/cheap
  constraint; kept to a single call for idle/processing), and — deliberately — the engine becomes
  a hard dependency of the enriched read: an engine outage fails process/instance reads (surfacing
  through standard error-rate alerting) rather than silently rendering stale-but-actionable state.
  This also reaches the action responses (`process/next`, `resume`, `complete` enrich their
  response): if the engine dies in the window after a transition committed but before enrichment,
  the client gets a 500 for an action that succeeded — honest, and the frontend refetches and
  converges. Consumers that don't want the coupling opt out per read
  (`includeWorkflowStatus=false`).
- Interaction with the side-effects split (`2026-07-10-workflow-engine-noncritical-side-effects.md`):
  the annotation resolves off collection heads, and side-effects workflows are `IsHead=false`, so
  a running or failed side-effects workflow never surfaces as `processing`/`failed` on a read.
  This is intentional — they are non-blocking by design and monitored via the engine instead.
- Known gap / accepted: the resolver reports `idle` for a process that has **ended**
  (`CurrentTask == null`) without consulting the engine, but the final (task → end) transition's
  post-commit steps (e.g. `CompletedAltinnEvent`, configured deletes) still run *after* `ended`
  is committed. A terminal failure there parks the workflow as ResumeRequired in the engine, yet
  no read ever surfaces it — the receipt renders normally and there is no user-facing retry.
  Detection and recovery is ops alerting on the engine's failed workflows. Revisit if these
  post-end steps ever gain user-visible significance.

### Follow-ups (not blockers)

- App-authored **user-safe failure message** channel (so useful, safe detail *can* be shown) —
  the path to richer citizen-facing failure detail than the generic message + support reference.
  (The original open question — whether the end user is the right actor to retry an engine
  failure — was decided: no. The engine has already exhausted its retry budget when it reports
  `failed`, so the UI shows an error page and recovery is ops-driven via `POST process/resume`.)
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
