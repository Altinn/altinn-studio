using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
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
internal sealed record WorkflowEnqueueEnvelope(
    WorkflowEnqueueRequest Request,
    string Namespace,
    string IdempotencyKey,
    string? CollectionKey
);

/// <summary>
/// Factory for creating WorkflowEnqueueRequest objects from process state changes.
/// Maps instance events to command sequences and assembles the complete request.
/// </summary>
internal sealed class ProcessNextRequestFactory
{
    internal const string ProcessNextIdLabel = "processNextId";
    internal const string ProcessNextSourceIdLabel = "processNextSourceId";
    internal const string ProcessNextTargetIdLabel = "processNextTargetId";
    internal const string ProcessNextInstanceGuidLabel = "processNextInstanceGuid";

    /// <summary>
    /// Batch-scoped ref for the Main workflow, only set when a side-effects workflow references it.
    /// </summary>
    internal const string MainWorkflowRef = "main";

    /// <summary>
    /// OperationId prefix identifying the fire-and-forget side-effects workflow. The wait/settle
    /// logic in <see cref="WorkflowEngineService"/> uses this to exclude side-effects workflows
    /// from the chain it blocks on and from failure classification.
    /// </summary>
    internal const string SideEffectsOperationIdPrefix = "Process next side-effects:";

    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppIdentifier _appIdentifier;
    private readonly AppSettings _appSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IWorkflowCallbackTokenGenerator _callbackTokenGenerator;
    private readonly WorkflowCallbackStateRewriter _callbackStateRewriter;

    public ProcessNextRequestFactory(
        AppImplementationFactory appImplementationFactory,
        IAuthenticationContext authenticationContext,
        AppIdentifier appIdentifier,
        IOptions<AppSettings> appSettings,
        IAppMetadata appMetadata,
        IWorkflowCallbackTokenGenerator callbackTokenGenerator,
        WorkflowCallbackStateRewriter callbackStateRewriter
    )
    {
        _appImplementationFactory = appImplementationFactory;
        _authenticationContext = authenticationContext;
        _appIdentifier = appIdentifier;
        _appSettings = appSettings.Value;
        _appMetadata = appMetadata;
        _callbackTokenGenerator = callbackTokenGenerator;
        _callbackStateRewriter = callbackStateRewriter;
    }

    /// <summary>
    /// Creates a WorkflowEnqueueEnvelope from the process state change.
    /// The bundle contains the request body plus the metadata (namespace, idempotency key,
    /// collection key) that must be sent via URL path and HTTP headers.
    /// </summary>
    public async Task<WorkflowEnqueueEnvelope> Create(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        string? state = null,
        bool isInstantiation = false,
        Actor? actor = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? idempotencyKey = null
    )
    {
        AssembledCommands commands = await AssembleCommandSequence(
            processStateChange,
            isInstantiation,
            prefill,
            notification
        );
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
            CallbackToken = _callbackTokenGenerator.GenerateToken(instanceId.InstanceGuid),
        };

        string ns = $"{_appIdentifier.Org}/{_appIdentifier.App}";
        string? collectionKey = $"{instanceId.InstanceGuid}";
        Dictionary<string, string> labels =
            CreateProcessNextLabels(processStateChange) ?? new Dictionary<string, string>(StringComparer.Ordinal);
        labels[ProcessNextInstanceGuidLabel] = instanceId.InstanceGuid.ToString("N", CultureInfo.InvariantCulture);

        // Main must stay Workflows[0]: the enqueue response's first workflow id is used to scope the wait.
        bool hasSideEffects = commands.SideEffects.Count > 0;
        var workflows = new List<WorkflowRequest>
        {
            new()
            {
                Ref = hasSideEffects ? MainWorkflowRef : null,
                OperationId = $"Process next: {fromTaskId} -> {toTaskId}",
                Steps = commands.Main,
                State = state,
                DependsOn = dependsOn,
            },
        };

        if (hasSideEffects)
        {
            // The side-effects workflow starts from its own state blob: it must reflect the
            // committed (NEW) process state, which Main's initial blob does not (it is captured
            // before the in-memory transition and only evolves within Main's own step chain).
            string? sideEffectState =
                state is not null && processStateChange.NewProcessState is { } newProcessState
                    ? _callbackStateRewriter.WithProcessState(state, newProcessState)
                    : state;

            workflows.Add(
                new WorkflowRequest
                {
                    OperationId = $"{SideEffectsOperationIdPrefix} {fromTaskId} -> {toTaskId}",
                    Steps = commands.SideEffects,
                    State = sideEffectState,
                    DependsOn = [WorkflowRef.FromRefString(MainWorkflowRef)],
                    // Invisible to the collection heads frontier: the next transition and the
                    // enqueue wait key off Main only. DependsOnHeads is a no-op (not a root).
                    IsHead = false,
                }
            );
        }

