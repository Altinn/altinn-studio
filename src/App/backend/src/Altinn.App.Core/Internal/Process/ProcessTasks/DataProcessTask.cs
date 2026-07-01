using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for form filling steps.
/// </summary>
public class DataProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Data;

    /// <inheritdoc/>
    public Task Abandon(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Start(ProcessTaskContext context) => Task.CompletedTask;
}
