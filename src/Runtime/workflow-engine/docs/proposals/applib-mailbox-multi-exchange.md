# Sequential multi-exchange for the mailbox pipeline API (phase 2)

## Context

Phase 1 ([`applib-mailbox-api.md`](applib-mailbox-api.md), implemented) restricted a pipeline to **one
exchange**, with the reply terminal as the conclusion. That restriction was a scoping call made while
planning, not the agreed design: what the design discussion deferred was only **interleaving** — the
same handle consumed by more than one handler — while plain sequential multi-exchange (several
mailboxes, each answered by exactly one handler, in pipeline order) was meant to be in scope. This
phase lifts the restriction.

Phase 1 deliberately left the plumbing multi-shaped, so most of the ground is prepared: the carry is a
map keyed by opening stage name with nothing assuming one entry (and tests holding two),
`EnqueueReceiveWorkflowPayload` already names its exchange, `MailboxHandle` exists as a value precisely
so a terminal can say *which* exchange it answers, and `MintMailbox` keys on its own step id so it
works unchanged from any workflow. What phase 1 did **not** build: the pipeline model is still
single-conclusion (the reply terminal *is* the conclusion), there is no vocabulary for a reply handler
that continues the pipeline instead of concluding the task, and the relay has no move that starts the
pipeline's next segment. Everything below is app-lib only; no engine changes.

The target shape, using the archive-then-journal example from the design discussion:

```csharp
pipeline
    .Stage("SendToArchive", SendToArchive, archiveOpts, out MailboxHandle archive)
    .HandleReplies(archive, OnArchiveMessage, OnArchiveClosed)       // non-terminal: pipeline continues
    .Stage("SendToJournal", SendToJournal, journalOpts, out MailboxHandle journal)
    .ConcludeOnReplies(journal, OnJournalMessage, OnJournalClosed);  // terminal: concludes the task
```

Also valid: both sends up front (`Stage(A) → Stage(B) → HandleReplies(A) → ConcludeOnReplies(B)`), and
a reply handled mid-pipeline with trailing stages (`Stage(A) → HandleReplies(A) → Stage(record) →
Finally(...)`) — which dissolves phase 1's "mid-pipeline reply" scope cut as a side effect.

All paths are relative to `src/App/backend/` unless stated otherwise.

## Decisions already made with the user

1. **Sequential only.** Exchanges are processed in handler composition order, one relay chain:
   Main → receivers A → continuation → receivers B → … → conclusion → process-next. Concurrent
   exchanges with a join semantic stay rejected. Head-of-line blocking is accepted and documented:
   messages for a later exchange wait in its log (the engine births receivers with their message even
   after closure, so an expired-but-answered mailbox still drains before its closing signal surfaces).
2. **Interleaving stays out.** Each handle is consumed by exactly one handler. Re-referencing a handle
   in a later segment (yield/resume) remains deferred until a consumer needs it; the model must merely
   not preclude it.
3. **Sends stay stage-only.** A handler cannot open a mailbox; a later exchange's send is a stage in
   the continuation (or an earlier segment). The mint step hugs its stage wherever that stage rides,
   so each deadline runs from its own send — meaning the *author* chooses, by stage placement, whether
   exchange B's clock runs during exchange A (up-front sends) or starts after A concludes.
4. **Identity carried, shape re-derived** — the phase-1 rule, extended: which exchange a receiver
   answers and which handler just concluded travel in payloads (opening stage name, fixed at enqueue),
   while the *content* of the next hop (handler step options, continuation steps) is re-derived from
   the current pipeline at that hop, exactly as successor receivers already are.
5. **Mid-chain permanent failure closes only its own mailbox.** Later mailboxes that are already open
   (up-front sends) stay open until their deadlines — closing them early would sabotage resume, which
   replays the failed handler and may then legitimately continue the chain.
