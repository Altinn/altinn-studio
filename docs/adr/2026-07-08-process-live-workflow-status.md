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
2. **Live engine state** — the workflow engine's per-workflow/per-step `PersistentItemStatus`
   (`Enqueued/Processing/Requeued/Completed/Failed/Canceled/DependencyFailed/Abandoned`). This
   is the real, current status of a transition in flight.

Today the frontend only ever sees the committed clock. The process state it reads
(`GET .../process`, or the process embedded in the enriched instance) is produced by
`ProcessStateEnricher.Enrich(instance, instance.Process, user)`, which enriches the persisted
`ProcessState` with authorization + static BPMN metadata and **never consults the engine**.
The serialized contract has no field for runtime status (verified: the generated OpenAPI
process schemas contain zero status/state/failure fields).

Consequences of the frontend seeing only the lagging clock:

- **Post-timeout background retries.** `process/next` blocks server-side polling the engine for
  ~100s; on timeout it returns **504**, but the engine keeps retrying (long-lived). The user is
  left on Task_1 with an active *Submit* button while the engine is committing Task_2.
- **`ResumeRequired` limbo.** A workflow that failed terminally needs `POST process/resume`, but
  via a read it is **indistinguishable** from a healthy active task (`currentTask` set, `ended`
  null). The only way to discover it today is to *attempt* an action and read the error.
- **Concurrent sessions / reload.** Another session advances the instance; this one keeps
  offering the old task's actions until it happens to act.

In every case the frontend offers the user the wrong options because it cannot tell
*in-progress* / *failed* / *settled* apart. The one channel that does carry live status — the
`processNextState` / `workflowFailure` extensions on a failed `process/next` response — is
currently ignored by the frontend entirely, and is only present as an *action* result, never on
a read.

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

- A1: **Live-enrich the process response unconditionally.** `ProcessStateEnricher` queries the
  engine on every read and adds a `workflow` annotation next to the (unchanged) committed
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
  constraint; a follow-up optimisation can collapse the current multi-query resolve into fewer
  calls.

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

## Technical design

### Contract

`ProcessStateEnricher.Enrich(...)` gains a nested annotation on the `AppProcessState` it returns.
`currentTask`, `ended`, `processTasks`, `actions` etc. are **unchanged**.

```jsonc
{
  "currentTask": { "elementId": "Task_1", "altinnTaskType": "data", /* … unchanged … */ },
  "ended": null,
  "processTasks": [ /* … unchanged … */ ],
  "workflow": {
    "status": "idle" | "processing" | "failed",
    "targetTask": "Task_2",            // omitted when idle / unknown
    "failure": {                       // present only when status == "failed"
      "detail": "…human-readable…",
      "kind": "StepFailed | DependencyFailed | EngineFault | Timeout"
    }
  }
}
```

Notes:
- `workflow` is always present. `idle` is the common case (no active/failed workflow for the
  current task) and means "render normally".
- `targetTask` is the BPMN element id of the task the in-flight/failed transition targets, with
  the engine label's `:{flow}` suffix stripped. Omitted when `idle` or when it cannot be resolved.
- `failure.detail` reuses the message the engine surfaces (see `BuildWorkflowFailure`), including
  detail extracted from a failing service-task/callback `ProblemDetails`.
- We intentionally do **not** expose retry counts, workflow ids, collection keys, or the raw
  `PersistentItemStatus`. `processing` covers first attempt and every automatic retry — the
  consumer behaviour (wait) is identical, so the distinction is noise (D4).

### State mapping (engine → exposed)

| Engine (`CurrentTaskWorkflowState` / `PersistentItemStatus`)     | Exposed `status` |
| ---------------------------------------------------------------- | ---------------- |
| `Unblocked` / `Completed` / `Abandoned`                          | `idle`           |
| `Retrying` (`Enqueued` / `Processing` / `Requeued`)              | `processing`     |
| `ResumeRequired` (`Failed` / `Canceled` / `DependencyFailed`)    | `failed`         |

`Abandoned → idle`: an abandoned workflow was written off (e.g. by a bpmn-allowed reject) and no
longer blocks the current task; the user can act normally. (To be re-confirmed against the reject
flow during implementation — `IsResumeRequiredCollectionHeadStatus` already excludes `Abandoned`.)

### Backend

All symbols below are in `src/App/backend/src/Altinn.App.Core` unless noted.

1. **`AppProcessState`** (`Internal/Process/Elements/AppProcessState.cs`) — the type
   `ProcessStateEnricher.Enrich` returns and that `ProcessController` serializes. Add a nullable
   `Workflow` property of a new `AppProcessWorkflowStatus` model:
   ```csharp
   public AppProcessWorkflowStatus? Workflow { get; set; }
   ```
   `AppProcessWorkflowStatus { WorkflowActivityStatus Status; string? TargetTask; AppProcessWorkflowFailure? Failure }`
   with `enum WorkflowActivityStatus { Idle, Processing, Failed }` (serialized camelCase) and
   `AppProcessWorkflowFailure { string? Detail; string? Kind }`. **Verify** which `AppProcessState`
   the process endpoints actually serialize (there is also `Api/Models/AppProcessState.cs`); add
   the field to the one on the wire and keep the OpenAPI snapshot updated.

