# Stage identity by index

## Context

Pipeline stages are identified by an author-supplied name: it is the callback dispatch key
(`ExecuteServiceTaskPayload.StageName`), the exchange's identity everywhere downstream (carry key,
`RepliesTo`, the mint's and the drift guards' vocabulary), the ops-visible OperationId suffix, and a
documented "compatibility surface" whose rename strands in-flight workflows loudly. Tobias's ruling
(2026-08-24): the name never guaranteed in-flight compatibility — a redeploy can keep every name and
still be incompatible with an old enqueue (changed stage semantics, changed data contracts between
stages) — so the drift protection it buys is a tripwire on the least dangerous change class, and does
not justify the per-stage literal, its validations, or the doctrine around it.

Identity therefore becomes the item's index. A mid-flight reshape (stages inserted, reordered or
removed) shifts every index behind it and can misassign work on resumed or in-flight workflows — but
that hazard is not specific to indexes: *any* mid-flight change to the composed process (an edited
BPMN file above all) invalidates an old enqueue in the same way. It is a general versioning problem
the app developer owns, deliberately **not addressed here**: nothing in this document guards against
it, exactly as nothing guards a changed BPMN.

Nothing here has shipped (the whole pipeline/mailbox surface is unreleased), so payload, blob and
public-API changes are free. All paths relative to `src/App/backend/` unless stated otherwise. No
engine changes.

## Decisions already made with the user

1. **Stage names are removed from the public API**: `Stage(work, options?)` and
   `Stage(work, mailboxOptions, out handle, options?)` — no name parameter, no ASCII validation, no
   duplicate-name validation.
2. **Identity is the item's index.** Every service-task step payload carries its index (where
   applicable); the exchange's identity is its **opening stage's item index**, exactly replacing
   today's opening stage name in every role.
3. **Mid-flight reshapes are accepted, unguarded.** Changing the pipeline between deploys is the
   app's compatibility responsibility, the same way every behavior change is — and the same class of
   risk as editing the BPMN file. This proposal adds no protection for it.
4. Old payloads are refused, never emulated ([no-compat policy]): there is no name→index migration
   arm — a payload carrying the retired `StageName`/`RepliesTo` strings simply no longer deserializes
   to anything the dispatch honors, and since nothing shipped, nothing needs to.

## Index space

Indexes are positions in `Pipeline.Items` (stages and handlers share the space — a handler occupies
an index even though it is never a step of its own workflow). The conclusion keeps its "no index"
identity (neither field set), as today.

## Payload and model changes

- `ExecuteServiceTaskPayload(ServiceTaskType, StageIndex: int?, RepliesTo: int?)` — at most one of
  the two indexes set (guard as today).
- `MintMailboxPayload(ServiceTaskType, StageIndex)`.
- `EnqueueReceiveWorkflowPayload(EnqueueRequest, OpeningStageIndex)`.
- `MailboxContinuation.AwaitNextMessage`/`ConcludeAndContinue`: `OpeningStageName` →
  `OpeningStageIndex` (still sourced from the executing step's payload; carrying it stays the cheaper
  and more explicit move).
- Carry/blob: `"mailboxes"` keyed by the opening item index as a string
  (`"mailboxes": { "0": { "id": …, "deadline": … } }`); `RecordMailbox(int, …)`, `FindMailbox(int)`,
  `RecordMailboxConcluded(int)`. Update the literal-field-names pin test.
- `MailboxHandle`: `OpeningStageName` → `OpeningIndex` (internal; the handle stays opaque).
- `ServiceTaskStage` loses `Name`; `ReplySegment.OpeningStageName` → `OpeningIndex`;
  `FindStage(string)` → `Items[index]`; `FindReplySegment` likewise by index.
- `StepRequest.ServiceTaskStageName`/`ServiceTaskRepliesTo` → `int?` equivalents;
  `ProcessStepOptionsResolver` keys tier 3 by index (same three-way branch, no `??` chain).

## Dispatch and guards

Order in `ExecuteServiceTask.Execute` (and the top of `MintMailbox` / `EnqueueReceiveWorkflow`):

1. Payload guards that need no pipeline: both-indexes set (`InvalidPayloadException`), rendezvous on
   an index-less step (`MailboxReceiptOnConclusion`) — both before task resolution, as today.
