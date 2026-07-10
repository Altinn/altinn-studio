# Split non-critical process-next side effects into an `IsHead=false` side-chain workflow

- Status: Proposed (implementation plan / knowledge-transfer doc — may be removed after implementation)
- Deciders: Daniel Skovli + App backend / Workflow Engine
- Date: 10.07.2026

> **Purpose of this document.** This is an implementation plan written to hand off to an implementing
> agent, not a permanent ADR. It captures the design decision, the engine mechanics it relies on, and a
> file-by-file change plan with source anchors. Read the two `AGENTS.md` files it references first
> (below) — they are the authoritative background.
>
> Background reading (required):
> - `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md` — the app⇄engine integration
>   layer (command sequences, state passthrough, callback lifecycle).
> - `src/Runtime/workflow-engine/docs/workflow-collections.md` — collections, heads frontier, `IsHead`,
>   `DependsOnHeads`. See especially Example 5 ("Invisible Side Chain with `IsHead = false`").

## Result

Split the single process-next workflow into a **two-workflow batch enqueued in one transaction**:

1. **Main workflow** (visible, `IsHead` = default/null) — all pre-commit steps, `SaveProcessStateToStorage`
   (the commit boundary), **and the critical post-commit steps** (`ExecuteServiceTask` and the process-end
   finalization/cleanup commands).
2. **Side-effects workflow** (`IsHead = false`, `DependsOn = [main]`) — the non-critical, fire-and-forget
   post-commit commands: the Altinn Events registrations and the instantiation notification.

Because the side-effects workflow is `IsHead = false`, it is invisible to the collection heads frontier:
the next process-next transition (which `DependsOnHeads`) waits only for the Main workflow, never for the
side effects, and the `EnqueueAndWaitForProcessNext` caller returns as soon as Main settles. The side
effects still run (ordered after the commit via `DependsOn`), but they no longer gate the pipeline or the
API response.

## Problem context

Today `ProcessNextRequestFactory.AssembleCommandSequence`
(`src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/ProcessNextRequestFactory.cs:166-223`)
builds **one** flat `List<StepRequest>` for the whole transition, wrapped in a **single** `WorkflowRequest`
(`ProcessNextRequestFactory.cs:122-136`). Every post-commit command
(`WorkflowCommandSet.PostProcessNextCommittedCommands`) runs as trailing steps of that one workflow.

Consequences:

- The `EnqueueAndWaitForProcessNext` wait, and therefore the ProcessNext HTTP response, does not complete
  until the entire workflow — including trailing side effects like registering an Altinn event or sending
  an instantiation notification — has settled.
