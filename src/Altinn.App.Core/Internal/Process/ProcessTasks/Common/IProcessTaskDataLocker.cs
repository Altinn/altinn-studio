using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Can be used to lock data elements connected to a process task
/// </summary>
public interface IProcessTaskDataLocker
{
    /// <summary>
    /// Unlock data elements connected to a specific task
    /// </summary>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    Task Unlock(string taskId, Instance instance);

    /// <summary>
    /// Lock data elements connected to a specific task
    /// </summary>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    Task Lock(string taskId, Instance instance);
}
