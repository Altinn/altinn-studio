# Service task pipelines and mailboxes

Authoring guide for service tasks built on `IPipelineServiceTask` — durable multi-step tasks, waiting,
and message-answered (mailbox) exchanges. This is the app-developer companion to the runtime's internal
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
- Stages share state through `ServiceTaskContext.InstanceDataMutator` and nothing else: a completed
  stage's data changes are saved into the workflow state and visible to every stage after it.
- A failed attempt saves nothing — the retry starts from exactly the state the attempt received. A handler
  that must *record* something records it and returns success.

### Stage results

`ServiceTaskStageResult` is the stage vocabulary: `Completed()`, `Defer(delay, reason?)`,
`FailedRetryable(msg)`, `FailedPermanent(msg)`. A plain stage cannot conclude the task or advance the
process — that is reserved for the pipeline's conclusion, and for a mailbox-opening stage's `Conclude`
(see below). The concluding step returns `ServiceTaskResult`, which adds `Success(action?)` /
`SuccessWithoutAutoAdvance()`.

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
- Read `ServiceTaskContext.Wait` (`DeferCount`, `StartedAt`, `Deadline`, and the derived
  `Remaining`/`IsFinalCheck`) to pace the wait or give up early with a message that names what never
  arrived. `EFormidlingServiceTask` is the worked example in-tree: a send stage, a polling `Finally` that
  owns the wait budget, a backoff ladder driven by `Wait.DeferCount`, and a `FailedPermanent` on
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
mailbox stops accepting answers. For an answer to be routable, the stage must publish `Id` in whatever
field the receiving system echoes back — the id *is* the address; nothing else routes a reply. A retried
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
  the process advances (or not) per the carried result — `Success(action?)` advances, `FailedPermanent`
  fails the task with the mailboxes closed.
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
  `Completed()` here means *this exchange is concluded, run the pipeline's next segment* — concluding the
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

| Verdict | Effect |
| --- | --- |
| `AwaitNextReply()` | This message is handled; wait for the next. |
| `Success(...)` / `Completed()` | Concludes the exchange. The mailbox is **closed first**, so no later message can land in an exchange already answered. |
| `FailedPermanent` | Concludes the exchange as failed; the mailbox is closed, whatever waited is not started. |
| `FailedRetryable` | Retries **this message** with nothing closed or started. A handler that will answer the same every time holds the exchange to its deadline — conclude with `FailedPermanent` instead. |
| `Defer` | Parks the receiver against this same message. |

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
- Each deadline runs from its own send: a send composed *before* an earlier exchange's handler spends its
  budget while that exchange runs; a send composed *after* it starts its clock only when the earlier
  exchange concludes. Up-front sends buy overlapping clocks, later sends buy undiminished budgets — stage
  placement is the whole lever.
- A failure in a `HandleReplies` handler fails the task like a stage failure and closes only that
  exchange's mailbox: later mailboxes already open wait out their own deadlines, so an operational resume
  can replay the failed handler and carry the chain on.
- Not on offer: concurrent exchanges with a join, and one handle answered by two handlers. Two exchanges
  that must genuinely overlap are two BPMN tasks.

## Forwarding a received message

`IServiceTaskReplyForwarder` is how the answer reaches the mailbox: the channel that receives it (a queue
subscriber, a webhook endpoint) reads the echoed mailbox id and calls `ForwardReply(mailboxId,
serviceTaskType, payload, idempotencyKey)`, doing no work of its own beyond decoding enough to forward.

- **Name the service task type directly** — it is bound into the integrity envelope, which is what stops
  another task's handler from reading the message. Deriving it can be wrong at signing time and sign its
  own mistake.
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

## Redeploys and in-flight workflows

The expansion fixes a pipeline's shape when a workflow is enqueued, and an item is identified by its
**position**. Reshaping the composition while workflows are in flight — inserting, reordering or removing
stages or reply handlers — shifts every index behind the change and strands those workflows with permanent
failures (`PipelineItemNotFound`, `MailboxDeclarationNotFound`). This is the same versioning problem as
editing a BPMN file mid-flight, and it is the app developer's to manage: drain or resume in-flight
workflows on the code that enqueued them, or abandon them deliberately.
