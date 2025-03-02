using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Class handling a dedicated type of event from the Event system ie. an external event.
/// </summary>
[ImplementableByApps]
public interface IEventHandler
{
    /// <summary>
    /// The type of event as specified in <see cref="CloudEvent"/> ref. https://github.com/cloudevents/spec/blob/v1.0/spec.md.
    /// </summary>
    string EventType { get; }

    /// <summary>
    /// Implementation of what should happen when the event is received in the application.
    /// </summary>
    Task<bool> ProcessEvent(CloudEvent cloudEvent);
}