6. **The singular handler forms go** (decided 2026-08-23): phase 1's `ConcludeOnReply` is deleted as
   part of this phase, and no `HandleReply` sibling is added — each position gets exactly one method,
   the plural form. What the singular enforced ("this protocol sends one answer") is an app protocol
   expectation, not a platform invariant: the runtime erased the single/multi distinction anyway, the
   mailbox is not capacity-1 engine-side, and an `AwaitNextReply` on a one-answer protocol
   self-reports at the deadline through the handler's own `onClosed`. The platform-owned compile-time
   guarantees all survive (`AwaitNextReply` stays uncompilable from every `onClosed`, from `Finally`,
   and from stages). Nothing in-tree uses `ConcludeOnReply`, nothing has shipped, and a singular
   overload can be reintroduced later purely additively should real consumers ask — the reverse would
   be a breaking change. The plural names stay, as they are honest about `AwaitNextReply` being in the
   vocabulary; the one-answer guidance moves into `ConcludeOnReplies`' xmldoc ("a one-answer protocol
   simply concludes on its first message").

## Invariants that must survive (unchanged from phase 1, extended across the new hop)

1. **Frontier-never-empty**, now across continuations too: the continuation is enqueued from inside
   the still-unsettled receiver (relay `Continue`, post-save), and the continuation's last step
   enqueues the next receiver before the continuation settles. At no instant between the transition's
   enqueue and the task's conclusion does the collection read all-settled.
2. **At most one execution concludes — per exchange.** `MailboxContinuation` grows to a closed
   three-member set (`AwaitNextMessage` | `Conclude` | `ConcludeAndContinue`), keeping the structural
   property: `AwaitNextMessage` has no path to a closure; both `Conclude` shapes have none to a
   successor receiver of the same exchange. Only the terminal produces an after-workflow.
3. **Every keyed engine call keys off the executing `StepId`**: the existing `{stepId}:mailbox-receive`
   and `{stepId}:mailbox-after`, plus the new `{stepId}:mailbox-continue`.
4. **Close-before-continue, per exchange**: `ConcludeAndContinue` closes mailbox k before enqueueing
   the continuation, in one method, same as `Conclude` closes before the after-workflow.
5. **The deadline clock starts at each send**: mint steps keep hugging their stages; nothing mints at
   segment boundaries or workflow starts.
6. **The state lineage stays linear**: handler k publishes its blob → the continuation carries it →
   its stages evolve it → the next receiver gets that segment's final blob. No new state channel.
7. The saga stays in `MailboxRelay`; successors and continuations carry the re-derived transition
   labels; the envelope flow is untouched.

## The design insight: a non-terminal reply handler is a message-driven stage

A non-terminal handler needs to say exactly five things: this message handled, wait for the next;
exchange done, continue the pipeline; retry this message; fail the task; park against
this message. Four of those are **exactly `ServiceTaskStageResult`** — `Completed` (with its
documented meaning: cannot conclude the task or advance the process; the pipeline just moves on),
`FailedRetryable`, `FailedPermanent`, `Defer`. So the non-terminal vocabulary is not a new parallel
hierarchy: it is the stage vocabulary, re-rooted once to admit `AwaitNextReply`, the same move phase 1
made for `ServiceTaskResult`:

```text
ServiceTaskStageExchangeResult          (new abstract root; factory: AwaitNextReply())
├── ServiceTaskStageResult              (re-parented; Completed / FailedRetryable / FailedPermanent / Defer)
└── ServiceTaskStageAwaitNextReplyResult (new sealed record)
```

- `Completed()` from a non-terminal handler means *the exchange is concluded; run the next segment* —
  no `Success(action)`, no auto-advance, structurally: those live only on `ServiceTaskResult`, which
  non-terminal handlers cannot return.
- `ServiceTaskStageAwaitNextReplyResult` duplicates the shape of `ServiceTaskAwaitNextReplyResult` on
  purpose — the two roots are different contracts, and a type cannot have two bases. Same justification
  and same documentation pattern as the `MailboxDisposedReason`/`MailboxClosedReason` enum pair; app
  authors only ever touch the factories, so the duplication is invisible at use sites.
