using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;

/// <summary>
/// Interface for abandon task event handlers, which are executed when a process abandon task event is triggered.
/// </summary>
public interface IAbandonTaskEventHandler
{
    /// <summary>
    /// Execute the abandon task event handler
    /// </summary>
    /// <param name="processTask"></param>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    Task Execute(IProcessTask processTask, string taskId, Instance instance);
}
