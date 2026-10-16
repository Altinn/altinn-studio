# Service task pipelines and mailboxes

Authoring guide for service tasks built on `IPipelineServiceTask` — durable multi-step tasks, waiting,
and message-answered (mailbox) exchanges — and for side effects (`ISideEffect`), which compose the same
pipelines but run beside the process instead of holding it up. This is the app-developer companion to the runtime's internal
spec in `src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md`; until it lands on docs.altinn.studio,
this file is the reference the API docs point to.

## The shape of a pipeline

Every service task is a pipeline. A task that does one thing implements `IServiceTask` and only writes
`Execute`; a task with more than one durable step implements `IPipelineServiceTask` and composes its
pipeline in `Define`:

```csharp
public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
    pipeline
        .Stage(SendToArchive, new MailboxOptions { Timeout = TimeSpan.FromDays(14) }, out MailboxHandle archive)
        .ConcludeOnReplies(archive, onMessage: HandleArchiveMessage, onClosed: HandleArchiveClosed);
```

A composition is zero or more `Stage(...)` calls and `HandleReplies(...)` handlers, in any order, ended by
exactly one terminal — `Finally(...)` for work that finishes by itself or by polling, or
`ConcludeOnReplies(...)` for work answered by a message. The terminal is the only way to obtain the
`ServiceTaskPipeline` that `Define` must return, so a pipeline cannot be left unfinished.

`Define` runs when a transition is enqueued (fixing the pipeline's shape for that workflow's lifetime), on
every callback (to dispatch), and at app startup (to validate). It must be cheap, deterministic and
side-effect free — the work happens inside the stages when the engine runs them.

The builder validates eagerly: a null delegate, invalid options, a mailbox handle from another pipeline, a
handle answered twice, or a mailbox left unanswered at the terminal all throw from the composing call and
fail **app startup**, not a callback days later.

App startup also checks the other side of the same invariant, in `process.bpmn`. Every task there must
carry a non-blank `<altinn:taskType>`, and that type must name something the app resolves: one of the
built-in types (`data`, `confirmation`, `feedback`, `signing`, `payment`, `pdf`, `subformPdf`,
`eFormidling`), a built-in you enabled with its own call (`fiksArkiv`, from `services.AddFiksArkiv()`), or
an `IServiceTask` / `IPipelineServiceTask` / `IProcessTask` your app registered. A type that resolves to
nothing would otherwise deploy quietly and strand the first instance to reach it — no work is scheduled,
the process comes to rest on the task, and the advance that follows fails with an unexplained internal
error — so the app refuses to start instead, naming every offending task, the type it declares, and the
types that are registered.

Two things about that check are worth knowing:

- **The element must match the type.** A task whose type resolves to a service task must be a
  `<bpmn:serviceTask>` element, and every other task a `<bpmn:task>`; the app refuses to start on a mismatch.
  The build reports the same mismatch as `ALTINNAPP1003` for the built-in types and for task classes in the
  app whose `Type` returns a constant, assuming each is registered under the interface it implements.
- **The type is matched exactly, including case.** `<altinn:taskType>PDF</altinn:taskType>` does not reach
  a task whose `Type` is `pdf`.

In v9, `IProcessTask.ValidateConfiguration(ProcessTaskValidationContext)` is an optional app-facing
hook, inherited by both service-task interfaces. The default returns no findings; existing tasks do
not need an override. It runs once per BPMN task using the selected implementation and receives the
task id, hosting environment, and application metadata. Return each configuration problem as a
string; the startup validator prefixes it with the task id and reports all findings together.
Validation is synchronous and must be side-effect free: do not execute task work or contact external
services. Validation has its own dependency-injection scope; its scoped services are disposed after
all tasks have been validated.
The built-in eFormidling task uses this hook for its environment-specific BPMN configuration, data
types, and required service registrations.

## Stages: durability and idempotency

Each stage runs as its own workflow-engine step, with its own retry budget, timeout, wait budget and
idempotency key. A completed stage **never runs again**: a retry or an operational resume re-enters the
pipeline at the failed stage, not at the beginning. That step ledger — not anything you track yourself —
is the durable guard for send-then-poll and send-then-receive work: give the send its own stage.

