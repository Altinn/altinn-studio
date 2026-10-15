# Workflow engine integration

An app runs every process transition as workflows in the
[workflow engine](../../../Runtime/workflow-engine-app/README.md). This document describes how the app libraries use
the engine and which guarantees the design depends on. The
[authoring guide for service tasks](service-task-pipelines.md) covers the app developer's side, and the engine's
[technical guide](../../../Runtime/workflow-engine/docs/technical-guide.md) covers the engine's side. The code is in
[`Internal/WorkflowEngine`](../src/Altinn.App.Core/Internal/WorkflowEngine), and its comments record why individual
types look the way they do.

## Workflows and steps

The app enqueues workflows in its own engine namespace, `{org}/{app}`. All workflows for an instance share one
collection, keyed by the instance ID. Each step is an app command. The engine runs the steps of a workflow in
order, and calls the app's callback endpoint once for each step.

A user's `process/next` runs as two workflows:

1. The request authorizes the action, runs user action handlers and validates. It then enqueues the acquire
   workflow, `Process next: Mark instance as processing`, with a single `AcquireProcessingStatus` step that
   carries the action. The request evaluates no gateways.
2. When the acquire step has saved, its callback computes the transition from the restored instance data and
   enqueues the main workflow, which depends on the acquire workflow. The main workflow exists before the
   callback returns, so the collection cannot settle between the two. An acquire conflict creates no main
   workflow.

Until the main workflow exists, status reads report that the instance is processing, with an unknown target
task. Instantiation runs as a single main workflow that starts with the acquire step.

The main workflow runs these steps:

1. The steps for leaving the current task, or for abandoning it on a reject.
2. `MutateProcessState`, when the transition leaves a task. It moves the in-memory process state to the target.
3. The steps for starting the target task. `CleanupGeneratedFromTask` runs before the task-start hooks, so they
   never see data from an earlier visit to the task.
4. `CommitProcessState`, whose save commits the new process state. This is the commit boundary.
5. For a task transition, `EnqueueSideEffectsWorkflow` followed by the critical post-commit steps: the service task
   steps if the target is a service task, and otherwise `ReleaseProcessingStatus`.
6. For a process end, `OnProcessEndedHook`, `DeleteDataOnProcessEnd` and `ReleaseProcessingStatus`, followed by
   `EnqueueSideEffectsWorkflow`.

[`WorkflowCommandSet`](../src/Altinn.App.Core/Internal/WorkflowEngine/WorkflowCommandSet.cs) decides which
commands each process event adds. When a service task concludes, its step enqueues the next transition as a
dependent workflow. A dependent workflow never acquires the instance again.

Pre-commit steps carry a `processNextElement` label that names the BPMN element they run for. The engine
dashboard groups steps by it. The transition's own steps, the post-commit steps and the side-effect steps carry no
such label.

## Callbacks

The engine calls `POST {org}/{app}/instances/{partyId}/{instanceGuid}/workflow-engine-callbacks/{commandKey}`. A
callback checks the callback token and the actor, resolves the command, restores the callback state, runs the
command, saves once, and returns the re-signed state. Any continuation is enqueued after the save.

| Response                | Meaning                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| 200                     | The step succeeded. The engine passes the returned state to the next step.         |
| 200 with a `defer` part | The step waits. The engine parks the workflow and runs the step again later.       |
| 409                     | A conflict, such as an acquire conflict or a content conflict. Not retried.        |
| 401                     | The callback token is missing, invalid or expired. Not retried.                    |
| 422                     | A permanent failure, such as invalid state, an actor mismatch or a failed command. |
| 500                     | A retryable failure. The engine retries with backoff.                              |

The engine treats every 4xx except 408, 418 and 429 as a permanent failure. Its default retry strategy backs off
exponentially for up to 24 hours.

- Every command is idempotent, because the engine retries steps.
- Commands stage their changes on the instance data unit of work, and the callback saves them. Commands and app
  hooks never write to Storage directly. Storage rejects such writes while the instance is processing.
- A deferral is stateless. It saves nothing, and the callback returns the incoming state unchanged. A deferring
  handler that changed data fails with a 422. Work that records something durable belongs in its own pipeline
  stage, before the stage that waits.

## Processing status and Storage

`AcquireProcessingStatus` moves the instance's process status from `idle` to `processing`. Every later save in the
chain expects `processing`, and `CommitProcessState` keeps it. `ReleaseProcessingStatus` moves it back to `idle` in
the last save of the transition, unless a service task follows. In that case the workflow that the service task
enqueues releases the instance. The target service task is committed before its steps run, so a failed service
task leaves the instance at that task with `processing`, and a resume runs it again without acquiring.

