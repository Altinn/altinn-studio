using System;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Profile.Models;
using Altinn.Platorm.Events.Extensions;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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

        private const string OrganisationPrefix = "/org/";
        private const string PersonPrefix = "/person/";
        private const string UserPrefix = "/user/";
        private const string OrgPrefix = "/org/";
        private const string PartyPrefix = "/party/";

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionController"/> class.
        /// </summary>
        public SubscriptionController(
            ISubscriptionService eventsSubscriptionService,
            IRegisterService registerService,
            IProfile profileService)
        {
            _registerService = registerService;
            _eventsSubscriptionService = eventsSubscriptionService;
            _profileService = profileService;
        }

        /// <summary>
        /// Register an subscription for events.
        /// </summary>
        /// <remarks>
        /// Requires information about endpoint to post events for subscribers.
        /// </remarks>
        /// <param name="eventsSubscription">The subscription details</param>
        /// <returns></returns>
        [HttpPost]
        [Authorize]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<string>> Post([FromBody] Subscription eventsSubscription)
        {
            await EnrichSubject(eventsSubscription);

            await SetCreatedBy(eventsSubscription);
            await EnrichConsumer(eventsSubscription);

            if (!ValidateSubscription(eventsSubscription, out string message))
            {
                return BadRequest(message);
            }

            if (!AuthorizeIdentityForConsumer(eventsSubscription))
            {
                return Unauthorized("Not authorized to create a subscription on behalf of " + eventsSubscription.Consumer);
            }

            if (!await AuthorizeSubjectForConsumer(eventsSubscription))
            {
                return Unauthorized("Not authorized to create a subscription with subject " + eventsSubscription.AlternativeSubjectFilter);
            }

            Subscription createdSubscription = await _eventsSubscriptionService.CreateSubscription(eventsSubscription);

            return Created("/events/api/v1/subscription/" + createdSubscription.Id, createdSubscription);
        }

        /// <summary>
        /// Get a specific subscription
        /// </summary>
        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult<string>> Get(int id)
        {
            Subscription subscription = await _eventsSubscriptionService.GetSubscription(id);

            if (subscription == null)
            {
                return NotFound();
            }

            if (!await AuthorizeAccessToSubscription(subscription))
            {
                return Unauthorized();
            }

            return Ok(subscription);
        }

        /// <summary>
        /// Method to validate an specific subscription. Only avaiable from validation function.
        /// </summary>
        [Authorize(Policy = "PlatformAccess")]
        [HttpPut("validate/{id}")]
        public async Task<ActionResult<string>> Validate(int id)
        {
            Subscription subscription = await _eventsSubscriptionService.GetSubscription(id);

            if (subscription == null)
            {
                return NotFound();
            }

            await _eventsSubscriptionService.SetValidSubscription(id);

            return Ok(subscription);
        }

        /// <summary>
        /// Delete a given subscription
        /// </summary>
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<ActionResult<string>> Delete(int id)
        {
            Subscription subscription = await _eventsSubscriptionService.GetSubscription(id);

            if (subscription == null)
            {
                return NotFound();
            }

            if (!await AuthorizeAccessToSubscription(subscription))
            {
                return Unauthorized();
            }

            await _eventsSubscriptionService.DeleteSubscription(id);
            return Ok();
        }

        /// <summary>
        /// Enriches the subject filter with party information based on alternative subject
        /// </summary>
        private async Task EnrichSubject(Subscription eventsSubscription)
        {
            try
            {
                if (string.IsNullOrEmpty(eventsSubscription.SubjectFilter)
                    && !string.IsNullOrEmpty(eventsSubscription.AlternativeSubjectFilter))
                {
                    eventsSubscription.SubjectFilter = await GetPartyFromAlternativeSubject(eventsSubscription.AlternativeSubjectFilter);
                }
            }
            catch
            {
                // The values is not valid. To protect against washing ssn we hide it and later give a warning about invalid subject
            }
        }

        private bool ValidateSubscription(Subscription eventsSubscription, out string message)
        {
            if (string.IsNullOrEmpty(eventsSubscription.SubjectFilter)
                && string.IsNullOrEmpty(HttpContext.User.GetOrg()))
            {
                message = "A valid subject to the authenticated identity is required";
                return false;
            }

            if (!string.IsNullOrEmpty(eventsSubscription.AlternativeSubjectFilter)
                && string.IsNullOrEmpty(eventsSubscription.SubjectFilter))
            {
                message = "A valid subject to the authenticated identity is required";
                return false;
            }

            if (string.IsNullOrEmpty(eventsSubscription.Consumer))
            {
                message = "Missing event consumer";
                return false;
            }

            if (eventsSubscription.SourceFilter == null)
            {
                message = "Source is required";
                return false;
            }

            string absolutePath = eventsSubscription.SourceFilter.AbsolutePath;
            if (string.IsNullOrEmpty(absolutePath) || absolutePath.Split("/").Length != 3)
            {
                message = "A valid app id is required in Source filter {environment}/{org}/{app}";
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
        private bool AuthorizeIdentityForConsumer(Subscription eventsSubscription)
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
        private async Task<bool> AuthorizeSubjectForConsumer(Subscription eventsSubscription)
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
            else if (!string.IsNullOrEmpty(eventsSubscription.SubjectFilter) && !eventsSubscription.SubjectFilter.Equals(eventsSubscription.Consumer))
            {
                return false;
            }

            return true;
        }

        private async Task<string> GetPartyFromAlternativeSubject(string alternativeSubject)
        {
            int partyId = 0;

            if (alternativeSubject.StartsWith(OrganisationPrefix))
            {
                string orgNo = alternativeSubject.Replace(OrganisationPrefix, string.Empty);
                partyId = await _registerService.PartyLookup(orgNo, null);
            }
            else if (alternativeSubject.StartsWith(PersonPrefix))
            {
                string personNo = alternativeSubject.Replace(PersonPrefix, string.Empty);
                partyId = await _registerService.PartyLookup(null, personNo);
            }

            if (partyId != 0)
            {
                return "/party/" + partyId;
            }

            return null;
        }

        private async Task EnrichConsumer(Subscription eventsSubscription)
        {
            if (string.IsNullOrEmpty(eventsSubscription.Consumer))
            {
                string org = HttpContext.User.GetOrg();
                if (!string.IsNullOrEmpty(org))
                {
                    eventsSubscription.Consumer = OrgPrefix + org;
                    return;
                }

                int? userId = HttpContext.User.GetUserIdAsInt();
                if (userId.HasValue)
                {
                    eventsSubscription.Consumer = UserPrefix + userId.Value;
                    return;
                }

                string organization = HttpContext.User.GetOrgNumber();
                if (!string.IsNullOrEmpty(organization))
                {
                    int partyId = await _registerService.PartyLookup(organization, null);
                    eventsSubscription.Consumer = PartyPrefix + partyId;
                    return;
                }
            }
        }

        private async Task SetCreatedBy(Subscription eventsSubscription)
        {
            string org = HttpContext.User.GetOrg();
            if (!string.IsNullOrEmpty(org))
            {
                eventsSubscription.CreatedBy = OrgPrefix + org;
                return;
            }

            int? userId = HttpContext.User.GetUserIdAsInt();
            if (userId.HasValue)
            {
                eventsSubscription.CreatedBy = UserPrefix + userId.Value;
                return;
            }

            string organization = HttpContext.User.GetOrgNumber();
            if (!string.IsNullOrEmpty(organization))
            {
                int partyId = await _registerService.PartyLookup(organization, null);
                eventsSubscription.CreatedBy = PartyPrefix + partyId;
                return;
            }
        }

        private async Task<bool> AuthorizeAccessToSubscription(Subscription eventsSubscription)
        {
            string currentIdenity = string.Empty;

            if (!string.IsNullOrEmpty(HttpContext.User.GetOrg()))
            {
                currentIdenity = OrgPrefix + HttpContext.User.GetOrg();
            }
            else if (!string.IsNullOrEmpty(HttpContext.User.GetOrgNumber()))
            {
                currentIdenity = PartyPrefix + await _registerService.PartyLookup(HttpContext.User.GetOrgNumber(), null);
            }
            else if (HttpContext.User.GetUserIdAsInt().HasValue)
            {
                currentIdenity = UserPrefix + HttpContext.User.GetUserIdAsInt().Value;
            }

            if (eventsSubscription.CreatedBy.Equals(currentIdenity))
            {
                return true;
            }

            return false;
        }
    }
}
