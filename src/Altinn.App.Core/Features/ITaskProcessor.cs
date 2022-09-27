using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// ITaskProcessor defines the methods that must be implemented by a task processor.
/// </summary>
public interface ITaskProcessor
{
    /// <summary>
    /// Method for defining custom processing on TaskEnded event.
    /// </summary>
    /// <param name="taskId">The taskId</param>
    /// <param name="instance">The instance</param>
    public Task ProcessTaskEnd(string taskId, Instance instance);
}