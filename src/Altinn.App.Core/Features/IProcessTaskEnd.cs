using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// IProcessTaskEnd defines a implementation for running logic when a task ends in the apps process
/// </summary>
[ImplementableByApps]
public interface IProcessTaskEnd
{
    /// <summary>
    /// Method for defining custom logic when a process task is ended
    /// </summary>
    /// <param name="taskId">The taskId</param>
    /// <param name="instance">The instance</param>
    public Task End(string taskId, Instance instance);
}
