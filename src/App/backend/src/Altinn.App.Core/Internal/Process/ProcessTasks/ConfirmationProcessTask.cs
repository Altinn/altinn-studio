using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user confirmation.
/// </summary>
public class ConfirmationProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Confirmation;

    /// <inheritdoc/>
    public Task Abandon(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Start(ProcessTaskContext context) => Task.CompletedTask;
}
