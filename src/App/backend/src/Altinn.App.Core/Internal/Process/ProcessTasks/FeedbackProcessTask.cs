namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for waiting for feedback from application owner.
/// </summary>
public class FeedbackProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "feedback";

    /// <inheritdoc/>
    public Task Abandon(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Start(ProcessTaskContext context) => Task.CompletedTask;
}
