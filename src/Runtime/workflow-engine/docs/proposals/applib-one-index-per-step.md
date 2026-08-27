# One index per step

## Context

Follows [`applib-stage-index-identity.md`](applib-stage-index-identity.md) (implemented: jj
`mkyuprxoltps`/`e2af606e` + `vrqmkmsxloyn`/`51d612a9`). Tobias's ask (2026-08-26): remove
`RepliesTo` from `ExecuteServiceTaskPayload`, so a step always carries one index. Adopted in a
stronger form: the conclusion becomes an ordinary pipeline item, so *every* step names the one item
it runs by a single required index, and the two-nullable-index payload disappears. The public builder
surface (`Stage`/`HandleReplies`/`Finally`/`ConcludeOnReplies`) does not change — everything in this
proposal is internal to the app-lib. Nothing here has shipped, so payload and internal-model changes
are free. All paths relative to `src/App/backend/`. No engine changes.

## The design: the conclusion becomes an item

### Model

- `PipelineConclusion` becomes a subclass of `PipelineItem` (keeping its two members, `FinalStep` and
  `ReplyExchange`, and its closed-set constructor discipline). The terminals still construct it; the
  `ServiceTaskPipeline` constructor takes `(IReadOnlyList<PipelineItem> items, PipelineConclusion conclusion)`
  and stores one list with the conclusion appended **last** — so "exactly one conclusion, at the
  end" stays structural, enforced by the only constructor, not by a validation.
- `ServiceTaskPipeline` keeps only `Items`. The `Conclusion` property and both
  `FindReplySegment`/`FindReplySegmentIndex` lookups are **deleted** — every consumer indexes
  `Items` directly (dispatch, options resolver, planner, relay; see below).
- `ServiceTaskPipelineBuilder`: no signature changes. `Stage`'s `openingIndex = _items.Count` is
  unchanged (the conclusion is appended after everything).

### Index vocabulary — two indexes remain, with disjoint jobs

- **Item index** — a position in `Items`; names *the item a step runs*. Carried by every
  `ExecuteServiceTask` step: a stage's own index, a reply handler's own index (mid-pipeline
  `ReplySegment` or terminal `ReplyExchange` — both are items now), or the conclusion's.
- **Opening stage index** — the item index of the `MailboxOpening` stage; names *the exchange/mailbox*.
  Still the carry's key, `MintMailboxPayload.StageIndex`, and
  `EnqueueReceiveWorkflowPayload.OpeningStageIndex` (both commands are about the mailbox, not about a
  pipeline item to run — unchanged). The **blob format does not change**: `"mailboxes"` stays keyed
  by opening stage index.

A receive step therefore stops carrying the opening index and carries **its handler's item index**.
The exchange it answers is read off the resolved handler (`ReplySegment.OpeningIndex` /
`ReplyExchange.OpeningIndex`) — composition data fixed by `Define`, not a per-hop lookup. The
mailbox id itself still comes only from the rendezvous and the carry, never from the pipeline. The
doctrine sentence updates accordingly: *the step carries which handler runs; the handler's
composition names which exchange it answers*. Under a mid-flight reshape both the old and the new
scheme misassign equally — reshapes stayed unguarded and accepted in the previous proposal, and
nothing here changes that.

### Payload

```csharp
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, int? ItemIndex = null);
```

