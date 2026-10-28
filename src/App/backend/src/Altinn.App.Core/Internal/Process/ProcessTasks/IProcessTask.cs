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
    /// Deprecated, and removed before v9 ships: compose the work as stages with <see cref="DefineStart"/> instead.
    /// Until then, the default <see cref="DefineStart"/> runs this as a single stage.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    [Obsolete("Removed before v9 ships. Compose the work as stages with DefineStart instead.")]
    Task Start(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Deprecated, and removed before v9 ships: compose the work as stages with <see cref="DefineEnd"/> instead.
    /// Until then, the default <see cref="DefineEnd"/> runs this as a single stage.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    [Obsolete("Removed before v9 ships. Compose the work as stages with DefineEnd instead.")]
    Task End(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Deprecated, and removed before v9 ships: compose the work as stages with <see cref="DefineAbandon"/> instead.
    /// Until then, the default <see cref="DefineAbandon"/> runs this as a single stage.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    [Obsolete("Removed before v9 ships. Compose the work as stages with DefineAbandon instead.")]
    Task Abandon(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Composes the work to do when the task starts as stages, each saved and retried on its own, the way a service
    /// task composes its pipeline. The stages run inside the transition into the task, before it commits. The default
    /// is one stage that calls the deprecated <see cref="Start"/>; override this instead of <see cref="Start"/>, and
    /// split the work into stages when it makes several calls that should not all be repeated when one fails.
    /// </summary>
    /// <remarks>
    /// Added in v9. The pipeline is composed again for every step and must not depend on the instance or on
    /// configuration that can change while a transition is in flight, since a step is dispatched by the position of
    /// its stage. For the same reason a deploy that changes the number or order of the stages reshapes the pipeline
    /// under transitions already in flight: each of their steps runs the stage now at its index and no other, so the
    /// first override of a task that ran the one default stage leaves such a transition with the first new stage
    /// only. Deploy such a change when no transition can be in flight, as for a service task pipeline.
    /// </remarks>
#pragma warning disable CS0618 // The defaults run the deprecated members on purpose, until those are removed.
    ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
        pipeline.Stage(context => RunAsStage(Start, context)).Build();

    /// <summary>
    /// Composes the work to do when the task ends as stages. See <see cref="DefineStart"/>. The default is one
    /// stage that calls <see cref="End"/>.
    /// </summary>
    ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
        pipeline.Stage(context => RunAsStage(End, context)).Build();

    /// <summary>
    /// Composes the work to do when the task is abandoned as stages. See <see cref="DefineStart"/>. The default is
    /// one stage that calls <see cref="Abandon"/>.
    /// </summary>
    ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
        pipeline.Stage(context => RunAsStage(Abandon, context)).Build();

#pragma warning restore CS0618

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
