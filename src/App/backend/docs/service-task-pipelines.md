# Service task pipelines

Authoring guide for service tasks built on `IServiceTask`: durable multi-step tasks, waiting, and work answered
by a message from an external system. This is the app developer's companion to
[workflow engine integration](workflow-engine-integration.md). Until it lands on docs.altinn.studio, this file is
the reference the API docs point to.

## The shape of a pipeline

Every service task is a pipeline, composed in `IServiceTask.DefineExecute` on the `PipelineBuilder.ServiceTask` it
is handed. A task that does one thing is a pipeline of one stage:

```csharp
public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

private async Task<ServiceTaskResult> Execute(StageContext context) { ... }
```

A task with more than one durable step gives each its own stage, and work answered by a message from an external
system is an external stage:

```csharp
public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
    pipeline
        .Stage(PrepareDocuments)
        .ExternalStage(SendToArchive, HandleArchiveReply, timeout: TimeSpan.FromDays(7), onTimeout: HandleArchiveTimeout)
        .Stage(NotifyCaseWorker);
```

Each `Stage` or `ExternalStage` call adds an item to the pipeline, and the items run in composition order. Every call
appends to the builder and returns it, and the runtime reads what was composed when `DefineExecute` returns. Any step
can end the task with `ServiceTaskResult.EndTask(action)`, and otherwise the task ends once the last item completes.

`DefineExecute` runs when a transition is enqueued, on every callback, and at app startup. It must be cheap,
deterministic and side-effect free. The work happens inside the stages when the engine runs them.

The builder validates eagerly: a null delegate, invalid options or an external stage's timeout out of range throw
from the composing call. App startup composes every service task, so these mistakes, and a `DefineExecute` that
composes no step at all, fail **app startup** rather than a callback days later.

App startup also checks the other side of the same invariant, in `process.bpmn`. Every task there must
carry a non-blank `<altinn:taskType>`, and that type must name something the app resolves: one of the
built-in types (`data`, `confirmation`, `feedback`, `signing`, `payment`, `pdf`, `subformPdf`,
`eFormidling`), a built-in you enabled with its own call (`fiksArkiv`, from `services.AddFiksArkiv()`), or
an `IServiceTask` or `IProcessTask` your app registered. A type that resolves to
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

### Work when a task starts, ends or is abandoned

Any task type composes the work it does when it starts, ends or is abandoned in `IProcessTask.DefineStart`,
`DefineEnd` and `DefineAbandon`, on a `PipelineBuilder.Lifecycle`:

```csharp
public void DefineEnd(PipelineBuilder.Lifecycle pipeline) =>
    pipeline.Stage(RevokeSigneeRights).Stage(StoreSigningPdf);
```

