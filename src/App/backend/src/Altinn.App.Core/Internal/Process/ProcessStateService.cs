using System.Security.Claims;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Service for converting and enriching process state information with authorization details.
/// </summary>
public sealed class ProcessStateService : IProcessStateService
{
    private readonly IProcessReader _processReader;
    private readonly IAuthorizationService _authorizationService;
    private readonly IInstanceClient _instanceClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessStateService"/> class.
    /// </summary>
    public ProcessStateService(
        IProcessReader processReader,
        IAuthorizationService authorizationService,
        IInstanceClient instanceClient
    )
    {
        _processReader = processReader;
        _authorizationService = authorizationService;
        _instanceClient = instanceClient;
    }

    /// <inheritdoc />
    public async Task<AppProcessState> GetProcessState(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        ClaimsPrincipal user
    )
    {
        var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        return await ConvertAndAuthorizeActions(instance, instance.Process, user);
    }

    /// <inheritdoc />
    public async Task<AppProcessState> ConvertAndAuthorizeActions(
        Instance instance,
        ProcessState? processState,
        ClaimsPrincipal user
    )
    {
        AppProcessState appProcessState = new(processState);
        if (appProcessState.CurrentTask?.ElementId != null)
        {
            var flowElement = _processReader.GetFlowElement(appProcessState.CurrentTask.ElementId);
            if (flowElement is ProcessTask processTask)
            {
                appProcessState.CurrentTask.Actions = [];
                List<AltinnAction> actions =
                [
                    new("read"),
                    new("write"),
                    .. processTask.ExtensionElements?.TaskExtension?.AltinnActions ?? [],
                ];
                var authDecisions = await _authorizationService.AuthorizeActions(instance, user, actions);
                appProcessState.CurrentTask.Actions = authDecisions
                    .Where(a => a.ActionType == ActionType.ProcessAction)
                    .ToDictionary(a => a.Id, a => a.Authorized);
                appProcessState.CurrentTask.HasReadAccess = authDecisions.Single(a => a.Id == "read").Authorized;
                appProcessState.CurrentTask.HasWriteAccess = authDecisions.Single(a => a.Id == "write").Authorized;
                appProcessState.CurrentTask.UserActions = authDecisions;
                appProcessState.CurrentTask.ElementType = flowElement.ElementType();
            }
        }

        var processTasks = new List<AppProcessTaskTypeInfo>();
        foreach (ProcessTask processElement in _processReader.GetAllFlowElements().OfType<ProcessTask>())
        {
            processTasks.Add(
                new AppProcessTaskTypeInfo
                {
                    ElementId = processElement.Id,
                    ElementType = processElement.ElementType(),
                    AltinnTaskType = processElement.ExtensionElements?.TaskExtension?.TaskType,
                }
            );
        }

        appProcessState.ProcessTasks = processTasks;

        return appProcessState;
    }
}
