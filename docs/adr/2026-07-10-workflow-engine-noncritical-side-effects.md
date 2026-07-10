# Run non-critical process-next side effects in a non-blocking side-chain workflow

- Status: Proposed
- Deciders: Daniel Skovli + App backend / Workflow Engine
- Date: 10.07.2026

## Result

A1 + S2: Each process-next transition is enqueued as a **two-workflow batch in one atomic
transaction**: a **Main** workflow (pre-commit steps, the `SaveProcessStateToStorage` commit, and the
critical post-commit commands) and a **side-effects** workflow (`IsHead = false`,
`DependsOn = ["main"]`) carrying the fire-and-forget commands. The side-effects workflow declares
`InheritStateFrom = "main"` — a new general engine primitive — so its commands run against Main's
final evolved state. When a transition has no side-effect commands, a single workflow is emitted,
identical to the pre-split request.

## Problem context

A process-next transition executes as commands in the v9 workflow engine. Before this decision, the
whole transition was **one** workflow: every post-commit command ran as a trailing step, so the
ProcessNext HTTP response (which waits for the workflow to settle) and the next transition on the
instance (which depends on the collection's heads) both waited for *everything* — including pure
outbound notifications such as Altinn Events registrations.

The post-commit commands are not equal:

- Some are **critical**: the user must not proceed and the instance must not accept further
  transitions until they complete (e.g. a service task performs automated work and can auto-advance
  the process; process-end cleanup deletes data deterministically).
- Some are **non-critical side effects**: pure outbound notifications. Once the process state is
  committed, the user can interact with the instance regardless of whether the "moved to task X"
  event has been registered yet.

A slow or failing side effect (e.g. the Events API being down) therefore gated the API response and
could wedge the instance's entire process pipeline, even though the transition it belonged to had
already committed. The non-critical work must run **after** the commit (correct ordering) but
**without** gating the next transition or the API response.

### Command categorization

| Command | Emitted by | Bucket | Rationale |
| --- | --- | --- | --- |
| `ExecuteServiceTask` | task-start | **critical (Main)** | Runs automated task logic, mutates form data, can auto-advance; next transition must wait |
| `EndProcessLegacyHook` | process-end | **critical (Main)** | App-authored `IProcessEnd.End`; opaque side effects, keep gated/visible |
| `DeleteDataElementsIfConfigured` | process-end | **critical (Main)** | Mutates/deletes storage; failures must be visible |
| `DeleteInstanceIfConfigured` | process-end | **critical (Main)** | Deletes the instance; must complete deterministically |
| `MovedToAltinnEvent` | task-start | **side-effect** | Outbound Events registration |
| `InstanceCreatedAltinnEvent` | task-start (instantiation) | **side-effect** | Outbound Events registration |
| `CompletedAltinnEvent` | process-end | **side-effect** | Outbound Events registration |
| `NotifyInstanceOwnerOnInstantiation` | task-start (instantiation) | **side-effect** | Outbound email/SMS notification |

## Decision drivers

- B1 (need): After the storage commit, the user/next-transition must wait for genuinely blocking work
  (service tasks) but must NOT wait for fire-and-forget side effects.
- B2 (need): A failing side effect (e.g. Events API down) must not wedge the instance's process
  pipeline or fail the transition that already committed.
- B3 (need): Enqueue must stay atomic and idempotent — no window where the committed transition
  exists but its side effects were never scheduled.
- B4 (need): Side-effect commands must see the **committed (NEW)** process state and must never act
  on stale data — including commands added in the future, not just the four current ones.
- B5 (nice to have): Minimal blast radius. Prefer existing engine primitives; where a new engine
  capability is warranted, it must be a general-purpose primitive, not app-specific special-casing.

## Alternatives considered

Two decisions were taken: the **workflow topology** (A) and **how the side-effects workflow obtains
its state** (S).

Topology:

- A1: **Two-workflow batch** — Main (incl. critical post-commit) → side-effects (`IsHead=false`,
  `DependsOn=["main"]`), enqueued in one atomic batch.
- A2: **Three-workflow "diamond"** — split the commit into its own workflow so both a critical
  `ExecuteServiceTask` workflow and the side-effects workflow depend only on the commit, letting side
  effects run in parallel with the service task.
- A3: **Step-level "non-critical" flag** — mark individual steps within one workflow as non-blocking.
- A4: **Controller-enqueued side-chain** — keep one workflow; have the callback controller enqueue
  the side-effects workflow after `SaveProcessStateToStorage` completes.

State:

- S1: **Reuse the primary state blob** (captured before the in-memory transition, i.e. OLD process
  state).
- S2: **Engine-level state inheritance** — a new `WorkflowRequest.InheritStateFrom` primitive: the
  workflow starts from a dependency's final evolved state, resolved by the engine when the workflow
  begins executing.
- S3: **App-side derived blob** — verify the primary blob, overwrite `Instance.Process` with the NEW
  process state, re-sign, and pass it as the side-effects workflow's own `State`.

## Pros and cons

### A1 — Two-workflow batch (chosen)

- Good (B1, B2): `IsHead=false` makes the side-effects workflow invisible to the collection heads
  frontier — its `dependsOn` edge is excluded from leaf detection, so heads = `{Main}`. The
  ProcessNext wait and the next transition (which `DependsOnHeads`) key off Main only; a side-effect
  failure lands on an invisible workflow and cannot gate anything.
- Good (B3): A single `WorkflowEnqueueRequest` batch is one atomic topological insert under one
  idempotency key.
- Good (B5): The entire critical step chain stays one workflow, so per-step state chaining is
  untouched for the critical path; the app-side DTOs already supported `Ref`/`DependsOn`/`IsHead`.
- Bad: Side effects trail the *entire* Main workflow, so e.g. `MovedToAltinnEvent` fires only after
  `ExecuteServiceTask` completes. Acceptable for eventual-delivery events/notifications; A2 remains
  the refinement if prompt emission ever becomes a requirement.

### A2 — Three-workflow diamond

- Good: Side effects run in parallel with the service task, so events fire promptly after commit.
- Bad (B5): Splitting the commit into its own workflow breaks the single per-step state chain and
  forces state re-materialization at two workflow boundaries instead of one. More moving parts for a
  benefit we don't need now. Documented future refinement.

### A3 — Step-level non-critical flag

- Bad: Not expressible in the engine. Steps run strictly sequentially and share the workflow's
  terminal status; the workflow — not the step — is the unit of dependency and of the heads frontier.
  A "non-blocking step" has no representation. Rejected.

### A4 — Controller-enqueued side-chain

- Good: The callback controller already holds the evolved NEW-state blob, so no state problem at all.
- Bad (B3): Breaks atomicity — a second enqueue after commit opens a window where the committed
  transition has no scheduled side effects, and adds a round-trip. Rejected.

### S1 — Reuse the primary (OLD) blob

- Bad (B4): The side-effect commands construct their output from the blob's process state:
  `MovedToAltinnEvent` builds the event type from `instance.Process.CurrentTask.ElementId` and
  `CompletedAltinnEvent` requires `instance.Process.EndEvent`. The OLD blob would emit
  `movedTo.{previous task}` and fail process-end events outright. Rejected.

### S2 — Engine-level state inheritance (chosen)

- Good (B4): The side-effects workflow sees **Main's full final evolved state** — the committed (NEW)
  process state plus every data change Main's commands made. That is exactly the view the trailing
  post-commit steps had before the split, so future side-effect commands are not restricted in what
  they may read. No Storage fetch (survives hard auto-delete at process end), no fetch-the-latest
  race under auto-advance.
- Good (B5): A general engine primitive (see semantics below), useful to any batch author, rather
  than app-side special-casing.
- Good: Fail-safe by construction — a workflow whose inheritance source did not complete runs with a
  null state, and the app's callbacks reject a null state with a non-retryable 422. Failure mode is
  "events lost, loudly", never "events emitted from stale data".
- Bad: Reopens the engine (schema migration, validation, handler logic) for what began as an
  app-side change. Accepted deliberately: v9 is unreleased and the primitive is generally useful.

### S3 — App-side derived blob

- Good: No engine changes.
- Bad (B4): The rewritten blob is "OLD snapshot + NEW process state" — correct for the four current
  commands, but a footgun for future side-effect commands tempted to read data elements or form data
  that Main's commands had since changed. Since this split is intended as a general pattern, rejected
  after review in favour of S2. (S3 was the first implementation; it was replaced.)

## Design decisions that follow

- **State inheritance semantics** (`WorkflowRequest.InheritStateFrom`, a `dependsOn` ref/id):
  validated at enqueue to be mutually exclusive with `state` and to reference one of the workflow's
  own `dependsOn` entries (only a dependency is guaranteed terminal before the workflow starts).
  Persisted (`inherit_state_from_workflow_id`) and exposed in status responses. Resolved at execution
  start — a terminal workflow's state is immutable, so there is no race: a `Completed` source's final
  state (last step-produced state, falling back to its initial state) replaces the dependent's
  initial state in memory; a non-`Completed` source yields no state; a transient lookup failure
  requeues the workflow rather than failing it.
- **Side-chain identification**: side-effects workflows are marked by the
  `Process next side-effects:` OperationId prefix. Every consumer that inspects an instance's
  workflow collection — the enqueue wait, failure classification, the resume-target lookup, and the
  read-path status enrichment (see Related) — must exclude them via this marker
  (`WorkflowEngineService.ScopeToCurrentChain` is the shared filter). The marker is a stopgap: the
  engine does not currently expose `IsHead` on `WorkflowStatusResponse` (see follow-ups).
- **Reject/abandon interaction**: an `Abandoned` dependency *satisfies* dependents rather than
  condemning them (that is what lets a superseding reject run), so abandoning a pre-commit-failed
  Main would release its side-effects sibling — events for a transition that never committed.
  `AbandonWorkflow` therefore cancels the abandoned batch's still-pending side-effects workflow after
  a successful abandon; the engine checks pending cancellation before dependency evaluation, so the
  cancel wins the race. If one ever slips through anyway, the S2 fail-safe applies (null state →
  422, no wrong events).

## Consequences

- Positive: ProcessNext returns and the next transition unblocks as soon as critical work settles; a
  failing notification cannot wedge the process; enqueue stays atomic and idempotent; the engine
  gains a reusable state-inheritance primitive.
- Negative / accepted: side effects fire only after the full Main workflow, including any service
  task (see A2 for the future diamond refinement).
- Negative / accepted: **cross-transition event ordering is relaxed.** Each side-effects workflow
  depends only on its own Main, so a retrying `movedTo.Task_2` can be registered after
  `movedTo.Task_3` or `completed`. Event consumers must tolerate out-of-order delivery
  (per-transition ordering is kept).
- Negative / accepted: side-effect failures no longer surface in the ProcessNext result. They remain
  queryable in the engine (by collection key / `processNextInstanceGuid` label, filtered on the
  `Process next side-effects:` marker) and must be monitored explicitly — see the observability note
  in the integration layer's `AGENTS.md`.
- Deployment ordering: the engine must ship before/with the app-lib version carrying this change. An
  older engine ignores the unknown `inheritStateFrom` field, leaving the side chain with a null state
  — a loud failure with no wrong events, but events would be lost. Both live in this monorepo and v9
  is unreleased, so this is a release-notes concern, not a migration.
- Out of scope: this gates **workflow ordering** only. It does not prevent ad-hoc data mutation
  (direct PATCH) while a service task runs — that remains a client/data-path concern.

### Follow-ups

- Engine: expose `IsHead` (or a per-workflow tag) in `WorkflowStatusResponse` and switch the
  side-chain filter from the OperationId marker to it.
- A2 (diamond) if prompt post-commit event emission becomes a requirement.

## Related

- `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md` — the integration layer:
  command sequences (including the split), state passthrough, and the side-effect failure
  observability guidance.
- `src/Runtime/workflow-engine/docs/workflow-collections.md` — collections, heads frontier, `IsHead`,
  `DependsOnHeads` (Example 5: "Invisible Side Chain with `IsHead = false`").
- `docs/adr/2026-07-08-process-live-workflow-status.md` — the live `workflow` status annotation on
  process reads. It resolves off collection heads, so side-chain workflows never surface as
  `processing`/`failed` on a read (intentional: they are non-blocking), and its failure-detail
  construction excludes side-chain workflows via the shared `ScopeToCurrentChain` filter.
