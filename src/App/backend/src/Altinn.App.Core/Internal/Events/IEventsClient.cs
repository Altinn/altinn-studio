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
    /// <param name="idempotencyKey">
    /// Optional key identifying this registration across every attempt at it. Altinn Events stores and
    /// delivers an event once per key, so a caller that may repeat the same registration — anything the
    /// workflow engine can retry — passes the key that is stable across those attempts, typically the
    /// engine's step id. One key registers one event: a caller that raises two events must give each its
    /// own key, or the second is discarded as a duplicate of the first. Omit it to register unconditionally.
    /// </param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        Guid? idempotencyKey = null,
        CancellationToken cancellationToken = default
    );
}