- The next transition on the same instance depends on the whole workflow (the collection's single head),
  so a slow or failing side effect blocks subsequent process activity.

But these post-commit commands are not equal:

- Some are **critical**: the user must not proceed and the instance must not accept further transitions
  until they complete (a service task performs automated work and can auto-advance the process).
- Some are **non-critical side effects**: pure outbound notifications. Once the process state is committed,
  the user can interact with the instance regardless of whether the "moved to task X" event has been
  registered yet.

We want the non-critical work to run **after** the commit (correct ordering) but **without** gating the
next transition or the API response.

## Decision drivers

- **B1 (need):** After the storage commit, the user/next-transition must wait for genuinely blocking work
  (service tasks) but must NOT wait for fire-and-forget side effects.
- **B2 (need):** A failing side effect (e.g. Events API down) must not wedge the instance's process
  pipeline or fail the transition that already committed.
- **B3 (need):** Enqueue must stay atomic and idempotent — no window where the committed transition exists
  but its side effects were never scheduled.
- **B4 (need):** Correctness of the existing commands is preserved — especially the two side-effect
  commands that read the committed (NEW) process state.
- **B5 (nice to have):** Minimal blast radius; reuse existing engine primitives rather than adding new
  engine features (no priority lanes, no per-instance locks).

## Alternatives considered

- **A1 (chosen): Two-workflow batch — Main (incl. critical post-commit) → side-effects (`IsHead=false`).**
- **A2: Three-workflow "diamond"** — split the commit into its own workflow so both a critical
  `ExecuteServiceTask` workflow and the side-effects workflow depend only on the commit, letting side
  effects run in parallel with the service task instead of after it.
- **A3: Step-level "non-critical" flag** — mark individual steps within one workflow as non-blocking.
- **A4: Controller-enqueued side-chain** — keep one workflow; have the callback controller enqueue the
  side-effects workflow after `SaveProcessStateToStorage` completes (like the existing auto-advance path).

## Pros and cons

### A1 — Two-workflow batch (chosen)

- Good (B1, B2): Heads frontier = `{Main}`; the wait and the next transition ignore the `IsHead=false`
  side-effects workflow. A side-effect failure lands on an invisible workflow and cannot gate the
  pipeline.
- Good (B3): Single `WorkflowEnqueueRequest` batch → one atomic topological insert under one idempotency
  key.
- Good (B5): The entire existing critical step chain stays as one workflow, so per-step state chaining
  (`StateOut → StateIn`) is untouched for the critical path. The app-side engine DTOs already support
  `Ref` / `DependsOn` / `IsHead` (`Models/Engine/WorkflowRequest.cs`, `WorkflowRef.cs`) — **no model
  changes**.
- Bad: The side effects trail the *entire* Main workflow, so `MovedToAltinnEvent` fires only after
  `ExecuteServiceTask` completes (see A2). Acceptable for eventual-delivery events/notifications.
- Bad (B4): The side-effects workflow needs its own initial `State` blob reflecting the committed (NEW)
  process state — it does not inherit Main's evolved state (see "State passthrough" below). This is the
  main implementation complexity.

### A2 — Three-workflow diamond

- Good: Side effects run in parallel with the service task, so events fire promptly after commit.
- Bad (B5): Requires splitting the commit into its own workflow, which breaks the single per-step state
  chain and forces state re-materialization at two workflow boundaries instead of one. More moving parts
  for a benefit (prompt eventual events) we don't need now. Keep as a documented future refinement.

### A3 — Step-level non-critical flag

- Bad: Not expressible in the engine. Steps within a workflow run strictly sequentially and share the
  workflow's terminal status; the workflow — not the step — is the unit of dependency and of the heads
  frontier. A "non-blocking step" has no representation. Rejected.

### A4 — Controller-enqueued side-chain

- Good: The callback controller already holds the evolved NEW-state blob, so no second capture is needed.
- Bad (B3): Breaks atomicity — a second enqueue after commit opens a window where the committed transition
  has no scheduled side effects, and adds a round-trip. Rejected in favour of the same-batch approach.

## Command categorization

Split `WorkflowCommandSet`'s current single post-commit bucket into **critical** (stay in Main) and
**side-effect** (move to the `IsHead=false` workflow). Pre-commit commands are unchanged.

| Command | Emitted by | Today's bucket | New bucket | Rationale |
| --- | --- | --- | --- | --- |
| `ExecuteServiceTask` | task-start | post-commit | **critical (Main)** | Runs automated task logic, mutates form data, can auto-advance; next transition must wait |
| `EndProcessLegacyHook` | process-end | post-commit | **critical (Main)** | App-authored `IProcessEnd.End`; opaque side effects, keep gated/visible |
| `DeleteDataElementsIfConfigured` | process-end | post-commit | **critical (Main)** | Mutates/deletes storage; failures must be visible |
| `DeleteInstanceIfConfigured` | process-end | post-commit | **critical (Main)** | Deletes the instance; must complete deterministically |
| `MovedToAltinnEvent` | task-start | post-commit | **side-effect** | Outbound Events registration; reads NEW `CurrentTask` |
| `InstanceCreatedAltinnEvent` | task-start (instantiation) | post-commit | **side-effect** | Outbound Events registration |
| `CompletedAltinnEvent` | process-end | post-commit | **side-effect** | Outbound Events registration; reads NEW `EndEvent` |
| `NotifyInstanceOwnerOnInstantiation` | task-start (instantiation) | post-commit | **side-effect** | Outbound email/SMS notification |

**State needs of the side-effect commands** (verified in `Commands/AltinnEvents/*.cs` and
`Commands/NotifyInstanceOwnerOnInstantiation.cs`): all four read **only `context.InstanceDataMutator.Instance`**,
never form data, and none mutate data that a later step depends on. Two of them read the **committed (NEW)**
process state:

- `MovedToAltinnEvent` reads `instance.Process.CurrentTask.ElementId`.
- `CompletedAltinnEvent` reads `instance.Process.EndEvent`.

This is why the side-effects workflow's initial state must carry the NEW process state (see below).

## Engine mechanics this relies on

From `src/Runtime/workflow-engine` (see `docs/workflow-collections.md` and `EngineRepository.Writes.cs`):

- A batch enqueue inserts a DAG of workflows wired by `dependsOn` edges (blocking) within one atomic,
  idempotent transaction (idempotency key covers the whole batch).
- `IsHead` is tri-state and **only** affects the collection heads frontier, not execution:
  - `null` (default): natural leaf detection — head iff nothing in the batch depends on it.
  - `false`: never a head, **and** its `dependsOn` edges are excluded from leaf detection and do not
    consume existing heads. Still participates in execution ordering.
- `DependsOnHeads` (default `true`) only injects head dependencies for **root** workflows (no intra-batch
  `dependsOn`). The side-effects workflow has an intra-batch `dependsOn` (Main), so it is not a root and
  `DependsOnHeads` is a no-op for it — leave it at default.

**Head math for our batch** `[Main(ref="main"), SideEffects(dependsOn=["main"], IsHead=false)]`:

- `SideEffects.IsHead == false` → its `dependsOn` edge to `"main"` is excluded from the depended-on set →
  `Main` is a natural leaf → **head**. `SideEffects` is excluded from heads.
- Heads = `{Main}`. The next transition (`DependsOnHeads=true`, root) depends on `Main` only. Correct.

## Implementation plan

No engine (`src/Runtime/workflow-engine`) changes. No DTO changes. All work is in
`src/App/backend/src/Altinn.App.Core` (+ `ProcessEngine`) and tests.

### 1. `WorkflowCommandSet.cs` — split the post-commit bucket

File: `Internal/WorkflowEngine/WorkflowCommandSet.cs`.

- Replace the single `_postProcessNextCommittedCommands` list (currently exposed as
  `PostProcessNextCommittedCommands`, lines 18/28) with two lists + properties:
  `CriticalPostCommitCommands` and `SideEffectCommands`.
- Add two private builders mirroring `AddPostProcessNextCommittedCommand` (lines 136-143):
  `AddCriticalPostCommitCommand` and `AddSideEffectCommand` (both delegate to `CreateCommand`,
  lines 145-156).
- Re-route the post-commit calls:
  - `GetTaskStartSteps` (lines 33-72): `MovedToAltinnEvent` → side-effect; `ExecuteServiceTask` →
    critical; `InstanceCreatedAltinnEvent` → side-effect; `NotifyInstanceOwnerOnInstantiation` →
    side-effect.
  - `GetProcessEndSteps` (lines 97-122): `EndProcessLegacyHook` → critical; `DeleteDataElementsIfConfigured`
    → critical; `DeleteInstanceIfConfigured` → critical; `CompletedAltinnEvent` → side-effect.
  - `GetTaskEndSteps` / `GetTaskAbandonSteps`: unchanged (no post-commit commands).

### 2. `ProcessNextRequestFactory.AssembleCommandSequence` — return two lists

File: `Internal/WorkflowEngine/ProcessNextRequestFactory.cs:166-223`.

- Introduce a small return type, e.g. `private readonly record struct AssembledCommands(List<StepRequest> Main, List<StepRequest> SideEffects)`.
- In the event loop (lines 179-210), accumulate a `criticalPostCommitSteps` and a `sideEffectSteps` list
  from `workflowCommands.CriticalPostCommitCommands` / `.SideEffectCommands` (replacing the single
  `postCommitSteps.AddRange(...)` at line 208).
- Assemble Main exactly as today (lines 212-220) but append the **critical** post-commit steps instead of
  all post-commit steps:
  `taskEndSteps` → (`MutateProcessState` if any task-end steps) → `taskStartSteps` →
  `SaveProcessStateToStorage` → `criticalPostCommitSteps`.
- Return `sideEffectSteps` as the second list.

### 3. `ProcessNextRequestFactory.Create` — build one or two workflows

File: `Internal/WorkflowEngine/ProcessNextRequestFactory.cs:72-139`.

- Add a parameter for the side-effects initial state, e.g. `string? sideEffectState = null` (see §5).
- Build the Main `WorkflowRequest` as today (lines 128-134) but set `Ref = "main"` **when** there are
  side-effect steps (the ref is only needed if something references it).
- When `sideEffectSteps` is non-empty, append a second `WorkflowRequest`:
  ```
  new WorkflowRequest
  {
      OperationId = $"Process next side-effects: {fromTaskId} -> {toTaskId}",
      Steps = sideEffectSteps,
      State = sideEffectState,
      DependsOn = [WorkflowRef.FromRefString("main")],
      IsHead = false,
      // DependsOnHeads left default (no-op: not a root)
  }
  ```
- When `sideEffectSteps` is empty (e.g. `RegisterEvents=false`, non-instantiation, no service task), emit
  **only** the Main workflow with no `Ref` — behaviour identical to today.
- Keep `WorkflowEnqueueEnvelope` / labels / context unchanged. **Order matters:** Main must be
  `Workflows[0]` because `EnqueueWorkflowEnvelope` returns `response.Workflows[0].DatabaseId`
  (`WorkflowEngineService.cs:414`) as the submitted-workflow id used to scope the wait.

### 4. Thread the parameter through

File: `Internal/WorkflowEngine/WorkflowEngineService.cs:375-398` (`CreateWorkflowEnqueueEnvelope`) and the
public `EnqueueAndWaitForProcessNext` signature. Add the `sideEffectState` argument alongside the existing
`state` and pass it into `_processNextRequestFactory.Create`.

### 5. State passthrough — the key complexity (B4)

The side-effects workflow does **not** inherit Main's evolved state; it starts from its own `WorkflowRequest.State`.
Two of its commands need the **committed (NEW)** process state. Today the `state` blob is captured
**before** the in-memory transition (OLD `CurrentTask`) in `ProcessEngine`
(`ProcessEngine.cs:158-169`, and again for reject/resume at `ProcessEngine.cs:~833`) via
`WorkflowCallbackStateService.CaptureState`.

**Recommended approach:** capture a second signed blob reflecting `processStateChange.NewProcessState` and
pass it as the side-effects workflow's `State`. Options for the implementer (pick after reading
`WorkflowCallbackStateService.CaptureState`, `WorkflowCallbackStateService.cs:42`):

