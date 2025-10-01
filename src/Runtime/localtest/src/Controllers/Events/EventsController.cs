using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;

using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Provides operations for handling generic events
    /// </summary>
    [Route("events/api/v1/events")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly IEventsRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsController"/> class
        /// </summary>
        /// <param name="repository">the events repository handler</param>
        /// <param name="logger">dependency injection of logger</param>
        public EventsController(IEventsRepository repository, ILogger<EventsController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        /// <summary>
        /// Inserts a new event.
        /// </summary>
        /// <param name="cloudEvent">The event to store.</param>
        /// <returns>The application metadata object.</returns>
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/cloudevents+json")]
        public async Task<ActionResult<string>> Post([FromBody] CloudEvent cloudEvent)
        {
            var (isValid, errorMessages) = ValidateCloudEvent(cloudEvent);
            if (!isValid)
            {
                return Problem(errorMessages, null, 400);
            }
            
            try
            {
                var cloudEventId = await _repository.Create(cloudEvent);
                _logger.LogInformation("Cloud Event successfully stored with id: {0}", cloudEventId);
                return Ok();
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Unable to register cloud event.");
                return StatusCode(500, $"Unable to register cloud event.");
            }
        }
        
        private static (bool IsValid, string ErrorMessage) ValidateCloudEvent(CloudEvent cloudEvent)
        {
            if (string.IsNullOrEmpty(cloudEvent.Resource))
            {
                return (false, "A 'resource' property must be defined.");
            }

            if (!Uri.IsWellFormedUriString(cloudEvent.Resource, UriKind.Absolute))
            {
                return (false, "'Resource' must be a valid urn.");
            }

            return (true, null);
        }
    }
}