2. **`IWorkflowEngineService`** (`Internal/WorkflowEngine/WorkflowEngineService.cs`) — add a
   projection method dedicated to enrichment:
   ```csharp
   Task<WorkflowTaskStatus> ResolveWorkflowTaskStatus(Instance instance, CancellationToken ct = default);
   ```
   returning `internal sealed record WorkflowTaskStatus(WorkflowActivityStatus Status, string? TargetTask, WorkflowFailure? Failure)`.
   Implement by factoring the existing scan in `GetCurrentTaskWorkflowState` (lines ~232-296) into
   a private core that resolves, for the current committed task, the newest matching workflow, its
   collection head status, its `processNextTargetId` label, and (for the failed case)
   `BuildWorkflowFailure(...)`. Both `GetCurrentTaskWorkflowState` (unchanged external behaviour,
   consumed by `ProcessEngine`) and the new `ResolveWorkflowTaskStatus` project from that core so
   the engine query logic is not duplicated. `targetTask` is read from the **active/failed head's
   own** `WorkflowStatusResponse.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]`
   (match head `DatabaseId` back to the workflow in `ListCurrentTaskProcessNextWorkflows` results),
   then strip the `:{flow}` suffix. When `instance.Process?.CurrentTask` is null (ended / not
   started), return `Idle` without querying the engine (mirrors the existing early return).

3. **`ProcessStateEnricher`** (`Internal/Process/ProcessStateEnricher.cs`) — inject
   `IWorkflowEngineService`; add an optional `CancellationToken` to `Enrich`; call
   `ResolveWorkflowTaskStatus` and map onto `AppProcessState.Workflow`. DI: both types are already
   registered transient (`Extensions/ServiceCollectionExtensions.cs:379`,
   `Internal/WorkflowEngine/DependencyInjection/ServiceCollectionExtensions.cs:25`) — no new
   registration needed, just the constructor dependency.

4. **`ProcessController` / `InstancesController`** — thread the ambient `CancellationToken` into
   the `Enrich` calls (call sites: `ProcessController.cs` ~106, ~184, ~371, ~387, ~449, ~596, and
   the enriched-instance path in `InstancesController`). No response-shape changes beyond the added
   field.

Assumption: `ProcessEngine` is the sole `IProcessEngine` in v9 (the engine is always in play), so
enrichment is unconditional and there is no legacy non-engine path to guard.

### Frontend

Source under `src/App/frontend/src`.

1. **Types** — extend the process state type (`features/instance/useProcessQuery.ts` /
   `types/shared.ts`) with the optional `workflow` object and a `WorkflowActivityStatus` union.
   Add `workflow` awareness to `useProcessQuery` selectors.

2. **`ProcessWrapper`** (`components/wrappers/ProcessWrapper.tsx`) — drive a state machine off
   `workflow.status`, sourced from the **fetched** instance so it survives reload and works
   cross-session:
   - `idle` → render the committed task normally.
   - `processing` → suppress the task's Submit/next actions; render a blocking "Advancing to
     {targetTask}…" state; set `refetchInterval` on the instance query (~2s) until `status`
     leaves `processing` or the committed `currentTask` advances, then route forward.
   - `failed` → suppress actions; show `failure.detail` and a **"Retry"** button (label "retry",
     not "resume") that calls `POST process/resume`, then returns to `processing` + poll.

3. **Resume** — add `doProcessResume` in `queries/queries.ts` (`POST .../process/resume`) and a
   mutation hook; wire it to the Retry button. The endpoint already exists
   (`ProcessController` `POST("resume")`) and re-derives the workflow/collection ids server-side,
   so the client just POSTs.

4. **Error-path alignment** — update `useProcessNext.tsx` so a synchronous failure and a polled
   `workflow.status` render identically: a `process/next` that returns `processNextState`
   (`retrying` → treat as `processing`; `resumeRequired` → treat as `failed`) drives the same
   state machine rather than a generic toast. This finally consumes the extensions the frontend
   currently ignores.

5. **Text resources** — add nb/en/nn entries for the advancing message, the retry action, and the
   failure heading.

### Testing

- **Backend unit** (`test/Altinn.App.Core.Tests`): `ProcessStateEnricher` mapping with a mocked
  `IWorkflowEngineService` (idle/processing/failed, target extraction, failure detail present only
  on failed); `WorkflowEngineService.ResolveWorkflowTaskStatus` label→target extraction and head
  classification with a fake `IWorkflowEngineClient`.
- **Backend integration/API** (`test/Altinn.App.Api.Tests` + OpenAPI snapshot): the process
  response includes `workflow`; update the OpenAPI verified snapshot.
- **Test app** (`src/test/apps`): an app (or scenario) with a **service task** that can be forced
  to fail and/or delay, so real `processing`/`failed` states are produced without intercepts. A
  service task runs in the engine post-commit and is the natural lever.
- **Frontend jest**: `ProcessWrapper` state machine per status.
- **Cypress e2e** (`src/App/frontend/test/e2e`): prove Submit is suppressed during `processing`,
  the Retry affordance appears on `failed` and calls `process/resume`, and refresh in each state
  re-renders correctly. Deterministic runs may intercept the enriched instance to assert the
  state machine; a real-backend run against the test app exercises the true engine path.

### Forward-looking (D5)

Because the frontend converges purely off the fetched `workflow.status`, the backend's
synchronous block-and-wait in `process/next` (kept for backwards compatibility) becomes an
implementation detail it can shed later: `process/next` returns `processing` immediately and the
frontend converges via polling. The design is deliberately indifferent to whether `next` is
synchronous or asynchronous — no client change is needed to make that switch.

## Related

- `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/CLAUDE.md` — workflow engine
  integration layer (enqueue/labels/callbacks, command phases, the `SaveProcessStateToStorage`
  commit boundary).
- `ProcessNextRequestFactory` — `processNextTargetId` / `processNextSourceId` labels stamped at
  enqueue and round-tripped on `WorkflowStatusResponse.Labels`.
- `docs/adr/2025-10-22-pdf-generation-architecture.md` — prior v9 runtime ADR (format reference).
