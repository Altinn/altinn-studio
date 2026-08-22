# Rework the app-lib mailbox pipeline API

## Context

The service-task mailbox API shipped on `main` but not in any release (`app/v9.0.0-preview.4` has
`Stage`/`Finally` only — no `WithReplyFrom`, `AwaitNextReply`, or `ServiceTaskContext.Reply`), so every
change below is breaking-change-free until v9 GA. The current shape has accumulated machinery that
exists only to guard against misuse the API itself invites: the `WithReplyFrom`-after-`Finally`
discarded-return guard (`_origin` back-reference, `NoteMailboxDeclaration`, the `ResolvePipeline`
check), the throwing getters on `ServiceTaskContext` (`Mailbox`, `Reply`, `ReplyClosedReason`) plus the
hand-written `PrintMembers` that keeps `ToString` from throwing, and runtime-permanent failures for
author mistakes types could catch (`AwaitNextReplyOutsideAnExchange`, `MailboxExchangeAlreadyClosed`).

The goal of this rework is a smaller, more honest API **and** a simpler implementation: everything the
type system can enforce moves to compile time, everything the builder can check moves to startup, and
what remains at runtime guards only genuine drift (redeploys mid-workflow, engine mismatches) — each
remaining runtime guard must be able to name the drift scenario it exists for.

All paths below are relative to `src/App/backend/` unless stated otherwise. No engine changes anywhere.

## Decisions already made with the user

1. **The mailbox declaration moves onto the stage, before `Finally`** — the stage that sends declares
   the mailbox in the same `Stage` call, receiving an opaque `MailboxHandle`. The declaring stage need
   not be last: `send → unrelated stage → reply terminal` is a supported shape.
2. **Single-reply and multi-reply exchanges are distinct terminals** with compile-time enforcement:
   `AwaitNextReply` is unrepresentable from a single-reply handler and from `onClosed`, via a re-rooted
   result hierarchy. Reply and closure reach the handler as **delegate parameters** (`onMessage` /
   `onClosed`), not context getters.
3. **The mint becomes its own engine step**, emitted immediately before the declaring stage — never at
   workflow start (pre-send stages must not erode the deadline budget) and never at enqueue time (a
   pre-send failure resumed days later must get a fresh clock, and `MailboxRejected` timing moves are
   not worth the trade). Mint stays keyed on the executing step's `StepId`.
4. **The carry stays** (mailbox id travels in the signed state blob); the derivable-key alternative was
   rejected because re-deriving a stage name at a later callback silently mints a fresh orphan mailbox
   after a mid-flight stage rename. The blob field becomes a **map keyed by opening stage name** from
   day one, so the later multi-exchange phase needs no blob-format migration against in-flight
   workflows.
5. **Sequential multi-exchange is the target model** (segments split at reply-handler positions;
   relay chains Main → receivers A → receivers B → continuation → process-next), but **phase 1 ships
   one exchange per pipeline with the reply handler as the terminal**. Internals are shaped so phase 2
   is additive. Sends stay stage-only (a handler cannot open a mailbox — a handler segment is many
   receive workflows, so mint-in-step has no sane keying there). Re-referencing a handle in a later
   segment (interleaving) stays out even in phase 2 until a consumer needs it. Concurrent exchanges
   with a join semantic are rejected outright.
6. **Rejected**: running the whole pipeline as one workflow (the engine's mailbox block is
   workflow-level and gates the workflow's start; receiver 1 needs post-stage state, so it cannot ride
   the initial enqueue batch).

## Invariants that must survive (from `Internal/WorkflowEngine/AGENTS.md`)

