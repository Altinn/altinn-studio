using System.Text.Json;
using Altinn.Platform.Events.Functions.Models;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Functions
{
    /// <summary>
    /// Azure Function class.
    /// </summary>
    public class EventsInbound
    {
        private readonly IPushEventsService _pushEventsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsInbound"/> class.
        /// </summary>
        public EventsInbound(IPushEventsService pushEventsService)
        {
            _pushEventsService = pushEventsService;
        }

        /// <summary>
        /// Retrieves messages from events-inbound queue and push events controller
        /// </summary>
        [FunctionName("EventsInbound")]
        public void Run([QueueTrigger("events-inbound", Connection = "QueueStorage")] string item, ILogger log)
        {
            CloudEvent cloudEvent = JsonSerializer.Deserialize<CloudEvent>(item);
            _pushEventsService.SendToPushController(cloudEvent).GetAwaiter().GetResult();
            log.LogInformation($"C# Queue trigger function processed: {cloudEvent.Id}");
        }
    }
}
