using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Interface;

/// <summary>
/// Interface describing client implementations for the Events component in the Altinn 3 platform.
/// </summary>
[Obsolete(message: "Use Altinn.App.Core.Internal.Events.IEventsClient instead", error: true)]
public interface IEvents
{
    /// <summary>
    /// Adds a new event to the events published by the Events component.
    /// </summary>
    Task<string> AddEvent(string eventType, Instance instance);
}