- Both new-root constructors follow the phase-1 closure pattern (`private protected`, the copy-ctor
  hole documented and pinned by a self-cleaning test, the approval-file caveat cross-referenced).

## Public API

One new builder method, the non-terminal sibling of the terminal (names contrast: `Conclude*` ends
the chain, `Handle*` continues it), returning `ServiceTaskPipelineBuilder`:

- `HandleReplies(handle, onMessage, onClosed, options?)`.
  `onMessage: Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>>`;
  `onClosed: Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>>` — a closure
  may legitimately `Completed()` (the exchange was optional; continue) or fail the task, and can never
  await a message.

And one removal (decision 6): **`ConcludeOnReply` is deleted** — with it go the widening wrapper in
`ServiceTaskPipelineBuilder.ConcludeOnReply`, its two tests
(`ConcludeOnReply_RecordsTheSameExchangeShapeWithTheHandlerWrapped`,
`ConcludeOnReply_WrappedHandler_ForwardsArgumentsAndResult`), its arms in the other builder tests, its
mentions in xmldocs, `Internal/WorkflowEngine/AGENTS.md` and the changelog's mailbox entry, and its
line in the public-API approval file. `ConcludeOnReplies`' xmldoc gains the one-answer guidance in its
place.

Builder changes behind them:

- The one-mailbox eager throw is deleted; `_handle`/`_handleAnswered` generalize to a registry of
  issued handles with per-handle answered marks. "Answered exactly once" stays, now per handle.
- **Terminal completeness check**: every terminal (`Finally` *and* both `Conclude*`) throws eagerly if
  any handle other than the one it answers is still unanswered, naming the stage — the generalization
  of phase 1's `Finally` refusal. A mailbox opened but never answered remains uncompilable to *lose*
  and a startup failure to *forget*.
- Handler order is exchange order, and it is the author's choice — `Handle(B)` before `Handle(A)` is
  legal when both stages precede both handlers. No ordering validation beyond what handles make
  structural (a handler can only reference an already-composed stage).
- **Fold in the phase-1 follow-up: make the builder's constructor `internal`.** With several handles
  in play, the fresh-builder mixing hole gets strictly worse; this is the moment. Public-API delta +
  changelog line.

`ConcludeOnReplies`' xmldoc and the changelog drop "a task gets one exchange in this version"; the
two-BPMN-tasks guidance survives only as the answer for *concurrent* needs.

### Analyzer: consuming a handle twice fails the app build

A compiler error is out of reach — C# has no linear types, and a `MailboxHandle` is an ordinary
reference — but the mistake becomes *writable* the moment `HandleReplies` exists, so it gets an
analyzer error in `Altinn.App.Analyzers`, following the `ALTINNAPP0700`/`0701` pattern (Error
severity, `Contracts` category, runtime backstop stays authoritative):

- **`ALTINNAPP0702` — mailbox handle consumed twice.** Within one method body, collect invocations of
  `HandleReplies`/`ConcludeOnReplies`, resolve each `handle` argument to its symbol (the `out var`
  local from the mailbox `Stage` overload), and report the second consumption of the same symbol on
  the same execution path, naming the opening stage. Message shaped like: *"the mailbox opened by
  stage '{0}' is already answered by an earlier handler; each handle is answered exactly once."*
- **Calibration, per `IncompleteBuilderAnalyzer`'s own doctrine:** an Error-severity false positive
  breaks an app's build, so report only what is provable — same local, straight-line double
  consumption. A handle stored in a field, passed to a helper, or consumed once per branch is not
  soundly reportable and is deliberately left to the builder's per-handle "answered exactly once"
  throw at startup, exactly as `ALTINNAPP0701` punts unprovable non-completion to startup validation.
  `Define` is contractually cheap/deterministic and in practice one fluent chain, so the provable
  case covers essentially all real code.
- **Optional companion (provable subset only):** a handle whose local has no references besides its
  declaration is "opened but never answered" and can be reported at the declaration; anything with
  further references falls through to the terminal-completeness throw.
