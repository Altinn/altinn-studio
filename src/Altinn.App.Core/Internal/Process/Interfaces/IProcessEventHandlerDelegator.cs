using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// This interface is responsible for delegating process events to the correct event handler.
/// </summary>
public interface IProcessEventHandlerDelegator
{
    /// <summary>
    /// Handle process events.
    /// </summary>
    /// <param name="instance"></param>
    /// <param name="prefill"></param>
    /// <param name="events"></param>
    /// <returns></returns>
    Task HandleEvents(Instance instance, Dictionary<string, string>? prefill, List<InstanceEvent>? events);
}
