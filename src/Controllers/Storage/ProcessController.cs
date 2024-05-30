using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

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
        private readonly string _storageBaseAndHost;
        private readonly IAuthorization _authorizationService;
        private readonly IInstanceEventService _instanceEventService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="generalsettings">the general settings</param>
        /// <param name="authorizationService">the authorization service</param>
        /// <param name="instanceEventService">the instance event service</param>
        public ProcessController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IOptions<GeneralSettings> generalsettings,
            IAuthorization authorizationService,
            IInstanceEventService instanceEventService)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _storageBaseAndHost = $"{generalsettings.Value.Hostname}/storage/api/v1/";
            _authorizationService = authorizationService;
            _instanceEventService = instanceEventService;
        }

        /// <summary>
        /// Updates the process of an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that should have its process updated.</param>
        /// <param name="processState">The new process state of the instance.</param>
        /// <returns>The updated instance</returns>
        [Authorize]
        [HttpPut]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> PutProcess(
                int instanceOwnerPartyId,
                Guid instanceGuid,
                [FromBody] ProcessState processState)
        {
            Instance existingInstance;

            existingInstance = await _instanceRepository.GetOne(instanceOwnerPartyId, instanceGuid);

            if (existingInstance == null)
            {
                return NotFound();
            }

            string altinnTaskType = existingInstance.Process?.CurrentTask?.AltinnTaskType;
            string taskId = null;
            
            var moveNextFlows = new []{"CompleteCurrentMoveToNext", "AbandonCurrentMoveToNext"};
            if (processState?.CurrentTask?.FlowType is not null && !moveNextFlows.Contains(processState.CurrentTask.FlowType))
            {
                altinnTaskType = processState.CurrentTask.AltinnTaskType;
                taskId = processState.CurrentTask.ElementId;
            }

            string action;

            switch (altinnTaskType)
            {
                case "data":
                case "feedback":
                    action = "write";
                    break;
                case "payment":
                    action = "pay";
                    break;
                case "confirmation":
                    action = "confirm";
                    break;
                case "signing":
                    action = "sign";
                    break;
                default:
                    action = altinnTaskType;
                    break;
            }

            bool authorized = await _authorizationService.AuthorizeInstanceAction(existingInstance, action, taskId);

            if (!authorized)
            {
                return Forbid();
            }

            // Archiving instance if process was ended
            if (existingInstance.Process.Ended == null && processState?.Ended != null)
            {
                existingInstance.Status ??= new InstanceStatus();
                existingInstance.Status.IsArchived = true;
                existingInstance.Status.Archived = processState.Ended;
            }

            existingInstance.Process = processState;
            existingInstance.LastChangedBy = User.GetUserOrOrgId();
            existingInstance.LastChanged = DateTime.UtcNow;

            Instance updatedInstance;

            updatedInstance = await _instanceRepository.Update(existingInstance);

            if (processState?.CurrentTask?.AltinnTaskType == "signing")
            {
                await _instanceEventService.DispatchEvent(InstanceEventType.SentToSign, updatedInstance);
            }

            updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);
            return Ok(updatedInstance);
        }

        /// <summary>
        /// Get the process history for an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance whos process history to retrieve.</param>
        /// <returns>Returns a list of the process events.</returns>
        [HttpGet("history")]
        [Authorize(Policy = "InstanceRead")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Produces("application/json")]
        public async Task<ActionResult<ProcessHistoryList>> GetProcessHistory(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            string[] eventTypes = Enum.GetNames(typeof(InstanceEventType)).Where(x => x.StartsWith("process")).ToArray();
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
            ProcessHistoryList processHistoryList = new ProcessHistoryList();

            List<InstanceEvent> processEvents = await _instanceEventRepository.ListInstanceEvents(instanceId, eventTypes, null, null);
            processHistoryList.ProcessHistory = ProcessHelper.MapInstanceEventsToProcessHistory(processEvents);

            return Ok(processHistoryList);
        }
    }
}