- `RepliesTo` deleted; `ItemIndex` is the only index and is semantically required.
- It stays `int?` **on purpose**: `CommandPayloadSerializer.Deserialize` throws out of
  `WorkflowEngineCommandBase` on a binding failure (no catch — an unhandled callback exception, not
  a legible verdict), so a non-nullable `int` would either throw on an old index-less payload or,
  worse, default-bind `0` and silently dispatch item 0. A `null` index is guarded first thing in
  `Execute` as a permanent `InvalidPayloadException` ("written by a version of this app-lib whose
  step identity differed") — the same no-compat stance as the previous proposal, one guard instead
  of the deleted both-indexes guard. An old receive payload's `repliesTo` property is skipped by
  deserialization, leaving `ItemIndex` null — refused by the same guard.

### Dispatch (`ExecuteServiceTask.Execute`)

Resolve the task and pipeline, then **one switch on `Items.ElementAtOrDefault(index)` × rendezvous
presence** — each arm a method that assumes its shape, as today:

| Item at index                | rendezvous present            | no rendezvous              |
| ---------------------------- | ----------------------------- | -------------------------- |
| *(none — out of range)*      | `PipelineItemNotFound`        | `PipelineItemNotFound`     |
| `ServiceTaskStage.Plain`     | `MailboxReceiptOnStage`       | `ExecuteStage`             |
| `ServiceTaskStage.MailboxOpening` | `MailboxReceiptOnStage`  | `ExecuteStage` (carry read unchanged) |
| `ReplySegment`               | `ExecuteSegmentReply`         | `MailboxReceiptMissing`    |
| `PipelineConclusion.ReplyExchange` | `ExecuteTerminalReply`  | `MailboxReceiptMissing`    |
| `PipelineConclusion.FinalStep` | `MailboxReceiptOnConclusion` | `ExecuteConclusion`      |

The reply-execution bodies (`ExecuteReply` prelude, both `Execute*Reply` wrappers, the mappers) are
unchanged; the two `Decide` calls now pass `item.OpeningIndex` (for the carry key) alongside the
step's own item index (for the successor — next section).

**Deleted with the two-index payload:**

- `BothStepIndexes` / the both-indexes `InvalidPayloadException` arm — unrepresentable.
- `MailboxHandlerNotFound` — its two halves land in `PipelineItemNotFound` (index out of range) and
  the shape-mismatch guards (rendezvous on a non-handler).
- The `(null, ReplyExchange)` dispatch arm and its `Finally`-turned-terminal redeploy essay — the
  scenario still fails loudly, now through the general `MailboxReceiptMissing` rule (the old Main's
  concluding step carries the old terminal's index; whatever shape sits there now either answers no
  message or expects a rendezvous the step does not carry).
- Both **pre-resolution refusals**. Telling whether an item answers messages now requires the
  pipeline, so the rendezvous-mismatch guards move inside the `try`, where a throwing task
  resolution turns them retryable — the known wart already recorded for every other guard on this
  path (`MintMailbox` has the identical shape). Accepted, not fixed here.

**Renamed:** `ServiceTaskStageNotFound` → `PipelineItemNotFound` (the index space is items, and a
receive step's miss lands here too). `MailboxReceiptOnStage`'s wording widens: with one index a
receive step whose index lands on a stage after a reshape is indistinguishable from a foreign
workflow handing a stage a rendezvous, so the message names both routes instead of asserting "this
workflow was not built by this application's pipeline expansion".

### Relay and planner

- `MailboxContinuation.AwaitNextMessage`/`ConcludeAndContinue` carry the **handler's item index**
  (and keep the opening index only where the carry key or wording needs it — see below).
  `ConcludeAndContinue`'s xmldoc today claims its index is "the handler's position in the pipeline";
  that claim is false today (the relay re-derives the position via `FindReplySegmentIndex`) and
  becomes true here — the property finally is what its doc says.
- `MailboxRelay.EnqueueContinuation` **loses the pipeline lookup entirely**: `PlanSegment(…,
  afterHandlerItemIndex: continuation.HandlerItemIndex)` takes the carried index directly. The
  `FindReplySegmentIndex` miss and its "Define must return the same pipeline every time"
  `InvalidOperationException` are deleted with the lookup. (The task resolution and `PlanSegment`
  call stay — the segment's *shape* is still re-derived at the hop, as documented.)
- `WorkflowCommandSet.PlanSegment`: the trailing conclusion `switch` folds into the loop — the walk
  simply reaches the conclusion item: `FinalStep` → append the concluding step **with its index**
  (payload and OperationId), `ReplyExchange` → return the receive half, exactly like the
  `ReplySegment` arm. `MailboxReceivePlan` keeps `(Step, OpeningStageIndex)` — the step's payload
  now names the handler item, and `OpeningStageIndex` stays because
  `EnqueueReceiveWorkflowPayload`'s carry lookup is keyed on it (its "held twice on purpose" remark
  carries over).
- `MailboxRelay.Decide`/`DecideSegment`: signatures gain the split described above — the answering
  item's index (what the successor's receive step names) next to the exchange's opening index (what
  `RecordMailboxConcluded` and the wording use). This also deletes `DecideSegment`'s "third meaning"
  remark: each parameter has one meaning again.

### Options resolution

