using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
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

    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppIdentifier _appIdentifier;
    private readonly AppSettings _appSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IWorkflowCallbackTokenGenerator _callbackTokenGenerator;

    /// <summary>
    /// The per-command default step options (tier 2), keyed by command key. Built once from the
    /// registered <see cref="IWorkflowEngineCommand"/> set; overridden per-step by a per-implementation
    /// <see cref="IProcessStepConfigurable.StepOptions"/> (tier 3) and falling back to the engine's
    /// global defaults (tier 1) when both are null.
    /// </summary>
    private readonly IReadOnlyDictionary<string, ProcessStepOptions?> _commandDefaultStepOptions;

    public ProcessNextRequestFactory(
        AppImplementationFactory appImplementationFactory,
        IAuthenticationContext authenticationContext,
        AppIdentifier appIdentifier,
        IOptions<AppSettings> appSettings,
        IAppMetadata appMetadata,
        IWorkflowCallbackTokenGenerator callbackTokenGenerator,
        IEnumerable<IWorkflowEngineCommand> commands
    )
    {
        _appImplementationFactory = appImplementationFactory;
        _authenticationContext = authenticationContext;
        _appIdentifier = appIdentifier;
        _appSettings = appSettings.Value;
        _appMetadata = appMetadata;
        _callbackTokenGenerator = callbackTokenGenerator;
        _commandDefaultStepOptions = commands
            .GroupBy(c => c.GetKey(), StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().DefaultStepOptions, StringComparer.Ordinal);
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
        List<StepRequest> commands = await AssembleCommandSequence(
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

        var request = new WorkflowEnqueueRequest
        {
            Labels = labels,
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

    private async Task<List<StepRequest>> AssembleCommandSequence(
        ProcessStateChange processStateChange,
        bool isInstantiation,
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
                isInstantiation,
                prefill,
                notification
            );
            if (workflowCommands != null)
            {
                // The task this event's commands run against (start hooks/service task read the entering
                // task; end/abandon hooks read the leaving task). This is the same id each hook feeds into
                // ShouldRunForTask at execute time, so resolving the handler here yields the same match.
                string? eventTaskId = instanceEvent.ProcessInfo?.CurrentTask?.ElementId;
                string? serviceTaskType = GetServiceTaskType(altinnTaskType);

                // Task-end/abandon commands go in the first group (they need OLD CurrentTask).
                // Task-start and process-end commands go in the second group (they need NEW CurrentTask).
                // MutateProcessState is inserted between the two groups to transition in-memory state.
                if (instanceEventType is InstanceEventType.process_EndTask or InstanceEventType.process_AbandonTask)
                {
                    taskEndSteps.AddRange(StampStepOptions(workflowCommands.Commands, eventTaskId, serviceTaskType));
                }
                else
                {
                    taskStartSteps.AddRange(StampStepOptions(workflowCommands.Commands, eventTaskId, serviceTaskType));
                }

                postCommitSteps.AddRange(
                    StampStepOptions(workflowCommands.PostProcessNextCommittedCommands, eventTaskId, serviceTaskType)
                );
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

    private StepRequest CreateMutateProcessStateCommand(ProcessStateChange processStateChange)
    {
        var payload = new SaveProcessStateToStoragePayload(processStateChange);
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        var step = new StepRequest
        {
            OperationId = MutateProcessState.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = MutateProcessState.Key, Payload = serializedPayload }
            ),
        };
        return StampStepOptions(step, taskId: null, serviceTaskType: null);
    }

    private StepRequest CreateSaveProcessStateToStorageCommand(ProcessStateChange processStateChange)
    {
        var payload = new SaveProcessStateToStoragePayload(processStateChange);
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        var step = new StepRequest
        {
            OperationId = SaveProcessStateToStorage.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = SaveProcessStateToStorage.Key, Payload = serializedPayload }
            ),
        };
        return StampStepOptions(step, taskId: null, serviceTaskType: null);
    }

    private IEnumerable<StepRequest> StampStepOptions(
        IEnumerable<StepRequest> steps,
        string? taskId,
        string? serviceTaskType
    ) => steps.Select(step => StampStepOptions(step, taskId, serviceTaskType));

    /// <summary>
    /// Resolves the effective execution timeout and retry strategy for a step and stamps them onto the
    /// outgoing request. Resolution is per-field: a per-implementation override (tier 3) wins over the
    /// command's own default (tier 2); a null on both leaves the wire field unset so the engine applies
    /// its global default (tier 1).
    /// </summary>
    private StepRequest StampStepOptions(StepRequest step, string? taskId, string? serviceTaskType)
    {
        ProcessStepOptions? commandDefault = _commandDefaultStepOptions.GetValueOrDefault(step.OperationId);
        ProcessStepOptions? implementationOverride = ResolveImplementationStepOptions(
            step.OperationId,
            taskId,
            serviceTaskType
        );

        TimeSpan? maxExecutionTime = implementationOverride?.MaxExecutionTime ?? commandDefault?.MaxExecutionTime;
        ProcessStepRetryStrategy? retryStrategy =
            implementationOverride?.RetryStrategy ?? commandDefault?.RetryStrategy;

        if (maxExecutionTime is null && retryStrategy is null)
        {
            return step;
        }

        return step with
        {
            Command = maxExecutionTime is not null
                ? step.Command with
                {
                    MaxExecutionTime = maxExecutionTime,
                }
                : step.Command,
            RetryStrategy = retryStrategy?.ToRetryStrategy() ?? step.RetryStrategy,
        };
    }

    /// <summary>
    /// Resolves the app-provided handler backing a command and returns its per-implementation step
    /// options (tier 3), or null when the command has no app-facing handler or none matches. Mirrors the
    /// handler selection each command performs at execute time so build-time and run-time agree.
    /// </summary>
    private ProcessStepOptions? ResolveImplementationStepOptions(
        string operationId,
        string? taskId,
        string? serviceTaskType
    )
    {
        if (operationId == ExecuteServiceTask.Key)
        {
            if (serviceTaskType is null)
                return null;

            return _appImplementationFactory
                .GetAll<IServiceTask>()
                .FirstOrDefault(t => t.Type.Equals(serviceTaskType, StringComparison.OrdinalIgnoreCase))
                ?.StepOptions;
        }

        if (operationId == OnTaskStartingHook.Key)
        {
            return taskId is null
                ? null
                : _appImplementationFactory
                    .GetAll<IOnTaskStartingHandler>()
                    .FirstOrDefault(h => h.ShouldRunForTask(taskId))
                    ?.StepOptions;
        }

        if (operationId == OnTaskEndingHook.Key)
        {
            return taskId is null
                ? null
                : _appImplementationFactory
                    .GetAll<IOnTaskEndingHandler>()
                    .FirstOrDefault(h => h.ShouldRunForTask(taskId))
                    ?.StepOptions;
        }

        if (operationId == OnTaskAbandonHook.Key)
        {
            return taskId is null
                ? null
                : _appImplementationFactory
                    .GetAll<IOnTaskAbandonHandler>()
                    .FirstOrDefault(h => h.ShouldRunForTask(taskId))
                    ?.StepOptions;
        }

        if (operationId == OnProcessEndingHook.Key)
        {
            return _appImplementationFactory.GetAll<IOnProcessEndingHandler>().FirstOrDefault()?.StepOptions;
        }

        return null;
    }
}
