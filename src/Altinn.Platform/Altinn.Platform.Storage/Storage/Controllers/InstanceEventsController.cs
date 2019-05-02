using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using Serilog.Core;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// API for managing the instance event element
    /// </summary>
    [Route("storage/api/v1/[controller]")]
    public class InstanceEventsController : Controller
    {
        private readonly IInstanceEventRepository _repository;
        private Logger logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

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
        /// <param name="instanceEvent">Id of instance to retrieve events for. </param>
        /// <returns>The stored instance event.</returns>
        /// POST storage/api/v1/instanceevents/
        [HttpPost]
        public async Task<ActionResult> Post([FromBody] InstanceEvent instanceEvent)
        {
            if (instanceEvent == null)
            {
                return BadRequest("Missing parameter values: instance event must exist and instanceId must be set");
            }

            instanceEvent.CreatedDateTime = DateTime.UtcNow;

            InstanceEvent result = await _repository.InsertInstanceEvent(instanceEvent);
            if (result == null)
            {
                return BadRequest("Unable to write new instance event to database");
            }

            return Ok(result);
        }

        /// <summary>
        /// Retrieves all instance events related to given instance id from instanceEvent collection.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for. </param>
        /// <returns>List of instance events.</returns>
        /// GET  storage/api/v1/instanceevents/?instanceid={instanceId}
        [HttpGet]
        public async Task<ActionResult> GetAllInstanceEvents(string instanceId)
        {
            if (!string.IsNullOrEmpty(instanceId))
            {
                List<InstanceEvent> result = await _repository.ListAllInstanceEvents(instanceId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any instance events for instanceId={instanceId}");
                }

                return Ok(result);
            }

            return BadRequest("Unable to perform query.");
        }

        /// <summary>
        /// Retrieves all instance events related to given instance id and listed event types from instanceEvent collection.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for.</param>
        /// <param name="eventTypes">List of event types to filter the events by./param>
        /// <returns>List of intance events.</returns>
        /// GET  storage/api/v1/instanceevents/GetByInstanceEventType?instanceId={instanceId}&eventTypes={eventType}&eventTypes={eventType}
        [HttpGet]
        [Route("GetByInstanceEventType")]
        public async Task<ActionResult> GetInstanceEventsEventTypes(string instanceId, List<string> eventTypes)
        {
            // or array of types is empty
            if (string.IsNullOrEmpty(instanceId) || eventTypes.Count == 0 || eventTypes == null)
            {
                return BadRequest("Unable to perform query.");
            }

            List<InstanceEvent> result = await _repository.ListInstanceEventsSpecificEventTypes(instanceId, eventTypes);

            if (result == null || result.Count == 0)
            {
                return NotFound($"Did not find any instance events for instanceId={instanceId} with event type {string.Join(", ", eventTypes.ToArray())}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Retrieves all instance events related to given instance id and time frame from instanceEvent collection.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for.</param>
        /// <param name="from"> Lower bound for DateTime span to filter events by. Utc format and invariantCulture. </param>
        /// <param name="to"> Upper bound for DateTime span to filter events by. Utc format and invariantCulture. </param>
        /// <returns>List of instance events.</returns>
        /// GET storage/api/v1/instanceevents/GetByTimeFrame?instanceId={instanceId}&from={fromtime}&to={totime}
        [HttpGet]
        [Route("GetByTimeFrame")]
        public async Task<ActionResult> GetInstanceEventsTimeframe(string instanceId, string from, string to)
        {
            DateTime fromDateTime, toDateTime;
            try
            {
                fromDateTime = DateTime.ParseExact(from, "s", CultureInfo.InvariantCulture);
                toDateTime = DateTime.ParseExact(to, "s", CultureInfo.InvariantCulture);
            }
            catch
            {
                return BadRequest("Unable to perform query.");
            }

            if (string.IsNullOrEmpty(instanceId))
            {
                return BadRequest("Unable to perform query.");
            }

            List<InstanceEvent> result = await _repository.ListInstanceEventsTimeFrame(instanceId, fromDateTime, toDateTime);

            // should we differenciate between query failing and no instances existing in collection?
            if (result == null || result.Count == 0)
            {
                return NotFound($"Did not find any instance events for instanceId={instanceId} between {fromDateTime} and {toDateTime}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Deletes all events related to an instance id.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for. .</param>
        /// <returns>Number of deleted events.</returns>
        /// DELETE storage/api/v1/instanceevents/?instanceId={instanceId}
        [HttpDelete]
        public async Task<ActionResult> Delete(string instanceId)
        {
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
