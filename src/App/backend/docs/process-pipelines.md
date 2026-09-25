# Shared process pipeline stages

Lifecycle and service pipelines share command stages, option resolution and ordinary-stage execution.
Each stage is one durable workflow step with its own save and retry boundary. The containing pipeline
owns completion: an ordinary stage cannot advance the process or release processing ownership.

## Lifecycle composition

Implement `IProcessTask` and compose registered commands:

```csharp
public ProcessPipeline DefineStartPipeline(string taskId, ProcessPipelineBuilder pipeline) => pipeline
    .Stage(new WorkflowCommandRef("Customer.Prepare", SerializeInput(taskId)))
    .Stage(new WorkflowCommandRef("Customer.Notify", SerializeInput(taskId)),
        new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) })
    .Build();
```

`DefineEndPipeline` and `DefineAbandonPipeline` use the same builder. A phase defaults to an empty
pipeline. These are the only lifecycle declaration methods; there is no command-list fallback or
lifecycle delegate dispatcher. `Build()` snapshots the definition without adding a conclusion step.

Register every `IWorkflowEngineCommand` independently of whether configuration currently selects it.
Startup validates each reference and refuses framework coordination commands as stages. Commands run
in the callback's service scope, with their persisted input in `CommandPayload`; carry the lifecycle
BPMN task ID in that input. Definitions must be deterministic, cheap and free of side effects.

Start stages follow common initialization and precede `CommitProcessState`. End stages precede the
ending hook and data lock; abandon stages precede the abandon hook. The enclosing transition retains
processing ownership. Initialization effects and the later process-state commit are not atomic.

## Service composition

Service pipelines retain their existing handlers, positional dispatch, `Finally` and mailbox semantics.
They can also reuse registered commands:

```csharp
public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => pipeline
    .Stage(PrepareShipment)
    .Stage(new WorkflowCommandRef("Customer.Dispatch", serializedInput))
    .Finally(AwaitReceipt);
```

Command stages execute through the service dispatcher so completion can hand over to the next mailbox
receiver. Their key and input are persisted when planned. `ProcessEngineCommandContext.TaskId` identifies
the committed service task. Service operation names retain their existing positional format; lifecycle
commands use their registered keys. There are no custom stage names.

Options merge per field: stage, service task (where applicable), then business command defaults. A service
stage without an explicit timeout retains the ten-minute service default. Lifecycle commands use the
engine default when neither stage nor command specifies one. Task types resolve case-insensitively in
both paths; startup rejects competing registrations, allowing the same instance under both interfaces.

## Persistence and recovery

The callback owns persistence: completed work saves once, failed attempts save nothing, and service
deferrals are stateless. External calls must be idempotent. Both contexts implement `IWorkflowStepContext`;
`WorkflowStepIdempotencyKey.Create(context, purpose, discriminator)` derives a retry-stable key for a
recipient or operation within a step. Its signing keys retain their original encoding. This is a per-step
key, not a cross-message key: mailbox continuations can use new workflow and step IDs.

Service failure factories accept `FailedRetryable(errorMessage, errorCode)` and
`FailedPermanent(errorMessage, errorCode)`. Codes survive mailbox handling without changing retry or
closure behavior. One-argument calls retain `ServiceTaskFailedException`.

Lifecycle callbacks execute persisted command references without re-evaluating declarations. Keep their
registrations while workflows are in flight. Service dispatch remains positional: do not reorder or
remove items during an active workflow. A missing service command returns `PipelineCommandNotFound`; a
missing service type returns `ServiceTaskTypeNotFound`. Restore the implementation before resuming.

## Signing

Signing starts with three fixed commands: resolve signees, delegate rights, notify signees. Recipient
state is saved before delegation; retries repeat only the failed step. PDF generation and revocation are
end stages, and abort cleanup is an abandon stage. Actual signing remains a direct `SigningUserAction`
request through `SignClient` into Storage. No mailbox waits for signatures.

Unit tests cover shared planning, persisted input, options, task identity, failure propagation and
mailbox handover. The workflow-commands integration app exercises registered lifecycle and service
commands from a separate assembly, including resume after command selections change.
