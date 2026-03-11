using System.Security.Claims;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using IAuthorizationService = Altinn.App.Core.Internal.Auth.IAuthorizationService;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Enriches a <see cref="ProcessState"/> into an <see cref="AppProcessState"/>
/// with authorized actions, read/write access, element types, and process task metadata.
/// </summary>
public sealed class ProcessStateEnricher
{
    private readonly IProcessReader _processReader;
    private readonly IAuthorizationService _authorization;

    public ProcessStateEnricher(IProcessReader processReader, IAuthorizationService authorization)
    {
        _processReader = processReader;
        _authorization = authorization;
    }

    public async Task<AppProcessState> Enrich(Instance instance, ProcessState? processState, ClaimsPrincipal user)
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
                var authDecisions = await _authorization.AuthorizeActions(instance, user, actions);
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
        foreach (var processElement in _processReader.GetAllFlowElements().OfType<ProcessTask>())
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
