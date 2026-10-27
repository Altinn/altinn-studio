namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A process task's lifecycle pipeline, as composed with a <see cref="PipelineBuilder"/>. Its stages run as
/// steps of the transition, in order, each dispatched by its position in the pipeline.
/// </summary>
public sealed class Pipeline
{
    internal Pipeline(IReadOnlyList<PipelineStage.Plain> stages)
    {
        Stages = [.. stages];
    }

    internal IReadOnlyList<PipelineStage.Plain> Stages { get; }
}
