using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for waiting for feedback from application owner.
/// </summary>
public class FeedbackProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "feedback";

    /// <inheritdoc/>
    public async Task Abandon(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task End(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task Start(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }
}
