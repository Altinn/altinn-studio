using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Events.Functions.Models;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Functions
{
    /// <summary>
    /// Azure Function class.
    /// </summary>
    public class EventsOutbound
    {
        private readonly IWebhookService _webhookService;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsOutbound"/> class.
        /// </summary>
        public EventsOutbound(IWebhookService webhookService)
        {
            _webhookService = webhookService;
        }

        /// <summary>
        /// Retrieves messages from events-outbound queue and send to webhook
        /// </summary>
        [FunctionName("EventsOutbound")]
        public async Task Run([QueueTrigger("events-outbound", Connection = "QueueStorage")]string item, ILogger log)
        {
            CloudEventEnvelope cloudEventEnvelope = JsonSerializer.Deserialize<CloudEventEnvelope>(item);
            await _webhookService.Send(cloudEventEnvelope);
        }
    }
}