- Add a `CaptureState` overload/param that serializes the instance with an overridden `Process`
  (= `NewProcessState`), or
- Temporarily set the in-memory `unitOfWork.Instance.Process = processStateChange.NewProcessState`, capture,
  then restore — only if it is safe w.r.t. later use of that unit of work in the same request.

Since the side-effect commands never read form data, the blob's form data is irrelevant to them; reuse the
same form data as the primary blob for simplicity.

**Verify before implementing (may simplify this step):** confirm whether `IEventsClient.AddEvent` actually
serializes `instance.Process` into the emitted cloud event. If it only uses instance identity
(owner/id/self URL) and the event *type string* already carries the target task, the OLD blob could be
reused and this whole step collapses to "reuse `state`". Do not assume — check `IEventsClient` /
`EventsClient` and the movedTo/completed event payloads.

Capture sites to update: `ProcessEngine.cs:169` (initial/normal) and `ProcessEngine.cs:~833` (reject/resume
supersede). Confirm whether the internal auto-advance / dependent-enqueue path
(`EnqueueDependentProcessNext`) also flows through `Create` and therefore needs the second blob too.

### 6. Verify the wait/settle logic keys off heads, not the whole chain (CRITICAL)

`WorkflowEngineService` polls the collection until the **heads** settle, scoping via `ScopeToCurrentChain`
("the workflow just submitted and everything created after it"). Because the side-effects workflow is in
the same batch, confirm the settle logic waits for **Main (the head)** and does **not** block on the
`IsHead=false` side-effects workflow. If the current implementation waits for every non-terminal workflow
in the scoped chain, it must be adjusted to wait on heads / on the submitted Main id only — otherwise the
API response still blocks on side effects and the whole change is defeated. This is the single most
important thing to validate end-to-end.

