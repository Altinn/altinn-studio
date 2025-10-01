using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Implementation used to handled events that could not bee resolved and matched on type.
/// </summary>
public class UnhandledEventHandler : IEventHandler
{
    /// <inheritdoc/>
    public string EventType => "app.events.unhandled";

    /// <inheritdoc/>
    public Task<bool> ProcessEvent(CloudEvent cloudEvent)
    {
        throw new NotImplementedException(
            $"Received unhandled event {cloudEvent?.Type} with the following data: {JsonSerializer.Serialize(cloudEvent)}"
        );
    }
}
