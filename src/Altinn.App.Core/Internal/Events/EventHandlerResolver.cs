using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Events
{
    /// <inheritDoc/>
    public class EventHandlerResolver : IEventHandlerResolver
    {
        private readonly IEnumerable<IEventHandler> _eventHandlers;

        /// <inheritDoc/>
        public EventHandlerResolver(IEnumerable<IEventHandler> eventHandlers)
        {
            _eventHandlers = eventHandlers;
        }

        /// <inheritDoc/>
        public IEventHandler ResolveEventHandler(string eventType)
        {
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
