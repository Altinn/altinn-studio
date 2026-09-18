using Altinn.App.Core.Features;
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
    /// <param name="eventType">The type of the event</param>
    /// <param name="instance">The instance the event relates to</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );
}
