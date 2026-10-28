# Workflow engine integration

An app runs every process transition as workflows in the [workflow engine](../../../Runtime/workflow-engine/README.md),
which the [Workflow Engine App](../../../Runtime/workflow-engine-app/README.md) hosts. This doc covers the guarantees
the [integration code](../src/Altinn.App.Core/Internal/WorkflowEngine/README.md) depends on. The
[service task authoring guide](service-task-pipelines.md) covers the app developer's side, and the engine's
[technical guide](../../../Runtime/workflow-engine/docs/technical-guide.md) the engine's side.

## Workflows and steps

The app enqueues workflows in its own engine namespace, `{org}/{app}`, with one collection per instance. The engine
calls the app's callback endpoint once for each step.

A `process/next` request authorizes the action, runs its handler, validates the task, runs the gateways and prepares
the transition. It then enqueues an acquire workflow with a single `AcquireProcessingStatus` step. That step claims the
instance, and its callback enqueues the transition's primary workflow before it returns, so the collection cannot
settle between the two. Instantiation runs as one workflow that starts with the acquire step.

[`WorkflowCommandSet`](../src/Altinn.App.Core/Internal/WorkflowEngine/WorkflowCommandSet.cs) decides the steps, on
these rules:

- `CommitProcessState` is the commit boundary. It runs after the task-end or abandon steps and before the task-start
  steps, so each group runs while Storage holds the task it belongs to. Storage checks a data type's `taskIds` against
  the stored current task, with no exception for a process transition, so a task-end step can write the leaving task's
  data and a task-start step the entering task's, and neither can write data bound to another task.
- The process-end steps run after the commit. The one write made with no current task is `DeleteDataOnProcessEnd`,
  which Storage allows because the process has ended and the data type sets `autoDeleteOnProcessEnd`.
- `CleanupGeneratedFromTask` runs before the task-start hooks, so they never see data that an earlier visit to the
  task generated.