- **Every stage may be retried on failure, so its work MUST be idempotent.** Use
  `ServiceTaskContext.StepId` as the idempotency key for an outbound call the stage must not repeat — it
  is stable across retries of the same step and covers the crash window between sending and completing.
- **Never** branch on anything under `ServiceTaskContext.Attempt` or `ServiceTaskContext.Wait` to guard a
  side effect: an attempt that sends and then crashes re-runs with all of those unchanged.
- Stages share state through `ServiceTaskContext.InstanceDataMutator` and `ServiceTaskContext.Values`: a
  completed stage's data changes are saved into the workflow state and visible to every stage after it, and so
  are the values it recorded.
- A failed attempt saves nothing — the retry starts from exactly the state the attempt received. A handler
  that must _record_ something records it and returns success.

### Values

`ServiceTaskContext.Values` holds small named strings a stage hands to the stages after it, such as the
reference an external system returned for the request the stage sent. Use it for what the pipeline itself needs
and nobody else reads; keep anything that belongs to the instance in instance data.

```csharp
private async Task<ServiceTaskStageResult> Send(ServiceTaskContext context)
{
    string messageId = await _client.Send(..., idempotencyKey: context.StepId);
    context.Values.Set("messageId", messageId);
    return ServiceTaskStageResult.Completed();
}

private async Task<ServiceTaskResult> AwaitReceipt(ServiceTaskContext context)
{
    string messageId = context.Values.Get("messageId") ?? throw new InvalidOperationException("No message id.");
    ...
}
```

- Values travel in the workflow state and need no save. They are kept when the step completes, like data
  changes, and a step that records a value and then defers fails permanently: a deferral is stateless.
- Each task sees only its own values, and the pipeline's first item starts with none, so nothing from an
  earlier visit to the task reaches a new one. The values stop traveling when the task concludes.
- A task holds at most `PipelineValues.MaxCount` values, each at most `PipelineValues.MaxValueLength`
  characters.

### Stage results

`ServiceTaskStageResult` is the stage vocabulary: `Completed()`, `Defer(delay, reason?)`,
`FailedRetryable(msg)`, `FailedPermanent(msg)`. A plain stage cannot conclude the task or advance the
process — that is reserved for the pipeline's conclusion, and for a mailbox-opening stage's `Conclude`
(see below). The concluding step returns `ServiceTaskResult`. Returning `Success(action?)` completes
the task and advances the process, using the optional action to select the next transition. Work that
is still waiting for an outcome uses `Defer` or a mailbox reply handler.

## Waiting: Defer and wait budgets

`Defer(delay, reason?)` means "ran without error, the outcome has not arrived yet": the engine parks the
process on this step — no worker held, no error recorded, retry counter reset — and runs it again after
`delay`.

- A deferral is **stateless**: nothing is saved, and instance data changes made by a deferring attempt are
  rejected as a contract violation. Work that produces something durable belongs before the wait, in its
  own stage.
- The total wait is bounded by `ProcessStepOptions.WaitBudget` (or the engine default); expiry fails the
  step. Declare a polling pipeline's wait budget on `Finally`, not on the task — task-level options are
  inherited by every stage, including stages that never wait.
- Read `ServiceTaskContext.Wait` (`DeferCount`, `StartedAt`, `Deadline`, `Remaining` and `IsFinalCheck`)
  to pace the wait, and give up on `IsFinalCheck` with a message that names what never arrived.
  `EFormidlingServiceTask` is the worked example in-tree: a send stage, a polling `Finally` that owns the
  wait budget, a backoff ladder driven by `Wait.DeferCount`, and a `FailedPermanent` on
  `Wait.IsFinalCheck`.