2. Resolve the pipeline; `StageIndex` → that item must exist and be a stage of the expected kind;
   `RepliesTo` → a `ReplySegment` at that index or the conclusion. An index that fails to resolve
   fails loudly through the existing not-found guards, reworded from name to index ("no stage at
   index 2") — at best a hint that the pipeline moved under an in-flight workflow; by luck, not
   design.

**Deleted with the name** (the rename-tolerance complex, which exists only because names could drift):

- `TerminalStandsInFor` and its stand-in ruling, xmldoc essay, and tests — renames no longer exist,
  so `RepliesTo` matching the conclusion is exact.
- The relocation enumerations in `ServiceTaskStageNotFound`, `MailboxDeclarationNotFound` and
  `MailboxHandlerNotFound` (they walked the current pipeline looking for where a *name* went) — an
  index has no old value to search for; the guards keep only their plain not-found verdicts.
- The "identity carried, never re-derived at a hop" cautions specific to rename survival (the values
  are still carried in payloads; the *warnings* about re-derivation lose their scenario).
- Builder: name parameters, ASCII check, duplicate-name check.

**Unchanged**: the rendezvous guards (`MailboxReceiptOnStage`/`OnConclusion`/`Missing`/`Ambiguous`,
`MailboxDeliveryEnvelopeInvalid`), `MailboxStepIdMissing`, `MailboxIdMissingFromState` (reworded to
index), the relay saga, keys (`{stepId}:mailbox-*`), frontier/labels/state-lineage mechanics, the
result vocabularies, and the analyzer's flow analysis (only its message source changes, below).

## Ops legibility

Names carried the story in OperationIds and errors. Options:

- **(a) Chosen (2026-08-26)**: bare index: `ExecuteServiceTask: 2`, `MintMailbox: 1`,
  `Mailbox continue: {task} · after 1`. Honest, terse, loses the narrative. No delegate-derived
  labels; no Operation-Id sanitization needed.
- (b) Delegate-derived display name, display-only — rejected for now.

The analyzer's diagnostics switch from the `name:` argument to the `out` variable's identifier (which
it already resolves) — "the mailbox opened into 'archive' is already answered…".

## What the expansion and relay change

Mechanical: `PlanSegment` walks by index (its `afterExchange` parameter becomes the handler's item
index; `FindSegmentStart` an index comparison) and emits payloads carrying indexes. The relay's
successor/continuation enqueues embed the indexes just resolved, same request.
`WorkflowEngineCommandValidator`'s dummy pipelines compose without names.

## Consumers and tests

- **FiksArkiv**: `SendStageName` const deleted; `Define` becomes
  `pipeline.Stage(SendToArchive, opts, out var archive).ConcludeOnReplies(archive, …)`. (`StepId`
  remains the idempotency key; nothing there used the name.) Same for `EFormidlingServiceTask`, the
  integration scenarios, and the test apps.
- **Tests**: builder tests lose name validations; the drift-guard tests (`StageNotFound`,
  `DeclarationNotFound`, `HandlerNotFound`) lose their rename/relocation scenarios and assert plain
  index verdicts; the stand-in suite is deleted; the mid-flight-rename tests
  (`AwaitNextReply_EnqueuesTheSuccessorAgainstTheNameTheReceiverCarried` etc.) are deleted with the
  scenario — renames no longer exist; carry pin test updated to index keys; analyzer snapshot
  re-verified (message change only); integration tests update OperationId assertions per the
  legibility decision.
- **Docs**: the AGENTS.md stage-name doctrine (the "compatibility surface" sentences, the
  `TerminalStandsInFor` bullet, the guard inventory) is rewritten around index identity and the
  unguarded-reshape stance; changelog rewords the mailbox entries' API examples and adds the API
  change under the existing breaking-change section.

## Guard ledger delta

| Today                                                       | After                                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| rename a stage mid-flight → loud `ServiceTaskStageNotFound`  | renames don't exist                                                                                                  |
| insert/reorder/remove stages mid-flight → tolerated (old plan runs) | unguarded — same class as any mid-flight process change (e.g. a BPMN edit); accepted, out of scope here       |
| terminal stand-in for a renamed single exchange              | deleted — no renames to tolerate                                                                                     |
| same-shape semantic change                                   | uncaught, as it always was — the app's responsibility                                                                |
| duplicate/non-ASCII stage names → eager throw                | deleted with the name                                                                                                |

## Suggested PR slicing

1. **PR 1 — the identity swap.** One atomic change (two identity schemes cannot half-coexist in the
   tree): builder API + payloads + carry + dispatch/guards + relay/planner + consumers + tests.
   Large but mechanical outside the dispatch rework.
2. **PR 2 — docs.** AGENTS.md contract rewrite, changelog, xmldoc pass; `rg` proving `StageName`,
   `OpeningStageName`, `stage name` (as a contract term) are gone from `src/`.

## Decisions to confirm before implementation

1. **Reshapes left unguarded** (decision 3 above) — inserting, reordering or removing pipeline items
   between deploys can strand or corrupt in-flight work, including exchanges waiting days for an
   answer, with no tripwire. Accepted as the app developer's responsibility, like any mid-flight
   process change.
2. **Display names in OperationIds** — **resolved 2026-08-26: option (a) bare index.**
   `ExecuteServiceTask: 2`, `MintMailbox: 1`, `Mailbox continue: {task} · after 1`; guard messages say
   "the stage at index 2". No delegate-derived labels anywhere.

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

| Step | Scope                                                        | Status    |
| ---- | ------------------------------------------------------------ | --------- |
| 1    | PR 1 — the identity swap (API, payloads, carry, guards, relay, consumers, tests) | approved (jj `mkyuprxoltps` / `e2af606e`; residuals recorded below) |
| 2    | PR 2 — docs: AGENTS.md rewrite, changelog, xmldoc pass, `rg` proof | approved (jj `vrqmkmsxloyn` / `20b26c15`; also carries the mechanical `process-transition-test` compile fix left by step 1) |

### Recorded residual gaps (non-blocking)

- `test/Altinn.App.SourceGenerator.Tests`: `FullTests.Empty`/`Run` fail (CRLF-vs-LF in generated-output
  literals) — caused by the separate `.editorconfig` crlf→lf ancestor commit (`trtzopwnwmkl`), not by any
  step here; the generator-literal sites documented in `src/App/backend/AGENTS.md` need normalizing with that flip.
- Restore-time blob-key collision (`"0"` vs `"00"` would last-writer-win on restore; nothing writes such keys today).
- Released `[9.0.0-preview.4]` changelog text still teaches the retired name-based API (history left unedited;
  superseded by the new Unreleased → Changed breaking-change entry).
- CHANGELOG.md unreleased wording "the same `Stage(work, options, out handle)` overload as before" refers to
  overload shape, not identity — cosmetic.
