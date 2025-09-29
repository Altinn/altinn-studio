using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Interface describing client implementations for the Events component in the Altinn 3 platform.
/// </summary>
public interface IEventsClient
{
    /// <summary>
    /// Adds a new event to the events published by the Events component.
    /// </summary>
    Task<string> AddEvent(string eventType, Instance instance);
}
