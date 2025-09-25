using Altinn.App.Core.Features;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Events;

/// <inheritdoc/>
public class EventHandlerResolver : IEventHandlerResolver
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <inheritdoc/>
    public EventHandlerResolver(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <inheritdoc/>
    public IEventHandler ResolveEventHandler(string eventType)
    {
        if (eventType == null)
        {
            return new UnhandledEventHandler();
        }

        var handlers = _appImplementationFactory.GetAll<IEventHandler>();
        foreach (var handler in handlers)
        {
            if (!handler.EventType.Equals(eventType, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return handler;
        }

        return new UnhandledEventHandler();
    }
}
