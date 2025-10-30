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
        private readonly IInstanceAndEventsRepository _instanceAndEventsRepository;
        private readonly string _storageBaseAndHost;
        private readonly IAuthorization _authorizationService;
        private readonly IInstanceEventService _instanceEventService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="instanceAndEventsRepository">the instance and events repository</param>
        /// <param name="generalsettings">the general settings</param>
        /// <param name="authorizationService">the authorization service</param>
        /// <param name="instanceEventService">the instance event service</param>
        public ProcessController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IInstanceAndEventsRepository instanceAndEventsRepository,
            IOptions<GeneralSettings> generalsettings,
            IAuthorization authorizationService,
            IInstanceEventService instanceEventService)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _instanceAndEventsRepository = instanceAndEventsRepository;
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
            Instance existingInstance = await _instanceRepository.GetOne(instanceOwnerPartyId, instanceGuid);

            if (existingInstance is null)
            {
                return NotFound();
            }

            var (action, taskId) = ActionMapping(processState, existingInstance);

            bool authorized = await _authorizationService.AuthorizeInstanceAction(existingInstance, action, taskId);

            if (!authorized)
            {
                return Forbid();
            }

            UpdateInstance(existingInstance, processState, out _);

            Instance updatedInstance = await _instanceRepository.Update(existingInstance);

            if (processState?.CurrentTask?.AltinnTaskType == "signing")
            {
                await _instanceEventService.DispatchEvent(InstanceEventType.SentToSign, updatedInstance);
            }

            updatedInstance.SetPlatformSelfLinks(_storageBaseAndHost);
            return Ok(updatedInstance);
        }
        
        /// <summary>
        /// Updates the process state of an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that should have its process updated.</param>
        /// <param name="processStateUpdate">The new process state of the instance (including instance events).</param>
        /// <returns></returns>
        [Authorize]
        [HttpPut("instanceandevents")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<Instance>> PutInstanceAndEvents(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            [FromBody] ProcessStateUpdate processStateUpdate)
        {
            Instance existingInstance = await _instanceRepository.GetOne(instanceOwnerPartyId, instanceGuid);

            if (existingInstance is null)
            {
                return NotFound();
            }

            foreach (var instanceEvent in processStateUpdate.Events ?? [])
            {
                if (string.IsNullOrWhiteSpace(instanceEvent.InstanceId))
                {
                    return BadRequest("Missing instance ID in InstanceEvent");
                }
                else if (instanceEvent.InstanceId != $"{instanceOwnerPartyId}/{instanceGuid}")
                {
                    return BadRequest("Instance ID in InstanceEvent does not match the Instance ID");
                }

                instanceEvent.Created = instanceEvent.Created?.ToUniversalTime() ?? DateTime.UtcNow;
            }

            ProcessState processState = processStateUpdate.State;

            var (action, taskId) = ActionMapping(processState, existingInstance);

            bool authorized = await _authorizationService.AuthorizeInstanceAction(existingInstance, action, taskId);

            if (!authorized)
            {
                return Forbid();
            }

            processStateUpdate.Events ??= [];
            UpdateInstance(existingInstance, processState, out var updateProperties);
            if (processState?.CurrentTask?.AltinnTaskType == "signing")
            {
                InstanceEvent instanceEvent = _instanceEventService.BuildInstanceEvent(InstanceEventType.SentToSign, existingInstance);
                processStateUpdate.Events.Add(instanceEvent);
            }

            Instance updatedInstance = await _instanceAndEventsRepository.Update(existingInstance, updateProperties, processStateUpdate.Events);

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

        private void UpdateInstance(Instance existingInstance, ProcessState processState, out List<string> updateProperties)
        {
            // Archiving instance if process was ended
            updateProperties = [
                nameof(existingInstance.Process),
                nameof(existingInstance.LastChanged),
                nameof(existingInstance.LastChangedBy)
            ];
            if (existingInstance.Process?.Ended is null && processState?.Ended is not null)
            {
                existingInstance.Status ??= new InstanceStatus();
                existingInstance.Status.IsArchived = true;
                existingInstance.Status.Archived = processState.Ended;
                updateProperties.Add(nameof(existingInstance.Status));
                updateProperties.Add(nameof(existingInstance.Status.IsArchived));
                updateProperties.Add(nameof(existingInstance.Status.Archived));
            }

            existingInstance.Process = processState;
            existingInstance.LastChangedBy = User.GetUserOrOrgNo();
            existingInstance.LastChanged = DateTime.UtcNow;
        }

        private (string Action, string TaskId) ActionMapping(ProcessState processState, Instance existingInstance)
        {
            string taskId = null;
            string altinnTaskType = existingInstance.Process?.CurrentTask?.AltinnTaskType;

            if (processState?.CurrentTask?.FlowType == "AbandonCurrentMoveToNext")
            {
                altinnTaskType = "reject";
            }
            else if (processState?.CurrentTask?.FlowType is not null
                && processState.CurrentTask.FlowType != "CompleteCurrentMoveToNext")
            {
                altinnTaskType = processState.CurrentTask.AltinnTaskType;
                taskId = processState.CurrentTask.ElementId;
            }

            string action = altinnTaskType switch
            {
                "data" or "feedback" or "pdf" or "eFormidling" or "fiksArkiv" => "write",
                "payment" => "pay",
                "confirmation" => "confirm",
                "signing" => "sign",
                _ => altinnTaskType,
            };

            return (action, taskId);
        }
    }
}