Related: `HasCommittedProcessState` (checks `SaveProcessStateToStorage`) stays valid — that step is in
Main. Ensure `BuildWorkflowFailure` cannot classify a side-effect failure as a transition failure (it
should not, since side effects are not heads and outside the wait scope). See the "Waiting, Failure
Classification, and Reject/Resume" section of the integration `AGENTS.md`.

### 7. Observability for silent side-effect failures (B2 trade-off)

Moving side effects off the head line means their failures no longer gate anything and no longer surface in
the ProcessNext result. They will exist as `Failed` workflows in the engine (queryable by the
`processNextInstanceGuid` label / collection key). Add/confirm telemetry so these are alertable rather than
silently lost. Note this explicitly in the integration `AGENTS.md` when updating docs (§9).

### 8. Tests

- Unit-test `ProcessNextRequestFactory` (see existing factory tests) to assert, per transition type:
  - Main workflow contains pre-commit + `SaveProcessStateToStorage` + critical post-commit, in order.
  - Side-effects workflow contains exactly the side-effect commands, has `IsHead == false`,
    `DependsOn == ["main"]`, and Main carries `Ref == "main"`.
  - When there are no side effects, only one workflow is emitted (no `Ref`, no second workflow) — regression
    guard for the common path.
- Unit-test `WorkflowCommandSet` bucket routing for task-start, process-end, task-end, task-abandon.
- Integration test (`test/Altinn.App.Integration.Tests`, AppFixture pattern): drive a Task→Task transition
  with events enabled and assert the API returns without waiting on the side-effect workflow, and that the
  side-effect workflow still completes (poll by collection key). Add a service-task transition asserting the
  next transition waits for `ExecuteServiceTask` (head) but not for the events. Follow the snapshot
  conventions; run full (unfiltered) suites before pushing (Verify auto-accepts snapshots locally).

