using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Handles operations for the application instance process resource
    /// </summary>
    [Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process")]
    [ApiController]
    public class ProcessController : ControllerBase
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;
        private readonly ILogger _logger;
        private readonly IPDP _pdp;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="logger">the logger</param>
        /// <param name="pdp">the policy decision point.</param>        
        public ProcessController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IPDP pdp,
            ILogger<ProcessController> logger)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _pdp = pdp;
            _logger = logger;
        }

        /// <summary>
        /// Updates the process of an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner party id</param>
        /// <param name="instanceGuid">instance guid</param>
        /// <param name="processState">the new process state of the instance</param>
        /// <returns>The updated instance</returns>
        [Authorize]
        [HttpPut]
        [ProducesResponseType(typeof(Instance), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> PutProcess(
                int instanceOwnerPartyId,
                Guid instanceGuid,
                [FromBody] ProcessState processState)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance existingInstance;
            try
            {
                existingInstance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            }
            catch (Exception e)
            {
                string message = $"Unable to find instance {instanceId} to update: {e}";
                _logger.LogError(message);

                return NotFound(message);
            }

            if (existingInstance == null)
            {
                return NotFound();
            }

            string altinnTaskType = existingInstance.Process?.CurrentTask?.AltinnTaskType;
            bool authorized = await Authorize(altinnTaskType, existingInstance);
            if (!authorized)
            {
                return Forbid();
            }

            // Archiving instance if process was ended
            if (existingInstance.Process.Ended == null && processState.Ended != null)
            {
                existingInstance.Status ??= new InstanceStatus();
                existingInstance.Status.Archived = processState.Ended;
            }

            existingInstance.Process = processState;
            existingInstance.LastChangedBy = User.GetUserOrOrgId();
            existingInstance.LastChanged = DateTime.UtcNow;

            Instance result;
            try
            {
                result = await _instanceRepository.Update(existingInstance);

                InstancesController.AddSelfLinks(Request, result);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to update instance object {instanceId}. Due to {e}");
                return StatusCode(500, $"Unable to update instance object {instanceId}: {e.Message}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Get the process history for an instance.
        /// </summary>
        /// <returns>Returns a list of the process events.</returns>        
        [HttpGet("history")]
        [Authorize(Policy = "InstanceRead")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetProcessHistory(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {      
            string[] eventTypes = Enum.GetNames(typeof(InstanceEventType)).Where(x => x.StartsWith("process")).ToArray();
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
            ProcessHistoryList processHistoryList = new ProcessHistoryList();

            try
            {
                List<InstanceEvent> processEvents = await _instanceEventRepository.ListInstanceEvents(instanceId, eventTypes, null, null);
                processHistoryList.ProcessHistory = ProcessHelper.MapInstanceEventsToProcessHistory(processEvents);

                return Ok(processHistoryList);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to retriece process history for instance object {instanceId}. Due to {e}");
                return StatusCode(500, $"Unable to retriece process history for instance object {instanceId}: {e.Message}");
            }
        }

        private async Task<bool> Authorize(string currentTaskType, Instance instance)
        {
            string actionType;
            if (string.IsNullOrEmpty(currentTaskType) || currentTaskType.Equals("data"))
            {
                actionType = "write";
            }
            else
            {
                actionType = currentTaskType;
            }

            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, actionType, null, instance.Id);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
            if (response?.Response == null)
            {
                _logger.LogInformation($"// Instance Controller // Authorization to update Process failed: {JsonConvert.SerializeObject(request)}.");
                return false;
            }

            bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, HttpContext.User);
            return authorized;
        }
    }
}
