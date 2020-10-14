using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    /// Provides operations for handling events
    /// </summary>
    [Authorize]
    [Route("events/api/v1/app")]
    public class EventsController : Controller
    {
        private readonly IEventsService _eventsService;
        private readonly ILogger _logger;
        private readonly string _eventsBaseUri;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsController"/> class
        /// </summary>
        /// <param name="eventsService">postgres service</param>
        /// <param name="settings">the general settings</param>
        /// <param name="logger">dependency injection of logger</param>
        public EventsController(IEventsService eventsService, IOptions<GeneralSettings> settings, ILogger<EventsController> logger)
        {
            _logger = logger;
            _eventsService = eventsService;
            _eventsBaseUri = $"https://platform.{settings.Value.Hostname}";
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
            if (string.IsNullOrEmpty(cloudEvent.Source.OriginalString) || string.IsNullOrEmpty(cloudEvent.SpecVersion) ||
            string.IsNullOrEmpty(cloudEvent.Type) || string.IsNullOrEmpty(cloudEvent.Subject))
            {
                return BadRequest("Missing parameter values: source, subject, type, id or time cannot be null");
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
        [Produces("application/json")]
        public async Task<ActionResult<List<CloudEvent>>> Get(
            [FromQuery] string after,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int party,
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

            try
            {
                List<CloudEvent> events = await _eventsService.Get(after, from, to, party, source, type, size);

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
    }
}
