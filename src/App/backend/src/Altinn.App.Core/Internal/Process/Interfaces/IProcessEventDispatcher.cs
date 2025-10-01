using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Interface for dispatching events that occur during a process
/// </summary>
public interface IProcessEventDispatcher
{
    /// <summary>
    /// Updates the instance process in storage and dispatches instance events
    /// </summary>
    /// <param name="instance">The instance with updated process</param>
    /// <param name="events">Events that should be dispatched</param>
    /// <returns>Instance from storage after update</returns>
    Task<Instance> DispatchToStorage(Instance instance, List<InstanceEvent>? events);

    /// <summary>
    /// Dispatch events for instance to the events system if AppSettings.RegisterEventsWithEventsComponent is true
    /// </summary>
    /// <param name="instance">The instance to dispatch events for</param>
    Task RegisterEventWithEventsComponent(Instance instance);
}
