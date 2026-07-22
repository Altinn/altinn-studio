#nullable enable
using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Logic;

/// <summary>
/// No-op test double for the platform Events API: every registration succeeds instantly with a
/// dummy event id, and the real Events API is never called.
///
/// This app enables <c>RegisterEventsWithEventsComponent</c> so the event commands exist in the
/// workflow landscape, but the events themselves are irrelevant to the scenarios. The post-commit
/// lever used to live here (delaying/failing <c>MovedToAltinnEvent</c>); with the side-effects
/// split those commands run in fire-and-forget side-effects workflows that are invisible to the
/// frontend by design, so the lever moved to <see cref="ScenarioServiceTask"/> — a critical
/// post-commit step whose delays and failures ARE frontend-observable.
/// </summary>
public sealed class EventsClient : IEventsClient
{
    public Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null
    ) => Task.FromResult(Guid.NewGuid().ToString());
}
