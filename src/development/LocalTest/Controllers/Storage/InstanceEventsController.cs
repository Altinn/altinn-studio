using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Authorization;
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
        /// <param name="instanceEvent">The instance event object to be inserted</param>
        /// <returns>The stored instance event object</returns>
        /// POST storage/api/v1/instances/{instanceId}/events
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPost]
        [ProducesResponseType(typeof(InstanceEvent), 201)]
        public async Task<ActionResult> Post([FromBody] InstanceEvent instanceEvent)
        {
            if (instanceEvent == null || instanceEvent.InstanceId == null)
            {
                return BadRequest("Missing parameter values: instance event must exist and instanceId must be set");
            }

            instanceEvent.Created = DateTime.UtcNow;

            InstanceEvent result = await _repository.InsertInstanceEvent(instanceEvent);
            if (result == null)
            {
                return BadRequest("Unable to write new instance event to database");
            }

            return Created(result.Id.ToString(), result);
        }

        /// <summary>
        /// Get one event.
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner</param>
        /// <param name="instanceGuid">instance guid</param>
        /// <param name="eventGuid">event guid</param>
        /// <returns>the event</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{eventGuid:guid}")]
        [ProducesResponseType(typeof(InstanceEvent), 200)]
        public async Task<ActionResult> GetOne(int instanceOwnerPartyId, Guid instanceGuid, Guid eventGuid)
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
        /// <param name="instanceOwnerPartyId">instance owner id</param>
        /// <param name="instanceGuid"> Id of instance to retrieve events for. </param>
        /// <param name="eventTypes">Array of event types to filter the events by.</param>
        /// <param name="from"> Lower bound for DateTime span to filter events by.</param>
        /// <param name="to"> Upper bound for DateTime span to filter events by.</param>
        /// <returns>List of instance events.</returns>
        /// <!--
        /// GET  storage/api/v1/instances/{instanceId}/events
        /// GET  storage/api/v1/instances/{instanceId}/events?eventTypes=deleted,submited
        /// GET  storage/api/v1/instances/{instanceId}/events?from=2019-05-03T11:55:23&to=2019-05-03T12:55:23
        /// GET  storage/api/v1/instances/{instanceId}/events?from=2019-05-03T11:55:23&to=2019-05-03T12:55:23&eventTypes=deleted,submited
        /// -->
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet]
        [ProducesResponseType(typeof(InstanceEventList), 200)]
        public async Task<ActionResult> Get(
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

            if (instanceEvents == null || instanceEvents.Count == 0)
            {
                return NotFound($"Did not find any instance events for instanceId={instanceId} matching the given event types: {string.Join(", ", eventTypes)} and the given time frame {fromDateTime} : {toDateTime}.");
            }

            InstanceEventList instanceEventList = new InstanceEventList { InstanceEvents = instanceEvents };

            return Ok(instanceEventList);
        }

        /// <summary>
        /// Deletes all events related to an instance id.
        /// </summary>
        /// <param name="instanceOwnerPartyId">Id of instance owner to retrieve events for. .</param>
        /// <param name="instanceGuid">Guid of the instance</param>
        /// <returns>Number of deleted events.</returns>
        /// DELETE storage/api/v1/instances/{instanceId}/events
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpDelete]
        public async Task<ActionResult> Delete(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (string.IsNullOrEmpty(instanceId))
            {
                return BadRequest("Unable to perform query.");
            }

            int result = await _repository.DeleteAllInstanceEvents(instanceId);

            if (result > 0)
            {
                return Ok($"{result} instance events were succesfully deleted from the database.");
            }
            else if (result == 0)
            {
                return Ok($"No instance events related to instance {instanceId} were found in the database.");
            }
            else
            {
                return BadRequest("Unable to perform query.");
            }
        }
    }
}
