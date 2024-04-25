using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Null implementation. Used when no other <see cref="IProcessTask"/> can be found
/// </summary>
public class NullTypeProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "NullType";

    /// <inheritdoc/>
    public async Task Start(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task End(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task Abandon(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }
}
