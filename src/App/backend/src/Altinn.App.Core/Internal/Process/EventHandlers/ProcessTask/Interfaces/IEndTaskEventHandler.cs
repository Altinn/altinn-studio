using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;

/// <summary>
/// Interface for end task event handlers, which are executed when a process end task event is triggered.
/// </summary>
public interface IEndTaskEventHandler
{
    /// <summary>
    /// Execute the end task event handler
    /// </summary>
    /// <param name="processTask"></param>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    Task Execute(IProcessTask processTask, string taskId, Instance instance);
}