- Deliverables: the analyzer + tests in `Altinn.App.Analyzers.Tests`, the
  `AnalyzerReleases.Unshipped.md` entry, and the rules doc page the `helpLinkUri` convention points at.

## Internal model

`ServiceTaskPipeline.Stages` becomes an ordered `Items` list; `Conclusion` stays exactly as phase 1
built it (the minimal delta — the terminal reply handler remains the conclusion, not an item):

```csharp
// Closed set, private ctor, not records — phase 1's conventions carry over.
internal abstract class PipelineItem
{
    // ServiceTaskStage.Plain and ServiceTaskStage.MailboxOpening move under here unchanged, plus:
    internal sealed class ReplySegment   // a non-terminal handler
    {
        string OpeningStageName;         // the exchange's identity, as everywhere
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>> OnMessage;
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>> OnClosed;
        ProcessStepOptions? StepOptions;
    }
}
```

(Exact nesting — whether `ServiceTaskStage` stays its own hierarchy under a `PipelineItem` wrapper or
flattens — is the implementer's call; the requirement is one ordered list dispatchable by shape, with
`FindStage` filtering stages.)

**Segments** are the items split at each `ReplySegment`: segment 0 rides Main; segment k rides the
continuation enqueued when exchange k concludes; the final segment ends with the `Conclusion`
(`EnqueueReceiveWorkflow` for a `ReplyExchange`, the concluding `ExecuteServiceTask` step for a
`FinalStep`). One **segment planner** produces a segment's step list from a resolved pipeline —
`[MintMailbox where a stage opens, stage steps …, then the segment's ending step]` — with exactly two
consumers: the factory/`WorkflowCommandSet` (segment 0) and the relay (segments 1..n). Two call sites
is what justifies the shared helper under phase 1's own "no new abstraction for one call site" rule.
For a single-exchange pipeline the planner must reproduce today's expansion byte-for-byte (pinned by
the existing factory snapshots staying green).

## Runtime changes

### 1. Receive-step identity: `ExecuteServiceTaskPayload` gains `RepliesTo`

`ExecuteServiceTaskPayload(ServiceTaskType, StageName?, RepliesTo?)` — at most one of the two names
set. Every receive step (terminal and non-terminal) carries `RepliesTo` = the opening stage name,
fixed at that receiver's enqueue. Dispatch in `ExecuteServiceTask.Execute` becomes:

- `StageName` set → `ExecuteStage` (unchanged, incl. its guards).
- `RepliesTo` set → `ExecuteReply` against the handler answering that stage — the terminal
  `ReplyExchange` or a `ReplySegment` item. No handler answering it is a new permanent drift guard
  (`MailboxHandlerNotFound`, wording modeled on `MailboxDeclarationNotFound`: a redeploy renamed or
  withdrew the handler while its exchange was in flight).
- Neither → `ExecuteConclusion` (`FinalStep` only; the existing rendezvous-shape guards keep their
  jobs).

**Compat**: phase-1 receive payloads carry neither field and rely on "null stage = the conclusion".
Land this phase before the next release train and the payload is born in its final shape with no
fallback arm. If a preview ships phase 1 first, keep one documented fallback: null `RepliesTo` + a
rendezvous + a `ReplyExchange` conclusion dispatches to that terminal (exactly phase-1 semantics).

### 2. The relay: `ConcludeAndContinue`

- `MailboxContinuation.ConcludeAndContinue(MailboxId, OpeningStageName)` — third closed-set member.
- A new `MailboxRelay.DecideSegment(ServiceTaskStageExchangeResult, …)` beside `Decide`, since the
  vocabularies are different types: `AwaitNextReply` → successor (as today, same key);
  `Completed` → `carry.RecordMailboxConcluded(stage)` + success outcome + `ConcludeAndContinue`;
  `FailedPermanent` → permanent failure carrying `Conclude` (close own mailbox, start nothing);
  `FailedRetryable`/`Defer` → as today, saga unstarted; unknown type → the phase-1
  `ServiceTaskResultUnknown` treatment, no continuation, mailbox left open, same reasoning. The
  `StepIdMissing` guard covers the two keyed verdicts (`AwaitNextReply`, `Completed`).