- `StartTask`, `EndTask` and `AbandonTask` each run one stage of the task type's lifecycle pipeline
  (`IProcessTask.DefineStart`, `DefineEnd` and `DefineAbandon`), as `StartTask: 0`, `StartTask: 1`, …, so a failed
  stage retries without the ones before it. The default composes no stages, so a task type with nothing to do at a
  phase, as the built-in `data` task at every phase, gets no step. Each stage step carries its method's name as the `stepName` label, for the people following the
  task in Studio's admin panel; see [Step names](service-task-pipelines.md#step-names).
  A stage is named by position, like a service task item, so [in-flight workflows](#in-flight-workflows) applies.
- A service task runs its steps after the commit. When it concludes, its last step enqueues the next transition as a
  dependent workflow, which does not acquire the instance again.

## Callbacks

A callback checks the callback token, restores the callback state, runs the command, saves what it staged in one save,
and returns the re-signed state.

| Response                | Meaning                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| 200                     | The step succeeded. The engine passes the returned state to the next step.                    |
| 200 with a `defer` part | The step waits. The engine parks the workflow and runs the step again later.                  |
| 401                     | The callback token is missing, invalid or expired, or does not cover the instance or command. |
| 404                     | No command has the key.                                                                       |
| 409                     | A binary data element changed after the state was captured. See [known gaps](#known-gaps).    |
| 422                     | A permanent failure, such as invalid state, an actor mismatch or a stale save.                |
| 500                     | A retryable failure, including an exception that a command throws.                            |

- Every command is idempotent, because the engine retries steps.
- A command reports a failure as a result. The callback does not catch a command's exception, so the engine gets a 500
  and retries it as transient.
- Commands and app hooks stage changes on the instance data unit of work and never write to Storage. While the
  instance is processing, Storage rejects data and process writes that do not come from the workflow's own save.
- A deferral saves nothing and returns the incoming state, so the next attempt starts where this one did. A deferring
  step that changed data fails with a 422.

## Processing status

A transition holds the instance in `processing` from its first save to its last.

`AcquireProcessingStatus` moves the instance from `idle` to `processing` with a compare-and-set in Storage, against the
versions the request read. The claim therefore covers exactly the data the gateways read. It runs in its own workflow
so that a request that crashes cannot leave the instance in `processing`. It stamps the transition's event times with
the step's execution reference time, which stays the same across retries.

- Acquired: the callback enqueues the primary workflow.
- Superseded: the instance changed, or another transition holds it. The step succeeds and enqueues nothing, because a
  failed acquire workflow would condemn the workflows queued behind it.
- Rejected: an invalid payload, or a lost claim during instantiation, fails permanently.

Every later save expects `processing`. `ReleaseProcessingStatus` moves the instance back to `idle` in the last save,
unless a service task follows. Then the workflow that the service task enqueues when it concludes releases it. A
failed service task therefore leaves the instance in `processing`, and a resume runs the failed step without
acquiring.

## Saving to Storage

Each callback saves through Storage's aggregate mutation endpoint, with the engine's step ID as the `Idempotency-Key`.
Storage replays a save with the same key and previous instance version without comparing the body, since a retry can
produce different bytes. On a replay the app rebuilds its state from Storage and goes on, so the first committed
attempt wins. A callback with nothing to save skips Storage, which is safe because the same incoming state leads to
the same decision.

- Storage allows standalone data value patches and read status updates while the instance is processing, without
  changing its versions. A patch changes only the keys it sends, so writers that need more than last-writer-wins own
  separate keys. Values that other systems set, such as `dialog.id`, reach the callback state with the next save.
- With `autoDeleteOnProcessEnd`, the release save also hard-deletes the instance. Storage accepts that only together
  with the ended state and the move to `idle`.

Callbacks save as the service owner, acting on the request's check of the user's right. An app's policy must give the
service owner the rights that the [policy analyzer](../src/Altinn.App.Analyzers/Authorization/ServiceOwnerActions.cs)
lists. Storage always lets the app owner commit a process transition.

The gateways also run as the service owner, through the data accessor they are given. A gateway that calls
`IDataClient` directly acts as the caller, and the accessor does not see what it changes.

## Identity and idempotency

- The acquire workflow is keyed on the instance version alone, not the action or target. Two different transitions
  from the same version collide, and a repeated identical request joins the first.
- The engine leaves the workflow context out of its idempotency hash. Requests that differ only in actor or language
  share the acquire workflow, and the first request's language applies to the whole chain.
- A retried callback can enqueue its continuation with different signed state, such as after an app code rotation or a
  Storage replay. The engine answers 409, and the app accepts the existing continuation when exactly one matches its
  key, source task visit and parent.

## Concurrent requests

`process/next` does not check earlier workflows before it enqueues, because the instance can move between the check
and the enqueue. Its own workflow's outcome answers it. Each answer below is a 409 with that `processNextState`:

- While the instance is processing, `retrying` while the transition runs, or `resumeRequired` once it has failed.
- From the same version with the same transition, such as a double click, the request joins the first workflow. With a
  different transition it gets `concurrentTransition` at once.
- Queued behind a terminally failed workflow, the request is condemned and answers `resumeRequired`. A resume with
  cascade revives it, and its compare-and-set decides whether it moves the process.
- With a superseded acquire, the request answers `instanceChanged` when the task and its flow number are unchanged.
  The flow number rises on every task entry, so a gateway back to the same task counts as moving on. If a later request
  moved the process meanwhile, the caller sees that move as its result.

An enqueue that gets no answer from the engine fails without knowing whether the workflow exists. A retry from the
same version reuses the key and joins the workflow if it exists.

## Callback state and authentication

The engine stores the callback state and passes it to each callback, so a callback never reads the process from
Storage. The app signs the state with an HMAC.

A callback token, signed with the newest `WorkflowEngineCallback` app code from the
[operator](../../../Runtime/operator/README.md), names the instance, a hash of the actor and the commands of the
workflows in the enqueue. The state has its own signature, so a leaked token cannot be combined with forged state. The
token for auxiliary workflows lists the commands in a step payload that the engine stores unsigned, so an engine that
changed the payload could widen that list. The token stays bound to the verified actor and instance.

Neither the token nor the state of a waiting workflow is refreshed, and both expire with the app code that signed
them. A workflow still waiting then fails with a permanent 401, and so does a resume. Nothing checks this per
workflow. Instead the engine's caps on wait budgets and mailbox timeouts stay well inside how long the operator keeps
a code valid, as [`EngineSettings`](../../../Runtime/workflow-engine/src/WorkflowEngine.Models/EngineSettings.cs)
describes.

The actor carries the request's language, so hooks, service tasks and the PDFs they render follow what the user chose.

## Auxiliary workflows

Event registrations and the instantiation notification run as auxiliary workflows beside the process, one per
command. The engine's technical guide defines
[primary and auxiliary workflows](../../../Runtime/workflow-engine/docs/technical-guide.md#primary-and-auxiliary-workflows),
and the [ADR](../../../../docs/adr/2026-07-10-workflow-engine-noncritical-side-effects.md) records why.

- They are enqueued in one atomic batch: right after the task-start steps for a task transition, and after the
  release for a process end, so `completed` is announced only for a finished process.
- They exist only once the transition has committed and its task has started; a failure before that schedules nothing
  until a resume gets past it. They carry their own state, and run independently of the primary workflow. The
  `process/next` wait, the next transition and status reads ignore them.
- Nothing orders them. The Events component delivers at least once and in any order anyway, so consumers that mirror
  process state from Altinn events must handle that. An auxiliary command that must run after another needs an
  explicit dependency.

## Waiting and failures

A request that enqueues a transition polls the collection until its chain settles, and then reads the instance from
Storage. The chain is the workflow it enqueued and every later primary workflow.

- The wait answers 504 after a fixed time.
- When every active workflow in the chain is parked, on a deferring service task or as a receive workflow, the wait
  returns success after a short grace period. The transition has committed by then.
- The server logs the detail of a failure. Clients get a generic message and the kind of failure.

Reads report the current task's transition: idle, processing or failed, the target task, and for a failure its kind
and the workflow ID as a support reference. A deferred step also reports the task's reason for waiting. A read fails
with a 500 when the engine does not answer within a few seconds, since an app cannot work without it.

## Recovering from failures

Every failure after the acquire step stays resumable, and the app never abandons a workflow. If an operator abandoned
the newest one, the request reports that the action never ran. The engine deletes terminal workflows after its
retention period, which bounds how long a resume is possible.

- A failed primary workflow leaves the instance stuck until someone calls `process/resume`. It resumes the failed
  workflow with cascade, so the condemned workflows run too, and waits like `process/next`. The frontend offers the
  user a retry when a service task failed. Other failures show the support reference, and an operator resumes them.
- A failed auxiliary workflow means lost events or a lost notification. Only the engine's
  [failure alert](../../../Runtime/workflow-engine/docs/technical-guide.md#alerting-on-terminal-failures) shows it,
  with `is_head="false"`. An operator resumes it with the engine's resume API, which is always valid since it carries
  its own state. `process/resume` never targets it. A failure in the process-end steps holds back that transition's
  auxiliary workflows until a resume.

## Mailboxes

A mailbox lets a service task wait for a message instead of polling. The
[authoring guide](service-task-pipelines.md#mailboxes-work-answered-by-a-message) covers how a task uses one, and the
engine's [technical guide](../../../Runtime/workflow-engine/docs/technical-guide.md#mailboxes) how the engine stores
and delivers messages.

- A `MintMailbox` step creates the mailbox right before the stage that declares it, keyed on its own step ID, so a
  retried stage runs against the address it already published. The mailbox travels in the callback state, keyed by the
  opening stage's index, because no later step can derive the mint's key.
- The primary workflow runs the pipeline up to the first stage that opens a mailbox, or up to the first reply handler.
  A reply handler runs alone in a receive workflow, because the engine hands a message only to a workflow's first step.
  Later stages run in continuation workflows.
- The step that ends a segment enqueues the next workflow before its own settles, so the collection has an active head
  while an exchange is open, and reads and new requests see the task as running. One resume with cascade revives a
  failed chain.
- At most one execution concludes an exchange. It closes the exchange's mailboxes before it starts anything that
  follows.
- Each hop re-signs with the app code current then. A message that waits past the expiry of the code that sealed it
  fails permanently, since a retry opens the same bytes.
- `IServiceTaskReplyForwarder` seals a message in an envelope signed for the mailbox, the service task type and the
  idempotency key, so someone with access to the engine API cannot redirect or replay it. The forwarder does not check
  the mailbox's status first. The engine answers a key it already holds with 200 even after the mailbox closed, so a
  check would dead-letter a message that still waits to be read.
- Integration tests match the operation IDs of receive and continuation workflows.

## In-flight workflows

A workflow runs its later steps on whatever app version is running then, with the callback state, command keys,
payloads and step lists that the enqueueing version wrote. A change to any of them decides whether those workflows
keep working or fail with a permanent error that names the problem.

A step names its pipeline item by position, so reshaping a pipeline in flight is the same problem. The
[authoring guide](service-task-pipelines.md#redeploys-and-in-flight-workflows) leaves it to the app developer, and the
app does not guard against it. Names would not help either, since a redeploy can change what a stage does.

- A step whose item no longer fits fails permanently with a code that names the index. It never moves to a neighboring
  item, which could read another exchange's message.
- A lifecycle step enqueued by a version from before lifecycle stages carries no stage index. It runs every stage of
  the task type's pipeline in that one step, as the version that enqueued it ran the whole lifecycle. The first stage
  runs under the step's id and each later stage under an id derived from it and the stage's position, the same on
  every attempt, so calls keyed on the step id stay apart. Only the first stage can defer, since the step cannot save
  between stages; a later stage that defers fails the step permanently with `ProcessTaskStageDeferredAfterOthers`.
- To recover, resume the workflow on the code that enqueued it, or abandon it. An open mailbox stays open until its
  deadline or until someone closes it.
- A reply handler finds its opening stage from the pipeline at each hop. After a reshape, concluding the exchange can
  leave a stale mailbox entry in the callback state, and the next mint at that index retries until its retry strategy
  runs out.

## Known gaps

- A retried step that reads a binary data element again, after the lost attempt updated it, gets a 409, and so does a
  resume. Signing's delegate and notify stages do this with the signee-state element, so the callback state carries
  the bytes of signee-state elements the unit of work already holds (`WorkflowCallbackState.BinaryData`), and
  `RestoreState` preloads them while the blob version still matches; the retried stage then reads its input from the
  state and its save reaches replay. No other built-in command does this, but an app's service task can. A general
  fix would send an empty mutation with the same idempotency key, and treat a replay as proof that the step had
  committed.
- An ended process reports `idle` without asking the engine. A failure after the commit of the final transition
  therefore shows only in the failure alert.
- The recovery from a 409 on a retried enqueue does not cover the receive and continuation workflows of a mailbox
  exchange.
- If a service task's type is missing from dependency injection, its mint and service task steps fail as retryable
  and never succeed.
