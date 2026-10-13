using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Implement this interface to create a new type of task for the process engine.
/// </summary>
/// <remarks>
/// When migrating from the legacy task lifecycle interfaces, move start/end/abandon logic into this interface and
/// use <see cref="IInstanceDataAccessor.Instance" /> on <see cref="ProcessTaskContext.InstanceDataMutator" /> to access
/// the instance. Use the data mutator for any data changes that should be persisted by the process engine.
/// </remarks>
[ImplementableByApps]
public interface IProcessTask
{
    /// <summary>
    /// The type is used to identify the correct task implementation for a given task type in the process config file.
    /// </summary>
    string Type { get; }

    /// <summary>
    /// Validates a BPMN task at app startup. Returns each configuration error, or an empty sequence if valid.
    /// Must not read or change instance data.
    /// </summary>
    /// <remarks>
    /// Added in v9. The default implementation accepts all configuration, so existing tasks need no override.
    /// Runs synchronously in a dependency injection scope. Must not cause side effects.
    /// </remarks>
    IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) => [];

    /// <summary>
    /// Any logic to be executed when a task is started should be put in this method.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    Task Start(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Any logic to be executed when a task is ended should be put in this method.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    Task End(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Any logic to be executed when a task is abandoned should be put in this method.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    Task Abandon(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Composes what runs when a task of this type is entered. The default runs <see cref="Start"/> as one stage.
    /// </summary>
    /// <remarks>
    /// Override to split the work into stages that are saved and retried one at a time, the way
    /// <see cref="IPipelineServiceTask.Define"/> does for service tasks. An override replaces <see cref="Start"/>
    /// unless it stages it. Called when a transition is enqueued and again when each stage runs, so the
    /// definition must be cheap, free of side effects, and the same for every task of this type.
    /// </remarks>
    /// <param name="pipeline">The builder to compose the stages with.</param>
    ProcessTaskPipeline DefineStart(ProcessTaskPipelineBuilder pipeline) => pipeline.Stage(Start).Build();

    /// <summary>
    /// Composes what runs when a task of this type is ended. The default runs <see cref="End"/> as one stage.
    /// </summary>
    /// <remarks>The same rules apply as for <see cref="DefineStart"/>.</remarks>
    /// <param name="pipeline">The builder to compose the stages with.</param>
    ProcessTaskPipeline DefineEnd(ProcessTaskPipelineBuilder pipeline) => pipeline.Stage(End).Build();

    /// <summary>
    /// Composes what runs when a task of this type is abandoned. The default runs <see cref="Abandon"/> as one
    /// stage.
    /// </summary>
    /// <remarks>The same rules apply as for <see cref="DefineStart"/>.</remarks>
    /// <param name="pipeline">The builder to compose the stages with.</param>
    ProcessTaskPipeline DefineAbandon(ProcessTaskPipelineBuilder pipeline) => pipeline.Stage(Abandon).Build();
}

/// <summary>
/// Parameters for process task lifecycle execution.
/// </summary>
public sealed class ProcessTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if task execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the task lifecycle operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;

    /// <summary>
    /// The workflow engine workflow running this lifecycle operation. Stable across retries of the workflow.
    /// </summary>
    public Guid WorkflowId { get; init; }

    /// <summary>
    /// The workflow engine step running this lifecycle operation. Stable across retries of the step, and unique
    /// per stage, so it can seed idempotency keys for calls a stage makes to other services.
    /// </summary>
    public Guid StepId { get; init; }
}