- `Continue`'s new case, in one method and in this order: close mailbox k; plan segment k from the
  re-resolved pipeline (the handler's position found by `OpeningStageName`); enqueue one workflow —
  steps from the planner with options resolved as the factory resolves them, key
  `{stepId}:mailbox-continue`, `IsHead = true`, `DependsOnHeads = false`, labels via the existing
  `CreateSuccessorLabels`, a token minted at this hop, `State` = the handler-published blob,
  OperationId e.g. `"Mailbox continue: {taskId} · after {openingStageName}"`. The relay gains an
  `AppImplementationFactory` dependency to resolve the pipeline; that is the identity-carried /
  shape-re-derived rule, not a violation of it — `ExecuteReply` already found the handler in this same
  request, and a crashed-attempt replay after a redeploy hits `MailboxHandlerNotFound` in dispatch
  before the relay runs.
- The terminal path (`Decide`, `Conclude`, after-workflow) is untouched. A continuation ending in a
  `FinalStep` conclusion auto-advances through the ordinary controller path, which is command-generic
  (verified: the controller reads `AutoAdvanceProcess` off any successful result) — the plan expects
  no controller change; the integration test proves it.

### 3. What already works, verified against the phase-1 code

No changes expected in: `MintMailbox` (fresh step ids in continuations; carry records per stage),
`EnqueueReceiveWorkflow` (already name-keyed; already tolerant of two carried mailboxes — pinned by
`Execute_WithMailboxesFromTwoStages_EnqueuesAgainstTheNamedOne`), the carry and blob format (map from
day one), the envelope, and `WorkflowEngineService`'s wait/status logic (continuations are ordinary
active heads; `Held` handling is receiver-generic). `ProcessStepOptionsResolver` needs the reply-step
identity threaded through (a `repliesTo` parameter beside `serviceTaskStageName`) so a non-terminal
handler's options come from its own `Handle*` call, same field-wise precedence.

## Guard ledger delta

| Phase 1                                                    | Phase 2                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| second mailbox-opening stage → eager throw                 | deleted — multiple exchanges compose                                |
| `Success(action)`/auto-advance from a non-terminal handler | does not compile (stage vocabulary)                                 |
| `AwaitNextReply` from any `onClosed`                       | still does not compile (both roots exclude it)                      |
| handle answered twice                                      | upgraded: analyzer error at the call site (`ALTINNAPP0702`, provable cases) + the per-handle eager throw as backstop |
| foreign handle                                             | stays, generalized per handle (eager throw)                         |
| `Finally` with an unanswered handle → eager throw          | generalized: every terminal checks every other handle               |
| —                                                          | new runtime drift guard: `MailboxHandlerNotFound` (`RepliesTo` names no handler) |
| "null stage name = the conclusion" payload convention      | replaced by explicit `RepliesTo` (compat fallback only if phase 1 ships first)  |
| builder constructor public (recorded follow-up)            | closed (`internal`) in this phase                                   |
| `AwaitNextReply` uncompilable from `ConcludeOnReply`       | deleted with the method — a one-answer protocol's stray `AwaitNextReply` self-reports at the deadline via its own `onClosed` |

## Semantics to document (xmldoc + AGENTS.md + changelog)

- Handler order is exchange order; a later exchange's messages wait in its log until the chain reaches
  it (head-of-line by design — the price of the linear chain every invariant rides on).
- Each deadline runs from its own send: up-front sends mean later budgets erode during earlier
  exchanges; sends in later segments start their clocks after the preceding exchange concludes. The
  author chooses by stage placement.
- A permanent failure mid-chain closes only its own mailbox; already-open later mailboxes wait out
  their deadlines so a resume can still continue the chain.
