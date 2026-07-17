# Run non-critical process-next side effects in a non-blocking side-chain workflow

- Status: Proposed
- Deciders: Daniel Skovli + App backend / Workflow Engine
- Date: 10.07.2026 (revised 17.07.2026: pivoted from the dependency-bound side chain (A1 + S2) to the
  enqueue-at-commit design (A5); the `InheritStateFrom` engine primitive that S2 introduced was
  removed again)

## Result

A5: Each process-next transition stays **one** Main workflow. When the transition has non-critical
side-effect commands (`MovedToAltinnEvent`, `InstanceCreatedAltinnEvent`, `CompletedAltinnEvent`,
`NotifyInstanceOwnerOnInstantiation`), the factory inserts a critical **`EnqueueSideEffectsWorkflow`**
step immediately after `SaveProcessStateToStorage`. That step enqueues a separate **side-effects
workflow** carrying those commands:

- an **independent root** — `DependsOn = null`, `DependsOnHeads = false` — so it starts immediately;
- **invisible** to the collection heads frontier (`IsHead = false`), so the ProcessNext wait and the
  next transition never key off it;
- with its **own state**: the commit-time state blob (the enqueue step's own `StateIn` — exactly the
  state the transition committed);
- **linked** (`links`, not `dependsOn`) to the Main workflow for ops traversal;
- enqueued **idempotently** per Main workflow (idempotency key `{mainWorkflowId}:side-effects`), so
  step retries dedup and a superseding transition gets its own key.

A transition with no side-effect commands emits exactly the pre-split single workflow.

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
- B3 (need): No window where the committed transition exists but its side effects were never
  scheduled.
- B4 (need): Side-effect commands must see the **committed (NEW)** process state and must never act
  on stale data — including commands added in the future, not just the four current ones.
- B5 (nice to have): Minimal blast radius. Prefer existing engine primitives; where a new engine
  capability is warranted, it must be a general-purpose primitive, not app-specific special-casing.

## Alternatives considered

- A1: **Two-workflow batch** — Main → side-effects (`IsHead=false`, `DependsOn=["main"]`), enqueued
  in one atomic batch. Requires solving how the side chain obtains the committed state; the chosen
  sub-alternative was S2, a new engine primitive `WorkflowRequest.InheritStateFrom` (start from a
  dependency's final evolved state). **Initially chosen and implemented; superseded by A5.**
- A2: **Three-workflow "diamond"** — split the commit into its own workflow so both a critical
  `ExecuteServiceTask` workflow and the side-effects workflow depend only on the commit, letting side
  effects run in parallel with the service task.
- A3: **Step-level "non-critical" flag** — mark individual steps within one workflow as non-blocking.
- A4: **Controller-enqueued side-chain** — keep one workflow; have the callback controller enqueue
  the side-effects workflow after the workflow settles.
- A5: **In-workflow enqueue-at-commit** (chosen) — a critical step inside Main, right after the
  commit, enqueues the side-effects workflow as an independent invisible root carrying the
  commit-time state.

## Pros and cons

### A5 — In-workflow enqueue-at-commit (chosen)

- Good (B3): The enqueue step sits **inside Main's retry envelope, before Main settles**: the
  transition cannot settle until the side effects were scheduled, retries dedup on the derived
  idempotency key, and a pre-commit failure schedules nothing. "Side effects exist **iff** the
  transition committed" holds by construction. (This is what distinguishes A5 from A4, which was
  rejected for exactly this atomicity gap — A4's enqueue ran *after* the workflow settled, outside
  any retry envelope.)
- Good (B4): The side-effects workflow carries the **commit-time state blob** — the enqueue step's
  own `StateIn`, i.e. exactly the state `SaveProcessStateToStorage` persisted. "The events describe
  the commit" is arguably a more principled contract than A1+S2's "whatever Main's final state
  happened to be after post-commit mutations". No Storage fetch, no stale data, works even when the
  transition ends the process and auto-deletes the instance from Storage (see the data-retention
  consequence below).
- Good (B1, B2): `IsHead=false` + `DependsOnHeads=false` makes the workflow an independent invisible
  root: heads = {Main}, the ProcessNext wait and the next transition key off Main only, and a failed
  side effect can never gate or wedge anything.
