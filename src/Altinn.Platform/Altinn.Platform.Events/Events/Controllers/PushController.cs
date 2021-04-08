using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Events.Authorization;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Controller responsible for pushing events to subscribers
    /// </summary>
    [Route("events/api/v1/push")]
    [ApiController]
    public class PushController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly IEventsService _eventsService;

        private readonly AuthorizationHelper _authorizationHelper;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PushController"/> class.
        /// </summary>
        public PushController(
        IEventsService eventsService,
        ISubscriptionService subscriptionService,
        IPDP pdp,
        IOptions<PlatformSettings> platformSettings)
        {
            _eventsService = eventsService;
            _subscriptionService = subscriptionService;
            _authorizationHelper = new AuthorizationHelper(pdp);
            _platformSettings = platformSettings.Value;
        }

        /// <summary>
        /// Alert push controller about a new event.
        ///
        /// This method will then identify any matching subscriptions and authorize if the consumer is authorized
        /// to receive event. If autorized it will put it on a outbound queue
        /// </summary>
        /// <returns>Returns the result of the request in the form og a HTTP status code.</returns>
        [Authorize]
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult> Post([FromBody] CloudEvent cloudEvent)
        {
            string sourceFilter = GetSourceFilter(cloudEvent.Source);

            if (!string.IsNullOrEmpty(sourceFilter))
            {
                List<Subscription> orgSubscriptions = await GetOrgSubscriptions(sourceFilter, cloudEvent.Subject, cloudEvent.Type);
                await AuthorizeAndPush(cloudEvent, orgSubscriptions);

                List<Subscription> subscriptions = await GetSubscriptionExcludeOrgs(sourceFilter, cloudEvent.Subject, cloudEvent.Type);
                await AuthorizeAndPush(cloudEvent, subscriptions);
            }

            return Ok();
        }

        private async Task AuthorizeAndPush(CloudEvent cloudEvent, List<Subscription> subscriptions)
        {
            foreach (Subscription subscription in subscriptions)
            {
                await AuthorizeAndPush(cloudEvent, subscription);
            }
        }

        private async Task AuthorizeAndPush(CloudEvent cloudEvent, Subscription subscription)
        {
            if (await _authorizationHelper.AuthorizeConsumerForAltinnAppEvent(cloudEvent, subscription.Consumer))
            {
                CloudEventEnvelope cloudEventEnvelope = MapToEnvelope(cloudEvent, subscription);
                await _eventsService.PushToConsumer(cloudEventEnvelope);
            }
        }

        private async Task<List<Subscription>> GetOrgSubscriptions(string source, string subject, string type)
        {
            return await _subscriptionService.GetOrgSubscriptions(
                source,
                subject,
                type);
        }

        private async Task<List<Subscription>> GetSubscriptionExcludeOrgs(string source, string subject, string type)
        {
            return await _subscriptionService.GetSubscriptions(
                source,
                subject,
                type);
        }

        private string GetSourceFilter(Uri source)
        {
            if (source.DnsSafeHost.Contains(_platformSettings.AppsDomain))
            {
                return source.OriginalString.Substring(0, source.OriginalString.IndexOf(source.Segments[3]));
            }
            else
            {
                return string.Empty;
            }
        }

        private CloudEventEnvelope MapToEnvelope(CloudEvent cloudEvent, Subscription subscription)
        {
            CloudEventEnvelope cloudEventEnvelope = new CloudEventEnvelope()
            {
                CloudEvent = cloudEvent,
                Consumer = subscription.Consumer,
                Pushed = DateTime.Now,
                SubscriptionId = subscription.Id,
                Endpoint = subscription.EndPoint
            };

            return cloudEventEnvelope;
        }
    }
}
