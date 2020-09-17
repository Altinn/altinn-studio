using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Provides operations for handling events
    /// </summary>
    [Route("events/api/v1/events")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly IEventsRepository repository;
        private readonly ILogger logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsController"/> class
        /// </summary>
        /// <param name="repository">the events repository handler</param>
        /// <param name="logger">dependency injection of logger</param>
        public EventsController(IEventsRepository repository, ILogger<EventsController> logger)
        {
            this.repository = repository;
            this.logger = logger;
        }

        /// <summary>
        /// Inserts a new event.
        /// </summary>
        /// <param name="cloudEvent">The event to store.</param>
        /// <returns>The applicaiton metadata object.</returns>
        // [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]

        // public async Task<ActionResult<string>> Post([FromBody] CloudEvent cloudEvent)
        public async Task<ActionResult<string>> Post([FromBody] CloudEvent cloudEvent)
        {
            logger.LogInformation("CloudEventSubject: " + cloudEvent.Subject);
            logger.LogInformation("CloudEventSource" + cloudEvent.Source.OriginalString);
            if (string.IsNullOrEmpty(cloudEvent.Source.OriginalString) || string.IsNullOrEmpty(cloudEvent.Specversion) ||
            string.IsNullOrEmpty(cloudEvent.Type) || string.IsNullOrEmpty(cloudEvent.Subject) || cloudEvent.Time == null)
            {
                return BadRequest("Missing parameter values: source, subject, type, id or time cannot be null");
            }

            try
            {
                cloudEvent.Id = null;
                string result = await repository.Create(cloudEvent);

                logger.LogInformation($"Cloud Event sucessfully stored", result);

                return Created(cloudEvent.Subject, result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to store cloud event in database. {e}");
                return StatusCode(500, $"Unable to store cloud event in database. {e}");
            }
        }
    }
}