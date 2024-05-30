using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Contains common logic for ending a process task.
/// </summary>
public interface IProcessTaskFinalizer
{
    /// <summary>
    /// Runs common finalization logic for process tasks for a given task ID and instance. This method removes data elements generated from the task, removes hidden data and shadow fields.
    /// </summary>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    Task Finalize(string taskId, Instance instance);
}
