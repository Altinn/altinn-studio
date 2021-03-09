using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
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
    /// Controller responsible for pushing eventsto subscribers
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class PushController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly IRegisterService _registerService;

        private readonly ILogger _logger;
        private readonly string _eventsBaseUri;
        private readonly AuthorizationHelper _authorizationHelper;
        private readonly AccessTokenSettings _accessTokenSettings;

        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";

        /// <summary>
        /// Initializes a new instance of the <see cref="PushController"/> class.
        /// </summary>
        public PushController(
        ISubscriptionService subscriptionService,
        IRegisterService registerService,
        IOptions<GeneralSettings> settings,
        ILogger<EventsController> logger,
        IPDP pdp,
        IOptions<AccessTokenSettings> accessTokenSettings)
        {
            _registerService = registerService;
            _logger = logger;
            _subscriptionService = subscriptionService;
            _eventsBaseUri = $"https://platform.{settings.Value.Hostname}";
            _authorizationHelper = new AuthorizationHelper(pdp);
            _accessTokenSettings = accessTokenSettings.Value;
        }

        /// <summary>
        /// Inserts a new event.
        /// </summary>
        /// <returns>The application metadata object.</returns>
        [Authorize(Policy = "PlatformAccess")]
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<string>> Post([FromBody] CloudEvent cloudEvent)
        {
            List<Subscription> subscriptions = new List<Subscription>();

            // TODO Needs to validate event. (does it contain enough to push). Is it relevant? What to do if not? No point adding it to queue
            string sourceFilter = GetSourceFilter(cloudEvent.Source);

            if (!string.IsNullOrEmpty(sourceFilter))
            {
                List<Subscription> orgSubscriptions = await MatchOrgSubscriptions(sourceFilter, cloudEvent.Subject, cloudEvent.Type);
                foreach (Subscription subscription in orgSubscriptions)
                {
                    // Authorize, push
                }

                List<Subscription> subscriptions = await MatchSubscriptionExcludeOrgs(sourceFilter, cloudEvent.Subject, cloudEvent.Type);
                foreach (Subscription subscription in subscriptions)
                {
                    // Authorize, push
                }
            }

            // Idenitfy any matching org subscriptions

            // Identity any matching other subscriptions based on subject

            // Foreach org subscription matching authorize access and if authorized push to outgoing queue. Important to cache authorization decision.

            // Foreach other subscriptions matchine authorize access and if authorized push to outgoing queue. Unsure if caching has any effect

            foreach (Subscription subscription in subscriptions)
            {
                await AuthorizeAndPush(cloudEvent, subscription);
            }

            return Ok();
        }

        private async Task<bool> AuthorizePushOfEvents(CloudEvent cloudEvent)
        {
            return true;
        }

        private async Task<List<Subscription>> MatchOrgSubscriptions(string source, string subject, string type)
        {
            return await _subscriptionService.GetOrgSubscriptions(
                source,
                subject,
                type);

        }

        private async Task<List<Subscription>> MatchSubscriptionExcludeOrgs(string source, string subject, string type)
        {
            return await _subscriptionService.GetSubscriptions(
                source,
                subject,
                type);
        }

        private string GetSourceFilter(Uri source)
        {
            if (source.DnsSafeHost.Contains("apps.altinn.no"))
            {
                return source.OriginalString.Substring(0, source.OriginalString.IndexOf(source.Segments[3]));
            }
            else
            {
                return string.Empty;
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

        private CloudEventEnvelope MapToEnvelope(CloudEvent cloudEvent, Subscription subscription)
        {
            CloudEventEnvelope cloudEventEnvelope = new CloudEventEnvelope() { CloudEvent = cloudEvent };
            cloudEventEnvelope.Consumer = subscription.Consumer;
            cloudEventEnvelope.Pushed = DateTime.Now;
            cloudEventEnvelope.SubscriptionId = subscription.Id;
            cloudEventEnvelope.Endpoint = subscription.EndPoint;
            return cloudEventEnvelope;
        }
    }
}
