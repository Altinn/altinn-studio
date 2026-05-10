using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for waiting for feedback from application owner.
/// </summary>
public class FeedbackProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "feedback";

    /// <inheritdoc/>
    public Task Abandon(IInstanceDataMutator dataMutator) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(IInstanceDataMutator dataMutator) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Start(IInstanceDataMutator dataMutator) => Task.CompletedTask;
}
