using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Events.Authorization;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Exceptions;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platorm.Events.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Provides operations for handling events
    /// </summary>
    [Authorize]
    [Route("events/api/v1/app")]
    public class EventsController : ControllerBase
    {
        private readonly IEventsService _eventsService;
        private readonly IRegisterService _registerService;
        private readonly ILogger _logger;
        private readonly string _eventsBaseUri;
        private readonly AuthorizationHelper _authorizationHelper;
        private readonly AccessTokenSettings _accessTokenSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsController"/> class
        /// </summary>
        public EventsController(
            IEventsService eventsService,
            IRegisterService registerService,
            IOptions<GeneralSettings> settings,
            ILogger<EventsController> logger,
            IPDP pdp,
            IOptions<AccessTokenSettings> accessTokenSettings)
        {
            _registerService = registerService;
            _logger = logger;
            _eventsService = eventsService;
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
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [Produces("application/json")]
        public async Task<ActionResult<string>> Post([FromBody] CloudEvent cloudEvent)
        {
            if (string.IsNullOrEmpty(cloudEvent.Source.OriginalString) || string.IsNullOrEmpty(cloudEvent.SpecVersion) ||
            string.IsNullOrEmpty(cloudEvent.Type) || string.IsNullOrEmpty(cloudEvent.Subject))
            {
                return BadRequest("Missing parameter values: source, subject, type, id or time cannot be null");
            }

            var item = HttpContext.Items[_accessTokenSettings.AccessTokenHttpContextId];

            if (!cloudEvent.Source.AbsolutePath.StartsWith("/" + item))
            {
                return StatusCode(401, item + " is not authorized to create events for " + cloudEvent.Source);
            }

            try
            {
                string cloudEventId = await _eventsService.StoreCloudEvent(cloudEvent);
                _logger.LogInformation("Cloud Event successfully stored with id: {0}", cloudEventId);
                return Created(cloudEvent.Subject, cloudEventId);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to store cloud event in database. {e}");
                return StatusCode(500, $"Unable to store cloud event in database. {e}");
            }
        }

        /// <summary>
        /// Retrieves a set of events based on query parameters.
        /// </summary>
        [HttpGet("{org}/{app}")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [Produces("application/json")]
        public async Task<ActionResult<List<CloudEvent>>> GetForOrg(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] string after,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int party,
            [FromQuery] string unit,
            [FromHeader] string person,
            [FromQuery] List<string> type,
            [FromQuery] int size = 50)
        {
            if (string.IsNullOrEmpty(HttpContext.User.GetOrg()))
            {
                // Only orgs can do a search based on. Alternative can be a service owner read in scope. Need to be added later
                return StatusCode(401, "Only orgs can call this api");
            }

            if (string.IsNullOrEmpty(after) && from == null)
            {
                return BadRequest("From or after must be defined.");
            }

            if (size < 1)
            {
                return BadRequest("Size must be a number larger that 0.");
            }

            List<string> source = new List<string> { $"%{org}/{app}%" };

            if ((!string.IsNullOrEmpty(person) || !string.IsNullOrEmpty(unit)) && party <= 0)
            {
                try
                {
                    party = await _registerService.PartyLookup(unit, person);
                }
                catch (PlatformHttpException e)
                {
                    return HandlePlatformHttpException(e);
                }
            }

            return await RetrieveAndAuthorizeEvents(after, from, to, party, source, type, size);
        }

        /// <summary>
        /// Retrieves a set of events based on query parameters.
        /// </summary>
        [HttpGet("party")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [Produces("application/json")]
        public async Task<ActionResult<List<CloudEvent>>> GetForParty(
            [FromQuery] string after,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int party,
            [FromQuery] string unit,
            [FromHeader] string person,
            [FromQuery] List<string> source,
            [FromQuery] List<string> type,
            [FromQuery] int size = 50)
        {
            if (string.IsNullOrEmpty(after) && from == null)
            {
                return BadRequest("From or after must be defined.");
            }

            if (size < 1)
            {
                return BadRequest("Size must be a number larger that 0.");
            }

            if (string.IsNullOrEmpty(person) && string.IsNullOrEmpty(unit) && party <= 0)
            {
                return BadRequest("Subject must be specified using either query params party or unit or header value person.");
            }

            if (party <= 0)
            {
                try
                {
                    party = await _registerService.PartyLookup(unit, person);
                }
                catch (PlatformHttpException e)
                {
                    return HandlePlatformHttpException(e);
                }
            }

            return await RetrieveAndAuthorizeEvents(after, from, to, party, source, type, size);
        }

        private async Task<ActionResult<List<CloudEvent>>> RetrieveAndAuthorizeEvents(
            string after,
            DateTime? from,
            DateTime? to,
            int party,
            List<string> source,
            List<string> type,
            int size)
        {
            try
            {
                List<CloudEvent> events = await _eventsService.Get(after, from, to, party, source, type, size);

                if (events.Count > 0)
                {
                    events = await _authorizationHelper.AuthorizeEvents(HttpContext.User, events);
                }

                if (events.Count > 0)
                {
                    StringBuilder nextUriBuilder = new StringBuilder($"{_eventsBaseUri}{Request.Path}?after={events.Last().Id}");

                    List<KeyValuePair<string, string>> queryCollection = Request.Query
                        .SelectMany(q => q.Value, (col, value) => new KeyValuePair<string, string>(col.Key, value))
                        .Where(q => q.Key != "after")
                        .ToList();

                    foreach (KeyValuePair<string, string> queryParam in queryCollection)
                    {
                        nextUriBuilder.Append($"&{queryParam.Key}={queryParam.Value}");
                    }

                    Response.Headers.Add("next", nextUriBuilder.ToString());
                }

                return events;
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unable to get cloud events from database. {e}");
            }
        }

        private ActionResult HandlePlatformHttpException(PlatformHttpException e)
        {
            if (e.Response.StatusCode == HttpStatusCode.NotFound)
            {
                return NotFound();
            }
            else
            {
                _logger.LogError($"// EventsController // HandlePlatformHttpException // Unexpected response from Altinn Platform. {e}");
                return StatusCode(500, e);
            }
        }
    }
}
