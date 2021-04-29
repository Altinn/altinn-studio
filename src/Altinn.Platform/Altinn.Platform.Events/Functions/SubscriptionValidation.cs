using Altinn.Platform.Events.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Altinn.Platform.Events.Functions
{
    public class SubscriptionValidation
    {

        /// <summary>
        /// Retrieves messages from events-inbound queue and push events controller
        /// </summary>
        [FunctionName("EventsInbound")]
        public async Task Run([QueueTrigger("events-inbound", Connection = "QueueStorage")] string item, ILogger log)
        {
            Subscription cloudEvent = JsonSerializer.Deserialize<Subscription>(item);
            await _pushEventsService.SendToPushController(cloudEvent);
        }
    }
}
