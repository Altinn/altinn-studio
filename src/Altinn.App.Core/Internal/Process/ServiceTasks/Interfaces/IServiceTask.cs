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
    public Task Execute(string taskId, Instance instance);
}