- `StepRequest`: `ServiceTaskStageIndex` + `ServiceTaskRepliesTo` → one `ServiceTaskItemIndex`.
  Set on every `ExecuteServiceTask` step (the conclusion's included); still absent from `MintMailbox`
  steps, which must not inherit the stage's options (unchanged, and the comment stays).
- `ProcessStepOptionsResolver`: the three-way branch collapses to one lookup —
  `pipeline.Items.ElementAtOrDefault(itemIndex)?.StepOptions`, merged field-wise with the task's
  options exactly as today. The "three sources are alternatives, never a chain" property is now
  literal in the shape: one item, one fallback. (Every `PipelineItem` already carries
  `StepOptions`, the conclusion included.)

### Ops legibility

- The conclusion's step gains its index: OperationId `ExecuteServiceTask: {index}` uniformly, so a
  simple `IServiceTask`'s one step reads `ExecuteServiceTask: 0` instead of bare
  `ExecuteServiceTask`. The index *is* the identity; a bare name was the old "no index = conclusion"
  convention, which this proposal retires.
- Receiver/continuation OperationIds keep the **opening index** (`Mailbox receive: {task} · 2`,
  `Mailbox continue: {task} · after 1`): the exchange is the ops-meaningful identity there, and both
  values are in hand at the enqueue sites. No format change.

### Guard ledger delta

| Today                                                          | After                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| both indexes set → `InvalidPayloadException`                    | unrepresentable (one index)                                            |
| index-less payload = the conclusion                             | index-less payload → permanent `InvalidPayloadException` (foreign/old) |
| `ServiceTaskStageNotFound` / `MailboxHandlerNotFound` (two codes) | one `PipelineItemNotFound`                                           |
| `MailboxReceiptOnConclusion` refused before task resolution     | same verdict, after resolution (the shape must be known); wart noted   |
| `MailboxReceiptOnStage` = "not built by this expansion"          | wording also names the reshape route                                   |
| `MailboxReceiptMissing` (incl. the special `(null, ReplyExchange)` arm) | same code, one general rule: reply item without a rendezvous   |

### Swept in (small, same PR)

- `WorkflowCallbackStateCarry`'s restoring constructor refuses **non-canonical** integer keys
  (`key != stageIndex.ToString(InvariantCulture)`), closing the recorded `"0"` vs `"00"`
  last-writer-wins residual from the previous proposal.
- Drop the stray `$` prefixes on non-interpolated string segments in `ExecuteStage`'s
  `ServiceTaskStageNotFound` message (they survive into whatever wording `PipelineItemNotFound`
  gets).

Deliberately **not** swept in: deduplicating the three near-identical `AppWorkflowContext` builds
(`EnqueueReceiveWorkflow.Execute`, the relay's two enqueues) — two different source shapes, small
payoff, separate decision.

## Consumers and tests

- **Consumers: none.** The public surface (`Stage`, `HandleReplies`, `Finally`, `ConcludeOnReplies`,
  `MailboxHandle`, the result roots) is untouched — FiksArkiv, EFormidling, the test apps and the
  analyzer need no change, and the public-API snapshot should not change.
- **Tests**: dispatch tests re-keyed to the one-index payload (the both-indexes suite deleted, an
  index-less-payload refusal test added); `MailboxHandlerNotFound` scenarios become
  `PipelineItemNotFound`/shape-mismatch assertions; resolver tests lose the three-way branch cases;
  relay tests assert the carried handler index and the deleted lookup; carry pin test **unchanged**
  (blob shape unchanged) plus a new non-canonical-key refusal case; integration tests update the
  conclusion step's OperationId assertion.
- **Docs (PR 2)**: `Internal/WorkflowEngine/AGENTS.md` — the four-way-dispatch bullet becomes the
  item-switch, the "index-less step never answers a message" and "conclusion keeps its no-index
  identity" sentences retire, the identity doctrine sentence updates to "the step carries the
  handler; the handler names its exchange". CHANGELOG: extend the existing Unreleased
  breaking-change entry by one clause (the concluding step's OperationId now carries its index);
  nothing else is user-facing.

## Suggested PR slicing

1. **PR 1 — the model swap.** Conclusion-as-item + one-index payload + dispatch + relay/planner +
   resolver + tests, one atomic change (two step-identity schemes cannot half-coexist in the tree).
2. **PR 2 — docs.** AGENTS.md rewrite of the affected bullets, changelog clause, xmldoc pass; `rg`
   proving `RepliesTo`, `FindReplySegment` and `ServiceTaskRepliesTo` are gone from `src/`.

## Decisions — confirmed 2026-08-27

Both confirmed by Tobias exactly as proposed; implement them as written.

1. **Reason-code renames** — CONFIRMED. `ServiceTaskStageNotFound`+`MailboxHandlerNotFound` →
   one `PipelineItemNotFound`; `MailboxReceiptOnConclusion`/`MailboxReceiptOnStage` keep their
   codes with widened wording.
2. **The conclusion's OperationId gains an index** — CONFIRMED. `ExecuteServiceTask: {index}`
   uniformly, so a simple `IServiceTask` emits `ExecuteServiceTask: 0`.

## Worker/reviewer protocol

- Use jj, not git.
- Top-level folders may be separate jj repositories; workers must run `jj root` from touched paths.
- Before coding, if the current jj revision is non-empty, create a new child revision.
- Do not push.
- Do not move bookmarks.
- Do not revert unrelated user changes.
- Workers and reviewers report back to the orchestrator by ending their run with a final report.
  They cannot message the orchestrator mid-task; if blocked, they end the run with a BLOCKED report
  rather than waiting.
- Worker final reports include: step name, READY_FOR_REVIEW/BLOCKED marker, jj change/revision ids,
  changed files, tests run, and notes for later steps.
- Reviewer final reports include: APPROVED or CHANGES_REQUESTED, with findings first.
- If a step is too broad, update the plan with the smallest coherent split and end the run with
  BLOCKED_FOR_SCOPE_SPLIT.

## Implementation status

| Step | Scope                                                              | Status      |
| ---- | ------------------------------------------------------------------ | ----------- |
| 1    | PR 1 — conclusion-as-item, one-index payload, dispatch/relay/planner/resolver, tests | not started |
| 2    | PR 2 — docs: AGENTS.md bullets, changelog clause, xmldoc pass, `rg` proof | not started |
