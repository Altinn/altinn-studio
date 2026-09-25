namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Ordered durable work for one process-task lifecycle phase. Completion returns to the enclosing
/// transition; it never advances the process or releases processing ownership.
/// </summary>
public sealed class ProcessPipeline
{
    internal ProcessPipeline(IEnumerable<ProcessPipelineStage.Command> stages) => Stages = stages.ToArray();

    internal IReadOnlyList<ProcessPipelineStage.Command> Stages { get; }
}
