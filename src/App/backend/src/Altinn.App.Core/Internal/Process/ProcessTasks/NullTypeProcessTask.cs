namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Null implementation. Used when no other <see cref="IProcessTask"/> can be found
/// </summary>
public class NullTypeProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "NullType";

    /// <inheritdoc/>
    public Task Start(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(ProcessTaskContext context) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Abandon(ProcessTaskContext context) => Task.CompletedTask;
}
