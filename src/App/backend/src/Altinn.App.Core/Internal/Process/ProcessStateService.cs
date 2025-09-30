using System.Security.Claims;
using Altinn.App.Core.Internal.Auth;
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

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessStateService"/> class.
    /// </summary>
    public ProcessStateService(IProcessReader processReader, IAuthorizationService authorizationService)
    {
        _processReader = processReader;
        _authorizationService = authorizationService;
    }

    /// <inheritdoc />
    public async Task<AppProcessState> GetAuthorizedProcessState(
        Instance instance,
        ProcessState? processState,
        ClaimsPrincipal user
    )
    {
        var appProcessState = new AppProcessState(processState);
        if (appProcessState.CurrentTask?.ElementId != null)
        {
            var flowElement = _processReader.GetFlowElement(appProcessState.CurrentTask.ElementId);
            if (flowElement is ProcessTask processTask)
            {
                appProcessState.CurrentTask.Actions = new Dictionary<string, bool>();
                var actions = new List<AltinnAction> { new("read"), new("write") };
                actions.AddRange(
                    processTask.ExtensionElements?.TaskExtension?.AltinnActions ?? new List<AltinnAction>()
                );
                var authDecisions = await _authorizationService.AuthorizeActions(instance, user, actions);
                appProcessState.CurrentTask.Actions = authDecisions
                    .Where(a => a.ActionType == ActionType.ProcessAction)
                    .ToDictionary(a => a.Id, a => a.Authorized);
                appProcessState.CurrentTask.HasReadAccess = authDecisions.Single(a => a.Id == "read").Authorized;
                appProcessState.CurrentTask.HasWriteAccess = authDecisions.Single(a => a.Id == "write").Authorized;
                appProcessState.CurrentTask.UserActions = authDecisions;
            }
        }

        var processTasks = new List<AppProcessTaskTypeInfo>();
        foreach (var processElement in _processReader.GetAllFlowElements().OfType<ProcessTask>())
        {
            processTasks.Add(
                new AppProcessTaskTypeInfo
                {
                    ElementId = processElement.Id,
                    AltinnTaskType = processElement.ExtensionElements?.TaskExtension?.TaskType,
                }
            );
        }

        appProcessState.ProcessTasks = processTasks;

        return appProcessState;
    }
}
