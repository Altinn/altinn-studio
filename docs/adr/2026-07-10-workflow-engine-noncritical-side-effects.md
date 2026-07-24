# Run non-critical process-next side effects in non-blocking side-effects workflows

- Status: Accepted
- Deciders: Daniel Skovli + App backend / Workflow Engine
- Date: 10.07.2026

## Problem

A process-next transition ran as **one** workflow, so the ProcessNext response and the next
transition on the instance waited for *everything* — including pure outbound notifications. A slow
or failing Altinn Events registration could gate the API response or wedge the instance's process
pipeline even though the transition had already committed.

Critical post-commit work must keep gating (`ExecuteServiceTask`, `EndProcessLegacyHook`,
`DeleteDataElementsIfConfigured`, `DeleteInstanceIfConfigured`). The fire-and-forget commands must
not (`MovedToAltinnEvent`, `InstanceCreatedAltinnEvent`, `CompletedAltinnEvent`,
`NotifyInstanceOwnerOnInstantiation`).

## Decision

**Enqueue-at-commit, one workflow per side effect.** A critical `EnqueueSideEffectsWorkflow` step
runs immediately after `SaveProcessStateToStorage` and enqueues the side-effect commands as
**separate single-step sibling workflows — one per side effect** — submitted as one atomic batch,
where each sibling is:

- an **independent root** (`dependsOn: null`, `dependsOnHeads: false`) — starts immediately;
- **invisible** to the collection heads frontier (`isHead: false`) — never gates the ProcessNext
  wait or the next transition;
- carrying its **own state**: the commit-time blob (the enqueue step's own `StateIn` — exactly what
  the transition committed);
- `links`-related to the Main workflow for ops traversal;
- named for its effect (OperationId suffix, e.g. `… · MovedToAltinnEvent`).

The batch is enqueued **idempotently** per Main workflow (one key, `{mainWorkflowId}:side-effects`,
covering the whole atomic batch).

Why this shape:

- **Exists if and only if committed.** The enqueue sits inside Main's retry envelope, before Main
  settles: a pre-commit failure schedules nothing, step retries dedup, and a committed transition's
  events survive a later reject/abandon of Main. No cancel logic, no races — and a failed side-effects
  workflow is always redrivable (own state, committed transition).
- **Independent outcomes fail independently.** The side effects are unrelated deliverables
  (event registrations, an owner notification); steps in one workflow are sequential, so bundling
  them would let a dead-lettered event registration silently starve the notification behind it —
  recreating, one level down, exactly the false coupling this ADR removes. One effect per workflow
  also gives per-effect retry pacing, a named per-effect alert row, and surgical redrive. Should
  a side effect ever genuinely need ordering relative to another, `dependsOn` expresses it
  explicitly rather than as an accident of step-list position.
- **Prompt.** Events fire at the commit, not after the service task.
- **No engine primitive.** The engine only persists/exposes `is_head` and tags the failure metric
  with it — generic observability, not app special-casing.

## Ordering

Side-effects workflows are independent of each other, so event registration order is not
guaranteed — neither across transitions nor between effects of the same transition. This breaks no
compatibility: **Altinn Events is unordered by design** — every queue has competing consumers (20
parallel listeners, horizontal scale-out), there are no Service Bus sessions or partition keys, and
per-event retry parking (10s → 12h) lets later events overtake a failing one even for the same
subscriber. Delivery is at-least-once, unordered; subscribers must already tolerate reorder and
duplicates. Serializing registrations on our side would buy nothing downstream while letting one
poisoned registration block every later event for the instance.

## Consequences

- ProcessNext returns and the pipeline advances as soon as critical work settles; a failing
  notification can never wedge the process.
- Side-effect failures are silent to users. Alert on `engine.workflows.execution.failed` with
  `reason` in (`execution`, `poisoned`); route by `is_head` (`false` = events lost → engine resume
  redrives; otherwise the instance is stuck → ops resume). Runbook in the integration layer's
  `AGENTS.md`; the alert rule itself is deployment config (follow-up).
- Process-end events may register before the process-end cleanup (deletes) finishes.
- Engine workflow state (incl. the commit-time blob) holds app data until the retention sweep
  (default 60 days; per-org database, not reachable outside the cluster). Explicit
  data-minimization/erasure alignment is a follow-up. Each sibling carries its own copy of the
  commit-time blob (2–3 per transition today); if blob volume ever matters, inject it only into
  siblings whose commands read it.

## Superseded / rejected

- **Side-effects workflow as a dependent of Main (`dependsOn: [main]`, first implementation).**
  A dependency means "start after Main settles", which is the wrong contract: events waited for
  the whole Main instead of the commit; the reject path had to cancel the sibling (racy,
  best-effort); and a committed transition's events were discarded when Main failed post-commit.
  It also required a new engine primitive (`InheritStateFrom`) to hand the final state across.
  Removed. Note: `links` (this design) expresses parentage/provenance; `dependsOn` expresses
  scheduling. Reviewers instinctively reach for `dependsOn` here — it was the first implementation
  and is rejected for the concrete reasons above, not by oversight.
- **Three-workflow diamond** (commit as its own workflow): enqueue-at-commit gets the same
  promptness without breaking the per-step state chain.
- **Step-level non-critical flag**: not expressible — the workflow, not the step, is the unit of
  dependency and heads tracking.
- **Controller-enqueued after settle**: a crash between settle and enqueue loses the side effects
  permanently; moving the enqueue *inside* the workflow (this decision) is the fix.

## Related

- `src/Runtime/workflow-engine/docs/workflow-collections.md` — collections, heads frontier,
  `IsHead`, `DependsOnHeads`.
- [PR #19506](https://github.com/Altinn/altinn-studio/pull/19506) — the read-path `workflow`
  status annotation; side-effects workflows never surface there (non-blocking by design).
