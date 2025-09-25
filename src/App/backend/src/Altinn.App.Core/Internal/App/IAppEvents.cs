using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Interface for implementing a receiver handling instance events.
/// </summary>
public interface IAppEvents
{
    /// <summary>
    /// Callback on first start event of process.
    /// </summary>
    /// <param name="startEvent">Start event to start</param>
    /// <param name="instance">Instance data</param>
    /// <returns></returns>
    public Task OnStartAppEvent(string startEvent, Instance instance);

    /// <summary>
    /// Is called when the process for an instance is ended.
    /// </summary>
    /// <param name="endEvent">End event to end</param>
    /// <param name="instance">Instance data</param>
    /// <returns></returns>
    public Task OnEndAppEvent(string endEvent, Instance instance);
}