A lifecycle stage returns a `StageResult`: `Completed()`, `Defer(delay, reason?)`, `FailedRetryable(msg)` or
`FailedPermanent(msg)`. These stages run inside the transition, so none of them can end a task. Each runs as its own
workflow step that saves on its own, and a failed stage is retried without the ones before it. The default
implementations compose nothing. A lifecycle stage that defers holds the transition: the instance stays
`processing` until the stage completes, the way a waiting service task holds it. Stages are dispatched by position
too, so the rules in [Redeploys and in-flight workflows](#redeploys-and-in-flight-workflows) apply to them as well.

The build reports a method named after one of these members that does not implement it, such as
`DefineStart(PipelineBuilder.ServiceTask pipeline)`, as `ALTINNAPP0704`: it would compile and never run.

## Stages: durability and idempotency

Each stage runs as its own workflow-engine step, with its own retry budget, timeout, wait budget and
idempotency key. It is also the last step of a workflow of its own, so its completion starts the workflow of
whatever the pipeline composes next. A completed stage **never runs again**: a retry or an operational resume
re-enters the pipeline at the failed stage, not at the beginning. That step ledger, not anything you track
yourself, is the durable guard for send-then-poll work: give the send its own stage.

- **Every stage may be retried on failure, so its work MUST be idempotent.** Use
  `StageContext.StepId` as the idempotency key for an outbound call the stage must not repeat — it
  is stable across retries of the same step and covers the crash window between sending and completing.
- **Never** branch on anything under `StageContext.Attempt` or `StageContext.Wait` to guard a
  side effect: an attempt that sends and then crashes re-runs with all of those unchanged.
- Stages share state through `StageContext.InstanceDataMutator` and nothing else: a completed
  stage's data changes are saved into the workflow state and visible to every stage after it.
- A failed attempt saves nothing — the retry starts from exactly the state the attempt received. A stage
  that must _record_ something records it and returns `Completed()` or `EndTask`.
- A stage also runs again when its save committed but the app's answer never reached the engine. The retry
  starts from the state the first attempt received, and Storage discards the retry's save because the step
  id is the same. The stages after it see what the first attempt saved. Work outside Storage runs a second
  time, which is why it must be idempotent.

## Results

A service task's stage, an external stage's send and its `onTimeout` return a `ServiceTaskResult`:

| Result                                          | Effect                                                                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Completed()`                                   | The step is done and its data changes are saved. The next item runs, or, after the last item, the task ends with the default flow. From a send, the stage waits for its replies first. |
| `EndTask(action?)`                              | The task ends now. Later items never run, and the action, when given, picks the next flow, such as `reject`.                                                                           |
| `Defer(delay, reason?)`                         | The step runs again after the delay. See [Waiting](#waiting-defer-and-wait-budgets).                                                                                                   |
| `FailedRetryable(msg)` / `FailedPermanent(msg)` | The step fails, retried with backoff or at once for good. Nothing is saved.                                                                                                            |

An external stage's reply handler returns a `ServiceTaskReplyResult`, which is the same vocabulary plus
`AwaitNextReply()`. `ServiceTaskResult` derives from it, so a reply handler can return either. Each factory returns
its own declaring type, so write `ServiceTaskReplyResult.Completed()` in a reply handler that returns
`Task.FromResult(...)`.

## Waiting: Defer and wait budgets

`Defer(delay, reason?)` means "ran without error, the outcome has not arrived yet": the engine parks the
process on this step — no worker held, no error recorded, retry counter reset — and runs it again after
`delay`.

- A deferral is **stateless**: nothing is saved, and instance data changes made by a deferring attempt are
  rejected as a contract violation. Work that produces something durable belongs before the wait, in its
  own stage.
- The total wait is bounded by `ProcessStepOptions.WaitBudget` (or the engine default); expiry fails the
  step. Declare a polling pipeline's wait budget on the stage that waits.
- Read `StageContext.Wait` (`DeferCount`, `StartedAt`, `Deadline`, `Remaining` and `IsFinalCheck`)
  to pace the wait, and give up on `IsFinalCheck` with a message that names what never arrived.
  `EFormidlingServiceTask` is the worked example in-tree: a send stage, a polling stage that owns the
  wait budget, a backoff ladder driven by `Wait.DeferCount`, and a `FailedPermanent` on
  `Wait.IsFinalCheck`.
- The `reason` string is persisted on the step and surfaced on status reads (ops dashboards, and the
  frontend's waiting UI via the `workflow.waitingReason` annotation) — phrase it for a reader, not a log
  parser.

### Step options

A step's options — its timeout, retry strategy and wait budget — are declared where the step is composed, on
`Stage` or `ExternalStage`. An external stage's options apply to its send and to each reply. A field left unset
falls back to the command's default and then the engine's, never to another step's. A task that wants the same
options on several steps passes the same object to each call.

### Step names

Where people follow a task's progress, such as Studio's admin panel, a step goes by the name of the method you
passed as its work, written out as words: `SendToArchive` reads "Send to archive", `GeneratePDFReceipt` reads
"Generate PDF receipt". An external stage's send goes by the send's method, and a reply step by both its handlers,
`On decision / On timeout`, since it runs one or the other. A lambda leaves the step unnamed, and so does a one-step
task's own `Execute`, which says nothing the task type does not. The name travels as the step label `stepName`, on
lifecycle stages and service task steps alike; the step that opens the reply address carries none. Names are display
only: renaming a method changes nothing about how the step runs, in-flight workflows included, because a step's
identity is its index.

## External stages: work answered by a message

An external stage sends a message to an external system and waits for the replies:

```csharp
pipeline.ExternalStage(SendToArchive, HandleArchiveReply, timeout: TimeSpan.FromDays(7), onTimeout: HandleArchiveTimeout);

private async Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress replyAddress) { ... }

private async Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply) { ... }

