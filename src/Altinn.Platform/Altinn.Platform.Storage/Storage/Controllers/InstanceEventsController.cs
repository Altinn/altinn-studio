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
    [Route("api/storage/v1/[controller]")]
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
        /// Inserts new instance event into the instanceEvent collection
        /// </summary>
        /// <param name="instanceEvent">intance event</param>
        /// <returns>instance event object</returns>
        /// POST https://localhost:44399/api/storage/v1/instanceevents/
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
        /// Inserts new instance event into the instanceEvent collection
        /// </summary>
        /// <param name="instanceId">instance owner</param>
        /// <returns>instance object</returns>
        /// GET  https://localhost:44399/api/storage/v1/instanceevents/?instanceid=123456
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
        /// Inserts new instance event into the instanceEvent collection
        /// </summary>
        /// <param name="instanceId">instance owner</param>
        /// <returns>instance object</returns>
        /// https://localhost:44399/api/storage/v1/instanceevents/GetByInstanceEventType?instanceId=123456&eventTypes=deleted&eventTypes=submit
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
        /// Inserts new instance event into the instanceEvent collection
        /// </summary>
        /// <param name="instanceId">instance owner</param>
        /// <returns>instance object</returns>
        /// GET https://localhost:44399/api/storage/v1/instanceEvents/GetByTimeFrame?instanceId=123456&from=2019-04-30T14:39:47&to=2019-04-30T14:39:47
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
        /// Deletes all events related to an instance
        /// </summary>
        /// <param name="instanceId">instance owner</param>
        /// <returns>instance object</returns>
        /// DELETE https://localhost:44399/api/storage/v1/instanceEvents/?instanceId={instanceId}
        [HttpDelete]
        public async Task<ActionResult> Delete(string instanceId)
        {
            // TODO: Check authorization level and access to delete the data
            if (string.IsNullOrEmpty(instanceId))
            {
                return BadRequest("Unable to perform query.");
            }

            bool result = await _repository.DeleteAllInstanceEvents(instanceId);

            if (result)
            {
                return Ok(result);
            }
            else
            {
                return NotFound();
            }
        }
    }
}
