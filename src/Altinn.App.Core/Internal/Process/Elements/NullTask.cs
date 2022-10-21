using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Null implementation. Used when no other <see cref="ITask"/> can be found
/// </summary>
public class NullTask: ITask
{
    /// <inheritdoc/>
    public async Task HandleTaskStart(ProcessChangeContext processChangeContext)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task HandleTaskComplete(ProcessChangeContext processChangeContext)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task HandleTaskAbandon(ProcessChangeContext processChangeContext)
    {
        await Task.CompletedTask;
    }
}