### 9. Docs

Update `Internal/WorkflowEngine/AGENTS.md`:
- "Command Sequences": show the two-workflow split and the critical/side-effect division; update the
  Task-to-Task / Task-to-End / Initial-Task-Start diagrams to mark which post-commit commands land in the
  `IsHead=false` side-chain.
- Add the side-effect-failure observability note.

## Consequences

- Positive: ProcessNext returns and the next transition unblocks as soon as critical work settles; a failing
  notification cannot wedge the process; enqueue stays atomic/idempotent; no engine or DTO changes.
- Negative / accepted: side effects fire only after the full Main workflow (incl. any service task) — see
  A2 for the future diamond refinement if prompt event emission becomes a requirement.
- Negative / accepted: **cross-transition event ordering is relaxed.** Each side-effects workflow depends
  only on its own Main, so a retrying `movedTo.Task_2` can be registered after `movedTo.Task_3` or
  `completed`. Event consumers must tolerate out-of-order delivery (per-transition ordering is kept).
- Follow-up (engine): the wait/settle exclusion identifies side-effects workflows by an OperationId string
  prefix because the engine does not persist/expose `IsHead` in `WorkflowStatusResponse` and labels are
  batch-scoped. Consider exposing `IsHead` (or a per-workflow tag) in status responses and switching the
  filter to it.
- Reject interaction (fixed during review): an Abandoned dependency *satisfies* dependents instead of
  condemning them, so abandoning a failed Main (the bpmn-allowed reject path) could let its not-yet-condemned
  side-effects sibling run and emit events for a transition that never committed. `AbandonWorkflow` now
  cancels the abandoned batch's still-pending side-effects workflow after a successful abandon (the engine
  checks pending cancellation before dependency evaluation, so the cancel wins the race).
- Out of scope: this gates **workflow ordering** only. It does not prevent ad-hoc data mutation (direct
  PATCH) while a service task runs — that remains a client/data-path (task-type) concern, unchanged by this
  work.

## Open questions for the implementer

1. Does `IEventsClient.AddEvent` depend on `instance.Process` in the emitted payload? (Decides whether §5
   needs a second blob or can reuse `state`.)
