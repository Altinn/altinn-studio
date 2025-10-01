using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// IProcessTaskAbandon defines a implementation for running logic when a task is abandoned in the apps process
/// </summary>
[ImplementableByApps]
public interface IProcessTaskAbandon
{
    /// <summary>
    /// Method for defining custom logic when a process task is abandoned
    /// </summary>
    /// <param name="taskId"></param>
    /// <param name="instance"></param>
    /// <returns></returns>
    public Task Abandon(string taskId, Instance instance);
}
