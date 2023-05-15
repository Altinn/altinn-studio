using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Null implementation. Used when no other <see cref="ITask"/> can be found
/// </summary>
public class NullTask: ITask
{
    /// <inheritdoc/>
    public async Task HandleTaskStart(string elementId, Instance instance, Dictionary<string, string> prefill)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task HandleTaskComplete(string elementId, Instance instance)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task HandleTaskAbandon(string elementId, Instance instance)
    {
        await Task.CompletedTask;
    }
}
