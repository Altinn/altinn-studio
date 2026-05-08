using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// IProcessTaskStart defines a implementation for running logic when a task starts in the apps process
/// </summary>
[ImplementableByApps]
[Obsolete("Use IOnTaskStartingHandler hook interface instead. This interface will be removed in a future release.")]
public interface IProcessTaskStart
{
    /// <summary>
    /// Method for defining custom logic when a process task is started
    /// </summary>
    /// <param name="taskId">The taskId</param>
    /// <param name="instance">The instance</param>
    /// <param name="prefill">Prefill data. Only specified for simple initialization. See POST {org}/{app}/instances/create endpoint</param>
    public Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill);
}
