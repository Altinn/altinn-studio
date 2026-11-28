namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A process task's lifecycle pipeline, as composed with a <see cref="PipelineBuilder.Lifecycle"/>. Its stages run
/// as steps of the transition, in order, each dispatched by its position in the pipeline.
/// </summary>
internal sealed class ProcessTaskPipeline
{
    internal ProcessTaskPipeline(IReadOnlyList<LifecycleStage> stages)
    {
        Stages = [.. stages];
    }

    internal IReadOnlyList<LifecycleStage> Stages { get; }
}
