using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A process task's composed stages for one lifecycle phase. Built via <see cref="ProcessTaskPipelineBuilder"/>;
/// the runtime reads it to plan and dispatch the phase's steps — apps only compose and return it.
/// </summary>
public sealed class ProcessTaskPipeline
{
    internal ProcessTaskPipeline(IReadOnlyList<ProcessTaskStage> stages)
    {
        Stages = [.. stages];
    }

    /// <summary>
    /// The stages in composition order. A stage's position is the identity its step is dispatched by, so the
    /// definition must not change while a workflow that planned it is in flight — the same rule as for
    /// <see cref="ServiceTaskPipeline"/>.
    /// </summary>
    internal IReadOnlyList<ProcessTaskStage> Stages { get; }
}

/// <summary>
/// One stage of a <see cref="ProcessTaskPipeline"/>. Not a record — it holds a delegate, so synthesized value
/// equality would compare references while claiming to compare values.
/// </summary>
internal sealed class ProcessTaskStage(Func<ProcessTaskContext, Task> work, ProcessStepOptions? stepOptions)
{
    public Func<ProcessTaskContext, Task> Work { get; } = work;

    /// <summary>
    /// Options for the engine step this stage becomes, winning field-wise over the command's defaults.
    /// </summary>
    public ProcessStepOptions? StepOptions { get; } = stepOptions;
}