- `Completed()` from a reply handler = "exchange concluded, pipeline continues" — the stage vocabulary
  read in its plain sense.

## Suggested PR slicing

1. **PR 1 — mechanical prep, no behavior change to the surviving surface.** Items list in the pipeline
   model, the `ServiceTaskStageExchangeResult` re-root (+ closure pattern, approval-file delta,
   copy-ctor probe), `RepliesTo` on the payload with phase-1 semantics preserved, the segment planner
   extracted with the factory as its only consumer, builder constructor made `internal`, and the
   `ConcludeOnReply` deletion (decision 6) with its tests and doc mentions. Every remaining test green,
   factory snapshots unchanged.
2. **PR 2 — the feature.** `HandleReplies` + builder registry and terminal checks,
   `DecideSegment` + `ConcludeAndContinue` + the continuation enqueue, dispatch by `RepliesTo`,
   `MailboxHandlerNotFound`, resolver threading, the `ALTINNAPP0702` analyzer with its tests and
   release-notes entry, unit tests throughout.
3. **PR 3 — end-to-end coverage + docs.** Integration scenario:
   `Stage(sendA, opens A) → HandleReplies(A: ack → AwaitNextReply, receipt → Completed) →
   Stage(sendB, opens B) → ConcludeOnReplies(B)` — one scenario exercising the non-terminal
   handler, the continuation carrying `[MintMailbox: sendB, sendB, EnqueueReceiveWorkflow]`, and the
   terminal handler concluding on its one expected message. Assert: the continuation workflow's operation ids and key; mailbox A
   `Disposed(Request)` before B's first receiver exists; B's `idempotencyKey` equals the continuation's
   mint-step `databaseId` (the phase-1 bridging trick); B's deadline ≈ continuation time, not Main
   time (pinning decision 3); the final conclusion advances the process; `onClosed` tripwires on both
   exchanges stay silent. Keep the phase-1 single-exchange scenario untouched as the regression floor.
   Then the AGENTS.md rewrite of the one-exchange prose, the changelog, and the xmldoc pass.

## Test plan (beyond the integration scenario)

- **Builder**: two handles compose; terminal with a foreign/unanswered/second-answered handle throws
  naming the stage; `Handle(B)` before `Handle(A)` composes; interleaving (same handle to `Handle*`
  then `Conclude*`) still throws.
- **Vocabulary**: `Completed` from `HandleReplies` maps to success + `ConcludeAndContinue`;
  `AwaitNextReply` to a successor; permanent failure closes own mailbox and starts nothing; the rogue
  copy-ctor subtype of the new root converges permanently with the mailbox left open (mirroring
  `UnrecognisedVerdict_FailsPermanentlyNamesTheTypeAndLeavesTheExchangeOpen`).
- **Planner**: segment 0 of a single-exchange pipeline equals today's expansion (snapshot); mid
  segments with and without stages; final segment for both conclusion shapes; the up-front-sends shape
  (both mints in segment 0, empty segment 1 = bare `EnqueueReceiveWorkflow(B)`).
- **Relay**: close-before-enqueue order for `ConcludeAndContinue` (mirroring the existing `Conclude`
  ordering test); continuation request shape (key, head flags, labels, state, token).
- **Dispatch**: `RepliesTo` routes to terminal and non-terminal handlers; `MailboxHandlerNotFound`
  wording; the compat fallback (only if shipped).
- **Analyzer**: `ALTINNAPP0702` reports the straight-line double consumption (the motivating example:
  two `HandleReplies(archive, …)` calls in one chain) and the mixed case (`HandleReplies` then
  `ConcludeOnReplies` on the same handle); does **not** report a handle passed to a helper method,
  stored in a field, or consumed once per `if`/`else` branch; two different handles each consumed
  once is clean.
- Full gate as phase 1: `-t:Rebuild`, full suite, approval-file diff read by hand, and `rg` proving
  the "one exchange in this version" wording is gone everywhere.
