using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Interface;

/// <summary>
/// Interface for implementing a receiver handling task process events.
/// </summary>
[Obsolete(message: "Use Altinn.App.Core.Internal.Process.ITaskEvents instead", error: true)]
public interface ITaskEvents
{
    /// <summary>
    /// Callback to app after task has been started.
    /// </summary>
    /// <param name="taskId">task id of task started</param>
    /// <param name="instance">Instance data</param>
    /// <param name="prefill">Prefill data</param>
    /// <returns></returns>
    public Task OnStartProcessTask(string taskId, Instance instance, Dictionary<string, string> prefill);

    /// <summary>
    /// Is called after the process task is ended. Method can update instance and data element metadata.
    /// </summary>
    /// <param name="endEvent">task id of task ended</param>
    /// <param name="instance">Instance data</param>
    /// <returns></returns>
    public Task OnEndProcessTask(string endEvent, Instance instance);

    /// <summary>
    /// Is called after the process task is abonded. Method can update instance and data element metadata.
    /// </summary>
    /// <param name="taskId">task id of task to abandon</param>
    /// <param name="instance">Instance data</param>
    public Task OnAbandonProcessTask(string taskId, Instance instance);
}
