using Altinn.App.Core.Infrastructure.Clients.Events;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Interface describing client implementations for the Events component in the Altinn 3 platform.
/// </summary>
public interface IEventsSubscription
{
    /// <summary>
    /// Adds a new event subscription in the Events component.
    /// </summary>
    Task<Subscription> AddSubscription(string org, string app, string eventType);
}
