using System;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Events.Authorization;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Profile.Models;
using Altinn.Platorm.Events.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Controller to handle administration of event subscriptions
    /// </summary>
    [Route("events/api/v1/subscriptions")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _eventsSubscriptionService;
        private readonly IRegisterService _registerService;
        private readonly IProfile _profileService;
        private readonly ILogger _logger;
        private readonly string _eventsBaseUri;
        private readonly AuthorizationHelper _authorizationHelper;
        private readonly AccessTokenSettings _accessTokenSettings;

        private const string OrganizationPrefix = "/organization/";
        private const string PersonPrefix = "/person/";
        private const string UserPrefix = "/user/";

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionController"/> class.
        /// </summary>
        public SubscriptionController(
            ISubscriptionService eventsSubscriptionService,
            IRegisterService registerService,
            IOptions<GeneralSettings> settings,
            ILogger<EventsController> logger,
            IPDP pdp,
            IOptions<AccessTokenSettings> accessTokenSettings,
            IProfile profileService)
        {
            _registerService = registerService;
            _logger = logger;
            _eventsSubscriptionService = eventsSubscriptionService;
            _eventsBaseUri = $"https://platform.{settings.Value.Hostname}";
            _authorizationHelper = new AuthorizationHelper(pdp);
            _accessTokenSettings = accessTokenSettings.Value;
            _profileService = profileService;
        }

        /// <summary>
        /// Method to register an subscription for events.
        /// Requires information about endpoint to post events for subscribers.
        /// </summary>
        /// <param name="eventsSubscription">The subscription details</param>
        /// <returns></returns>
        [HttpPost]
        [Authorize]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<string>> Post([FromBody] EventsSubscription eventsSubscription)
        {
            await EnrichSubject(eventsSubscription);

            SetCreatedBy(eventsSubscription);
            EnrichConsumer(eventsSubscription);

            string message = null;
            if (!ValidateSubscription(eventsSubscription, out message))
            {
                return BadRequest(message);
            }

            if (!await AuthorizeIdentityForConsumer(eventsSubscription))
            {
                return Unauthorized("Not authorized to create a subscription on behalf of " + eventsSubscription.Consumer);
            }

            if (!await AuthorizeSubjectForConsumer(eventsSubscription))
            {
                return Unauthorized("Not authorized to create a subscription with subject " + eventsSubscription.AlternativeSubjectFilter);
            }

            int id = await _eventsSubscriptionService.CreateSubscription(eventsSubscription);

            return Created("/events/api/v1/subscription/" + id, eventsSubscription);
        }

        /// <summary>
        /// Method to get a specific subscription
        /// </summary>
        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult<string>> Get(int id)
        {
            EventsSubscription subscription = await _eventsSubscriptionService.GetSubscription(id);

            if (!AuthorizeAccessToSubscription(subscription))
            {
                return Unauthorized();
            }

            // TODO Authorize
            return Ok(subscription);
        }

        /// <summary>
        /// API to delete a given subscription
        /// </summary>
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<ActionResult<string>> Delete(int id)
        {
            EventsSubscription subscription = await _eventsSubscriptionService.GetSubscription(id);

            if (!AuthorizeAccessToSubscription(subscription))
            {
                return Unauthorized();
            }

            await _eventsSubscriptionService.DeleteSubscription(id);
            return Ok();
        }

        /// <summary>
        /// Enriches the subject filter with party information based on alternative subject
        /// </summary>
        private async Task EnrichSubject(EventsSubscription eventsSubscription)
        {
            if (string.IsNullOrEmpty(eventsSubscription.SubjectFilter)
                && !string.IsNullOrEmpty(eventsSubscription.AlternativeSubjectFilter))
            {
                eventsSubscription.SubjectFilter = await GetPartyFromAlternativeSubject(eventsSubscription.AlternativeSubjectFilter);
            }
        }

        private bool ValidateSubscription(EventsSubscription eventsSubscription, out string message)
        {
            if (string.IsNullOrEmpty(eventsSubscription.SubjectFilter)
                && string.IsNullOrEmpty(HttpContext.User.GetOrg()))
            {
                message = "A valid subject to the authenticated is required";
                return false;
            }

            if (string.IsNullOrEmpty(eventsSubscription.Consumer))
            {
                message = "Missing event consumer";
                return false;
            }

            if (string.IsNullOrEmpty(eventsSubscription.AlternativeSubjectFilter)
                && string.IsNullOrEmpty(eventsSubscription.SourceFilter))
            {
                message = "Source is required when subject is not defined";
                return false;
            }

            if (string.IsNullOrEmpty(eventsSubscription.CreatedBy))
            {
                message = "Invalid creator";
                return false;
            }

            message = null;
            return true;
        }

        /// <summary>
        /// Validate that the identity (user, organization or org) is authorized to create subscriptions for given consumer. Currently
        /// it needs to match. In future we need to add validation of business rules. (yet to be defined)
        /// </summary>
        private async Task<bool> AuthorizeIdentityForConsumer(EventsSubscription eventsSubscription)
        {
            if (!eventsSubscription.CreatedBy.Equals(eventsSubscription.Consumer))
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Validates that the identity (user, organization or org) is authorized to create subscriptions for a given subject.
        /// Currently the subject needs to match the identity.  Org does not need subject.
        /// </summary>
        private async Task<bool> AuthorizeSubjectForConsumer(EventsSubscription eventsSubscription)
        {
            // First version require that created and consumer is the same
            if (eventsSubscription.CreatedBy.StartsWith(UserPrefix))
            {
                int userId = Convert.ToInt32(eventsSubscription.CreatedBy.Replace(UserPrefix, string.Empty));
                UserProfile profile = await _profileService.GetUserProfile(userId);
                string ssn = PersonPrefix + profile.Party.SSN;

                if (!ssn.Equals(eventsSubscription.AlternativeSubjectFilter))
                {
                    return false;
                }
            }
            else if (!string.IsNullOrEmpty(eventsSubscription.AlternativeSubjectFilter) && !eventsSubscription.AlternativeSubjectFilter.Equals(eventsSubscription.Consumer))
            {
                return false;
            }

            return true;
        }

        private async Task<string> GetPartyFromAlternativeSubject(string alternativeSubject)
        {
            int partyId = 0;

            if (alternativeSubject.StartsWith(OrganizationPrefix))
            {
                string orgNo = alternativeSubject.Replace(OrganizationPrefix, string.Empty);
                partyId = await _registerService.PartyLookup(orgNo, null);
            }
            else if (alternativeSubject.StartsWith(PersonPrefix))
            {
                string persnoNo = alternativeSubject.Replace(PersonPrefix, string.Empty);
                partyId = await _registerService.PartyLookup(null, persnoNo);
            }

            if (partyId != 0)
            {
                return "/party/" + partyId;
            }

            return null;
        }

        private void EnrichConsumer(EventsSubscription eventsSubscription)
        {
            if (string.IsNullOrEmpty(eventsSubscription.Consumer))
            {
                string org = HttpContext.User.GetOrg();
                if (!string.IsNullOrEmpty(org))
                {
                    eventsSubscription.Consumer = "/org/" + org;
                    return;
                }

                int? userId = HttpContext.User.GetUserIdAsInt();
                {
                    if (userId.HasValue)
                    {
                        eventsSubscription.Consumer = "/user/" + userId.Value;
                    }
                }

                string organization = HttpContext.User.GetOrgNumber();
                {
                    if (!string.IsNullOrEmpty(organization))
                    {
                        eventsSubscription.Consumer = "/organization/" + organization;
                    }
                }
            }
        }

        private void SetCreatedBy(EventsSubscription eventsSubscription)
        {
            string org = HttpContext.User.GetOrg();
            if (!string.IsNullOrEmpty(org))
            {
                eventsSubscription.CreatedBy = "/org/" + org;
                return;
            }

            int? userId = HttpContext.User.GetUserIdAsInt();
            {
                if (userId.HasValue)
                {
                    eventsSubscription.CreatedBy = "/user/" + userId.Value;
                }
            }

            string organization = HttpContext.User.GetOrgNumber();
            {
                if (!string.IsNullOrEmpty(organization))
                {
                    eventsSubscription.CreatedBy = "/organization/" + organization;
                }
            }
        }

        private bool AuthorizeAccessToSubscription(EventsSubscription eventsSubscription)
        {
            string currentIdenity = string.Empty;

            if (!string.IsNullOrEmpty(HttpContext.User.GetOrg()))
            {
                currentIdenity = "/org/" + HttpContext.User.GetOrg();
            }
            else if (!string.IsNullOrEmpty(HttpContext.User.GetOrgNumber()))
            {
                currentIdenity = "/organization/" + HttpContext.User.GetOrgNumber();
            }
            else if (HttpContext.User.GetUserIdAsInt().HasValue)
            {
                currentIdenity = "/user/" + HttpContext.User.GetUserIdAsInt().Value;
            }

            if (eventsSubscription.CreatedBy.Equals(currentIdenity))
            {
                return true;
            }

            return false;
        }
    }
}
