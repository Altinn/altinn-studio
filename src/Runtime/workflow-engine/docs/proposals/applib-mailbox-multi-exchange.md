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

### Considered and deferred: a spent-builder guard

Reviewing step 5 surfaced a substantially simpler end state for "each mailbox answered exactly once".
The two-valued answer mark (`None | Segment | Terminal`) exists **only** to cope with a builder that can
hand back more than one pipeline: a `HandleReplies` answer is an item and travels with every pipeline the
builder can still return, while a terminal's answer is the conclusion of the one pipeline that terminal
returned. A `private bool _composed` guard on both terminals would close that door instead — collapsing
the mark to a bool, removing `answeredHere` from the completeness check, and **making this plan's literal
wording correct as written**. It also reports the real mistake (composing two pipelines from one builder)
rather than misdiagnosing it as an unanswered mailbox. Verified at review time: no `src` or `test` site
composes two terminals on one builder except the three that already expect a throw, and a conditional
`Define` only ever executes one terminal, so there are no false positives. Deferred deliberately — it
adds a new stateful rule to a public type and changes behaviour for mailbox-free pipelines, both outside
step 5's scope — but it should be a conscious future decision, not an omission.

### Considered and deferred: hand the segment position down instead of re-resolving

The relay's continuation hop re-resolves the pipeline (`AppImplementationFactory` → `Define` →
`FindSegmentStart`), as this plan prescribes. Reviewing step 7 noted the cost: `FindServiceTask`'s null
throw, `ResolvePipeline`'s own throws and `FindSegmentStart`'s throw all run **after** `CloseMailbox` and
outside `ExecuteServiceTask.Execute`'s catch, so if any were ever reached the shape is a non-converging
500 retry ladder with the mailbox already closed — the shape this area's doctrine dislikes. All three are
unreachable today (dispatch found the handler in the same request; a replay re-runs dispatch first and
hits `MailboxHandlerNotFound`), and the only writable route is a non-deterministic `Define`, which nothing
validates. The structurally airtight alternative is to hand the segment position down from
`ExecuteSegmentReply`, which already holds the resolved pipeline and the matched `ReplySegment`: that
removes `FindSegmentStart`, the relay's new `AppImplementationFactory` dependency, and the second `Define`
call per hop. Deferred as a conscious decision, not an omission.

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

## Residual follow-ups (out of scope for this plan, recorded at step 9's review)

None of these blocks the feature; all are coverage gaps a later change should close.

1. **Invariant 6 (linear state lineage) is pinned only by "the chain worked".** No handler in the
   integration scenario makes a *data* change, so nothing shows a handler's form-data edit surviving into
   the next segment's stages and the next handler. `EnqueueContinuation`'s `request.State ?? throw` pins
   the blob's *presence*; its *contents* are unpinned.
2. **Head-of-line blocking (decision 1) has no end-to-end coverage** and is one line away in the existing
   scenario: `Task_Upfront` already leaves Beta's mailbox open through Alpha's whole exchange, so
   forwarding a Beta message *before* Alpha concludes would exercise "a message waits in its log until its
   receiver is born" — a documented decision currently proved nowhere.
3. **The sampler's per-iteration mailbox read now serves one assertion plus the trace**, so hoisting it
   out of the loop would cut the sampler's request count by a third and shrink its transient-error
   exposure. **The frontier sampler also covers one of three hand-overs.** Neither up-front hop is sampled, including the
   one whose continuation *concludes the task* — arguably where frontier-never-empty is least obvious.
4. **Decision 5 (a mid-chain permanent failure closes only its own mailbox) has no end-to-end coverage.**
   The plan assigns it to unit level and it is pinned there; `Task_Upfront` is the shape that could show it
   end to end.
