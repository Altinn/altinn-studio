namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Work that follows a committed process transition without holding it up, composed as a pipeline the way a
/// service task is: stages that send, and a conclusion that can wait for the outcome with
/// <see cref="ServiceTaskResult.Defer"/>. It runs in a side-effect workflow of its own, so the process moves on
/// while it waits, and a failure fails that workflow alone.
/// </summary>
/// <remarks>
/// <para>
/// The same builder, stage results, values and step options as a service task, with three differences:
/// </para>
/// <list type="bullet">
/// <item>
/// It cannot change instance data. It runs on the state the transition committed while the process moves on,
/// so a save would race the process. Hand values to later stages with <see cref="ServiceTaskContext.Values"/>.
/// </item>
/// <item>
/// Its conclusion ends its own workflow and nothing else, so <see cref="ServiceTaskResult.Success"/> cannot
/// name a process action.
/// </item>
/// <item>It cannot open a mailbox yet.</item>
/// </list>
/// <para>
/// Built-in side effects only, for now: the workflow command set decides which transitions run one.
/// </para>
/// </remarks>
internal interface ISideEffectPipeline
{
    /// <summary>
    /// The side effect's name: unique among registered side effects, the identity its steps are dispatched by,
    /// and the suffix of its workflow's operation id.
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Composes the pipeline. Like <see cref="IPipelineServiceTask.Define"/>, it runs when the transition is
    /// enqueued, on every callback and at startup, so it must be cheap, deterministic and free of side effects.
    /// </summary>
    ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline);
}
