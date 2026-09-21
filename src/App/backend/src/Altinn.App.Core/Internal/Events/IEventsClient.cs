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
    /// Optional key identifying this registration across every attempt at it. Altinn Events stores one
    /// event per key, so a caller that may repeat the same registration — anything the workflow engine can
    /// retry — passes the key that is stable across those attempts, typically the engine's step id.
    /// Deduplication applies to storage only: a duplicate registration is still pushed to subscribers, so
    /// this makes delivery no better than at-least-once. One key stores one event, and the two events are
    /// never compared — so a caller raising two events must give each its own key, or the second is
    /// silently dropped as a duplicate of the first while this call still reports success. Omit the key to
    /// register unconditionally.
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
