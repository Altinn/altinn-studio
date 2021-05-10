using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Events.Functions.Configuration;
using Altinn.Platform.Events.Functions.Models;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Altinn.Platform.Events.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Functions
{
    /// <summary>
    /// Function to validate the webhook endpoint for an subscription
    /// </summary>
    public class SubscriptionValidation
    {
        private readonly IWebhookService _webhookService;
        private readonly PlatformSettings _platformSettings;
        private readonly IValidateSubscriptionService _validateSubscriptionService;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionValidation"/> class.
        /// </summary>
        public SubscriptionValidation(
            IWebhookService webhookService,
            IOptions<PlatformSettings> eventsConfig,
            IValidateSubscriptionService validateSubscriptionService)
        {
            _platformSettings = eventsConfig.Value;
            _webhookService = webhookService;
            _validateSubscriptionService = validateSubscriptionService;
        }

        /// <summary>
        /// Retrieves messages from subscription-validation queue and verify endpoint. If valid
        /// it will call subscription service
        /// </summary>
        [FunctionName("SubscriptionValidation")]
        public async Task Run([QueueTrigger("subscription-validation", Connection = "QueueStorage")] string item, ILogger log)
        {
            Subscription subscription = JsonSerializer.Deserialize<Subscription>(item);
            CloudEventEnvelope cloudEventEnvelope = CreateValidateEvent(subscription);
            await _webhookService.Send(cloudEventEnvelope);
            await _validateSubscriptionService.ValidateSubscription(cloudEventEnvelope.SubscriptionId);
        }

        private CloudEventEnvelope CreateValidateEvent(Subscription subscription)
        {
            CloudEventEnvelope cloudEventEnvelope = new CloudEventEnvelope();
            cloudEventEnvelope.Consumer = subscription.Consumer;
            cloudEventEnvelope.Endpoint = subscription.EndPoint;
            cloudEventEnvelope.SubscriptionId = subscription.Id;
            cloudEventEnvelope.CloudEvent = new CloudEvent();
            cloudEventEnvelope.CloudEvent.Source = new Uri(_platformSettings.ApiEventsEndpoint + "subscriptions/" + subscription.Id);
            cloudEventEnvelope.CloudEvent.Type = "platform.events.validatesubscription";
            return cloudEventEnvelope;
        }
    }
}
