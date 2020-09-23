using System.Threading.Tasks;

using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.PlatformWrappers
{
    /// <summary>
    /// Represents a simplified client for the events component.
    /// </summary>
    public class EventsWrapper : IEventsWrapper
    {
        private readonly IEvents _eventsClient;

        public EventsWrapper(IEvents eventsClient)
        {
            _eventsClient = eventsClient;
        }

        /// <inheritdoc />
        public async Task AddEvent(string eventType, Instance instance)
        {
            CloudEvent cloudEvent = new CloudEvent
            {
                Type = eventType
            };

            await _eventsClient.AddEvent(cloudEvent);
        }
    }
}