1. **Frontier-never-empty**: the receiver exists before Main settles (`EnqueueReceiveWorkflow` stays
   Main's last step), and every relay enqueue happens from inside a still-unsettled predecessor.
2. **At most one execution concludes**: `MailboxContinuation` stays a two-member closed set;
   `Conclude` closes the mailbox before enqueueing the after-workflow, in one method.
3. **Every keyed engine call keys off the executing `StepId`** (`{stepId}:mailbox-receive`,
   `{stepId}:mailbox-after`, and the mint itself), so crashed-attempt replays dedup.
4. **Stage names are a wire-compatibility surface** (they ride `Operation-Id` headers and callback
   payloads); the mint step's identity derives from the stage name and inherits the same constraint.
5. **The deadline clock starts at the send**: the mint step hugs its declaring stage; nothing mints
   earlier.
6. **Deferral is stateless**; the carry rides the blob and is forwarded unchanged by commands that
   don't touch it.
7. **The saga lives in `MailboxRelay` and nowhere else**; the successor carries the re-derived
   transition labels (`processNextTargetId`/`processNextTargetTask`).
8. The envelope seal/unwrap flow (`MailboxDeliveryEnvelope`, `IServiceTaskReplyForwarder`) is
   untouched by this rework.

**Which of these are observable end to end, as of Step 3b:** invariant 2 (the mailbox read reports
`status: Disposed`, `disposedReason: Request` — proving the close happened and came from the app's
conclusion rather than the sweep), invariant 3 (the mint step's `databaseId` equals the mailbox's
`idempotencyKey`), invariant 5 (the mint is sandwiched between two plain stages, so neither "not hoisted to
the front" nor "not deferred to the end" is vacuous), and invariant 8 (asserting the reply payload pins the
seal/unwrap round trip). The rest remain unit- and controller-level only.

## Target public API

The running example, `FiksArkivServiceTask` (multi-message: ack then receipt):

```csharp
public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
    pipeline
        .Stage(
            SendStageName,
            SendToArchive, // Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskStageResult>>
            new MailboxOptions { Timeout = ArchiveReplyTimeout },
            out MailboxHandle archive
        )
        .ConcludeOnReplies(
            archive,
            onMessage: HandleArchiveMessage, // Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>>
            onClosed: HandleArchiveClosed // Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>>
        );
```

A single-reply exchange uses `ConcludeOnReply`, whose `onMessage` returns `Task<ServiceTaskResult>` —
`AwaitNextReply` does not compile there. A pipeline with no mailbox is unchanged:
`Stage(...)* .Finally(...)`.

### Builder surface (`Features/Process/ServiceTaskPipelineBuilder.cs`)

- One builder type, no intermediate chain types. The mailbox-opening variant is a **`Stage` overload**,
  not a fluent modifier: the declaration and the mailbox-aware delegate must travel together (a
  modifier after the fact cannot retype an already-supplied delegate), and the overload structurally
  removes the "modifier with no stage to attach to" error path.
  - `Stage(string name, Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work, ProcessStepOptions? options = null)` — unchanged.
  - `Stage(string name, Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskStageResult>> work, MailboxOptions mailbox, out MailboxHandle handle, ProcessStepOptions? options = null)` — new.
- Terminals (each returns `ServiceTaskPipeline`, ending the chain):
  - `Finally(work, options?)` — unchanged; throws eagerly if a `MailboxHandle` was issued and never
    consumed ("a mailbox was opened but no reply terminal answers it").
  - `ConcludeOnReply(handle, onMessage, onClosed, options?)` — single reply.
  - `ConcludeOnReplies(handle, onMessage, onClosed, options?)` — multi reply.
- Eager (compose-time → startup-failure) validation, in the existing style of the duplicate-name
  throw: handle belongs to this builder; phase 1 allows one mailbox-opening stage per pipeline; a
  handle is consumed exactly once; `options` validated as today.
- Delete: `ServiceTaskPipeline.WithReplyFrom`, `MailboxDeclared`/`NoteMailboxDeclaration`, the
  `_origin` back-reference, and the discarded-return check in
  `ServiceTaskLookupExtensions.ResolvePipeline`. Nothing replaces them — the terminal seals the
  declaration; there is nothing left to discard.

### Considered and rejected: a second builder type

Step 3's review raised the one substantially different shape: a `MailboxPipelineBuilder` returned by the
mailbox `Stage` overload, with `Stage` returning itself, no `Finally`, and `ConcludeOnReply(y|ies)` taking
no handle. It would make three of the four eager checks compile-time and could drop `MailboxHandle` and the
`out` parameter entirely — strictly better on this document's own "compile-time > startup-eager" ordering.
Rejected anyway: the builder surface decision above explicitly chose one builder type with no intermediate
chain types, and phase 2's multi-exchange needs handles to say *which* exchange a terminal answers, so a
handle-free phase 1 would have to reintroduce them — churn against decision 5's "phase 2 lands additively".
Recorded here so it is not relitigated.

### `MailboxHandle` (new, `Features/Process/MailboxHandle.cs`)

Opaque sealed class: internally the owning builder and the opening stage name. Its only job is making
"a reply terminal must reference a really-declared mailbox" a compile-time fact (you cannot
manufacture one) plus two eager checks (right builder, consumed once).

### Result hierarchy (`Features/Process/ServiceTaskResult.cs` + new file)

Re-root so the multi-reply vocabulary is a supertype, not a runtime rule:

```text
ServiceTaskExchangeResult            (new, abstract; factory: AwaitNextReply())
├── ServiceTaskResult                (existing; loses the AwaitNextReply factory)
│   ├── Success / SuccessWithoutAutoAdvance / FailedRetryable / FailedPermanent / Defer
└── ServiceTaskAwaitNextReplyResult  (re-parented)
```

`ConcludeOnReplies.onMessage` returns `Task<ServiceTaskExchangeResult>`; everything else returns
`Task<ServiceTaskResult>`. This deletes two runtime failure classes outright:
`AwaitNextReplyOutsideAnExchange` (a `Finally` cannot return it) and `MailboxExchangeAlreadyClosed`
(`onClosed` cannot return it, and `onMessage` only runs when a message exists).

### `ServiceTaskContext` (`Features/Process/ServiceTaskContext.cs`)

Becomes a plain record again. Delete `Mailbox`, `MailboxOrDefault`, `MailboxUnavailableReason`,
`Reply`, `ReplyOrDefault`, `ReplyClosedReason`, `MailboxClosedReasonOrDefault`,
`ReplyUnavailableReason`, and the hand-written `PrintMembers`/`DescribeReply`. The mailbox reaches the
declaring stage as a delegate parameter; the reply/closure reach the handler the same way.

## Internal model

### Pipeline (`Features/Process/ServiceTaskPipeline.cs`)

```csharp
internal sealed record ServiceTaskStage(
    string Name,
    Func<ServiceTaskContext, ServiceTaskMailbox?, Task<ServiceTaskStageResult>> Work, // plain stages wrap (ctx, _) => work(ctx)
    ProcessStepOptions? StepOptions,
    MailboxOptions? OpensMailbox // non-null exactly for the declaring stage
);

// Exactly one conclusion; the closed set replaces "Finally that is secretly also the reply handler".
internal abstract record PipelineConclusion
{
    internal sealed record FinalStep(Func<ServiceTaskContext, Task<ServiceTaskResult>> Work, ProcessStepOptions? StepOptions) : PipelineConclusion;
    internal sealed record ReplyExchange(
        string OpeningStageName,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> OnMessage, // single-reply handlers wrap losslessly
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> OnClosed,
        ProcessStepOptions? StepOptions
    ) : PipelineConclusion;
}
```

Single vs multi is not recorded on the model: the compile-time split already did its work at the API
boundary, and a single-reply `onMessage` wraps to the exchange-result signature without loss (its
results are a subtype). The runtime treats every `ReplyExchange` uniformly.

The **opening stage name is the exchange's identity** everywhere: the carry map key, the
`EnqueueReceiveWorkflow` payload field, and (phase 2) the relay's continuation lookup. It is already a
wire-compat literal, so it takes on no new fragility.

### Carry (`Internal/WorkflowEngine/Models/WorkflowCallbackState.cs` + `WorkflowCallbackStateCarry.cs`)

Replace `Guid? MailboxId` with a map, and store the deadline so the declaring stage's
`ServiceTaskMailbox` parameter can carry it:

```json
"mailboxes": { "SendToArchive": { "id": "018f4e…", "deadline": "2026-08-30T12:00:00Z" } }
```

Carry API: `RecordMailbox(string stageName, Guid id, DateTimeOffset deadline)` (refuses a conflicting
re-record for the same stage, as today), `FindMailbox(string stageName)` (named for the local `ServiceTaskPipeline.FindStage` convention — `TryGet*` in .NET means `bool` + `out`),
`RecordMailboxConcluded(string stageName)`. Phase 1 holds at most one entry; the code does not care.
The old `mailboxId` blob field is dropped, not migrated — nothing released ever wrote it.

## Runtime changes

### 1. New command: `MintMailbox` (`Internal/WorkflowEngine/Commands/MintMailbox.cs`)

Payload `MintMailboxPayload(string ServiceTaskType, string StageName)`. Execution, in order:

1. Resolve the pipeline; find the stage; a missing stage or missing declaration is permanent with the
   `ServiceTaskStageNotFound`-style redeploy wording (drift guard: declaration removed/renamed while
   this workflow was in flight).
2. Empty `StepId` → permanent `MailboxStepIdMissing` (unchanged wording).
3. Mint keyed on `StepId` with the declaration's `Timeout` and the instance-guid collection key —
   the exact call `ExecuteServiceTask.ResolveMailbox` makes today, moved verbatim.
4. `Minted` → `carry.RecordMailbox(stageName, id, deadline)`, success. `Rejected` → permanent
   `MailboxRejected`. `AtCapacity` → retryable `MailboxAtCapacity`.

OperationId `MintMailbox: {stageName}`. Registration follows "How to Add a New Command": payload in
`CommandPayload.cs` (`[JsonDerivedType]` + `[JsonSerializable]`), DI in
`DependencyInjection/ServiceCollectionExtensions.cs`. It is expansion-emitted (like
`ExecuteServiceTask`), not part of any `WorkflowCommandSet` sequence. No step-options override — it is
one HTTP call; engine defaults suffice.

### 2. Expansion (`Internal/WorkflowEngine/WorkflowCommandSet.cs` + `ProcessNextRequestFactory.cs`)

Replace the `ServiceTaskStageNames` + `ServiceTaskMailbox` pair on `TaskStartContext` with one small
projection computed from the pipeline in a single place (e.g. `ServiceTaskPlan`): the ordered stages
(name + opens-mailbox flag), the opening stage name if any, and whether the conclusion is a
`FinalStep` or a `ReplyExchange`. Emission per transition into the task:

- per stage: `[MintMailbox step]` (only for the declaring stage, immediately before it) + the
  `ExecuteServiceTask` stage step — mint step options resolve like the stage's? No: engine defaults
  (see above);
- then either the concluding `ExecuteServiceTask` step (null stage name, `FinalStep`) **or** the
  `EnqueueReceiveWorkflow` step (`ReplyExchange`), exactly as today.

`EnqueueReceiveWorkflowPayload` gains `string OpeningStageName` (set at assembly time — never
re-derived later, per decision 4). The command looks the mailbox up in the carry map by that name;
a missing entry keeps today's permanent `MailboxIdMissingFromState`.

### 3. `ExecuteServiceTask` (`Internal/WorkflowEngine/Commands/ExecuteServiceTask.cs`)

The command's `Execute` becomes a three-way dispatch resolved once, each branch a dedicated method —
no more interrogating nullable fields to reconstruct which execution this is:

1. **Stage** (`payload.StageName != null`): find the stage (missing → `ServiceTaskStageNotFound`,
   unchanged). If it opens a mailbox, read the carry entry (missing → permanent, "the mint step records
   it; a step between the two dropped it") and pass `ServiceTaskMailbox` to the work delegate;
   otherwise pass null (never observable by app code — plain stages wrapped it away). A stage handed a
   mailbox receipt stays a permanent `MailboxReceiptOnStage` (drift guard).
2. **Reply** (`payload.StageName == null`, pipeline concludes with `ReplyExchange`): the receipt-block
   consistency checks stay as they are — receipt missing (`MailboxReceiptMissing`), receipt present
   without declaration (`MailboxReceiptWithoutDeclaration`), delivery XOR disposed
   (`MailboxReceiptAmbiguous`), envelope unwrap (`MailboxDeliveryEnvelopeInvalid`). They guard engine
   drift and redeploys, which types cannot. Then dispatch: delivery → `OnMessage(ctx, reply)`;
   disposed → `OnClosed(ctx, reason)`; hand the verdict to `MailboxRelay.Decide`.
3. **Conclusion** (`payload.StageName == null`, `FinalStep`): run `Work`, map with
   `MapServiceTaskResult` — which loses its `ServiceTaskAwaitNextReplyResult` arm entirely.

Delete from this file: `ResolveMailbox` (moved to `MintMailbox`), the `ReplyResolution` unavailable-
reason plumbing (delegate dispatch replaced it), `NoMailboxDeclaredReason` /
`NoMailboxDeclaredReplyReason`, `AwaitNextReplyOutsideAnExchange`. If the file is still large after the
deletions, extract the receipt-block reading (checks 2's first half + envelope unwrap) into a small
`MailboxReceiptReader` — but only if it is genuinely still large; no new type for one screenful.

### 4. `MailboxRelay` (`Internal/WorkflowEngine/MailboxRelay.cs`)

- `Decide` takes `ServiceTaskExchangeResult`. The `AwaitNextReply`-on-closed branch is deleted
  (unrepresentable: `OnClosed` returns `ServiceTaskResult`, and `OnMessage` only ran with a delivery).
  The `StepIdMissing` guards, the continuation set, `Continue`, successor labels, and both idempotency
  keys are unchanged.
- `Conclude` calls `carry.RecordMailboxConcluded(openingStageName)` — the relay learns the name from
  the pipeline's `ReplyExchange`. **Correction (found in Step 3):** the parenthetical "pass it in
  `MailboxRelayRequest`" is not mechanically satisfiable. `RecordMailboxConcluded` must run *before* the
  controller's `CaptureState`, while `MailboxRelayRequest` exists only on the `Continue` path, which runs
  *after* it — routing the carry write through there would publish a blob still naming the concluded
  mailbox. The name therefore reaches `Decide` as a parameter, sourced from
  `PipelineConclusion.ReplyExchange.OpeningStageName`. The substantive half of the instruction (no
  re-derivation, no pair switch over nullable fields) is what matters and is satisfied.

### 5. Migrations of in-tree consumers

- `Altinn.App.Clients.Fiks/FiksArkiv/FiksArkivServiceTask.cs`: `Define` as in the target-API example.
  `SendToArchive` takes the mailbox parameter (its `Mailbox.Id == Guid.Empty` defensive check can go —
  the mint step fails before an empty id can reach a stage; the `StepId` check stays).
  `HandleArchiveReply` splits at its existing `context.Reply is not { } reply` seam:
  `HandleArchiveClosed(ctx, reason)` gets the timeout wording; `HandleArchiveMessage(ctx, reply)` gets
  the rest, returning `ServiceTaskExchangeResult`.
- `EFormidlingServiceTask`: no mailbox — recompiles unchanged.
- Test apps: `test/Altinn.App.Integration.Tests/_testapps/basic/_scenarios/workflow-engine-pipeline/`
  (`PipelineScenario.cs`) and `src/test/apps/process-transition-test/App/logic/ScenarioServiceTask.cs`
  (repo-root relative) — migrate whatever `WithReplyFrom`/`AwaitNextReply` usage they have; `rg` for
  the old names must come back empty at the end.

## What moves where — the guard ledger

| Today (runtime, permanent)                     | After                                                        |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `AwaitNextReplyOutsideAnExchange`              | does not compile                                              |
| `MailboxExchangeAlreadyClosed`                 | does not compile (`onClosed` returns `ServiceTaskResult`)     |
| `Mailbox`/`Reply` read in the wrong execution  | does not compile (delegate parameters)                        |
| discarded `WithReplyFrom` return               | gone with the method; terminal seals the declaration          |
| `WithReplyFrom` names a missing stage          | gone (handle instead of string)                               |
| second mailbox declaration                     | eager builder throw → startup failure                         |
| mailbox opened but never handled               | eager `Finally` throw → startup failure (new)                 |
| handle from another builder / reused handle    | eager builder throw → startup failure (new)                   |
| `MailboxStepIdMissing` (mint)                  | stays, in `MintMailbox`                                       |
| `MailboxRejected` / `MailboxAtCapacity`        | stays, in `MintMailbox`                                       |
| `ServiceTaskStageNotFound` + declaration drift | stays (redeploy drift)                                        |
| receipt-block consistency + envelope checks    | stay (engine drift)                                           |
| `MailboxIdMissingFromState`                    | stays (broken carry)                                          |

## Readability principles (the point of the exercise)

- **Dispatch by shape once.** Which of the three executions this is (stage / reply / conclusion) is
  decided in one place; each branch is a method that assumes its shape. No method interrogates
  nullable fields to rediscover context.
- **Delete, don't port.** The guard machinery in the left column above is removed, not reimplemented
  defensively "just in case". Every runtime guard that remains has an xmldoc naming the drift scenario
  it catches.
- **Prefer compile-time > startup-eager > runtime-permanent**, in that order, and never duplicate a
  check across two tiers.
- **No new abstraction for one call site.** `ServiceTaskPlan` and `MailboxReceiptReader` exist only if
  the code they'd replace is genuinely sprawling; a private method is the default.
- **The saga stays in `MailboxRelay`**; the builder stays declarative (no I/O, eager validation only);
  `Define` stays cheap/deterministic (unchanged contract).

## Suggested PR slicing

1. **PR 1 — mint as its own step, carry map.** Today's API untouched: add `MintMailbox`, move the mint
   out of `ExecuteServiceTask` (the stage-side `ctx.Mailbox` getter reads the carry for now), switch
   the blob to the map shape, extend the expansion, update
   `ExecuteServiceTaskMailboxTests`/`ProcessNextRequestFactoryTests`. Small, independently verifiable.
2. **PR 2 — the API reshape.** Builder overload + handles + terminals, result-hierarchy re-root,
   `ServiceTaskContext` cleanup, `PipelineConclusion` model, `ExecuteServiceTask` dispatch rework,
   `MailboxRelay.Decide` signature, consumer migrations, delete `WithReplyFrom` and the guard
   machinery.
3. **PR 3 — docs.** `Internal/WorkflowEngine/AGENTS.md` (the Mailboxes and reply-handler bullets are
   written against the old API and must be rewritten, including the carry description), xmldoc pass on
   the new public surface (the `ConcludeOnReply`/`ConcludeOnReplies` docs should state plainly that a
   task gets one exchange in this version and that two exchanges are, for now, two BPMN tasks).

Phase 2 (sequential multi-exchange: non-terminal handler methods, continuation workflows carrying the
remaining steps, relay continuation as a position lookup keyed by opening stage name, a
`ServiceTaskStageResult`-flavored vocabulary for non-terminal handlers) is deliberately not in these
PRs; the model above was shaped so it lands additively — new terminal methods and a relay lookup, no
reshaping of what phase 1 built.

## Test plan

- **New**: `MintMailboxTests` (mint outcomes → command results, carry recording, StepId guard, missing
  declaration/stage drift wording); builder tests for the new eager validations (foreign handle,
  reused handle, unconsumed handle, second mailbox); carry map round-trip through
  `WorkflowCallbackStateService` (record → capture → restore → read; concluded entry dropped from the
  published blob). One assertion must pin the literal blob JSON (`"mailboxes"`, `"id"`,
  `"deadline"`) — the round-trip tests use the same serializer both ways, so a field rename would pass
  them while breaking in-flight workflows, and decision 4 makes those names what buys phase 2 its
  migration-free path.
- **Updated**: `ServiceTaskPipelineMailboxTests` (composition surface), `ExecuteServiceTaskStageTests`
  (mailbox parameter reaches the declaring stage from the carry; missing entry wording),
  `ExecuteServiceTaskReplyTests` (onMessage/onClosed dispatch; the receipt drift guards unchanged),
  `ExecuteServiceTaskMailboxTests` (shrinks — mint coverage moves to `MintMailboxTests`),
  `MailboxRelayTests`/`MailboxRelayFrontierTests` (Decide input type; conclude records by stage name),
  `ProcessNextRequestFactoryTests` (expansion now emits the mint step; receive payload carries the
  opening stage name), `ServiceTaskRegistrationValidatorTests`,
  `WorkflowEngineCallbackControllerMailboxTests`, `FiksArkivServiceTaskTest` (split handlers; the
  reply-address round-trip test keeps pinning the wire value off the real outbound request).
- **Integration**: there is currently **no end-to-end coverage of a mailbox exchange anywhere** in
  `test/Altinn.App.Integration.Tests` — the `workflow-engine-pipeline` scenario declares no mailbox, so
  the mint step is not emitted there and no snapshot moves (Step 2 established this). This is new
  coverage, not an update: it needs a scenario with a mailbox pipeline plus an endpoint that forwards a
  reply. It lands in Step 3, written against the new API, rather than being built against the old API in
  Step 2 and rewritten immediately.
- Full run: `dotnet build solutions/All.slnx -t:Rebuild -v m` then `dotnet test solutions/All.slnx`
  (rebuild, not incremental — warnings-as-errors hides otherwise), plus `rg -n "WithReplyFrom"` across
  the repo returning nothing.

## Implementation steps (orchestrated)

Each step must build and test green on its own; no step may leave the tree non-compiling. Steps are
executed in order, one worker per step, one reviewer per step. `[ ]` = unfinished, `[x]` = approved.

- [x] **Step 1 — Carry map.** (approved) `Internal/WorkflowEngine/Models/WorkflowCallbackState.cs` +
      `WorkflowCallbackStateCarry.cs`: replace `Guid? MailboxId` with the `mailboxes` map keyed by
      opening stage name, holding `id` + `deadline`. Carry API: `RecordMailbox(stageName, id, deadline)`
      (refuses a conflicting re-record for the same stage), `FindMailbox(stageName)`,
      `RecordMailboxConcluded(stageName)`. Adapt today's call sites (`ExecuteServiceTask` mint path,
      `EnqueueReceiveWorkflow`, `MailboxRelay.Conclude`) to key off the declaring stage name derived
      from the existing pipeline model. Behavior otherwise unchanged; public API untouched. Tests: carry
      map round-trip through `WorkflowCallbackStateService` (record → capture → restore → read;
      concluded entry dropped from the published blob).
- [x] **Step 2 — Mint as its own step.** (approved) New `Internal/WorkflowEngine/Commands/MintMailbox.cs` per
      "Runtime changes §1" (payload, registration, DI, OperationId, outcome mapping). Move the mint out
      of `ExecuteServiceTask.ResolveMailbox`; the stage-side `ctx.Mailbox` getter reads the carry for
      now. Extend the expansion (`WorkflowCommandSet.cs` + `ProcessNextRequestFactory.cs`) to emit the
      mint step immediately before its declaring stage, and add `OpeningStageName` to
      `EnqueueReceiveWorkflowPayload` (set at assembly time) and switch the carry lookup to
      `carry.FindMailbox(payload.OpeningStageName)` — which **deletes Step 1's interim
      `MailboxAmbiguousInState` arm**; that guard exists only because the sole-entry read does, and with
      the name on the payload a second carried entry is no longer ambiguous. Only
      `MailboxIdMissingFromState` survives. Public API still the old shape. Tests: new
      `MintMailboxTests`; updated `ExecuteServiceTaskMailboxTests`, `ProcessNextRequestFactoryTests`,
      and the `workflow-engine-pipeline` integration scenario snapshots.
- [x] **Step 3 — The API reshape.** (approved) The largest step and deliberately atomic (the tree cannot compile
      halfway through): `MailboxHandle`, the `Stage` mailbox overload, `ConcludeOnReply` /
      `ConcludeOnReplies`, the eager builder validations, the `PipelineConclusion` internal model, the
      result-hierarchy re-root (`ServiceTaskExchangeResult`), `ServiceTaskContext` back to a plain
      record, `MailboxRelay.Decide` signature + `Conclude` keyed by stage name, `ExecuteServiceTask`
      adapted to the new model, deletion of `WithReplyFrom` / `MailboxDeclared` / `NoteMailboxDeclaration`
      / `_origin` / the `ResolvePipeline` discarded-return check, and the in-tree consumer migrations
      (`FiksArkivServiceTask`, `PipelineScenario.cs`, `ScenarioServiceTask.cs`). Tests per "Test plan"
      for everything named here, **plus the first end-to-end integration coverage of a mailbox exchange**
      (a scenario declaring a mailbox pipeline and an endpoint forwarding a reply, asserting the mint step
      appears in the workflow's step list and the exchange concludes) — Step 2 established that none
      exists today — **that integration coverage is split out as Step 3b below**, so this step stays the
      compile-atomic API change and nothing more.
      Three small items carried forward from Step 2's review, to fold in while already in these files:
      `MintMailbox`'s two drift arms collapse into one stage lookup once the declaration lives on
      `ServiceTaskStage` (its relocation clause becomes part of that single message, and should be moved
      *ahead* of the remediation sentence so the reader learns where the declaration went before being
      told to restore the old name); and four `using Altinn.App.Core.Internal.WorkflowEngine.Http;` lines
      are now orphaned in `ProcessStepOptionsResolverTests.cs`, `ProcessNextRequestFactoryTests.cs`,
      `Commands/ExecuteServiceTaskStageTests.cs`, `Commands/ExecuteServiceTaskTests.cs` (but *not*
      `ExecuteServiceTaskReplyTests.cs`, which still needs its copy).
      Note the step/step boundary: delete whatever the API reshape makes **unreachable** (the
      `UnavailableReason` plumbing dies here by necessity, since the context getters go), but leave the
      *restructuring* of `ExecuteServiceTask.Execute` into the three-way dispatch to Step 4.
- [x] **Step 3b — First end-to-end integration coverage of a mailbox exchange.** (approved) Additive and test-only,
      on top of Step 3: a scenario in `test/Altinn.App.Integration.Tests/_testapps/` declaring a mailbox
      pipeline against the new API, plus an endpoint that forwards a reply, asserting the mint step appears
      in the workflow's step list and that the exchange concludes. Step 2 established that no such coverage
      exists anywhere today. Per the `AutoVerify` note above: diff every snapshot the run touches and judge the drift.
      **This runs before Step 4**, on Step 3's reviewer's advice: Step 4 refactors `ExecuteServiceTask`, the
      one file with no end-to-end net under it. Precise coverage, once this lands: the mailbox scenario
      enters `ExecuteStage` three times (one mailbox-opening, two plain — the declaring stage is
      deliberately surrounded, so neither adjacency half is unfalsifiable) and `ExecuteReply`'s
      delivery arm twice
      (`AwaitNextReply`, then the conclusion). It never enters `ExecuteConclusion` — a mailbox pipeline
      emits no bare concluding step — which stays covered by the pre-existing `workflow-engine-pipeline`,
      `workflow-engine-side-effects` and `eformidling-pipeline` scenarios. `ExecuteReply`'s **disposed arm
      remains unit-only**: reaching it end to end needs a deadline expiry plus the engine's sweep interval
      and a scenario whose `onClosed` does not fail permanently, which conflicts with the happy-path
      scenario's tripwire. All three branches are covered *across the suite*, not in one run.
- [x] **Step 4 — Dispatch-by-shape cleanup.** (approved) *Narrowed by what Step 3 was forced to do:* the three-way
      dispatch (`ExecuteStage` / `ExecuteReply` / `ExecuteConclusion`) already landed in Step 3, because
      delegate-parameter dispatch means each branch must own its handler call and no shared `pipeline.Final`
      path survives; and `MailboxReceiptReader` was judged unwarranted (the file is ~348 lines with the
      receipt block at ~40 of them — not "genuinely sprawling", and a type for one call site is what this
      plan warns against). Re-examine both judgements, then do what remains: the xmldoc pass naming each
      surviving guard's drift scenario, the stage-side missing-carry wording debt below, and the guard-name
      sweep. Three items from Step 3's review land here too. **(a) Close both result roots** —
      `ServiceTaskExchangeResult` and `ServiceTaskResult` both have `protected` ctors, so an app can derive
      a subtype the runtime cannot understand: it reaches `MailboxRelay.Decide`'s `default:` throw, which
      `Execute` catches into a retryable failure that never converges. Making both ctors `internal` leaves
      same-assembly derivation untouched and genuinely closes the vocabularies. It is a public-API change,
      so state it in the approval-file delta and the changelog; nothing has shipped, so this is the cheap
      moment. **(b) Decide consciously** whether `ServiceTaskStage` should become a closed two-member
      hierarchy (plain vs mailbox-opening), which would delete the `?? throw new UnreachableException`, the
      nullable delegate parameter, and turn `MintMailbox`'s `?.OpensMailbox is not { }` into a type test —
      internal-only, no public churn. Do it or record why not. **(c) Optional:** `PipelineConclusion` and
      its two members are `record`s whose synthesized value equality compares delegate references and is
      never used; plain classes with the same private base ctor would be equally closed and claim less.
      **The sweep is code-only** — `Internal/WorkflowEngine/AGENTS.md` still names `WithReplyFrom` in
      its Mailboxes prose and that rewrite is Step 5's, so requiring a repo-wide empty `rg` before Step 5
      was self-contradictory. Original text follows: `ExecuteServiceTask.Execute` becomes the three-way
      dispatch (stage / reply / conclusion), each branch a dedicated method assuming its shape; remove
      the leftover unavailable-reason plumbing, `NoMailboxDeclaredReason`,
      `NoMailboxDeclaredReplyReason`, `AwaitNextReplyOutsideAnExchange`, `MailboxExchangeAlreadyClosed`,
      and the `MapServiceTaskResult` await-next-reply arm. Extract `MailboxReceiptReader` only if the
      file is genuinely still sprawling. Every surviving runtime guard gets an xmldoc naming the drift
      scenario it catches. `rg -n "WithReplyFrom|AwaitNextReplyOutsideAnExchange|MailboxExchangeAlreadyClosed"`
      across the repo must come back empty. One wording debt inherited from Step 2 belongs to this pass:
      the stage-side missing-carry failure says only "the mint step records it immediately before this
      stage runs; a step between the two must have dropped it", but a redeploy that *adds* a mailbox
      declaration while a transition is in flight reaches the same failure with no mint step ever emitted —
      the message must name that second cause too.
- [x] **Step 5 — Docs.** (approved) Rewrite the Mailboxes and reply-handler sections of
      `Internal/WorkflowEngine/AGENTS.md` (including the carry description) against the new API, and do
      the xmldoc pass on the new public surface — `ConcludeOnReply`/`ConcludeOnReplies` must state
      plainly that a task gets one exchange in this version and that two exchanges are, for now, two
      BPMN tasks. Note that `RecordMailbox`'s conflict guard is now scoped per stage, so the AGENTS.md
      line claiming a conclusion must drop the id "otherwise the next transition's own `WithReplyFrom`
      would hit `RecordMailbox`'s one-mailbox guard" describes a scope that no longer exists and must be
      rewritten, not merely re-worded.

## Worker/reviewer protocol

### Version control

- **Use `jj`, not `git`.** Never run `git` mutating commands.
- Top-level folders may be separate jj repositories: run `jj root` from every path you touch and
  confirm which repo you are in before creating revisions. (At the time of writing there is a single
  repository rooted at the monorepo root.)
- Before coding, check the current revision. If it is non-empty (`jj st` shows changes, or
  `jj log -r @` reports the working copy is not empty), create a new child revision with `jj new`, and
  give it a description with `jj describe -m "..."`.
- **Do not push.** **Do not move bookmarks.** **Do not revert unrelated user changes** — if you find
  pre-existing modifications you did not make, leave them alone and mention them in your report.

### Reporting

Workers and reviewers **cannot message the orchestrator mid-task**. There is no callback channel: you
report by ending your run with a structured final report. If you are blocked, end the run with a
`BLOCKED` report stating exactly what is needed — never wait, never poll, never ask a question you
cannot get answered.

**Worker final report** must contain:

- Step name
- `READY_FOR_REVIEW` or `BLOCKED` marker (on its own line)
- jj change id(s) and revision id(s) created
- Changed files
- Tests/builds run, with results
- Notes for later steps (anything a subsequent step must know, including residual gaps)

**Reviewer final report** must contain:

- `APPROVED` or `CHANGES_REQUESTED` on its own line, findings first, then reasoning
- Residual non-blocking gaps listed separately at the end

If a step turns out to be too broad to land coherently, update this plan's step list with the smallest
coherent split (each part still building and testing green) and end the run with
`BLOCKED_FOR_SCOPE_SPLIT`.

### Scope discipline

Implement **only** the current step. Later-step behavior must not be implemented early, even when it
looks trivial or when a temporary shim feels wasteful — the shims named in the step list are
intentional. Phase 2 (sequential multi-exchange) is out of scope for every step here.

### Verification

Per step, at minimum build and test the affected projects. Before reporting `READY_FOR_REVIEW` on the
steps that touch the app-lib runtime, run from `src/App/backend/`:

```
dotnet build solutions/All.slnx -t:Rebuild -v m
dotnet test solutions/All.slnx
```

`-t:Rebuild` is required — incremental builds hide warnings-as-errors failures.

Two known artifacts of the unsettled CRLF/LF state on this branch, neither caused by this work:

- `Altinn.App.SourceGenerator.Tests` fails `FullTests.Empty` and `FullTests.Run` on `\r\n` vs `\n`.
  Skip that project; do not chase the failures, and do not "fix" them by accepting snapshots — its
  `ModuleInitializer` calls `VerifierSettings.AutoVerify`, so running it silently rewrites
  `DiagnosticTests.RunJsonError.verified.txt`.
- The build alone rewrites `test/Altinn.App.SourceGenerator.Integration.Tests/gen/**/*.g.cs`
  (CRLF→LF). Restore them out of your revision before reporting:
  `jj restore --from <your commit before the build> src/App/backend/test/Altinn.App.SourceGenerator.Integration.Tests/gen`

A fourth hazard, **discovered during Step 3b**: integration-scenario `services/*.cs` files are compiled at
runtime by Roslyn, and a compile error there is only *logged* (`LogInitError`), never thrown — the service
task simply fails to register and the test fails somewhere unrelated. If you edit a scenario service file,
validate it compiles before trusting a red run's message.

A third hazard, unrelated to line endings and **discovered during Step 2** (see the follow-up note at the
`AutoVerify(includeBuildServer: false)` is **deliberate, and it is how this repo is meant to be used**:
locally, Verify accepts the new value and you inspect the drift in your VCS diff; on the build server it
fails instead. So the review step is not a workaround for a hazard — it *is* the workflow. Earlier revisions
of this document framed it as a defect; that was wrong.

What follows from it, for every worker here: **the green summary is not the artifact you check — the diff
is.** After any run, `jj diff` the snapshots and the public-API approval file
(`PublicApiTests.PublicApi_ShouldNotChange_Unintentionally.verified.txt`), read the drift, and decide
whether it is intended. Keep what you meant to change; restore what you did not. In this stack Step 3
deliberately changed the approval file and read it line by line, while Steps 2 and 4 found *unintended*
drift in the integration suite — a scope/token-dependent response moving (`Forbidden` → `401`, and once
`Forbidden` → `OK`) in the shared localtest — and restored it. Both are the mechanism working; only the
second is a signal about the environment.

## Follow-up worth its own change (out of scope here)

**A discarded declaration the terminal cannot seal.** The `ResolvePipeline` discarded-return check was
deleted on the grounds that a terminal is the only source of a `ServiceTaskPipeline`, so nothing can be
discarded. Step 5's review found the conclusion is too absolute: `ServiceTaskPipelineBuilder` has a **public
parameterless constructor**, so an app can call the mailbox `Stage` overload on the supplied builder and then
`return new ServiceTaskPipelineBuilder().Stage(…).Finally(…)` — the declaration is silently dropped, with no
eager throw and no mint step, which is exactly the case the deleted check covered. Cheapest close is making
that constructor `internal`; it is a public-API change, and nothing has shipped, so the window is open.

**Non-converging retry on a missing service task.** Both `ExecuteServiceTask` and `MintMailbox` throw
`ProcessException($"No service task found for type {type}")` from *inside* the outer `try`, so the outer
catch turns it into a **retryable** failure that can never converge — the same non-convergence shape that
motivated closing the result roots in Step 4, but for a genuine redeploy-drift scenario (the task type was
renamed or removed while a workflow was in flight). Found during Step 4 and deliberately not changed there:
it is not in the guard ledger, and making it permanent is a behaviour change that deserves its own review.

**A derivation route the closed result roots do not close.** Step 4 made the declared result-root
constructors inaccessible outside the assembly, which stops the plausible author mistake (`record RogueA :
ServiceTaskResult;` is now `CS0122`). But a record's synthesized *copy* constructor is `protected` and C#
forbids narrowing it below `protected` on an unsealed record (CS8878), so a subtype that chains through it
still compiles and instantiates. Step 4's review confirmed this by compiling a probe against the built
assembly, and established it is broader than first reported: the route is open on **all three roots**
(`ServiceTaskResult`, `ServiceTaskStageResult`, `ServiceTaskExchangeResult`) and lands on **three** sites
(`MapServiceTaskResult`, `MapStageResult`, `MailboxRelay.Decide`) — so the vocabulary-drift defaults in those
mappers are reachable from app code, not merely from a future in-assembly addition. Step 4 therefore made all
three **return a permanent failure naming the offending type** (reason `ServiceTaskResultUnknown`) rather than
throw into a catch that turns it retryable; none of the three throws any more, and `Decide`'s arm deliberately
does **not** close the mailbox, because what closes it is the app having concluded and an unrecognised verdict
is no conclusion. Three tests derive through the copy constructor to pin that convergence, and they are
self-cleaning: closing the hole properly stops them compiling. The roots cannot
become plain classes because the leaves are records; closing it properly means moving off records, which is
its own change.


**The unsettled CRLF/LF state.** `.editorconfig` says LF, `.gitattributes` still declares `eol=crlf` for
`src/App/backend/**/*.cs`, and the generators hold hardcoded `\r\n` — so `Altinn.App.SourceGenerator.Tests`
fails `FullTests.Empty`/`FullTests.Run` on line endings alone, and every build rewrites
`test/Altinn.App.SourceGenerator.Integration.Tests/gen/**/*.g.cs`. Not caused by this rework and not fixed
by it; it deserves a change of its own. (`AutoVerify` is *not* part of this: see the correction in the
verification section.)