private Task<ServiceTaskResult> HandleArchiveTimeout(StageContext context) { ... }
```

The runtime opens a reply address right before the send, and the send is handed it as a `ReplyAddress`: `Id` is
the address, and `Deadline` is when it stops accepting replies. The send must publish `Id` in whatever field the
external system echoes back, since nothing else routes a reply. A retried or deferred send is handed the same
address. The workflow engine calls a reply address a _mailbox_, so its logs, admin views and step names, such as
`MintMailbox`, use that word.

- **The send.** `Completed()` means sent, now wait for replies. `EndTask(action)` ends the task without waiting and
  closes the address, for a send whose failure already settles the task, such as a recipient that does not exist.
  End the task only on a verdict that is final. A send whose outcome is unknown, such as a timeout, returns
  `FailedRetryable`, since the message may have left.
- **The replies.** Each reply runs `onReply` as its own durable step, one at a time in the order they were
  accepted, each starting from the state its predecessor saved. Return `AwaitNextReply()` to wait for the next
  reply, `Completed()` when done with the replies, or `EndTask(action)` to end the task. `Completed()` and
  `EndTask` close the address first, so no later reply can land after the stage is done.
- **The timeout.** `timeout` runs from when the address opens, defaults to 14 days, and may be at most 21 days, the
  workflow engine's default `MaxMailboxTimeout`. An engine configured with a lower cap refuses to open the address,
  which app startup cannot check, and the step that opens it fails before the send runs. When the address closes
  before a reply handler is done, because the timeout ran out or an operator closed it, `onTimeout` runs.
  `Completed()` from it carries on without the replies. Without `onTimeout`, the task fails, naming the stage and its
  timeout.
- **Failures.** `FailedRetryable` runs the step again with the same reply. A failure never closes the address: after
  a fix, a resume runs the failed step again with the same address, and replies that arrived meanwhile wait.
  Prefer `FailedPermanent` for app-level failures, such as refused credentials, that a fix and a resume can
  recover from.
- **Several external systems.** A task that talks to two systems composes two external stages. The second one's
  address opens only once the first is done with its replies, so its timeout is not spent while the first one waits.

Whether the app expects one reply or several is its expectation of the external system, not something the runtime
records. A protocol with one answer returns `Completed()` on it. The reply address id is unguessable but **not a
secret**: it says where a reply goes, not who sent it.

## Forwarding a received message

`IServiceTaskReplyForwarder` is how a reply reaches the reply address: the channel that receives it (a queue
subscriber, a webhook endpoint) reads the echoed address and calls `ForwardReply(replyAddressId,
serviceTaskType, payload, idempotencyKey)`, doing no work of its own beyond decoding enough to forward.

- **Name the service task type directly** — it is bound into the integrity envelope, which is what stops
  another task's handler from reading the message. Deriving it can be wrong at signing time and sign its
  own mistake.
- Pass the **source's own message id** as `idempotencyKey` (at most 200 characters): channels and retries
  both deliver at least once, and the handler reads the same value back as `ServiceTaskReply.IdempotencyKey`
  — the natural key for side effects it must not repeat.
- An **early message is not an error**: it is accepted and waits at its position. `Late` always means the
  address closed, never "too early".
- Keep the payload small: the engine accepts 256 KB, and the integrity envelope's JSON escaping can eat
  most of it (up to ×6) — roughly half is a safe budget for a JSON body. Anything large belongs in
  Storage, forwarded as a reference.
- Resolve the forwarder **per message from a scope** — injecting this transient into a singleton
  subscriber pins its HttpClient.
- On failure, branch on `ServiceTaskReplyForwardException.Outcome` per case rather than on `IsTransient`
  alone, so every verdict is stated: only `EngineUnavailable` and `SigningUnavailable` can succeed on a
  re-forward; `Unroutable`, `Late`, `PayloadTooLarge`, `TooManyReplies` and `Rejected` never will.
- The payload the handler receives round-trips byte-for-byte, but remains **untrusted** content chosen
  outside the platform: validate defensively, and fail permanently on a message the handler cannot understand.

The worked example in-tree is Fiks Arkiv (`Altinn.App.Clients.Fiks`): `FiksArkivServiceTask` publishes the
reply address as the outbound message's `klientKorrelasjonsId`, and `FiksArkivSubscriber.IncomingMessageListener`
reads the echo, decrypts, and forwards.

## Redeploys and in-flight workflows

A workflow's steps are fixed when it is enqueued, and a step names its item by **position**. Reshaping the
composition while workflows are in flight — inserting, reordering or removing stages — shifts every index behind
the change and strands those workflows with permanent failures (`PipelineItemNotFound`,
`MailboxDeclarationNotFound`, and, around an external stage, `MailboxReceiptOnStage` or
`MailboxIdMissingFromState`). This is the same versioning problem as editing a BPMN file mid-flight, and it is the
app developer's to manage: drain or resume in-flight workflows on the code that enqueued them, or abandon them
deliberately.

Nothing detects a reshape as such: every step reads the composition it finds, so a reshape can also change
what an in-flight step goes on to do without failing at all. Every item runs as its own workflow's last step,
though, so completing one always starts what the pipeline now composes after it, or ends the task when nothing
follows it.
