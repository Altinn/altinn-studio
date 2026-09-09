using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
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
    /// <summary>
    /// Composite process-next id (<c>"{taskId}:{flow}"</c>, see <see cref="CreateProcessNextId(string, int)"/>)
    /// of the task the transition left. Absent on initial task start.
    /// </summary>
    internal const string ProcessNextSourceIdLabel = "processNextSourceId";

    /// <summary>
    /// Composite process-next id (<c>"{taskId}:{flow}"</c>) of the task the transition moves to.
    /// Absent on process end. Together with the source id this lets current-task lookups match a
    /// transition leaving or entering the task.
    /// </summary>
    internal const string ProcessNextTargetIdLabel = "processNextTargetId";

    /// <summary>
    /// Bare element id of the task the transition moves to, so status reads never have to parse the
    /// <c>":{flow}"</c> suffix back off <see cref="ProcessNextTargetIdLabel"/>. Absent on process end.
    /// </summary>
    internal const string ProcessNextTargetTaskLabel = "processNextTargetTask";

    /// <summary>
    /// The instance guid ("N" format), present on every process-next workflow. Groups all
    /// transitions of an instance for label-based lookups (mirrors the collection key).
    /// </summary>
    internal const string ProcessNextInstanceGuidLabel = "processNextInstanceGuid";

    /// <summary>
    /// OperationId prefix for the Main process-next workflow (the visible collection head carrying
    /// the pre-commit, commit, and post-commit steps).
    /// </summary>
    internal const string MainOperationIdPrefix = "Process next:";

    /// <summary>
    /// OperationId prefix for the fire-and-forget side-effects workflows (one single-step workflow
    /// per side effect, enqueued as an atomic batch at the commit boundary by
    /// <see cref="EnqueueSideEffectsWorkflow"/>; each OperationId carries the command key as a
    /// suffix). A human-readable naming convention for ops queries and logs only - identification
    /// (wait/settle scoping, failure classification) is by the engine-persisted
    /// <c>IsHead == false</c> directive (see <see cref="WorkflowEngineService.IsSideEffectsWorkflow"/>),
    /// not by this string.
    /// </summary>
    internal const string SideEffectsOperationIdPrefix = "Process next side-effects:";

    /// <summary>
    /// OperationId prefix for a receive workflow — enqueued by <see cref="MailboxRelay"/>, never by this
    /// factory; the constant lives here beside its siblings. A naming convention for ops and logs; nothing
    /// identifies a receiver by it.
    /// </summary>
    internal const string MailboxReceiveOperationIdPrefix = "Mailbox receive:";

    /// <summary>
    /// OperationId prefix for a workflow running a pipeline segment after an exchange concluded — enqueued by
    /// <see cref="MailboxRelay"/>, never by this factory. A naming convention for ops and logs; nothing
    /// identifies a continuation by it.
    /// </summary>
    internal const string MailboxContinueOperationIdPrefix = "Mailbox continue:";

    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppIdentifier _appIdentifier;
    private readonly AppSettings _appSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IWorkflowCallbackTokenGenerator _callbackTokenGenerator;
    private readonly ProcessStepOptionsResolver _stepOptionsResolver;
    private readonly ProcessTaskResolver _processTaskResolver;

    public ProcessNextRequestFactory(
        AppImplementationFactory appImplementationFactory,
        IAuthenticationContext authenticationContext,
        AppIdentifier appIdentifier,
        IOptions<AppSettings> appSettings,
        IAppMetadata appMetadata,
        IWorkflowCallbackTokenGenerator callbackTokenGenerator,
        ProcessStepOptionsResolver stepOptionsResolver,
        ProcessTaskResolver processTaskResolver
    )
    {
        _appImplementationFactory = appImplementationFactory;
        _authenticationContext = authenticationContext;
        _appIdentifier = appIdentifier;
        _appSettings = appSettings.Value;
        _appMetadata = appMetadata;
        _callbackTokenGenerator = callbackTokenGenerator;
        _stepOptionsResolver = stepOptionsResolver;
        _processTaskResolver = processTaskResolver;
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
        string? collectionKey = CreateCollectionKey(instanceId);
        Dictionary<string, string> labels =
            CreateProcessNextLabels(processStateChange) ?? new Dictionary<string, string>(StringComparer.Ordinal);
        labels[ProcessNextInstanceGuidLabel] = instanceId.InstanceGuid.ToString("N", CultureInfo.InvariantCulture);

        JsonElement serializedContext = JsonSerializer.SerializeToElement(context);

        // The Main workflow's step sequence: everything through the SaveProcessStateToStorage
        // commit, then - when the transition has side effects - the EnqueueSideEffectsWorkflow
        // step that schedules them, then the critical post-commit commands. Enqueueing at the
        // commit boundary makes the side effects exist if and only if the transition committed,
        // and lets them run promptly without waiting for e.g. a service task.
        List<StepRequest> mainSteps = commands.ThroughCommit;
        if (commands.SideEffects.Count > 0)
        {
            var sideEffectsEnqueueRequest = new WorkflowEnqueueRequest
            {
                Labels = labels,
                Context = serializedContext,
                // One single-step workflow per side effect: the effects are independent
                // outcomes, so each gets its own failure containment - a dead-lettered event
                // registration must not starve the notification behind it - and its own retry
                // pacing, alert row, and redrive. Should a side effect ever need ordering
                // relative to another, express it explicitly via DependsOn rather than as an
                // accident of step-list position.
                Workflows = commands
                    .SideEffects.Select(step => new WorkflowRequest
                    {
                        OperationId = $"{SideEffectsOperationIdPrefix} {fromTaskId} -> {toTaskId} · {step.OperationId}",
                        Steps = [step],
                        // The command injects State (this step's commit-time state blob) and
                        // Links (the Main workflow id) when it executes.
                        // Invisible to the collection heads frontier and started immediately:
                        // independent roots that neither consume nor become heads, so the
                        // ProcessNext wait and the next transition never key off them.
                        IsHead = false,
                        DependsOnHeads = false,
                    })
                    .ToList(),
            };
            mainSteps.Add(CreateEnqueueSideEffectsWorkflowCommand(sideEffectsEnqueueRequest));
        }
        mainSteps.AddRange(commands.CriticalPostCommit);
        mainSteps = SplitSigneeInitialization(
            mainSteps,
            labels,
            serializedContext,
            $"{MainOperationIdPrefix} {fromTaskId} -> {toTaskId}"
        );

        var request = new WorkflowEnqueueRequest
        {
            Labels = labels,
            Context = serializedContext,
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = $"{MainOperationIdPrefix} {fromTaskId} -> {toTaskId}",
                    Steps = mainSteps,
                    State = state,
                    DependsOn = dependsOn,
                },
            ],
        };

        return new WorkflowEnqueueEnvelope(request, ns, effectiveIdempotencyKey, collectionKey);
    }

    private List<StepRequest> SplitSigneeInitialization(
        List<StepRequest> steps,
        Dictionary<string, string> labels,
        JsonElement context,
        string operationId
    )
    {
        int index = steps.FindIndex(step => SigningWorkflowSteps.GetKey(step) == ScheduleSigneeInitialization.Key);
        if (index < 0)
        {
            return steps;
        }
        if (steps.Skip(index + 1).Any(step => SigningWorkflowSteps.GetKey(step) == ScheduleSigneeInitialization.Key))
        {
            throw new ApplicationConfigException(
                "A process transition can initialize only one delegated signing task."
            );
        }

        AppCommandData command = SigningWorkflowSteps.GetAppCommand(steps[index]);
        var marker = CommandPayloadSerializer.Deserialize<ScheduleSigneeInitializationPayload>(command.Payload);
        if (marker is null || string.IsNullOrWhiteSpace(marker.TaskId))
        {
            throw new ApplicationConfigException(
                "The signing initialization scheduling command must specify its task ID."
            );
        }

        // Freeze the original tail and all runtime-expanded command options. The callback only binds
        // persisted recipient identities and the published state; retries enqueue the same request body.
        var continuation = new WorkflowEnqueueRequest
        {
            Labels = labels,
            Context = context,
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = operationId,
                    Steps = steps.Skip(index + 1).ToList(),
                    IsHead = true,
                    DependsOnHeads = false,
                },
            ],
        };
        var payload = marker with
        {
            Continuation = continuation,
            DelegationStep = SigningWorkflowSteps
                .Create(DelegateSigneeRightsCommand.Key)
                .ApplyStepOptions(_stepOptionsResolver, marker.TaskId, null),
            NotificationStep = SigningWorkflowSteps
                .Create(NotifySigneeCommand.Key)
                .ApplyStepOptions(_stepOptionsResolver, marker.TaskId, null),
            NotificationSchedulerStep = SigningWorkflowSteps
                .Create(ScheduleSigneeNotifications.Key)
                .ApplyStepOptions(_stepOptionsResolver, marker.TaskId, null),
        };
        var preparation = steps.Take(index).ToList();
        preparation.Add(SigningWorkflowSteps.WithPayload(steps[index], payload));
        return preparation;
    }

    /// <summary>
    /// The collection key that groups every process-next workflow for an instance. This is the
    /// single source of truth for the key algorithm: any caller that needs to look up an instance's
    /// workflows (e.g. read-path status enrichment in <c>ResolveWorkflowTaskStatus</c>) must derive
    /// the key here, so a future change (e.g. adding a prefix) trickles down to enqueue and lookups
    /// alike and they cannot drift apart.
    /// </summary>
    internal static string CreateCollectionKey(InstanceIdentifier instanceIdentifier) =>
        $"{instanceIdentifier.InstanceGuid}";

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

        if (processStateChange.NewProcessState?.CurrentTask is { ElementId.Length: > 0 } targetTask)
        {
            labels[ProcessNextTargetIdLabel] = CreateProcessNextId(targetTask.ElementId, targetTask.Flow ?? 0);
            labels[ProcessNextTargetTaskLabel] = targetTask.ElementId;
        }

        return labels.Count > 0 ? labels : null;
    }

    /// <summary>
    /// The assembled step lists for one transition: the Main workflow's sequence through the
    /// SaveProcessStateToStorage commit, the critical post-commit commands that follow it, and the
    /// non-critical side-effect steps destined for the separate side-effects workflow (enqueued at
    /// the commit boundary by <see cref="EnqueueSideEffectsWorkflow"/>).
    /// </summary>
    private readonly record struct AssembledCommands(
        List<StepRequest> ThroughCommit,
        List<StepRequest> CriticalPostCommit,
        List<StepRequest> SideEffects
    );

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

            // The task this event's commands run against (start hooks/service task/the task type's own
            // commands read the entering task; end/abandon hooks and commands read the leaving task). This
            // is the same id each hook feeds into ShouldRunForTask at execute time, and the id the task
            // type declares its commands for, so resolving either here yields the same match.
            string? eventTaskId = instanceEvent.ProcessInfo?.CurrentTask?.ElementId;

            WorkflowCommandSet? workflowCommands = await GetWorkflowStepsForInstanceEvent(
                instanceEventType,
                altinnTaskType,
                eventTaskId,
                isInitialTaskStart,
                isInstantiation,
                prefill,
                notification
            );
            if (workflowCommands != null)
            {
                string? serviceTaskType = GetServiceTaskType(altinnTaskType);

                // Task-end/abandon commands go in the first group (they need OLD CurrentTask).
                // Task-start and process-end commands go in the second group (they need NEW CurrentTask).
                // MutateProcessState is inserted between the two groups to transition in-memory state.
                if (instanceEventType is InstanceEventType.process_EndTask or InstanceEventType.process_AbandonTask)
                {
                    taskEndSteps.AddRange(
                        workflowCommands.Commands.ApplyStepOptions(_stepOptionsResolver, eventTaskId, serviceTaskType)
                    );
                }
                else
                {
                    taskStartSteps.AddRange(
                        workflowCommands.Commands.ApplyStepOptions(_stepOptionsResolver, eventTaskId, serviceTaskType)
                    );
                }

                criticalPostCommitSteps.AddRange(
                    workflowCommands.CriticalPostCommitCommands.ApplyStepOptions(
                        _stepOptionsResolver,
                        eventTaskId,
                        serviceTaskType
                    )
                );
                sideEffectSteps.AddRange(
                    workflowCommands.SideEffectCommands.ApplyStepOptions(
                        _stepOptionsResolver,
                        eventTaskId,
                        serviceTaskType
                    )
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

        return new AssembledCommands(commands, criticalPostCommitSteps, sideEffectSteps);
    }

    private async Task<WorkflowCommandSet?> GetWorkflowStepsForInstanceEvent(
        InstanceEventType eventType,
        string? altinnTaskType,
        string? eventTaskId,
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
            {
                string? serviceTaskType = GetServiceTaskType(altinnTaskType);
                return WorkflowCommandSet.GetTaskStartSteps(
                    new TaskStartContext
                    {
                        ServiceTask = ResolveServiceTask(serviceTaskType),
                        StartCommands = ResolveTaskCommands(
                            altinnTaskType,
                            eventTaskId,
                            (task, taskId) => task.GetStartCommands(taskId)
                        ),
                        IsInitialTaskStart = isInitialTaskStart,
                        IsInstantiation = isInstantiation,
                        Prefill = isInitialTaskStart ? prefill : null,
                        Notification = isInitialTaskStart ? notification : null,
                        RegisterEvents = _appSettings.RegisterEventsWithEventsComponent,
                    }
                );
            }
            case InstanceEventType.process_EndTask:
                return WorkflowCommandSet.GetTaskEndSteps(
                    ResolveTaskCommands(altinnTaskType, eventTaskId, (task, taskId) => task.GetEndCommands(taskId))
                );
            case InstanceEventType.process_AbandonTask:
                return WorkflowCommandSet.GetTaskAbandonSteps(
                    ResolveTaskCommands(altinnTaskType, eventTaskId, (task, taskId) => task.GetAbandonCommands(taskId))
                );
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

        return _appImplementationFactory.FindServiceTask(altinnTaskType) is not null ? altinnTaskType : null;
    }

    /// <summary>
    /// The commands the task type declares for one lifecycle phase of the given BPMN task. Read at enqueue time,
    /// which fixes the step list for the workflow's lifetime. The same <see cref="ProcessTaskResolver"/>
    /// selects the implementation during startup validation.
    /// A task type with no registered implementation fails here, at enqueue, rather than at its first step.
    /// </summary>
    private IReadOnlyList<WorkflowCommandRef> ResolveTaskCommands(
        string? altinnTaskType,
        string? taskId,
        Func<IProcessTask, string, IReadOnlyList<WorkflowCommandRef>> declare
    )
    {
        if (taskId is null)
            return [];

        IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
        return declare(processTask, taskId);
    }

    /// <summary>
    /// The service task and its composed pipeline, or null when this is not a service task (or names a
    /// type no implementation is registered for). Read at enqueue time: this is the moment the pipeline's
    /// shape is fixed for the workflow's lifetime — callback dispatch is by item index, and whether the
    /// transition ends with a concluding step or with a receive workflow is decided here.
    /// </summary>
    private ResolvedServiceTask? ResolveServiceTask(string? serviceTaskType) =>
        serviceTaskType is not null
        && _appImplementationFactory.FindServiceTask(serviceTaskType)?.ResolvePipeline() is { } pipeline
            ? new ResolvedServiceTask(serviceTaskType, pipeline)
            : null;

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
                SystemUserOwnerOrgNo = systemUser.SystemUserOrgNr.Get(OrganizationNumberFormat.Local),
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
        return step.ApplyStepOptions(_stepOptionsResolver, taskId: null, serviceTaskType: null);
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
        return step.ApplyStepOptions(_stepOptionsResolver, taskId: null, serviceTaskType: null);
    }

    private StepRequest CreateEnqueueSideEffectsWorkflowCommand(WorkflowEnqueueRequest sideEffectsEnqueueRequest)
    {
        var payload = new EnqueueSideEffectsWorkflowPayload(sideEffectsEnqueueRequest);
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        var step = new StepRequest
        {
            OperationId = EnqueueSideEffectsWorkflow.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = EnqueueSideEffectsWorkflow.Key, Payload = serializedPayload }
            ),
        };
        return step.ApplyStepOptions(_stepOptionsResolver, taskId: null, serviceTaskType: null);
    }
}
