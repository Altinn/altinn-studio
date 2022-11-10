using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Events
{
    /// <inheritdoc/>
    public class EventHandlerResolver : IEventHandlerResolver
    {
        private readonly IEnumerable<IEventHandler> _eventHandlers;

        /// <inheritdoc/>
        public EventHandlerResolver(IEnumerable<IEventHandler> eventHandlers)
        {
            _eventHandlers = eventHandlers;
        }

        /// <inheritdoc/>
        public IEventHandler ResolveEventHandler(string eventType)
        {
            if (eventType == null)
            {
                return new UnhandledEventHandler();
            }

            foreach (var handler in _eventHandlers)
            {
                if (handler.EventType.ToLower() != eventType.ToLower())
                {
                    continue;
                }

                return handler;
            }

            return new UnhandledEventHandler();
        }
    }
}
