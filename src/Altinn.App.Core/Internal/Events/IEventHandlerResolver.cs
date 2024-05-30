using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Interface used to resolve the <see cref="IEventHandler"/> implementation that should be used for a given event.
/// </summary>
public interface IEventHandlerResolver
{
    /// <summary>
    /// Resolves the correct implementation based on the event type.
    /// </summary>
    /// <param name="eventType">The type of event that has occured</param>
    /// <returns>A implementation of <see cref="IEventHandler"/> that is dedicated to handle events of the given type.</returns>
    public IEventHandler ResolveEventHandler(string eventType);
}
