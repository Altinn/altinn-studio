using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Result from <see cref="ProcessNextRequestFactory.Create"/> containing both the request body
/// and the metadata that must be sent via URL path and HTTP headers.
/// </summary>
internal sealed record WorkflowEnqueueBundle(
    WorkflowEnqueueRequest Request,
    string Namespace,
    string IdempotencyKey,
    Guid? CorrelationId
);

/// <summary>
/// Factory for creating WorkflowEnqueueRequest objects from process state changes.
/// Maps instance events to command sequences and assembles the complete request.
/// </summary>
internal sealed class ProcessNextRequestFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppIdentifier _appIdentifier;
    private readonly AppSettings _appSettings;
    private readonly IAppMetadata _appMetadata;

    public ProcessNextRequestFactory(
        AppImplementationFactory appImplementationFactory,
        IAuthenticationContext authenticationContext,
        AppIdentifier appIdentifier,
        IOptions<AppSettings> appSettings,
        IAppMetadata appMetadata
    )
    {
        _appImplementationFactory = appImplementationFactory;
        _authenticationContext = authenticationContext;
        _appIdentifier = appIdentifier;
        _appSettings = appSettings.Value;
        _appMetadata = appMetadata;
    }

    /// <summary>
    /// Creates a WorkflowEnqueueBundle from the process state change.
    /// The bundle contains the request body plus the metadata (namespace, idempotency key,
    /// correlation ID) that must be sent via URL path and HTTP headers.
    /// </summary>
    public async Task<WorkflowEnqueueBundle> Create(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        string? state = null,
        Actor? actor = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? idempotencyKey = null
    )
    {
        List<StepRequest> commands = await AssembleCommandSequence(processStateChange, prefill, notification);
        string effectiveIdempotencyKey = idempotencyKey ?? lockToken;

        string fromTaskId =
            processStateChange.OldProcessState?.CurrentTask?.ElementId
            ?? processStateChange.NewProcessState?.StartEvent
            ?? "Start event";
        string toTaskId =
            processStateChange.NewProcessState?.CurrentTask?.ElementId
            ?? processStateChange.NewProcessState?.EndEvent
            ?? "End event";

        Actor resolvedActor = actor ?? await ExtractActor();
        InstanceIdentifier instanceId = new(instance);

        var context = new AppWorkflowContext
        {
            Actor = resolvedActor,
            LockToken = lockToken,
            Org = _appIdentifier.Org,
            App = _appIdentifier.App,
            InstanceOwnerPartyId = instanceId.InstanceOwnerPartyId,
            InstanceGuid = instanceId.InstanceGuid,
        };

        string ns = $"{_appIdentifier.Org}/{_appIdentifier.App}";
        Guid correlationId = instanceId.InstanceGuid;

        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(context),
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = $"Process next: {fromTaskId} -> {toTaskId}",
                    Steps = commands,
                    State = state,
                    DependsOn = dependsOn,
                },
            ],
        };

        return new WorkflowEnqueueBundle(request, ns, effectiveIdempotencyKey, correlationId);
    }

    private async Task<List<StepRequest>> AssembleCommandSequence(
        ProcessStateChange processStateChange,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null
    )
    {
        var taskEndSteps = new List<StepRequest>();
        var taskStartSteps = new List<StepRequest>();
        var postCommitSteps = new List<StepRequest>();

        bool isInitialTaskStart = processStateChange.OldProcessState?.CurrentTask is null;

        foreach (InstanceEvent instanceEvent in processStateChange.Events ?? [])
        {
            if (!Enum.TryParse(instanceEvent.EventType, true, out InstanceEventType instanceEventType))
                continue;

            string? altinnTaskType = instanceEvent.ProcessInfo?.CurrentTask?.AltinnTaskType;

            WorkflowCommandSet? workflowCommands = await GetWorkflowStepsForInstanceEvent(
                instanceEventType,
                altinnTaskType,
                isInitialTaskStart,
                prefill,
                notification
            );
            if (workflowCommands != null)
            {
                // Task-end/abandon commands go in the first group (they need OLD CurrentTask).
                // Task-start and process-end commands go in the second group (they need NEW CurrentTask).
                // MutateProcessState is inserted between the two groups to transition in-memory state.
                if (instanceEventType is InstanceEventType.process_EndTask or InstanceEventType.process_AbandonTask)
                {
                    taskEndSteps.AddRange(workflowCommands.Commands);
                }
                else
                {
                    taskStartSteps.AddRange(workflowCommands.Commands);
                }

                postCommitSteps.AddRange(workflowCommands.PostProcessNextCommittedCommands);
            }
        }

        var commands = new List<StepRequest>();
        commands.AddRange(taskEndSteps);
        if (taskEndSteps.Count > 0)
        {
            commands.Add(CreateMutateProcessStateCommand(processStateChange));
        }
        commands.AddRange(taskStartSteps);
        commands.Add(CreateSaveProcessStateToStorageCommand(processStateChange));
        commands.AddRange(postCommitSteps);

        return commands;
    }

    private async Task<WorkflowCommandSet?> GetWorkflowStepsForInstanceEvent(
        InstanceEventType eventType,
        string? altinnTaskType,
        bool isInitialTaskStart,
        Dictionary<string, string>? prefill,
        InstantiationNotification? notification
    )
    {
        switch (eventType)
        {
            case InstanceEventType.process_StartEvent:
                return null;
            case InstanceEventType.process_StartTask:
                return WorkflowCommandSet.GetTaskStartSteps(
                    new TaskStartContext
                    {
                        ServiceTaskType = GetServiceTaskType(altinnTaskType),
                        IsInitialTaskStart = isInitialTaskStart,
                        Prefill = isInitialTaskStart ? prefill : null,
                        Notification = isInitialTaskStart ? notification : null,
                        RegisterEvents = _appSettings.RegisterEventsWithEventsComponent,
                    }
                );
            case InstanceEventType.process_EndTask:
                return WorkflowCommandSet.GetTaskEndSteps();
            case InstanceEventType.process_AbandonTask:
                return WorkflowCommandSet.GetTaskAbandonSteps();
            case InstanceEventType.process_EndEvent:
            {
                ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
                return WorkflowCommandSet.GetProcessEndSteps(
                    new ProcessEndContext
                    {
                        RegisterEvents = _appSettings.RegisterEventsWithEventsComponent,
                        HasAutoDeleteDataTypes = appMetadata.DataTypes.Any(dt =>
                            dt?.AppLogic?.AutoDeleteOnProcessEnd == true
                        ),
                        AutoDeleteInstanceOnProcessEnd = appMetadata.AutoDeleteOnProcessEnd == true,
                    }
                );
            }
            default:
                return null;
        }
    }

    private string? GetServiceTaskType(string? altinnTaskType)
    {
        if (altinnTaskType is null)
            return null;

        IEnumerable<IServiceTask> serviceTasks = _appImplementationFactory.GetAll<IServiceTask>();
        bool isServiceTask = serviceTasks.Any(x => x.Type.Equals(altinnTaskType, StringComparison.OrdinalIgnoreCase));
        return isServiceTask ? altinnTaskType : null;
    }

    private async Task<Actor> ExtractActor()
    {
        Authenticated currentAuth = _authenticationContext.Current;
        string userIdOrOrgNumber = currentAuth switch
        {
            Authenticated.User user => user.UserId.ToString(CultureInfo.InvariantCulture),
            Authenticated.Org org => org.OrgNo,
            Authenticated.ServiceOwner serviceOwner => serviceOwner.OrgNo,
            Authenticated.SystemUser systemUser => systemUser.SystemUserOrgNr.Get(OrganisationNumberFormat.Local),
            _ => throw new InvalidOperationException($"Unknown authentication type: {currentAuth.GetType().Name}"),
        };

        string? language = await currentAuth.GetLanguage();

        return new Actor { UserIdOrOrgNumber = userIdOrOrgNumber, Language = language };
    }

    private static StepRequest CreateMutateProcessStateCommand(ProcessStateChange processStateChange)
    {
        var payload = new SaveProcessStateToStoragePayload(processStateChange);
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        return new StepRequest
        {
            OperationId = MutateProcessState.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = MutateProcessState.Key, Payload = serializedPayload }
            ),
        };
    }

    private static StepRequest CreateSaveProcessStateToStorageCommand(ProcessStateChange processStateChange)
    {
        var payload = new SaveProcessStateToStoragePayload(processStateChange);
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        return new StepRequest
        {
            OperationId = SaveProcessStateToStorage.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = SaveProcessStateToStorage.Key, Payload = serializedPayload }
            ),
        };
    }
}
