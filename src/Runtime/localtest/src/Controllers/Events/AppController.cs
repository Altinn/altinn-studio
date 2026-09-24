#nullable disable

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;

using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Provides operations for handling app events
    /// </summary>
    [Route("events/api/v1/app")]
    [ApiController]
    public class AppController : ControllerBase
    {
        private readonly IEventsRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppController"/> class
        /// </summary>
        /// <param name="repository">the events repository handler</param>
        /// <param name="logger">dependency injection of logger</param>
        public AppController(IEventsRepository repository, ILogger<EventsController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        /// <summary>
        /// Inserts a new event.
        /// </summary>
        /// <param name="cloudEvent">The event to store.</param>
        /// <param name="idempotencyKey">
        /// Optional client-supplied idempotency key. A key is globally unique and registers exactly one
        /// event.
        /// </param>
        /// <returns>The application metadata object.</returns>
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<string>> Post(
            [FromBody] CloudEvent cloudEvent,
            [FromHeader(Name = "Idempotency-Key")] Guid? idempotencyKey)
        {
            if (string.IsNullOrEmpty(cloudEvent.Source.OriginalString) || string.IsNullOrEmpty(cloudEvent.Specversion) ||
            string.IsNullOrEmpty(cloudEvent.Type) || string.IsNullOrEmpty(cloudEvent.Subject))
            {
                return BadRequest("Missing parameter values: source, subject, type, id or time cannot be null");
            }

            try
            {
                // Force cosmos to create id
                cloudEvent.Id = null;

                CloudEventCreateResult result = await _repository.Create(cloudEvent, idempotencyKey);

                if (result.IsDuplicate)
                {
                    _logger.LogInformation(
                        "Duplicate idempotency key {IdempotencyKey} skipped. Already registered as event {CloudEventId}",
                        idempotencyKey,
                        result.Id);
                }
                else
                {
                    _logger.LogInformation("Cloud Event successfully stored with id: {0}", result.Id);
                }

                return Created(cloudEvent.Subject, result.Id);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to store cloud event in database. {e}");
                return StatusCode(500, $"Unable to store cloud event in database. {e}");
            }
        }
    }
}
