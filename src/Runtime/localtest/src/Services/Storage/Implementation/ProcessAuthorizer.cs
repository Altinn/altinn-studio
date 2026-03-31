#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Authorization;

/// <summary>
/// Authorizer for process operations.
/// </summary>
public class ProcessAuthorizer : IProcessAuthorizer
{
    private readonly IAuthorization _authorizationService;
    private readonly GeneralSettings _settings;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessAuthorizer"/> class.
    /// </summary>
    public ProcessAuthorizer(IAuthorization authorizationService, IOptions<GeneralSettings> settings)
    {
        _authorizationService = authorizationService;
        _settings = settings.Value;
    }

    /// <inheritdoc/>
    public Task<bool> AuthorizeProcessNext(Instance instance, ProcessState nextProcessState)
    {
        ArgumentNullException.ThrowIfNull(nextProcessState);
        return Authorize(instance, nextProcessState);
    }

    /// <inheritdoc/>
    public Task<bool> AuthorizeInstanceLock(Instance instance) => Authorize(instance);

    /// <inheritdoc/>
    public Task<bool> AuthorizeDataElementLock(Instance instance) => Authorize(instance);

    /// <inheritdoc/>
    public Task<bool> AuthorizePresentationTextsUpdate(Instance instance) => Authorize(instance);

    /// <inheritdoc/>
    public Task<bool> AuthorizeDataValuesUpdate(Instance instance) =>
        AuthorizeWithSyncAdapterBypass(instance);

    /// <summary>
    /// Get all actions that allow process next for the given task type.
    /// </summary>
    /// <remarks>To allow process next for a custom action, user needs to have access to an action with the same name as the task type in the policy.</remarks>
    public static List<string> GetActionsThatAllowProcessNextForTaskType(string? taskType)
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

    private async Task<bool> Authorize(Instance instance, ProcessState? nextProcessState = null)
    {
        if (instance.Process?.CurrentTask is null)
        {
            return false;
        }

        string? taskId = instance.Process.CurrentTask.ElementId;
        string? altinnTaskType = instance.Process.CurrentTask.AltinnTaskType;

        if (nextProcessState?.CurrentTask?.FlowType == "AbandonCurrentMoveToNext")
        {
            return await _authorizationService.AuthorizeInstanceAction(instance, "reject", taskId);
        }

        // Think this IF is related to gateways, but not sure.
        if (
            nextProcessState?.CurrentTask?.FlowType is not null
            && nextProcessState.CurrentTask.FlowType != "CompleteCurrentMoveToNext"
        )
        {
            altinnTaskType = nextProcessState.CurrentTask.AltinnTaskType;
            taskId = nextProcessState.CurrentTask.ElementId;
        }

        // When no nextProcessState is provided (e.g. locking), we don't know if this is an
        // abandon flow, so we include "reject" as a fallback.
        List<string> actions = GetActionsThatAllowProcessNextForTaskType(altinnTaskType);
        if (nextProcessState is null)
        {
            actions.Add("reject");
        }

        foreach (string action in actions)
        {
            if (await _authorizationService.AuthorizeInstanceAction(instance, action, taskId))
            {
                return true;
            }
        }

        return false;
    }

    private Task<bool> AuthorizeWithSyncAdapterBypass(Instance instance)
    {
        if (_authorizationService.UserHasRequiredScope(_settings.InstanceSyncAdapterScope))
        {
            return Task.FromResult(true);
        }

        return Authorize(instance);
    }
}
