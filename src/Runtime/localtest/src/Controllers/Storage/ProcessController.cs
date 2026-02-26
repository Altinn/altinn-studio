#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Controllers;

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
        IInstanceEventService instanceEventService
    )
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
    /// <param name="cancellationToken">CancellationToken</param>
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
        [FromBody] ProcessState processState,
        CancellationToken cancellationToken
    )
    {
        (Instance existingInstance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        if (existingInstance is null)
        {
            return NotFound();
        }

        bool atLeastOneActionAuthorized = await AuthorizeProcessNext(
            processState,
            existingInstance
        );

        if (!atLeastOneActionAuthorized)
        {
            return Forbid();
        }

        UpdateInstance(existingInstance, processState, out var updateProperties);

        Instance updatedInstance = await _instanceRepository.Update(
            existingInstance,
            updateProperties,
            cancellationToken
        );

        if (processState?.CurrentTask?.AltinnTaskType == "signing")
        {
            await _instanceEventService.DispatchEvent(
                InstanceEventType.SentToSign,
                updatedInstance
            );
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
    /// <param name="cancellationToken">CancellationToken</param>
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
        [FromBody] ProcessStateUpdate processStateUpdate,
        CancellationToken cancellationToken
    )
    {
        (Instance existingInstance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );

        if (existingInstance is null)
        {
            return NotFound();
        }

        foreach (InstanceEvent instanceEvent in processStateUpdate.Events ?? [])
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

        bool atLeastOneActionAuthorized = await AuthorizeProcessNext(
            processState,
            existingInstance
        );

        if (!atLeastOneActionAuthorized)
        {
            return Forbid();
        }

        processStateUpdate.Events ??= [];
        UpdateInstance(existingInstance, processState, out var updateProperties);
        if (processState?.CurrentTask?.AltinnTaskType == "signing")
        {
            InstanceEvent instanceEvent = _instanceEventService.BuildInstanceEvent(
                InstanceEventType.SentToSign,
                existingInstance
            );
            processStateUpdate.Events.Add(instanceEvent);
        }

        Instance updatedInstance = await _instanceAndEventsRepository.Update(
            existingInstance,
            updateProperties,
            processStateUpdate.Events,
            cancellationToken
        );

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
        [FromRoute] Guid instanceGuid
    )
    {
        string[] eventTypes = Enum.GetNames<InstanceEventType>()
            .Where(x => x.StartsWith("process"))
            .ToArray();
        string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
        ProcessHistoryList processHistoryList = new ProcessHistoryList();

        List<InstanceEvent> processEvents = await _instanceEventRepository.ListInstanceEvents(
            instanceId,
            eventTypes,
            null,
            null
        );
        processHistoryList.ProcessHistory = ProcessHelper.MapInstanceEventsToProcessHistory(
            processEvents
        );

        return Ok(processHistoryList);
    }

    /// <summary>
    /// Gets process info relevant to authorization
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to retrieve.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Authorization info.</returns>
    [HttpGet("authinfo")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<AuthInfo>> GetForAuth(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        string? message = null;
        try
        {
            (Instance instance, _) = await _instanceRepository.GetOne(
                instanceGuid,
                false,
                cancellationToken
            );
            if (instance.InstanceOwner.PartyId == instanceOwnerPartyId.ToString())
            {
                return Ok(new AuthInfo() { Process = instance.Process, AppId = instance.AppId });
            }
        }
        catch (Exception e)
        {
            message = e.Message;
        }

        return NotFound(
            $"Unable to find instance {instanceOwnerPartyId}/{instanceGuid}: {message}"
        );
    }

    private void UpdateInstance(
        Instance existingInstance,
        ProcessState processState,
        out List<string> updateProperties
    )
    {
        // Archiving instance if process was ended
        updateProperties =
        [
            nameof(existingInstance.Process),
            nameof(existingInstance.LastChanged),
            nameof(existingInstance.LastChangedBy),
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

    private async Task<bool> AuthorizeProcessNext(
        ProcessState processState,
        Instance existingInstance
    )
    {
        (string[] actionsThatAllowProcessNext, string? taskId) = GetActionsToAuthorize(
            processState,
            existingInstance
        );

        foreach (string action in actionsThatAllowProcessNext)
        {
            bool actionIsAuthorized = await _authorizationService.AuthorizeInstanceAction(
                existingInstance,
                action,
                taskId
            );
            if (actionIsAuthorized)
            {
                return true;
            }
        }

        return false;
    }

    private static (string[] Actions, string? TaskId) GetActionsToAuthorize(
        ProcessState processState,
        Instance existingInstance
    )
    {
        string? taskId = existingInstance.Process?.CurrentTask?.ElementId;
        string? altinnTaskType = existingInstance.Process?.CurrentTask?.AltinnTaskType;

        if (processState?.CurrentTask?.FlowType == "AbandonCurrentMoveToNext")
        {
            return (["reject"], taskId);
        }

        // Think this IF is related to gateways, but not sure.
        if (
            processState?.CurrentTask?.FlowType is not null
            && processState.CurrentTask.FlowType != "CompleteCurrentMoveToNext"
        )
        {
            altinnTaskType = processState.CurrentTask.AltinnTaskType;
            taskId = processState.CurrentTask.ElementId;
        }

        string[] actionsThatAllowProcessNextForTaskType = GetActionsThatAllowProcessNextForTaskType(
            altinnTaskType
        );

        return (actionsThatAllowProcessNextForTaskType, taskId);
    }

    /// <summary>
    /// Get all actions that allow process next for the given task type. Meant to be used to authorize the process next when no action is provided.
    /// </summary>
    /// <remarks>To allow process next for a custom action, user needs to have access to an action with the same name as the task type in the policy.</remarks>
    public static string[] GetActionsThatAllowProcessNextForTaskType(string? taskType)
    {
        return taskType switch
        {
            null => [],
            "data" or "feedback" or "pdf" or "eFormidling" or "fiksArkiv" or "subformPdf" =>
            [
                "write",
            ],
            "payment" => ["pay", "write"],
            "confirmation" => ["confirm"],
            "signing" => ["sign", "write"],
            _ => [taskType],
        };
    }
}
