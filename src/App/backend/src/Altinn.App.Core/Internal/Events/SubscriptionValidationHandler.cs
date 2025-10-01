using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Implementation used to handled events that the Event system used to validate
/// the events receiver endpoint.
/// </summary>
public class SubscriptionValidationHandler : IEventHandler
{
    /// <inheritdoc/>
    public string EventType => "platform.events.validatesubscription";

    /// <inheritdoc/>
    public Task<bool> ProcessEvent(CloudEvent cloudEvent)
    {
        return Task.FromResult(true);
    }
}
