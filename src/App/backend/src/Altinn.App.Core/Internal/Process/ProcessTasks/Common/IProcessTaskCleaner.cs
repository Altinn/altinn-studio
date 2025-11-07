using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Contains common logic to clean up process data
/// </summary>
public interface IProcessTaskCleaner
{
    /// <summary>
    /// Removes ALL data elements generated from a specific task
    /// </summary>
    /// <param name="instance">The instance to to act on</param>
    /// <param name="taskId">The ID of the task which generated the data elements</param>
    Task RemoveAllDataElementsGeneratedFromTask(Instance instance, string taskId);
}
