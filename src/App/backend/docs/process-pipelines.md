# Shared process pipeline stages

Lifecycle and service pipelines share ordinary stage definitions, step planning, execution and option
resolution. Every stage is a separate workflow-engine step with its own save boundary and retry history.
The containing pipeline owns completion semantics; an ordinary stage cannot advance the process or
release processing ownership.

## Lifecycle definitions

Implement `IPipelineProcessTask` and register the task as `IProcessTask`. A service task can additionally
implement `IPipelineProcessTask` while retaining its existing service-task registration.

```csharp
public ProcessPipeline DefineStartPipeline(string taskId, ProcessPipelineBuilder pipeline)
{
    return pipeline
        .Stage(new WorkflowCommandRef("Customer.Prepare", SerializeInput(taskId)))
        .Stage("Check preparation", CheckPreparation)
        .Build();
}

private Task<ProcessEngineCommandResult> CheckPreparation(ProcessEngineCommandContext context)
{
    // context.TaskId is the explicit BPMN task being entered, ended or abandoned.
    // Read/stage instance data through context.InstanceDataMutator.
    return Task.FromResult(ProcessEngineCommandResult.Completed());
}
```

`DefineEndPipeline` and `DefineAbandonPipeline` use the same builder. `Build()` snapshots the definition
without adding an engine step or a task conclusion. Start stages run after common initialization and
before `CommitProcessState`; end stages run before the ending hook and data lock; abandon stages run
before the abandon hook. Processing ownership remains with the enclosing transition.

Existing `IProcessTask.GetStartCommands`, `GetEndCommands` and `GetAbandonCommands` implementations remain
supported. The planner adapts their lists to the same command-stage model. The default methods on
`IPipelineProcessTask` also forward to those lists, so a task can migrate one phase at a time. Existing
implementable interfaces have not changed.

Service task types use the same case-insensitive lookup for lifecycle and service execution. Startup
rejects multiple implementations of one service task type; registering the same instance under both
service interfaces is supported.

Definitions must be deterministic, cheap and free of side effects. They depend on task configuration,
not instance data, the current time or recipients discovered during execution. Each delegate runs on a
task resolved in its callback scope; enqueue-time task instances and closures are never retained for execution.

## Two ways to implement a stage

Both builders accept registered command references:

```csharp
pipeline.Stage(
    new WorkflowCommandRef("Customer.Notify", serializedInput),
    options: new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) },
    name: "Notify signees"
);
```

The command must be registered exactly once as `IWorkflowEngineCommand`, independently of whether the
current configuration selects it. Startup validates the reference. Framework coordination commands cannot
be used as stages. Repeating a reference creates separate engine steps, even when the command key is the
same. Each occurrence can have different input and options.

Lifecycle handlers return `ProcessEngineCommandResult` and receive `ProcessEngineCommandContext`.
Service handlers retain `ServiceTaskStageResult` and `ServiceTaskContext`, including their existing
deferral vocabulary. Both are adapted to the same internal ordinary-stage execution contract.

Service pipelines support explicit names for their existing handlers:

```csharp
public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => pipeline
    .Stage("Prepare shipment", PrepareShipment)
    .Stage(new WorkflowCommandRef("Customer.Dispatch", serializedInput))
    .Finally(AwaitReceipt);
```

Service conclusions, polling and mailbox exchanges retain their existing behavior. A service command
stage runs through the service dispatcher so that, when it precedes a reply handler, successful completion
can hand over to that receiver. This is still one engine step and one save, not a nested workflow or a loop
executing several commands. The dispatcher persists the command key and input in the step payload rather
than deriving them again from a changed definition. Lifecycle command stages retain their direct command
keys and payloads on the wire.

Options are merged per field: stage options override service-task options (where applicable), which
override the command's defaults. Command-backed service stages use the business command's defaults;
delegate-backed service stages keep the existing service dispatcher defaults. Engine defaults apply when
all levels leave a field unset. Planned stage options travel with the planned step until enqueue.