Each callback saves through Storage's aggregate mutation endpoint, with the engine's step ID as the
`Idempotency-Key`. The step ID stays the same across retries. Storage admits a replay when the key and the previous
instance version match and the instance has not moved on. It does not compare the request body, because a retry
can produce different bytes for the same step. On a replay the app rebuilds its state from Storage and continues,
so the first commit wins. A callback with nothing to save skips Storage.

- Storage allows standalone data value patches and read status updates while the instance is processing. A patch
  changes only the keys it sends, so writers that need more than last-writer-wins own separate keys. Values that
  the workflow owns, such as the eFormidling shipment, are saved with the workflow's own saves.
- Values that other systems set, such as `dialog.id`, are refreshed from the response of the next real save.
- At process end with `autoDeleteOnProcessEnd`, the hard delete is part of the release save. Storage accepts a
  workflow-owned hard delete only together with the ended state and the move from `processing` to `idle`.

Callbacks save as the service owner. The user's right to perform the action is checked when the request is made.
An app's policy must give the service owner the rights that the
[policy analyzer](../src/Altinn.App.Analyzers/Authorization/ServiceOwnerActions.cs) lists. Storage always lets the
app owner commit a process transition. Task-start steps save data while Storage still has the task being left as
the current task, which works because the service owner's write right does not depend on the task.

## Identity and idempotency

- The acquire workflow, and the single workflow of an instantiation, use the key
  `process-next-operation-{instanceGuid:N}-{instanceVersion}`. Two transitions submitted from the same instance
  version collide, and a repeated identical request deduplicates.
- The engine leaves the workflow context out of its hash. Requests that differ only in actor or language share
  the acquire workflow, and the first request's language applies to the whole chain.
- A dependent workflow uses `process-next-dependent-{workflowId:N}`, keyed on the workflow it depends on.
- A continuation takes its event timestamps from the callback's execution reference time, which the engine keeps
  the same across retries. A retried callback can still enqueue its continuation with different signed state, for
  example after an app code rotation. The engine then answers 409, and the app accepts the existing continuation
  when exactly one matches.
- Each step does at most one keyed enqueue, so the step ID is the whole key for the enqueues that mailbox steps
  make.

## Callback state and authentication

The engine stores the callback state and passes it to each callback, so a callback never reads process state from
Storage. The state holds the instance, its Storage versions, the form data and any mailboxes the task opened. It is
signed with an HMAC by the app. A deferred step gets its own incoming state again on the next attempt.

When the app enqueues a workflow, it mints a callback token signed with a `WorkflowEngineCallback` app code from the
[operator](../../../Runtime/operator/README.md). The token names the instance, a hash of the actor, and the
commands of the workflows it covers. The engine sends it with every callback. The app rejects a callback whose
route instance or command is not in the token, and one whose actor does not match the hash. The state has its own
signature, so a leaked token cannot be combined with forged state. Tampered state fails with a 422.

Neither the token nor the state of a waiting step is refreshed. Both expire with the app code that signed them. A
workflow still waiting when its code expires fails its next callback with a 401, which the engine treats as
permanent, and a resume fails the same way. The engine's limits on wait budgets and mailbox timeouts keep waits
well within the app code rotation policy.

## Side effects

Event registrations and notifications are side effects. They run as separate single-step workflows, one for each
side effect, so they fail and retry independently. The decision is recorded in
[the side effects ADR](../../../../docs/adr/2026-07-10-workflow-engine-noncritical-side-effects.md).

- `EnqueueSideEffectsWorkflow` enqueues them as one atomic batch, keyed `{mainWorkflowId}:side-effects`. Each
  workflow carries the state from its enqueue step and links to the main workflow. Its operation ID is
  `Process next side-effects: {from} -> {to} · {command}`.
- For a task transition they are enqueued right after the commit. For a process end they are enqueued after the
  release, so a failure in the process-end steps delays them until a resume.
- They are not heads in the collection. The `process/next` wait, the next transition and the status reads ignore
  them.
- Nothing orders them, within or across transitions. Consumers that mirror process state from Altinn events must
  handle events out of order and more than once. Side effects that need an order use an explicit dependency.
- The event side effects exist only when the app registers events with the Events component.

A side-effects workflow that fails terminally means that events or notifications were lost, so operations must
watch for it:

- Alert on the engine metric `engine.workflows.execution.failed` with `reason` `execution` or `poisoned`, for every
  `is_head` value. `is_head="false"` is a lost side effect. Any other value is a main workflow, and the instance is
  stuck until someone resumes it. Don't alert on `dependency_failed`, which follows from a main workflow failure
  that has already alerted.
- Find failed side-effects workflows in the engine's workflow list with `status=Failed` and `isHead: false`, or
  for one instance with the label `processNextInstanceGuid`.
- Resume a failed side-effects workflow through the engine's resume API. `process/resume` in the app does not
  touch side-effects workflows. A resume is always valid, because the workflow belongs to a committed transition
  and carries its own state. The engine deletes terminal workflows after its retention period.

## Waiting and failures

