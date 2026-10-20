using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Authorizer for the process engine.
/// </summary>
internal sealed class ProcessEngineAuthorizer : IProcessEngineAuthorizer
{
    private readonly IAuthorizationService _authorizationService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<ProcessEngineAuthorizer> _logger;

    public ProcessEngineAuthorizer(
        IAuthorizationService authorizationService,
        IHttpContextAccessor httpContextAccessor,
        AppImplementationFactory appImplementationFactory,
        ILogger<ProcessEngineAuthorizer> logger
    )
    {
        _authorizationService = authorizationService;
        _httpContextAccessor = httpContextAccessor;
        _appImplementationFactory = appImplementationFactory;
        _logger = logger;
    }

    /// <summary>
    /// Use this to determine if the user is allowed to perform process next for the current task.
    /// </summary>
    public async Task<bool> AuthorizeProcessNext(
        Instance instance,
        string? action = null,
        CancellationToken cancellationToken = default
    )
    {
        if (instance.Process.CurrentTask is null)
        {
            _logger.LogError(
                "Instance {InstanceId} has no current task. The process must be started before process next can be authorized.",
                instance.Id
            );
            return false;
        }

        string currentTaskId = instance.Process.CurrentTask.ElementId;
        string altinnTaskType = instance.Process.CurrentTask.AltinnTaskType;

        // When an action is provided we only allow process next if that action is allowed.
        if (action is not null)
        {
            bool isPerformedActionAuthorized = await _authorizationService.AuthorizeAction(
                new AppIdentifier(instance.AppId),
                new InstanceIdentifier(instance),
                _httpContext.User,
                action,
                currentTaskId,
                cancellationToken
            );

            _logger.LogInformation(
                "Process next was performed with action: {SanitizedAction}. Authorization result: {IsPerformedActionAuthorized}.",
                LogSanitizer.Sanitize(action),
                isPerformedActionAuthorized
            );

            return isPerformedActionAuthorized;
        }

        // When no action is provided we check if the user is authorized for at least one of the actions that allow process next for the current task type.
        string[] actionsThatAllowProcessNextForTaskType = GetActionsThatAllowProcessNext(altinnTaskType);

        var isAnyActionAuthorized = false;
        foreach (string actionToAuthorize in actionsThatAllowProcessNextForTaskType)
        {
            bool isActionAuthorized = await _authorizationService.AuthorizeAction(
                new AppIdentifier(instance.AppId),
                new InstanceIdentifier(instance),
                _httpContext.User,
                actionToAuthorize,
                currentTaskId,
                cancellationToken
            );

            if (isActionAuthorized)
            {
                isAnyActionAuthorized = true;
                break;
            }
        }

        _logger.LogInformation(
            "Process next performed without an action. Authorizing based on task type {AltinnTaskType}, which means using action(s) [{Actions}]. Authorization result: {IsAnyActionAuthorized}.",
            altinnTaskType,
            string.Join(",", actionsThatAllowProcessNextForTaskType),
            isAnyActionAuthorized
        );

        return isAnyActionAuthorized;
    }

    private HttpContext _httpContext =>
        _httpContextAccessor.HttpContext ?? throw new ProcessException("No HTTP context available");

    /// <summary>
    /// Get all actions that allow process next for the given task type. Meant to be used to authorize the process next when no action is provided.
    /// </summary>
    /// <remarks>
    /// Every service task, built-in or registered by the app, is allowed by <c>write</c>: the workflow engine runs it
    /// without user interaction, so a user only ever retries or resumes it. A user task type not listed here allows
    /// process next only through a policy action with the same name as the task type; <c>write</c> does not grant it.
    /// </remarks>
    private string[] GetActionsThatAllowProcessNext(string taskType)
    {
        if (_appImplementationFactory.FindServiceTask(taskType) is not null)
        {
            return ["write"];
        }

        return taskType switch
        {
            AltinnTaskTypes.Data or AltinnTaskTypes.Feedback => ["write"],
            AltinnTaskTypes.Payment => ["pay", "write"],
            AltinnTaskTypes.Confirmation => ["confirm"],
            AltinnTaskTypes.Signing => ["sign", "write"],
            _ => [taskType],
        };
    }
}
