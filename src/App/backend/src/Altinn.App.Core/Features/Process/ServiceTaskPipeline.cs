namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: the ordered durable stages and the concluding step. Built
/// via <see cref="ServiceTaskPipelineBuilder"/> and returned from
/// <see cref="IPipelineServiceTask.Define"/>; the runtime reads it to expand, dispatch and
/// validate the task — apps only compose and return it.
/// </summary>
public sealed class ServiceTaskPipeline
{
    internal ServiceTaskPipeline(
        IReadOnlyList<ServiceTaskStage> stages,
        Func<ServiceTaskContext, Task<ServiceTaskResult>> final
    )
    {
        Stages = stages;
        Final = final;
    }

    /// <summary>The durable stages, in execution order. Empty for a simple service task.</summary>
    internal IReadOnlyList<ServiceTaskStage> Stages { get; }

    /// <summary>The concluding step — for an <see cref="IServiceTask"/>, its <c>Execute</c>.</summary>
    internal Func<ServiceTaskContext, Task<ServiceTaskResult>> Final { get; }

    /// <summary>
    /// The stage with the given name (exact match — stage names are our own wire values), or
    /// <c>null</c>.
    /// </summary>
    internal ServiceTaskStage? FindStage(string stageName) =>
        Stages.FirstOrDefault(s => string.Equals(s.Name, stageName, StringComparison.Ordinal));
}

/// <summary>One composed stage: its wire identity, its work, and its optional per-stage options.</summary>
internal sealed record ServiceTaskStage(
    string Name,
    Func<ServiceTaskContext, Task<ServiceTaskStageResult>> Work,
    ProcessStepOptions? StepOptions
);