- Good: Side effects start **at the commit**, not after the full Main workflow — events fire
  promptly even while a service task is still running. (A1 delayed them behind Main; this captures
  A2's promptness benefit without splitting the commit.)
- Good: **Reject/abandon needs no special handling.** Under A1+S2, an Abandoned Main *satisfied* its
  side-effects dependent, so the abandon path had to cancel the sibling — and a committed-then-
  rejected transition's events were discarded. Under A5 the side effects of a committed transition
  are already independently in flight when a later reject writes Main off; a never-committed
  transition scheduled nothing. Both outcomes are correct without any cancel logic or race.
- Good (B5): **No new engine primitive.** The `InheritStateFrom` machinery S2 added (schema
  migration, enqueue validation, execution-start resolution, requeue path) was removed again. The
  only engine additions that remain are `is_head` persistence/exposure and the `is_head` failure-
  metric tag — generic observability that any invisible-workflow user benefits from.
- Bad: Main is re-gated on the engine's **enqueue endpoint** availability at the commit step. The
  callback itself proves app↔engine connectivity in that moment, so the incremental risk is small,
  and a transient enqueue failure just retries the (idempotent) step.
- Bad / accepted: process-end events can now register **before** the critical post-commit cleanup
  (`EndProcessLegacyHook`, deletes) completes. A subscriber that reacts to `completed` by fetching
  instance data can race the deletion. Pre-split, `completed` fired after the deletes. Same
  trade-off A2 would have had; accepted because event delivery is asynchronous and unordered anyway
  (see the ordering section below).

### A1 + S2 — Two-workflow batch with engine state inheritance (superseded)

- Good (B3): a single enqueue batch is one atomic topological insert under one idempotency key.
- Bad: side effects trail the *entire* Main workflow — e.g. `MovedToAltinnEvent` fires only after
  `ExecuteServiceTask` completes.
- Bad: an Abandoned dependency satisfies dependents (that is what lets a superseding reject run), so
  the reject path had to cancel the still-pending sibling — racy (best-effort cancel after a
  successful abandon), and it discarded a committed transition's events when Main failed
  *post*-commit and the user backed out via reject. The "nothing to re-deliver for a transition that
  never committed" justification did not hold in that branch.
- Bad (B5): reopened the engine (schema migration, validation, handler logic) for a
  state-inheritance primitive whose only consumer was this split. Mixed-version behavior was also
  sharp: an engine that ignored `inheritStateFrom` left the side chain stateless, so every
  event-enabled transition surfaced as failed.
- Replaced by A5, which needs none of it.

### A2 — Three-workflow diamond

- Good: side effects run in parallel with the service task, so events fire promptly after commit.
- Bad (B5): splitting the commit into its own workflow breaks the single per-step state chain and
  forces state re-materialization at two workflow boundaries. A5 achieves the same promptness
  without this. Rejected.

### A3 — Step-level non-critical flag

- Bad: Not expressible in the engine. Steps run strictly sequentially and share the workflow's
  terminal status; the workflow — not the step — is the unit of dependency and of the heads frontier.
  A "non-blocking step" has no representation. Rejected.

### A4 — Controller-enqueued side-chain

- Bad (B3): the controller enqueues after the workflow settled — a crash between settle and enqueue
  loses the side effects permanently, outside any retry envelope, and adds a round-trip. Rejected.
  (A5 moves the same idea *inside* the workflow as a gated, idempotent step, which resolves the
  objection.)

## Cross-transition event ordering

Each side-effects workflow is independent, so the engine does not order event registrations across
transitions: a retrying `movedTo.Task_2` registration can land after `movedTo.Task_3` (or after
`completed`). Per-transition ordering (within one side-effects workflow) is kept.

This relaxes nothing real: **the Altinn Events service does not guarantee ordering at any hop**, so
ordered registration was never observable by subscribers. Verified against
[altinn-events](https://github.com/Altinn/altinn-events) (July 2026):

- Every queue consumer is a competing consumer — the Wolverine/Service Bus pipeline runs
  `.ListenerCount(20).ProcessInline()` per listener (`src/Events/Program.cs`), the legacy Storage
  Queue/Functions pipeline uses default batched dequeue, and both scale out horizontally.
- Neither transport is ordered as configured: Azure Storage Queues are best-effort FIFO by design;
  Service Bus is FIFO only with sessions, and there are no sessions or partition keys anywhere in
  the codebase.
- Failed webhook deliveries are parked on an escalating retry schedule (10s → … → 12h,
  `SendEventToSubscriberHandler` / `RetryBackoffService`) while later events for the same subscriber
  are delivered — so even per-subscriber delivery order breaks on a single subscriber timeout.

Delivery is effectively at-least-once, unordered. Consumers that mirror process state from Altinn
events already must tolerate out-of-order (and duplicate) delivery; serializing registrations on our
side (e.g. chaining side-effects workflows per instance) would buy nothing downstream while
converting one poisoned registration into a blocked tail of every later event for the instance.
Deliberately not done.

## Consequences

- Positive: ProcessNext returns and the next transition unblocks as soon as critical work settles;
  side effects start at the commit (not after the service task); a failing notification cannot wedge
  the process; scheduling is exactly-once per committed transition; reject/abandon interacts
  correctly with side effects by construction; the engine keeps no app-specific machinery.
- Negative / accepted: side-effect failures no longer surface in the ProcessNext result (nor in the
  read-path status annotation) — a terminally failed side-effects workflow means events were lost,
  silently from the user's perspective. Mitigated with a dedicated telemetry dimension: the engine's
  `engine.workflows.execution.failed` counter is tagged `is_head` (on the execution, poisoned, and
  dependency-failed paths). Alert on `reason` in (`execution`, `poisoned`) across **all** `is_head`
  values — with the user-facing Retry removed from the failed screen (error details + contact
  support; see the live-status ADR), an ops resume is the only recovery path for a failed Main too —
  and use `is_head` for routing/severity: `false` = a side-effects workflow failed (events lost;
  re-deliver via the engine resume), `unset`/`true` = a head workflow failed (the instance is stuck
  until ops resumes it with cascade). Because a side-effects workflow carries its own state, **a
  redrive is always valid** — there is no "correctly dead" side chain to distinguish anymore. Failed
  side-effects workflows remain enumerable (`status=Failed`, `isHead: false`; or by collection key /
  `processNextInstanceGuid` label) and redrivable via the engine's resume API — the app's
  `process/resume` deliberately excludes them. See the observability + redrive runbook in the
  integration layer's `AGENTS.md`.
- Negative / accepted: process-end events may register before process-end cleanup finishes (see A5
  cons).
- Negative / accepted: cross-transition event ordering is not guaranteed — see the ordering section;
  this matches what the Events service delivers anyway.
- Deployment: v9 is unreleased and app-lib + engine ship from this monorepo. The app identifies
  side-effects workflows by the engine-reported `isHead == false`; an engine that does not persist
  and expose `is_head` (pre-v9) is not supported by this app-lib version. With `InheritStateFrom`
  gone, a side-effects workflow runs correctly off its own state on any engine version — a stale
  engine degrades only the app-side filtering (`isHead` missing from status responses), never into
  lost or wrong events.
- **Data retention (deliberate, bounded).** The engine's persisted workflow state (`initial_state`,
  per-step `state_out`) embeds the app's callback state — instance metadata, process state, and form
  data. This is inherent to the state-passthrough design of *every* workflow-engine-backed
  transition, not new to this decision; the side-effects workflow carries one more copy (the
  commit-time blob) that outlives even an instance hard-deleted from Storage at process end. The
  bounds and controls are: terminal workflows (and their state) are purged by the engine's retention
  job — default `Retention.RetentionPeriod` of **60 days** (2h sweep interval), configurable per
  deployment; the engine database is scoped **per org** and is not routed outside the cluster
  (neither the database nor the dashboard is reachable externally, and no human-facing surface
  exposes the blobs); an org can have its namespace pruned on request. There is deliberately **no
  erasure hook** from instance deletion into engine state — engine state is treated as short-lived
  processing data with a bounded lifetime, not as a copy of the archive. Aligning this explicitly
  with data-minimization/erasure requirements is a follow-up.
- Out of scope: this gates **workflow ordering** only. It does not prevent ad-hoc data mutation
  (direct PATCH) while a service task runs — that remains a client/data-path concern.

### Follow-ups

- Wire an actual alert rule on
  `engine.workflows.execution.failed{reason=~"execution|poisoned"}` in the monitoring stack,
  using `is_head` for routing/severity (the metric dimensions ship with this decision; the alert
  is deployment configuration).
- Data retention review (platform-wide, not specific to this decision): document the engine's
  retention period in service-owner-facing material (DPIA support), and evaluate per-org retention
  configuration and a purge-by-collection-key operation so an erasure request can also clear the
  corresponding engine state ahead of the retention sweep.

## Related

- `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md` — the integration layer:
  command sequences (including `EnqueueSideEffectsWorkflow`), state passthrough, and the
  side-effect failure observability + redrive runbook.
- `src/Runtime/workflow-engine/docs/workflow-collections.md` — collections, heads frontier, `IsHead`,
  `DependsOnHeads` (Example 5: "Invisible Side Chain with `IsHead = false`").
- `docs/adr/2026-07-08-process-live-workflow-status.md` — the live `workflow` status annotation on
  process reads. It resolves off collection heads, so side-effects workflows never surface as
  `processing`/`failed` on a read (intentional: they are non-blocking), and its failure-detail
  construction excludes them via the shared `ScopeToCurrentChain` filter.