2. Does the settle/scope logic already ignore `IsHead=false` workflows, or must §6 change it?
3. Should the process-end Altinn `CompletedAltinnEvent` really move to the side-chain given the process has
   already ended (no successor to unblock)? It is harmless either way; grouped with the other Events
   registrations for consistency and failure isolation, but confirm no downstream ordering assumption.

## Answers (resolved during implementation, 10.07.2026)

1. **No, but the second blob is still required.** `EventsClient.AddEvent` serializes only instance
   identity (owner, party, id, self URL) into the CloudEvent — never `instance.Process`. However, the
   *commands* read the blob's process state to construct the event: `MovedToAltinnEvent` builds the
   type string from `instance.Process.CurrentTask.ElementId` and `CompletedAltinnEvent` throws when
   `instance.Process.EndEvent` is null. Reusing the OLD blob would emit `movedTo.{previous task}` and
   fail process-end events outright. Implemented as a **derived** blob rather than a second capture:
   `WorkflowCallbackStateRewriter` verifies the primary blob, sets `Instance.Process = NewProcessState`
   (exactly what `MutateProcessState` does in-memory), and re-signs. The derivation happens inside
   `ProcessNextRequestFactory.Create`, so no `ProcessEngine`/`IWorkflowEngineService` signature changes,
   and the auto-advance dependent path (`EnqueueDependentProcessNext`) is covered automatically.
2. **Partially — §6 needed a change.** The heads poll was already correct (`IsHead=false` workflows never
   appear as heads). But `anchoredChainSettled` also requires the `ScopeToCurrentChain` result to be
   inactive, and while a *same-batch* side-effects workflow is excluded by the strictly-newer timestamp
   filter (all workflows in one enqueue share `metadata.CreatedAt`), a *dependent auto-advance batch's*
   side-effects workflow is strictly newer than the anchor and would have blocked the wait and polluted
   `BuildWorkflowFailure`/`GetResumeTargetWorkflowId`. Fixed by excluding workflows whose OperationId
   carries the `Process next side-effects:` marker inside `ScopeToCurrentChain` (and the resume-target
   lookup).
3. **Yes, moved.** The relative ordering is unchanged from the pre-split sequence (`CompletedAltinnEvent`
   already ran after the delete commands), the command only reads instance identity + `EndEvent` from
   the blob (indifferent to instance deletion), and no downstream ordering assumption was found.

## Amendment (10.07.2026): engine-level state inheritance replaces the derived blob

The `WorkflowCallbackStateRewriter` approach from Answer 1 was replaced during review discussion. The
rewritten blob was correct for the four current commands but only carried "OLD snapshot + NEW process
state" — a footgun for future side-effect commands tempted to read data elements or form data that Main's
commands had since changed. Since this split is intended as a general pattern, the fix moved into the
engine (reopening the "no engine changes" constraint deliberately):

- **New engine feature**: `WorkflowRequest.InheritStateFrom` (a `WorkflowRef`). Validated at enqueue to
  (a) be mutually exclusive with `State` and (b) reference one of the workflow's own `DependsOn` entries
  (only a dependency is guaranteed terminal before the workflow starts). Persisted as
  `inherit_state_from_workflow_id`; exposed in `WorkflowStatusResponse`. At execution start the engine
  resolves the source's final state (last step-produced state, falling back to its initial state) and
  uses it as the dependent's initial state — in memory only, the persisted column is untouched. A
  non-Completed source (abandoned-and-released) yields no state; a transient lookup failure requeues the
  workflow rather than failing it.
- **App side**: the side-effects workflow is enqueued with `InheritStateFrom = "main"` and `State = null`.
  Its commands now see **Main's full final evolved blob** — the exact view the trailing post-commit steps
  had pre-split (NEW process state + all data changes) — so the "side-effect commands may only read
  identity + process state" restriction is lifted. `WorkflowCallbackStateRewriter` is deleted. The
  fail-safe if an orphaned side chain ever runs without Main completing: null state → callback 422, never
  events from stale data.
- **Deployment ordering**: an older engine would ignore the unknown `inheritStateFrom` field, leaving the
  side chain with null state (loud failure, no wrong events — but events would be lost). The engine must
  be deployed before/with the app-lib version carrying this change. Both live in this monorepo and v9 is
  unreleased, so this is a release-notes concern, not a migration.