5. **The new multi-exchange integration test flaked at fixture level during step 10's review** — twice
   consecutively, `Assert.Equal() Failure: Expected: Created, Actual: Unauthorized` on
   `Instances.PostSimplified`, i.e. a **401 before any mailbox behaviour runs** — then passed twice
   consecutively with no tree change. Not a product signal: 401 comes from the ASP.NET auth pipeline and no
   app-lib path returns it (`InstancesController` maps a party-lookup 401 to **403**), and the phase-1 test
   in the same collection passed throughout. Both classes are correctly in `WorkflowEngineTestCollection`,
   so parallelism is not the cause, and it was not pinned further. **A brand-new integration test that fails
   at fixture level roughly half the time will bite CI — investigate before CI adoption.**
6. **The consolidation principle now applies to one of three duplicated reason codes.**
   `"ServiceTaskResultUnknown"` still has three independent literals (`ExecuteServiceTask.cs`,
   `MailboxRelay.cs` ×2) and `"MailboxStepIdMissing"` three (`MailboxRelay.cs`, `MintMailbox.cs`,
   `EnqueueReceiveWorkflow.cs`). Step 10's narrow target was defensible — `ServiceTaskFailedException` was
   the only case where the same *sentence* was duplicated — but the stated reason ("two independent literals
   would let a reword show apps two different codes") applies to the code strings verbatim. A
   `WorkflowEngineReasonCodes` holder is the coherent end state.

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

## Execution protocol (orchestrated implementation)

### Version control

- **Use `jj`, not `git`.** Never run `git` mutating commands.
- Top-level folders may be separate jj repositories: run `jj root` from a path you are about to touch
  before assuming which repo you are in.
- Before coding: if the current jj revision (`@`) is non-empty, create a new child revision
  (`jj new`) and work there. If `@` is empty, work in it directly. Describe the revision
  (`jj describe -m "..."`) with a message in the repo's existing style.
- **Do not push. Do not move bookmarks. Do not revert or discard unrelated user changes.**

### Worker / reviewer reporting

Subagents cannot message the orchestrator mid-run. They report **only** by ending their run with a
structured final report. A blocked worker ends the run with a `BLOCKED` report rather than waiting for
an answer.

**Worker final report** must contain:

- step name (from the ledger below)
- `READY_FOR_REVIEW` or `BLOCKED` marker (BLOCKED includes the reason and what it needs)
- jj change id / revision id(s) touched
- changed files
- tests and builds run, with results
- notes for later steps (surprises, deferred bits, anything the next step must know)

**Reviewer final report** must contain:

- `APPROVED` or `CHANGES_REQUESTED` as the verdict, with findings **first**, most important first
- residual non-blocking gaps listed separately at the end

Reviewers review only: they do not modify files. Running builds and tests is expected.

If a step turns out to be too broad to land coherently, the worker updates this plan with the smallest
coherent split and ends the run with `BLOCKED_FOR_SCOPE_SPLIT`.

Scope discipline: implement **only** the current step. Do not implement later-step behavior early, even
when it looks trivially adjacent — later steps are separately reviewed.

### Step ledger

Steps are derived from the PR slicing above, split small enough to review in one pass. All paths are
relative to `src/App/backend/`.

**Shared working copy (learned twice in steps 8-9): when another agent is active in the same workspace,
never `jj edit`/`jj new` to reach your own revision — make the edits and move them with a path-scoped
`jj squash --from @ --into <your change> <paths>`. And then verify the content landed in the target
revision, not the squash's exit message: if the other agent snapshotted and ran `jj new` between your edit
and your squash, `@` is a fresh empty revision, your edit is already inside *their* commit, and the squash
silently no-ops while still printing a reassuring "Rebased 1 descendant commits". Recover with
`jj squash --from <their change> --into <yours> <paths>`.**

**Gate serialization (found reviewing step 8): never run the `src/test/apps/` rebuild sweep concurrently
with `dotnet test`.** The overlap produces `MSB3030` (`Altinn.App.Api.dll` not found), `CS0006` on
`Altinn.App.Internal.Analyzers.dll`, reference-less fixture compilations, and spurious app-sweep failures —
`Altinn.App.Analyzers.Tests.csproj` carries a comment warning about exactly this. Reassuringly the race can
only ever produce a **false red**, never a false green (missing files and empty reference sets), so no
earlier passing numbers in this stack are in doubt. Run the sweep and the test suites strictly serially.

**Build gotcha: building anything under `src/test/apps/` dirties three unrelated files** —
`src/App/fileanalyzers/src/Altinn.FileAnalyzers/MimeType/{MimeTypeAnalyser,MimeTypeValidator,ServiceCollectionExtensions}.cs`.
Restore with `jj restore src/App/fileanalyzers` and do not read the dirt as your own step's. **Correction
(step 10's review): this is a line-ending rewrite, not a BOM strip** — the UTF-8 BOM survives untouched
(`efbbbf` before and after); what changes is ~145 lines per file. An earlier version of this note said
CSharpier "strips their UTF-8 BOM", which would send a reader looking for the wrong thing.

**The `end_of_line = lf` setting is a deliberate local-only workaround — do not "fix" it, and do not
inherit it.** The branch commit `trtzopwnwmkl` "set end_of_line to lf" flips `src/App/backend/.editorconfig`
because **jj does not apply `.gitattributes eol=crlf`**, so without it a build rewrites the whole tree to
CRLF. The repo owner keeps it locally and **excludes it when pushing**, so:

- `src/App/backend/AGENTS.md`'s statement that `.editorconfig` sets `crlf` is **correct for what ships**.
  An earlier version of this note called that doc wrong; it is not — it is only inconsistent with the local
  working tree, by design.
- The two `Altinn.App.SourceGenerator.Tests` failures (`FullTests.Empty`, `FullTests.Run`) and the
  `src/App/fileanalyzers` line-ending churn on every `src/test/apps/` build are **expected local artifacts
  of that workaround, not defects and not something to carry into a PR**. They were correctly excluded from
  every gate baseline in this stack.
- The committed `SourceGenerator.Integration.Tests/gen/**/*FormDataWrapper.g.cs` artifacts are **untouched by
  this stack** — verified byte-identical between the phase-1 commit `xvyooszrquty` and the working copy
  (35 CR / 253 lines and 336 CR / 2150 lines), and no revision in this stack lists them.

**Doc policy (established reviewing step 6): a step fixes the `AGENTS.md` statements it makes false.**
The plan puts the `AGENTS.md` rewrite in PR 3 while steps 5-8 are PR 2, so deferring every doc
correction to step 10 means PR 2 ships internal doctrine that misnames a guard and miscounts the
dispatch. Correctness-critical statements — which guard fires where, how many dispatch branches exist,
what a reason code means — are fixed by the step that invalidates them. Step 10 keeps the *narrative*
rewrite (the one-exchange prose, the changelog, the xmldoc pass).

**Shipping constraint (raised reviewing step 5, discharged in step 7).** Between step 5 and step 7 a
composed `ReplySegment` made `PlanSegment`'s `default:` arm app-reachable while that arm throws
`UnreachableException`, against this area's doctrine that an app-reachable unmappable arm is a permanent
failure naming the type. Step 7 closed the window, and the claim was verified at review — but **not for the reason first
given**. `private protected` does *not* by itself prevent derivation: Roslyn honours `InternalsVisibleTo`
for the internal half of `ProtectedAndInternal`, so any of Core's friend assemblies could declare a third
item shape (confirmed by compiling a probe). What actually closes the tripwire is that Core declares
exactly two direct subclasses of `PipelineItem` — `ServiceTaskStage` (abstract, `private` ctor) and
`ReplySegment` — both of which now have planning arms, and that **app assemblies are not friends**. The
`default:` arm is therefore unreachable from app code, which is what the doctrine asks. `PipelineItem`
being a class rather than a record also means the step-2 copy-constructor route is absent here. The doctrinal reason
for shipping steps 5-8 together is therefore discharged; keeping the analyzer and the integration
coverage in the same PR remains desirable on its own merits, not as a correctness requirement.

- [x] **Step 1 — Delete `ConcludeOnReply`; builder constructor `internal`.** *(approved; jj `znxkulwxxssm`)* Decision 6 plus the
      folded-in phase-1 follow-up. Public-API approval file delta, changelog line, doc mentions, the
      two dedicated tests and the `ConcludeOnReply` arms in other tests. No behavior change to the
      surviving surface.
- [x] **Step 2 — Re-root the stage result hierarchy.** *(approved; jj `pyysllytnmrt`)* New abstract `ServiceTaskStageExchangeResult`
      root + `ServiceTaskStageAwaitNextReplyResult`, `ServiceTaskStageResult` re-parented, phase-1
      closure pattern (`private protected` ctor, copy-ctor hole **documented** in xmldoc),
      approval-file delta. No consumer yet — and therefore **no test in this step**: phase 1's three
      copy-ctor probes each live in their consumer's test class and pin a mapper arm's *convergence*,
      which does not exist until something maps the new root. The pin moves to step 7 with its
      consumer (resolves a contradiction between the closure-pattern prose above and this phase's own
      test plan, which assigns the rogue-subtype test to the relay).
- [x] **Step 3 — Ordered `Items` list + segment planner (segment 0 only).** *(approved; jj `ymuozwsuwryw`)* `ServiceTaskPipeline.Stages`
      becomes an ordered items list dispatchable by shape, `FindStage` filters stages; extract the
      segment planner with the factory / `WorkflowCommandSet` as its only consumer. Factory snapshots
      must stay byte-for-byte unchanged.
- [x] **Step 4 — `RepliesTo` on `ExecuteServiceTaskPayload`.** *(approved; jj `vlrooqqsokyz`)* Payload gains the field (at most one of
      `StageName`/`RepliesTo` set); every receive step carries it at enqueue; dispatch in
      `ExecuteServiceTask.Execute` keys off it while preserving exact phase-1 semantics for the
      terminal. No non-terminal handler exists yet.
- [x] **Step 5 — `HandleReplies` builder surface.** *(approved; jj `kwkwqwoxmvpz`)* The `ReplySegment` pipeline item, the
      `HandleReplies(handle, onMessage, onClosed, options?)` method, handle registry with per-handle
      "answered exactly once", terminal completeness check on every terminal (`Finally` and
      `ConcludeOnReplies`), the one-mailbox eager throw deleted. Builder tests per the test plan.
      Carried from step 1: share the handle claim (owner check + per-handle answered check + mark) as a
      new private helper with its two real call sites — do **not** resurrect the deleted `Conclude`
      helper, which returned a finished pipeline and is the wrong shape for a builder-returning
      `HandleReplies`. Normalize `ConcludeOnReplies`' argument-null order (it checks `onMessage` before
      `handle`, a leftover of the deleted wrapper) while extracting that helper. Revisit
      `AwaitNextReply`'s xmldoc summary ("Returnable only from a reply terminal's `onMessage`") once a
      non-terminal handler joins the audience — it is true for this root but frames the rule narrowly.
      Carried from step 2: this step owns the changelog entry for the whole re-rooted vocabulary (step 2
      is unreachable from app code, so it deliberately shipped none); add the `HandleReplies` `<see cref>`
      to `ServiceTaskStageExchangeResult`'s docs, for symmetry with `ServiceTaskExchangeResult`'s cref to
      `ConcludeOnReplies`; and note the inherited-static wart in a sentence — `ServiceTaskStageResult.AwaitNextReply()`
      resolves from app code (statics are inherited), so the author's error lands on the return with
      `CS1503` rather than at the call. Phase 1 has the identical wart on `ServiceTaskResult`, so it is
      precedented and not worth an API change.
      Carried from step 3: `ReplySegment` slots in as `internal sealed class ReplySegment : PipelineItem`
      beside `ServiceTaskStage` (the `private protected` base ctor admits it, `base(stepOptions)` covers
      its options) — `FindStage` already filters it out and `PlanSegment`'s `default:` arm throws
      `UnreachableException`, so a shape added without a planning arm fails loudly. The builder's
      `_stages` field becomes `List<PipelineItem>` and `ValidateStage`'s duplicate-name check becomes
      `_items.OfType<ServiceTaskStage>().Any(...)`. Also confirm `WorkflowEngineCommandValidator`'s
      `CreateDummyMailboxPipeline` still composes once the terminal completeness check lands — it now
      composes a **real** pipeline on the app startup path, so a composition the new check rejects would
      fail every app's boot, not just a test.
- [x] **Step 6 — Dispatch to non-terminal handlers.** *(approved; jj `zkqtxzqvqqop`)* `RepliesTo` routes to a `ReplySegment` item,
      new `MailboxHandlerNotFound` permanent drift guard, `ProcessStepOptionsResolver` threading
      (`repliesTo` beside `serviceTaskStageName`). Unit tests. Carried from step 3: the resolver reads
      `StepOptions` off `PipelineItem` now, so a `ReplySegment`'s options are reachable through the same
      property once the `repliesTo` lookup exists. Also fix `MintMailbox`'s drift-guard wording, which
      reports only the first relocated mailbox (`Items.OfType<MailboxOpening>().FirstOrDefault()`) —
      correct while at most one existed, misleading with several.
      Carried from steps 4-5, in priority order: **the segment lookup must run before dispatch's
      `(not null, FinalStep)` arm**, which becomes wrong the moment a `FinalStep` pipeline can answer
      exchanges through segments — `HandleReplies → … → Finally` is legal after step 5 — and
      `MailboxHandlerNotFound` is what fires when neither a segment nor the terminal answers the named
      exchange. The `(null, ReplyExchange)` **compatibility arm** and `ExecuteReply`'s
      `repliesTo ?? exchange.OpeningStageName` fallback must both survive: narrowing either strands
      in-flight name-less receivers, and both are pinned by tests. The lookup itself is
      `pipeline.Items.OfType<ReplySegment>().FirstOrDefault(r => string.Equals(r.OpeningStageName, repliesTo, StringComparison.Ordinal))`.
      `ExecuteConclusion`'s first documented cause is stale (every receiver this expansion builds now
      carries `RepliesTo`, so that cause routes elsewhere) — this step rewrites that arm anyway.
      Optional, judged worthwhile but declined in step 4 to keep it behaviour-clean: hoisting the
      both-names refusal above `FindServiceTask` so a doubly-broken payload converges on the legible 422
      instead of the non-converging `ProcessException` retry. Carried from step 5: `HandleReplies`'
      `options` xmldoc promises they mean "exactly what they mean on `ConcludeOnReplies`", but
      `ProcessStepOptionsResolver` reaches item options only through `FindStage`, which filters
      `ReplySegment` out — so that sentence is **false about a public parameter** until this step's
      `repliesTo` lookup lands. Make it true.
