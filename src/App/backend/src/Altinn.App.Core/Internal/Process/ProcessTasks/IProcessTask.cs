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
    /// Composes the work to do when the task starts as stages, each saved and retried on its own, the way a service
    /// task composes its pipeline. The stages run inside the transition into the task, before it commits. The default
    /// is one stage that calls <see cref="Start"/>; override this instead of <see cref="Start"/> when the work makes
    /// several calls that should not all be repeated when one of them fails.
    /// </summary>
    /// <remarks>
    /// Added in v9. The pipeline is composed again for every step and must not depend on the instance or on
    /// configuration that can change while a transition is in flight, since a step is dispatched by the position of
    /// its stage.
    /// </remarks>
    Pipeline DefineStart(PipelineBuilder pipeline) => pipeline.Stage(context => RunAsStage(Start, context)).Build();

    /// <summary>
    /// Composes the work to do when the task ends as stages. See <see cref="DefineStart"/>. The default is one
    /// stage that calls <see cref="End"/>.
    /// </summary>
    Pipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(context => RunAsStage(End, context)).Build();

    /// <summary>
    /// Composes the work to do when the task is abandoned as stages. See <see cref="DefineStart"/>. The default is
    /// one stage that calls <see cref="Abandon"/>.
    /// </summary>
    Pipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Stage(context => RunAsStage(Abandon, context)).Build();

    private static async Task<StageResult> RunAsStage(Func<ProcessTaskContext, Task> work, StageContext context)
    {
        await work(
            new ProcessTaskContext
            {
                InstanceDataMutator = context.InstanceDataMutator,
                CancellationToken = context.CancellationToken,
            }
        );
        return StageResult.Completed();
    }
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
}