Both contexts implement `IWorkflowStepContext`, exposing instance data, workflow and step IDs, the
persisted execution reference time, and cancellation. Shared helpers can accept that interface without
knowing which kind of pipeline is executing. For an external request, derive its idempotency key with:

```csharp
Guid key = WorkflowStepIdempotencyKey.Create(context, "Customer.Notify", recipientId);
```

Keep the purpose and recipient or operation discriminator stable across attempts, and send the key to a
dependency that supports deduplication. The helper preserves the existing signing notification keys.
Keys belong to one workflow step: a mailbox continuation can use a new workflow and step, so this is not
a cross-message or whole-business-operation deduplication key.

Service stage, opening-stage and conclusion results accept an optional application error code through
`FailedRetryable(errorMessage, errorCode)` and `FailedPermanent(errorMessage, errorCode)`. The code reaches
workflow diagnostics unchanged, including through mailbox handlers. It does not change retry or mailbox
closure behavior. Existing one-argument calls retain the `ServiceTaskFailedException` code.

## Persistence, retries and deployment

The existing workflow callback controller owns persistence. Completed work saves once through the
workflow aggregate; failed attempts save nothing. Service deferrals remain stateless. External effects
must be idempotent because an attempt can fail after the dependency accepted its request.

These save boundaries do not make the whole transition atomic. Initialization stages still execute
before the new process state is committed.

The workflow and step IDs remain stable across retry and resume. Display names are not idempotency keys.
Lifecycle command stages execute their persisted command input even if later configuration would omit
them. Keep those command registrations available while workflows are in flight.

Lifecycle delegates are addressed by task type, explicit BPMN task ID, lifecycle phase and handler name.
Handler names must be unique within a phase and stable across deployments. Removing a handler produces a
permanent `PipelineStageNotFound` failure rather than dispatching a different handler at the same position.
The definition must still bind an in-flight delegate when it is resolved again.

Existing service pipeline dispatch remains positional. Do not reorder or remove service pipeline items
while their workflows are in flight; adding display names does not change that compatibility rule.
Removing the registered service task type produces a permanent `ServiceTaskTypeNotFound` failure. Restore
the implementation before resuming; a diagnostic failure is not an automatic migration.

## Signing and payment

Signing declares three start stages: `ResolveSignees`, `DelegateSigneeRights`, `NotifySignees`. Their command
implementations and business services remain unchanged. PDF generation and revocation are end stages;
abort cleanup is an abandon stage. Payment uses the same lifecycle model for cleanup and completion.

The existing signing recovery behavior is preserved: the recipient list is saved before delegation;
transient failures retry the failed whole step; repeated external calls use the existing idempotency
behavior; permanent recipient failures are recorded. App-wide delegation failures block the transition.
Transient notification failures still block while retrying, and can exhaust their retry allowance.

Actual signing stays a direct user request through `SigningUserAction` and `SignClient` into Storage.
No mailbox waits for signatures. This change does not introduce dynamic stage expansion or independent
per-signee retry; the three initialization steps remain fixed.

## Dashboard and future administration

Each stage has its own engine status, timing, attempts and failure details. Command keys are the default
operation names; explicit names are supported. Lifecycle steps retain `processTask` and `processTaskPhase`
labels for dashboard grouping. Existing unnamed service stages retain their original operation names.

Execution status and recipient outcomes are separate. A delegation stage can complete while recording a
permanent refusal for one signee. The engine owns execution history; Storage owns structured delegation
and notification facts. A future admin panel should combine them, for example showing “Completed: four
delegated, one refused”, rather than interpreting a completed engine step as success for every recipient.

## Verification

`SharedProcessPipelineTests` covers shared stage planning, immutable definitions, explicit lifecycle task
identity, ownership, removed handlers, persisted command input, command-to-mailbox continuation, option
precedence, dashboard metadata, stable idempotency keys and application error codes. Registration tests
verify consistent lookup and rejection of ambiguous service task types. Existing signing, payment,
workflow and mailbox tests pin the original recovery behavior. The workflow-commands integration app exercises lifecycle delegates and command stages
inside a service pipeline from a separate app assembly, including scoped services and resume after
configuration changes.