- [x] **Step 7 — Relay: `ConcludeAndContinue`.** *(approved; jj `motstyplpknr`)* `MailboxContinuation`'s third member,
      `DecideSegment`, `Continue`'s new case (close mailbox k, plan segment k, enqueue one workflow
      keyed `{stepId}:mailbox-continue`), planner extended to segments 1..n. Relay + planner tests.
      Owns the copy-ctor pin deferred from step 2: declare `RogueStageVerdict` in `MailboxRelayTests`
      beside its three siblings and assert `DecideSegment` converges permanently, names the type, and
      leaves the mailbox open — mirroring `UnrecognisedVerdict_FailsPermanentlyNamesTheTypeAndLeavesTheExchangeOpen`.
      While there, bump `ServiceTaskExchangeResult`'s "Three tests derive that way — one per root the
      runtime maps" count to four.
      Carried from step 3: call `WorkflowCommandSet.PlanSegment(serviceTaskType, pipeline)` and add the
      segment selector (index, or the `OpeningStageName` the handler answers) as a parameter; append the
      `EnqueueReceiveWorkflow` step yourself when `Receive` is non-null, and map `Steps` through
      `ApplyStepOptions(_stepOptionsResolver, taskId, serviceTaskType)` as `EnqueueSuccessorReceiver`
      already does. Mint steps carry `ServiceTaskStageName = null` deliberately (engine defaults for one
      HTTP call) — preserve that. **Invariant 1 is the caller's to hold, not the planner's**: because the
      enqueue step is appended by the hop, "the segment's last step enqueues the next receiver before the
      segment settles" is enforced outside `PlanSegment`, so the relay must reproduce the factory's
      ordering (pinned there by `Create_MailboxPipeline_EndsMainWithTheReceiveEnqueueAndEmitsNoConclusion`)
      and this step's reviewer cannot lean on the planner for it. `MailboxReceivePlan` now carries
      `OpeningStageName` twice (once as the field the enqueue step reads, once inside the receive step's
      payload) — justified, since deriving one from the other would mean re-deserializing a payload, but
      it needs a sentence so a later reader does not "deduplicate" it. Carried from step 5: three
      `HandleReplies` xmldoc claims are contracts this step must honour, not descriptions of today —
      "the pipeline carries on with whatever is composed after this call"; "Exchanges run one at a time,
      in the order their *handlers* are composed"; and "closes only this exchange's mailbox: any later
      mailbox already open waits out its own deadline". Also confirm `PlanSegment`'s `default:` arm is
      unreachable again once the `ReplySegment` arm exists (see the shipping constraint above).
      **Decision this step owes (hazard found reviewing step 6, recorded nowhere else):** the
      `({ } repliesTo, ReplyExchange)` arm lets the terminal stand in for *any* carried name, which is
      harmless while a task has one exchange but becomes **mis-dispatch** once it has several. On
      `Stage(A) → HandleReplies(A) → Stage(B) → ConcludeOnReplies(B)`, a receiver carrying
      `RepliesTo = "A_v1"` (the segment's opening stage renamed mid-flight) misses the segment lookup and
      falls into that arm — so the *journal's* handler reads the *archive's* message and may conclude the
      task on it. Weigh refusing a non-null `repliesTo` that matches neither a segment nor
      `exchange.OpeningStageName` against losing the terminal's own mid-flight rename tolerance. The
      `(null, ReplyExchange)` compat arm must survive either way. Also: `ProcessNextRequestFactory.cs:366-368`
      ("the receive step is the pipeline's conclusion and resolves its options as a concluding Main step
      would") is true today only because the factory reaches it solely for a `ReplyExchange`; it goes
      false when the planner starts ending segment 0 at a `ReplySegment`.
- [x] **Step 8 — `ALTINNAPP0702` analyzer.** *(approved after four review rounds; jj `szzvkrsoqqkz`; shipped as `ALTINNAPP0702` + `ALTINNAPP0703`)* Provable straight-line double consumption of a handle,
      plus the optional never-answered companion if it stays provable; tests in
      `Altinn.App.Analyzers.Tests`, `AnalyzerReleases.Unshipped.md`, rules doc page.
      **Correction found while implementing: the "rules doc page" deliverable has no in-tree location.**
      No page exists for `ALTINNAPP0700` or `0701` anywhere in this repo — `helpLinkUri` points at
      `docs.altinn.studio`, a separate docs repository — so the in-tree precedent is the
      convention-shaped help link plus a changelog entry, and that is what this step shipped. The
      docs-site pages for the new rules remain to be written **outside this repo**: a residual for the
      final status, not something a worker here can land. Two facts established at review: the analyzer
      reaches **more** in-tree projects than first reported — `Altinn.App.SourceGenerator.Integration.Tests`
      (explicit `OutputItemType="Analyzer"`) and `test/Altinn.App.Integration.Tests/_testapps/basic/App`
      (a `PackageReference` on the locally-packed nupkg, i.e. the real customer delivery path in tree) —
      while the "app test project needs a `#pragma`" hazard is **smaller** than reported, because every
      double-answer test in-tree puts the second consumption inside `Assert.Throws(() => …)`, and lambda
      bodies live in their own flow graph and are unmapped, so the rule is silent on the natural idiom.
      Non-blocking nit left undone: the analyzer uses `RegisterOperationBlockAction` plus a manual
      `DescendantsAndSelf()` walk where `RegisterOperationBlockStartAction` + kind-filtered
      `RegisterOperationAction` is idiomatic and avoids duplicating a traversal every method body pays for.
      Guard-ledger note for the docs pass — the accurate silence set for `ALTINNAPP0702`, which is much
      narrower than an early draft of this line claimed: it reports two answers in any stretch of the
      method **every returning execution passes through**, so a branch merely *preceding* the chain (an
      `if`/`else` merge, `?:`, `??`, `?.`, a `switch` merge, a loop, a `using`, a `lock`, a `try`/`finally`)
      no longer silences it. It stays silent for: one answer per `if`/`else` branch; both answers inside a
      body that may not run (conditional, loop, `switch` arm); both inside a `finally`; both inside a `try`
      whose handler **swallows** (a *rethrowing* handler opens no route out, so those report); a candidate
      anywhere **downstream** of a `try` whose handler reaches the exit; a `while(true)` body; answers split by a `throw`/`return` guard; lambda and
      local-function bodies; and any handle the rule cannot follow (field, helper parameter, `ref` alias,
      deconstruction, local reused by a second opening `Stage`, or any mention that is not a by-value
      argument). Those stay the runtime backstop's alone, by the calibration this rule is held to. Anyone re-running the out-of-tree probe harness used to validate
      this analyzer must keep its MVID guard: an app-local stale copy of `Altinn.App.Analyzers.dll` will
      silently bind ahead of the path passed to `Assembly.LoadFrom`, and the harness then reports
      round-N-1 results as though nothing changed.
- [x] **Step 9 — Integration scenario.** *(approved; jj `zqmmttqwptnk`; invariant 4 mutation-proven end to end)* The end-to-end multi-exchange scenario with the assertions
      listed under "Suggested PR slicing" item 3; phase-1 single-exchange scenario untouched.
      Carried from step 7: assert the continuation's `Idempotency-Key` is `{concludingStepId}:mailbox-continue`
      and its OperationId `Mailbox continue: {taskId} · after SendToArchive`; its steps are exactly
      `[MintMailbox: SendToJournal, ExecuteServiceTask: SendToJournal, EnqueueReceiveWorkflow]`; it carries
      **no** `mailbox` declaration (a continuation is not a receiver) while `IsHead = true` and
      `DependsOnHeads = false`; and the collection never reads all-settled across the A-conclusion
      hand-over — the one invariant only an end-to-end test can observe rather than model. Also worth
      covering here: a `Continue` with two carried mailboxes closing exactly one (structurally guaranteed,
      unpinned at unit level), and the auto-advance-through-a-continuation path the plan says needs no
      controller change.
- [x] **Step 10 — Docs pass + full gate.** *(approved; jj `qvlrtypwvpzy`)* AGENTS.md rewrite of the one-exchange prose, changelog,
      xmldoc pass, `-t:Rebuild` build, full suite, approval-file diff read by hand, `rg` proving the
      "one exchange in this version" wording is gone. Carried from step 1: run that `rg` sweep over
      `test/` as well as `src/` — `test/Altinn.App.Integration.Tests/WorkflowEngine/WorkflowEngineMailboxTests.cs`
      is the case a `src/`-only sweep misses. The three surviving "multi-message" mentions (that file
      plus `src/Altinn.App.Clients.Fiks/FiksArkiv/FiksArkivServiceTask.cs:22` and `:66`) are truthful
      protocol description of an archive that really answers twice — they stay. Optional: the decision-6
      rationale bullet in `Internal/WorkflowEngine/AGENTS.md` could gain "and the mailbox is not
      capacity-1 engine-side" so the permanent record is complete once these proposals are deleted.
      Carried from step 2: the changelog's "the answers a service task can give are a closed set" bullet
      names only two roots — make it list all four (`ServiceTaskStageResult`'s omission is a pre-existing
      phase-1 gap, not new); add a reverse `<remarks>` on `ServiceTaskAwaitNextReplyResult` pointing at
      its deliberate twin, as cheap insurance against someone "deduplicating" from that side; and turn
      the plain-text `Internal.WorkflowEngine.Models.Engine.MailboxDisposedReason` reference into a
      `<see cref>` so it cannot rot silently on a rename. Carried from steps 4-5: two clauses in the
      "Declaring one — the composition surface" bullet of `Internal/WorkflowEngine/AGENTS.md` are false
      after step 5 — "`Finally` refuses outright once a stage has opened a mailbox" and "**A task gets one
      exchange in this version:** a second mailbox-opening stage is an eager throw". The "one exchange"
      mentions in `src/` are down to that bullet plus `WorkflowCallbackState.cs:32`, which is still
      truthful (it says the blob format needs no change for several exchanges). Also stale: the
      "Command Conventions" bullet's "a stage name dispatches to that stage, a null one to the pipeline's
      conclusion", an approximation that survives step 4 and goes false once a `ReplySegment` is not the
      conclusion. **Also stale and NOT in the enumeration above** (found reviewing step 5): line ~299's
      builder-rejections list still says "a second mailbox", and its "`Finally(work, options?)`, or
      `ConcludeOnReplies` when a stage opened a mailbox" is now incomplete, since a `HandleReplies`
      mailbox pipeline may end with `Finally`. Changelog: add decision 5's semantic (a mid-chain
      permanent failure closes only its own mailbox; later open mailboxes wait out their deadlines),
      which the "Semantics to document" section assigns to the changelog and which currently lives only
      in xmldoc — and reconcile the two `[Unreleased]` bullets that now read as a rule stated and then
      reversed ("the pipeline then ends with the terminal that answers that mailbox instead of with
      `Finally`" versus "may **now** end with `Finally`"). **Also stale, found reviewing step 6**: the
      "Reading it in the declaring stage" bullet (~line 310) says a receive step naming an exchange a
      `FinalStep`-concluded pipeline cannot answer is `MailboxReceiptWithoutDeclaration` "reported as what
      it saw … unlike the conclusion route that shares its reason code" — flatly false after step 6 (it is
      `MailboxHandlerNotFound`, and the reason code is no longer shared by two routes), and the same
      bullet's "three-way dispatch" needs a fourth branch. Step 6 is also what finally breaks the
      "Command Conventions" approximation already recorded above. `MailboxHandlerNotFound` wants a line in
      the guard prose. Non-blocking option surfaced there: `MailboxReceiptWithoutDeclaration` now has
      exactly one route and one caller, so if this pass prefers a distinct reason code for "a bare
      concluding step handed a rendezvous", this is when it is cheap — weighed against changing an
      in-flight-visible reason code for no behavioural gain. Carried from step 9's review: note in
      `src/WorkflowEngine.Core/wwwroot/DASHBOARD_SPEC.md` that an app-lib integration test now depends on
      the dashboard projection's `mailboxId`, so it is no longer "just the dashboard's" field; and record in
      `Internal/WorkflowEngine/AGENTS.md` that **three** receiver operation-id formats now coexist —
      `Mailbox receive: {from} -> {to}` (factory), `… · after message {n}` (successor), and `… · {stage}`
      (from a continuation) — since a reader would not guess there are three and a test now matches the
      third exactly. Carried from step 7: the reason-code
      inventory has one fewer entry (`MailboxSegmentNotContinued` was transitional and never shipped) and
      `MailboxHandlerNotFound` gained a second route (a multi-exchange `ReplyExchange` conclusion, per
      step 7's mis-dispatch ruling) — the guard prose should say so. Two wording fixes from step 7's
      review: "factory snapshots" is a misnomer in-tree (there are no Verify snapshots for the factory —
      the pin is assertion-based tests), and the relay test recorder's `"enqueue-workflow"` label no longer
      distinguishes a continuation from a successor receiver, which recording the key suffix
      (`"enqueue:mailbox-continue"`) would restore. Also from step 7: the `"ServiceTaskFailedException"`
      reason code and its sentence now live in **two** classes, each from its own literals
      (`MailboxRelay.HandlerFailedReasonCode`/`HandlerFailedMessage` and `ExecuteServiceTask.MapFailure`).
      Step 7 improved this (five copies → two) and was right not to reach across classes, but an
      operator-visible reason code with two independent definitions is a drift surface: reword one and
      apps see two different sentences for the same condition. This pass owns the reason-code inventory,
      so a single shared source belongs here.