A request that enqueues a transition polls the collection until the current chain settles, and then reads the
instance from Storage. The chain is the workflow it enqueued and every later workflow in the collection.

- The wait times out after 100 seconds with a 504.
- When every active workflow in the chain is waiting or held, the wait returns the ordinary success response after
  a two-second grace period. The frontend then shows that the instance is waiting.
- An acquire conflict returns 409. The app abandons the acquire workflow first, so the instance does not need a
  resume.
- Any failure after the acquire step stays resumable, and is never written off.
- The detail of a failed callback is logged on the server. Clients receive a generic message.

Before it accepts a new action, the process engine checks the current task's workflows. A running transition
blocks the action, and so does a failed one until someone resumes it with `process/resume`. Process reads report
whether the transition is idle, processing or failed, the target task, the failure kind and the failed workflow's
ID. A deferred step also reports its waiting reason. A failed service task offers the user a retry, which calls
`process/resume`. Other failures show the failed workflow's ID as a support reference.

## Mailboxes

A mailbox lets a service task wait for a message instead of polling. The
[authoring guide](service-task-pipelines.md#mailboxes-work-answered-by-a-message) covers how a task declares and
answers one, and the engine's [technical guide](../../../Runtime/workflow-engine/docs/technical-guide.md#mailboxes)
covers how the engine stores and delivers messages.

- A `MintMailbox: {index}` step creates the mailbox right before the stage that declares it. The mint is keyed on
  its own step ID, with the instance ID as the collection key, so a retried mint gets the same mailbox.
- The mailbox's ID and deadline travel in the callback state, in a `mailboxes` map keyed by the opening stage's
  item index, such as `"mailboxes": { "0": { "id": "…", "deadline": "…" } }`. In-flight workflows depend on this
  shape.
- The main workflow carries the pipeline up to and including the first stage that opens a mailbox, or up to the
  first reply handler. Each reply handler runs alone in a receive workflow, because the engine hands a message only
  to a workflow's first step. Later stages run in continuation workflows.
- The step that ends a segment enqueues the next workflow as a head that depends on the current head, before its
  own workflow settles. The collection therefore always has a head, so status reads and new actions see the task
  as running. A failure condemns the rest of the chain, and one cascading resume revives it.
- A receive workflow is named `Mailbox receive: {taskId} · {openingIndex}`, or
  `Mailbox receive: {taskId} · after message {position}` for a later message in the same exchange. A continuation
  is named `Mailbox continue: {taskId} · after {itemIndex}`. Integration tests match these names.
- A conclusion closes its mailboxes before it starts anything that follows. At most one execution concludes an
  exchange. A permanent failure also closes the mailbox, and starts nothing.
- Each hop mints a new callback token and re-signs the state with the current app code. A task that waits for a
  message stays limited by the expiry of the app code that signed its waiting receive workflow.
- A held receive workflow counts as running. It blocks new actions and lets the `process/next` wait return early,
  and it reports no waiting reason.
- Exchanges run one after the other, in the order of their handlers. A later exchange's messages wait until its
  handler runs.
- [`IServiceTaskReplyForwarder`](../src/Altinn.App.Core/Features/Process/IServiceTaskReplyForwarder.cs) seals a
  received message in an envelope signed for the mailbox ID, the service task type and the message's idempotency
  key. Someone with access to the engine API can therefore not move a message to another mailbox or handler.

## Redeploys and reshaped pipelines

A step names the pipeline item it runs by its position. A deploy that inserts, removes or reorders stages or
handlers while workflows are in flight can make steps point at the wrong item. Nothing guards against this,
because any change to a running process carries the same risk, and the
[authoring guide](service-task-pipelines.md#redeploys-and-in-flight-workflows) leaves it to the app developer.

- A step whose item no longer fits fails permanently with a code that names the item index. It never moves to a
  neighboring item, which could read another exchange's message.
- To recover, resume the workflow on the code that enqueued it, or abandon it. An open mailbox stays open until its
  deadline, or until someone closes it.
- A reshape can leave a stale mailbox entry in the callback state. The next mint at that index then fails and
  retries until its retry strategy runs out.

## Known gaps

- A retried step that re-reads a binary data element that the lost attempt updated gets a 409, which the engine
  does not retry, and a resume fails the same way. No built-in command does this, but an app's service task can.
  A fix would send an empty mutation with the same idempotency key, and treat a replay as proof that the step
  already committed.
- An ended process reports `idle` without asking the engine. A failure in the post-commit steps of the final
  transition therefore never shows in a read, and only the failure alert detects it.
- The recovery from a 409 on a retried enqueue covers process continuations, but not the enqueues of receive and
  continuation workflows.
- If a service task's type is missing from dependency injection, its mint and service task steps fail as retryable
  and never converge.
- If Storage starts authorizing workflow saves against the end user, task-start saves need the new task to be
  committed first.
