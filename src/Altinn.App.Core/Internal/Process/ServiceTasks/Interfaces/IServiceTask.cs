using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ServiceTasks;

/// <summary>
/// Interface for service tasks that can be executed during a process.
/// </summary>
public interface IServiceTask
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    public Task Execute(string taskId, Instance instance);
}