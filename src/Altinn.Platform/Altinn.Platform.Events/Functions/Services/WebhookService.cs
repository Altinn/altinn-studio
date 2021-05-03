using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Events.Functions.Models;
using Altinn.Platform.Events.Functions.Models.Payloads;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Functions.Services
{
    /// <summary>
    /// Handles Webhook service
    /// </summary>
    public class WebhookService : IWebhookService
    {
        private readonly HttpClient _client;
        private readonly ILogger<IWebhookService> _logger;
        private readonly string _slackUri = "hooks.slack.com";

        /// <summary>
        /// Initializes a new instance of the <see cref="WebhookService"/> class.
        /// </summary>
        public WebhookService(HttpClient client, ILogger<IWebhookService> logger)
        {
            _client = client;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task Send(CloudEventEnvelope envelope)
        {
            string payload = GetPayload(envelope);
            StringContent httpContent = new StringContent(payload, Encoding.UTF8, "application/json");

            try
            {
                HttpResponseMessage response = await _client.PostAsync(envelope.Endpoint, httpContent);
                if (response.StatusCode != HttpStatusCode.OK)
                {
                    string reason = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"// WebhookService // Send // Failed to send cloudevent, subscriptionId: {envelope.SubscriptionId}. Response {response}. \n Reason {reason}.");

                    throw new Exception(reason);
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, $"// Send to webhook with subscriptionId: {envelope.SubscriptionId} failed with errormessage {e.Message}");
                throw e;
            }
        }

        private string GetPayload(CloudEventEnvelope envelope)
        {
            if (envelope.Endpoint.OriginalString.Contains(_slackUri))
            {
                SlackEnvelope slackEnvelope = new SlackEnvelope
                {
                    CloudEvent = envelope.CloudEvent.Serialize()
                };
                return slackEnvelope.Serialize();
            }
            else
            {
                return envelope.CloudEvent.Serialize();
            }
        }
    }
}