- The `reason` string is persisted on the step and surfaced on status reads (ops dashboards, and the
  frontend's waiting UI via the `workflow.waitingReason` annotation) — phrase it for a reader, not a log
  parser.

### Step options

A step's own options — a stage's from `Stage`, a reply handler's from its own `HandleReplies`, the
conclusion's from the terminal — win field-wise over the task's `StepOptions`, which are the fallback for
every step. The three sources are alternatives, never a chain: what one step leaves unset falls back to
the task's options, never to another step's.

## Mailboxes: work answered by a message

A pipeline answered by a message rather than by polling opens a **mailbox** from the stage that sends:

```csharp
pipeline.Stage(SendIt, new MailboxOptions { Timeout = ... }, out MailboxHandle handle)
```

The stage's work is handed a `ServiceTaskMailbox`: `Id` is the reply address, `Deadline` is when the
mailbox stops accepting answers, and `Owner` is the pipeline that answers it. For an answer to be routable, the stage must publish `Id` in whatever
field the receiving system echoes back — the id _is_ the address; nothing else routes a reply. A retried
or deferred attempt of the stage is handed the same mailbox: the mint is its own durable step immediately
before the stage, so it never runs twice.

- `MailboxOptions.Timeout` runs from the mint, and the deadline is absolute — no message re-arms it. It
  is a real domain deadline only the task can know; days are ordinary. One ceiling cannot be checked at
  app startup: the engine's `MaxMailboxTimeout` (21 days by default) rejects the mint and fails the
  declaring transition.
- The mailbox id is unguessable but **not a secret**: it is the address a message is sent to, not proof
  of who sent it.

### Concluding from the opening stage

A mailbox-opening stage answers its own vocabulary, `ServiceTaskOpeningStageResult`: the stage members,
plus `Conclude(ServiceTaskResult)` for the send whose failure already settles the task — a recipient
address that does not exist — where waiting out the exchange would only delay the same verdict.

- A conclusion ends the **whole task**: every mailbox the task has opened is closed before anything
  downstream starts, no receiver is enqueued, the pipeline items composed after the stage never run, and
  the carried result determines what happens next: `Success(action?)` advances the process,
  and `FailedPermanent` fails the task with the mailboxes closed.
- A wrapped `FailedRetryable` or `Defer` concludes nothing: it acts exactly as the stage vocabulary's own
  member, and every open mailbox stays open.
- It is honored from **every** mailbox-opening stage, wherever that stage sits in the composition: the
  items composed after it are work the conclusion never starts, not steps it would have to cancel. Nothing
  about what you compose around the send decides whether concluding from it works.
- Conclude only on a verdict that is already final. A send whose outcome is unknown (a timeout, a
  cancelled attempt) must return `FailedRetryable` instead: the shipment may have left, and concluding
  would close the mailbox its answer needs.
- Conclude only on failures remediated case-side. An app-level failure — refused credentials, broken
  configuration — should be an ordinary permanent stage failure (`FailedPermanent`) instead: the mailbox
  stays open, and fixing the problem plus resuming the workflow re-runs the send and lets the exchange
  complete.

### Answering the exchange

Exactly one handler answers each mailbox, named by the handle the opening `Stage` handed out:

- `ConcludeOnReplies(handle, onMessage, onClosed)` — the exchange the task **ends** on. `onMessage`
  returns `ServiceTaskExchangeResult`: any `ServiceTaskResult` (concluding the task), or
  `AwaitNextReply()` to be called again on the next message.
- `HandleReplies(handle, onMessage, onClosed)` — an exchange the pipeline **carries on past**. `onMessage`
  returns `ServiceTaskStageExchangeResult`: any `ServiceTaskStageResult`, or `AwaitNextReply()`.
  `Completed()` here means _this exchange is concluded, run the pipeline's next segment_ — concluding the
  task and advancing the process are deliberately not in this vocabulary.

`onMessage` runs once per message, each as its own durable unit of work. Messages arrive one at a time in
accepted order, each starting from the state its predecessor published — on `AwaitNextReply()`, data
changes are saved, so publish what the next message should see.

`onClosed` runs when the mailbox closed with the exchange still unconcluded — the deadline passed, or it
was closed by hand; `MailboxClosedReason` says which, and it changes only the wording, since both mean no
message can arrive. It cannot ask for another message, and it decides whether that is fatal
(`FailedPermanent`) or, for `HandleReplies`, simply the end of an exchange the task can live without
(`Completed()`, and the pipeline carries on).

What each verdict does to the exchange:

| Verdict                        | Effect                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AwaitNextReply()`             | This message is handled; wait for the next.                                                                                                                                           |
| `Success(...)` / `Completed()` | Concludes the exchange. The mailbox is **closed first**, so no later message can land in an exchange already answered.                                                                |
| `FailedPermanent`              | Concludes the exchange as failed; the mailbox is closed, whatever waited is not started.                                                                                              |
| `FailedRetryable`              | Retries **this message** with nothing closed or started. A handler that will answer the same every time holds the exchange to its deadline — conclude with `FailedPermanent` instead. |
| `Defer`                        | Parks the receiver against this same message.                                                                                                                                         |

Whether the app expects one answer or several is its expectation of the counterparty, not something the
runtime records: a one-answer protocol concludes on its first message, and a stray `AwaitNextReply` on one
self-reports at the deadline through the handler's own `onClosed`.

### Several exchanges in one task

A task may open several mailboxes, each answered by exactly one handler. Exchanges run strictly
sequentially, **in the order their handlers are composed — not the order their sends are**:
`Stage(A) → Stage(B) → HandleReplies(A) → ConcludeOnReplies(B)` sends both messages up front and still
reads A's exchange to the end before B's begins.

- Messages for a later exchange wait in its mailbox until the pipeline reaches its handler — never lost,
  and never handled early.
- Each deadline runs from its own send: a send composed _before_ an earlier exchange's handler spends its
  budget while that exchange runs; a send composed _after_ it starts its clock only when the earlier
  exchange concludes. Up-front sends buy overlapping clocks, later sends buy undiminished budgets — stage
  placement is the whole lever.
- A failure in a `HandleReplies` handler fails the task like a stage failure and closes only that
  exchange's mailbox: later mailboxes already open wait out their own deadlines, so an operational resume
  can replay the failed handler and carry the chain on.
- Not on offer: concurrent exchanges with a join, and one handle answered by two handlers. Two exchanges
  that must genuinely overlap are two BPMN tasks.

## Forwarding a received message

`IServiceTaskReplyForwarder` is how the answer reaches the mailbox: the channel that receives it (a queue
subscriber, a webhook endpoint) reads the echoed mailbox id and calls `ForwardReply(mailboxId, owner,
payload, idempotencyKey)`, doing no work of its own beyond decoding enough to forward.

- **Name the owner directly** — `MailboxOwner.ServiceTask(type)` or `MailboxOwner.SideEffect(name)`. It is
  bound into the integrity envelope, which is what stops another pipeline's handler from reading the
  message. Deriving it can be wrong at signing time and sign its own mistake. A forwarder that serves more
  than one pipeline can have the opening stage publish `mailbox.Owner.ToString()` with the reply address and
  read it back with `MailboxOwner.Parse`.
- Pass the **source's own message id** as `idempotencyKey` (at most 200 characters): channels and retries
  both deliver at least once, and the handler reads the same value back as `ServiceTaskReply.IdempotencyKey`
  — the natural key for side effects it must not repeat.
- An **early message is not an error**: it is accepted and waits at its position. `Late` always means the
  mailbox closed, never "too early".
- Keep the payload small: the engine accepts 256 KB, and the integrity envelope's JSON escaping can eat
  most of it (up to ×6) — roughly half is a safe budget for a JSON body. Anything large belongs in
  Storage, forwarded as a reference.
- Resolve the forwarder **per message from a scope** — injecting this transient into a singleton
  subscriber pins its HttpClient.
- On failure, branch on `ServiceTaskReplyForwardException.Outcome` per case rather than on `IsTransient`
  alone, so every verdict is stated: only `EngineUnavailable` and `SigningUnavailable` can succeed on a
  re-forward; `Unroutable`, `Late`, `PayloadTooLarge`, `MailboxFull` and `Rejected` never will.
- The payload the handler receives round-trips byte-for-byte, but remains **untrusted** content chosen
  outside the platform: validate defensively, and conclude an ununderstandable message with
  `FailedPermanent`.

The worked example in-tree is Fiks Arkiv (`Altinn.App.Clients.Fiks`): `FiksArkivServiceTask` publishes the
mailbox id as the outbound message's `klientKorrelasjonsId`, and `FiksArkivSubscriber.IncomingMessageListener`
reads the echo, decrypts, and forwards.

## Side effects: work that should not hold up the process

A service task holds the process up until its pipeline concludes. When the process should move on while the
work waits for an outcome — a notification whose delivery should be confirmed, a copy sent to an archive that
answers later — make it a **side effect** instead:

```csharp
public sealed class SendToArchive(IArchiveClient archive) : ISideEffect
{
    public string Name => "send-to-archive";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(Send)
            .Finally(AwaitReceipt, new ProcessStepOptions { WaitBudget = TimeSpan.FromDays(2) });

    private async Task<ServiceTaskStageResult> Send(ServiceTaskContext context)
    {
        ArchiveRequest request = context.GetInput<ArchiveRequest>()!;
        string receiptId = await archive.Send(request, idempotencyKey: context.StepId);
        context.Values.Set("receiptId", receiptId);
        return ServiceTaskStageResult.Completed();
    }

    private async Task<ServiceTaskResult> AwaitReceipt(ServiceTaskContext context) => ...;
}

services.AddTransient<ISideEffect, SendToArchive>();
```

A side effect composes the same pipeline as a service task — stages, `Defer` with a wait budget, mailboxes
and reply handlers, values, step options — and runs in workflows of its own. Two rules differ:

- **It cannot change instance data.** It runs on the state the transition saved while the process moves on,
  so a save would race the process. Hand values to later stages with `context.Values`; a step that changes
  data fails permanently.
- **Its conclusion ends the side effect, nothing else.** `ServiceTaskResult.Success()` cannot name a process
  action.

A failed side effect fails its own workflow and nothing else: operators see it in the workflow engine and
the admin panel, and can resume it.

### Starting a side effect

Start a side effect from the code a step runs — a hook (`IOnTaskStartingHandler`, `IOnTaskEndingHandler`,
`IOnTaskAbandonHandler`, `IOnProcessEndedHandler`), a process task (`IProcessTask.Start`, `End`, `Abandon`), a
service task stage or another side effect — through the context's `SideEffects`:

```csharp
public Task<HookResult> Execute(OnTaskEndingContext context)
{
    context.SideEffects.Start<SendToArchive>(new ArchiveRequest(caseId));
    return Task.FromResult<HookResult>(HookResult.Success());
}
```

- A started side effect runs **only if the step's work is saved**: code that runs before the transition is
  saved starts its side effects right after the transition is saved, and code that runs after it starts them
  right after its own save. A step that fails, or a transition that never saves, starts nothing.
- Starting is idempotent per step. A step that runs again must start the same side effects with the same
  input; a step that **defers** must not start anything, and fails permanently if it does.
- The input travels as JSON (`System.Text.Json` web defaults). Read it with `context.GetInput<T>()`, and keep
  it small: it rides every step of the side effect.
- Hooks and process tasks run before the transition is saved and cannot wait. If the process must wait for
  the outcome, use a service task; if it must not, start a side effect.

## Redeploys and in-flight workflows

The expansion fixes a pipeline's shape when a workflow is enqueued, and an item is identified by its
**position**. Reshaping the composition while workflows are in flight — inserting, reordering or removing
stages or reply handlers — shifts every index behind the change and strands those workflows with permanent
failures (`PipelineItemNotFound`, `MailboxDeclarationNotFound`, and, for a mailbox pipeline,
`MailboxReceiptMissing` or `MailboxIdMissingFromState`). This is the same versioning problem as editing a
BPMN file mid-flight, and it is the app developer's to manage: drain or resume in-flight workflows on the
code that enqueued them, or abandon them deliberately.

Nothing detects a reshape as such: every step reads the composition it finds, so a reshape can also change
what an in-flight step goes on to do without failing at all. **One case of that loses work silently.** A
step that was its workflow's last because a reply handler was composed after it stops being its workflow's
last if the redeploy removes that exchange — so it completes, starts nothing, and its workflow settles
with the items composed after it never run. The task neither concludes nor fails: the transition is simply
over, with part of the pipeline dropped. Only a plain stage can end this way. A mailbox-opening stage
always starts what follows it, so it either continues the pipeline or fails saying why, never silently
drops the rest.
