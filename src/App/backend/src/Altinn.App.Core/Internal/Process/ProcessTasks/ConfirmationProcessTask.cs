using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user confirmation.
/// </summary>
/// <remarks>
/// The task does nothing when it starts, ends or is abandoned, so it composes no stages and a transition through it
/// plans no lifecycle steps.
/// </remarks>
internal sealed class ConfirmationProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Confirmation;

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Build();

    /// <inheritdoc/>
    public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();
}
