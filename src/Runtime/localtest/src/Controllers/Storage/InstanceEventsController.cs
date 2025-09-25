using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// API for managing the instance event element
    /// </summary>
    [Route("storage/api/v1/instances/{instanceOwnerPartyId}/{instanceGuid}/events")]
    [ApiController]
    public class InstanceEventsController : ControllerBase
    {
        private readonly IInstanceEventRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventsController"/> class
        /// </summary>
        /// <param name="instanceEventRepository">the instance repository handler</param>
        public InstanceEventsController(IInstanceEventRepository instanceEventRepository)
        {
            _repository = instanceEventRepository;
        }

        /// <summary>
        /// Inserts new instance event into the instanceEvent collection.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the event is associated with.</param>
        /// <param name="instanceEvent">The instance event object to be inserted</param>
        /// <returns>The stored instance event.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<string>> Post(int instanceOwnerPartyId, Guid instanceGuid, [FromBody] InstanceEvent instanceEvent)
        {
            if (instanceEvent?.InstanceId == null)
            {
                return BadRequest("Missing parameter values: instance event must exist and instanceId must be set");
            }

            instanceEvent.Created = instanceEvent.Created?.ToUniversalTime() ?? DateTime.UtcNow;

            InstanceEvent result = await _repository.InsertInstanceEvent(instanceEvent);
            if (result == null)
            {
                return BadRequest("Unable to write new instance event to database");
            }

            return Created(result.Id.ToString(), result);
        }

        /// <summary>
        /// Get information about one specific event.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the event is associated with.</param>
        /// <param name="eventGuid">The unique id of the specific event to retrieve.</param>
        /// <returns>Information about the specified event.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{eventGuid:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<InstanceEvent>> GetOne(int instanceOwnerPartyId, Guid instanceGuid, Guid eventGuid)
        {
            try
            {
                string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
                InstanceEvent theEvent = await _repository.GetOneEvent(instanceId, eventGuid);
                if (theEvent != null)
                {
                    return Ok(theEvent);
                }
                else
                {
                    return NotFound();
                }
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Exception {e.Message}");
            }
        }

        /// <summary>
        /// Retrieves all instance events related to given instance id, listed event types, and given time frame from instanceEvent collection.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the event(s) is associated with.</param>
        /// <param name="eventTypes">Array of event types to filter the events by.</param>
        /// <param name="from">Lower bound for DateTime span to filter events by.</param>
        /// <param name="to">Upper bound for DateTime span to filter events by.</param>
        /// <returns>List of instance events.</returns>
        /// <!--
        /// GET  storage/api/v1/instances/{instanceId}/events
        /// GET  storage/api/v1/instances/{instanceId}/events?eventTypes=deleted,submited
        /// GET  storage/api/v1/instances/{instanceId}/events?from=2019-05-03T11:55:23&to=2019-05-03T12:55:23
        /// GET  storage/api/v1/instances/{instanceId}/events?from=2019-05-03T11:55:23&to=2019-05-03T12:55:23&eventTypes=deleted,submited
        /// -->
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<InstanceEventList>> Get(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string[] eventTypes,
            [FromQuery] string from,
            [FromQuery] string to)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (string.IsNullOrEmpty(instanceId))
            {
                return BadRequest("Unable to perform query.");
            }

            DateTime? fromDateTime = null, toDateTime = null;

            if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
            {
                try
                {
                    fromDateTime = DateTimeHelper.ParseAndConvertToUniversalTime(from);
                    toDateTime = DateTimeHelper.ParseAndConvertToUniversalTime(to);
                }
                catch
                {
                    return BadRequest("Unable to perform query. Invalid format for time span. Use string format of UTC.");
                }
            }

            List<InstanceEvent> instanceEvents = await _repository.ListInstanceEvents(instanceId, eventTypes, fromDateTime, toDateTime);

            InstanceEventList instanceEventList = new InstanceEventList { InstanceEvents = instanceEvents };

            return Ok(instanceEventList);
        }
    }
}
