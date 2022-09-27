using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Default Implementation of the ITaskProcessor interface.
/// This implementation does nothing.
/// </summary>
public class NullTaskProcessor: ITaskProcessor
{
    /// <inheritdoc />
    public async Task ProcessTaskEnd(string taskId, Instance instance)
    {
        await Task.CompletedTask;
    }
}