        var request = new WorkflowEnqueueRequest
        {
            Labels = labels,
            Context = JsonSerializer.SerializeToElement(context),
            Workflows = workflows,
        };

        return new WorkflowEnqueueEnvelope(request, ns, effectiveIdempotencyKey, collectionKey);
    }

    internal static string? CreateProcessNextId(ProcessElementInfo? currentTask) =>
        currentTask?.ElementId is { Length: > 0 } taskId ? CreateProcessNextId(taskId, currentTask.Flow ?? 0) : null;

    internal static string CreateProcessNextId(string taskId, int flow) => $"{taskId}:{flow}";

    internal static Dictionary<string, string>? CreateProcessNextLabels(ProcessStateChange processStateChange)
    {
        var labels = new Dictionary<string, string>(StringComparer.Ordinal);

        if (CreateProcessNextId(processStateChange.OldProcessState?.CurrentTask) is { } sourceId)
        {
            labels[ProcessNextSourceIdLabel] = sourceId;
        }

        if (CreateProcessNextId(processStateChange.NewProcessState?.CurrentTask) is { } targetId)
        {
            labels[ProcessNextTargetIdLabel] = targetId;

            // Keep the original label for existing workflow lookups and dashboard filters.
            labels[ProcessNextIdLabel] = targetId;
        }

        return labels.Count > 0 ? labels : null;
    }

    /// <summary>
    /// The assembled step lists for one transition: the Main workflow's full sequence and the
    /// non-critical side-effect steps destined for the separate side-effects workflow.
    /// </summary>
    private readonly record struct AssembledCommands(List<StepRequest> Main, List<StepRequest> SideEffects);

    private async Task<AssembledCommands> AssembleCommandSequence(
        ProcessStateChange processStateChange,
        bool isInstantiation,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null
    )
    {
        var taskEndSteps = new List<StepRequest>();
        var taskStartSteps = new List<StepRequest>();
        var criticalPostCommitSteps = new List<StepRequest>();
        var sideEffectSteps = new List<StepRequest>();

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
                isInstantiation,
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

                criticalPostCommitSteps.AddRange(workflowCommands.CriticalPostCommitCommands);
                sideEffectSteps.AddRange(workflowCommands.SideEffectCommands);
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
        commands.AddRange(criticalPostCommitSteps);

        return new AssembledCommands(commands, sideEffectSteps);
    }

    private async Task<WorkflowCommandSet?> GetWorkflowStepsForInstanceEvent(
        InstanceEventType eventType,
        string? altinnTaskType,
        bool isInitialTaskStart,
        bool isInstantiation,
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
                        IsInstantiation = isInstantiation,
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
        if (currentAuth is Authenticated.User user)
        {
            Authenticated.User.Details details = await user.LoadDetails(validateSelectedParty: true);
            string? userLanguage = await currentAuth.GetLanguage();
            return new Actor
            {
                UserId = user.UserId,
                AuthenticationLevel = user.AuthenticationLevel,
                NationalIdentityNumber = details.Profile.Party.SSN,
                Language = userLanguage,
            };
        }

        string? resolvedLanguage = await currentAuth.GetLanguage();
        return currentAuth switch
        {
            Authenticated.Org org => new Actor
            {
                OrgId = org.OrgNo,
                AuthenticationLevel = org.AuthenticationLevel,
                Language = resolvedLanguage,
            },
            Authenticated.ServiceOwner serviceOwner => new Actor
            {
                OrgId = serviceOwner.OrgNo,
                AuthenticationLevel = serviceOwner.AuthenticationLevel,
                Language = resolvedLanguage,
            },
            Authenticated.SystemUser systemUser => new Actor
            {
                AuthenticationLevel = systemUser.AuthenticationLevel,
                SystemUserId = systemUser.SystemUserId[0],
                SystemUserOwnerOrgNo = systemUser.SystemUserOrgNr.Get(OrganisationNumberFormat.Local),
                SystemUserName = null,
                Language = resolvedLanguage,
            },
            _ => throw new InvalidOperationException($"Unknown authentication type: {currentAuth.GetType().Name}"),
        };
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
