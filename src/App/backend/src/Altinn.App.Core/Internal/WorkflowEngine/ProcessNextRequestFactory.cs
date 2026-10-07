using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
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
/// Result from <see cref="ProcessNextRequestFactory.CreateChainInitiating"/> containing both the request body
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
    /// <strong>Step</strong> label (the others here are workflow labels): the bare id of the BPMN element
    /// whose lifecycle this step runs — the task being left on a task-end/abandon step, the task being
    /// entered on a task-start step, and the end event on a process-end step. A transition's step list
    /// spans two elements, so the element is a per-step fact and cannot be read off the workflow's own
    /// labels; this is what lets a consumer attribute a step to an element without knowing what any
    /// command is called.
    ///
    /// Carried only by the pre-commit lifecycle steps, which is exactly the run the dashboard brackets
    /// under one element name. The transition-level steps around them (<c>AcquireProcessingStatus</c>,
    /// <c>MutateProcessState</c>, <c>CommitProcessState</c>, <c>EnqueueSideEffectsWorkflow</c>) belong to
    /// the transition rather than to either element and stay unlabeled, and so do the post-commit and
    /// side-effect steps: labeling those would draw the entering element's name a second time, after the
    /// commit, around work the first bracket already named.
    /// </summary>
    internal const string ProcessNextElementLabel = "processNextElement";

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
    private readonly IWorkflowCallbackTokenGenerator _callbackTokenGenerator;
    private readonly ProcessStepOptionsResolver _stepOptionsResolver;

    public ProcessNextRequestFactory(
        AppImplementationFactory appImplementationFactory,
        IAuthenticationContext authenticationContext,
        AppIdentifier appIdentifier,
        IOptions<AppSettings> appSettings,
        IWorkflowCallbackTokenGenerator callbackTokenGenerator,
        ProcessStepOptionsResolver stepOptionsResolver
    )
    {
        _appImplementationFactory = appImplementationFactory;
        _authenticationContext = authenticationContext;
        _appIdentifier = appIdentifier;
        _appSettings = appSettings.Value;
        _callbackTokenGenerator = callbackTokenGenerator;
        _stepOptionsResolver = stepOptionsResolver;
    }

    /// <summary>
    /// Creates a WorkflowEnqueueEnvelope from the process state change.
    /// The bundle contains the request body plus the metadata (namespace, idempotency key,
    /// collection key) that must be sent via URL path and HTTP headers.
    /// <paramref name="language"/> is the language the instance was created with (see <see cref="ExtractActor"/>).
    /// </summary>
    public Task<WorkflowEnqueueEnvelope> CreateChainInitiating(
        Instance instance,
        ProcessStateChange processStateChange,
        string idempotencyKey,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? language = null
    ) =>
        Create(
            instance,
            processStateChange,
            acquireProcessingStatus: true,
            state,
            isInstantiation,
            actor: null,
            language,
            dependsOn: null,
            prefill,
            notification,
            idempotencyKey
        );

    /// <summary>
    /// Claims the instance before the callback computes and enqueues the transition's steps.
    /// Only the source task is known until acquisition succeeds and the callback computes the transition.
    /// <paramref name="language"/> is the language process/next was called with (see <see cref="ExtractActor"/>).
    /// </summary>
    public async Task<WorkflowEnqueueEnvelope> CreateAcquire(
        Instance instance,
        string? action,
        string state,
        string idempotencyKey,
        string? language
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(idempotencyKey);
        InstanceIdentifier instanceId = new(instance);
        Actor actor = await ExtractActor(language);
        List<WorkflowRequest> workflows =
        [
            new WorkflowRequest
            {
                OperationId = $"{MainOperationIdPrefix} Mark instance as processing",
                Steps = [CreateCommand(ProcessingStatusAcquirer.Key, new AcquireProcessingStatusPayload(action))],
                State = state,
            },
        ];
        var context = new AppWorkflowContext
        {
            Actor = actor,
            Org = _appIdentifier.Org,
            App = _appIdentifier.App,
            InstanceOwnerPartyId = instanceId.InstanceOwnerPartyId,
            InstanceGuid = instanceId.InstanceGuid,
            CallbackToken = _callbackTokenGenerator.GenerateToken(instanceId.InstanceGuid, actor, workflows),
        };
        var labels = new Dictionary<string, string>(StringComparer.Ordinal);
        if (CreateProcessNextId(instance.Process?.CurrentTask) is { } sourceId)
        {
            labels[ProcessNextSourceIdLabel] = sourceId;
        }
        labels[ProcessNextInstanceGuidLabel] = instanceId.InstanceGuid.ToString("N", CultureInfo.InvariantCulture);
        var request = new WorkflowEnqueueRequest
        {
            Labels = labels,
            Context = JsonSerializer.SerializeToElement(context),
            Workflows = workflows,
        };
        return new WorkflowEnqueueEnvelope(
            request,
            $"{_appIdentifier.Org}/{_appIdentifier.App}",
            idempotencyKey,
            CreateCollectionKey(instanceId)
        );
    }

    /// <summary>
    /// Creates an engine-owned continuation that remains inside an already acquired transition chain.
    /// </summary>
    public Task<WorkflowEnqueueEnvelope> CreateDependent(
        Instance instance,
        ProcessStateChange processStateChange,
        string state,
        Actor actor,
        IEnumerable<WorkflowRef> dependsOn,
        string idempotencyKey
    ) =>
        Create(
            instance,
            processStateChange,
            acquireProcessingStatus: false,
            state,
            isInstantiation: false,
            actor,
            language: null,
            dependsOn,
            prefill: null,
            notification: null,
            idempotencyKey
        );

    private async Task<WorkflowEnqueueEnvelope> Create(
        Instance instance,
        ProcessStateChange processStateChange,
        bool acquireProcessingStatus,
        string? state,
        bool isInstantiation,
        Actor? actor,
        string? language,
        IEnumerable<WorkflowRef>? dependsOn,
        Dictionary<string, string>? prefill,
        InstantiationNotification? notification,
        string idempotencyKey
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(idempotencyKey);

        AssembledCommands commands = AssembleCommandSequence(
            processStateChange,
            acquireProcessingStatus,
            isInstantiation,
            prefill,
            notification
        );
        string fromTaskId =
            processStateChange.OldProcessState?.CurrentTask?.ElementId
            ?? processStateChange.NewProcessState?.StartEvent
            ?? "Start event";
        string toTaskId =
            processStateChange.NewProcessState?.CurrentTask?.ElementId
            ?? processStateChange.NewProcessState?.EndEvent
            ?? "End event";

        Actor resolvedActor = actor ?? await ExtractActor(language);
        InstanceIdentifier instanceId = new(instance);

        string ns = $"{_appIdentifier.Org}/{_appIdentifier.App}";
        string? collectionKey = CreateCollectionKey(instanceId);
        Dictionary<string, string> labels =
            CreateProcessNextLabels(processStateChange) ?? new Dictionary<string, string>(StringComparer.Ordinal);
        labels[ProcessNextInstanceGuidLabel] = instanceId.InstanceGuid.ToString("N", CultureInfo.InvariantCulture);

        // The Main workflow's step sequence: everything through the CommitProcessState
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
                // Runtime authentication is added by the enqueue command. Embedding a freshly minted
                // callback token here would change the parent's hashed payload on every reconstruction.
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

        List<WorkflowRequest> workflows =
        [
            new WorkflowRequest
            {
                OperationId = $"{MainOperationIdPrefix} {fromTaskId} -> {toTaskId}",
                Steps = mainSteps,
                State = state,
                DependsOn = dependsOn,
            },
        ];
        var context = new AppWorkflowContext
        {
            Actor = resolvedActor,
            Org = _appIdentifier.Org,
            App = _appIdentifier.App,
            InstanceOwnerPartyId = instanceId.InstanceOwnerPartyId,
            InstanceGuid = instanceId.InstanceGuid,
            CallbackToken = _callbackTokenGenerator.GenerateToken(instanceId.InstanceGuid, resolvedActor, workflows),
        };

        var request = new WorkflowEnqueueRequest
        {
            Labels = labels,
            Context = JsonSerializer.SerializeToElement(context),
            Workflows = workflows,
        };

        return new WorkflowEnqueueEnvelope(request, ns, idempotencyKey, collectionKey);
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
    /// CommitProcessState commit, the critical post-commit commands that follow it, and the
    /// non-critical side-effect steps destined for the separate side-effects workflow (enqueued at
    /// the commit boundary by <see cref="EnqueueSideEffectsWorkflow"/>).
    /// </summary>
    private readonly record struct AssembledCommands(
        List<StepRequest> ThroughCommit,
        List<StepRequest> CriticalPostCommit,
        List<StepRequest> SideEffects
    );

    private AssembledCommands AssembleCommandSequence(
        ProcessStateChange processStateChange,
        bool acquireProcessingStatus,
        bool isInstantiation,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null
    )
    {
        var taskEndSteps = new List<StepRequest>();
        var taskStartSteps = new List<StepRequest>();
        var criticalPostCommitSteps = new List<StepRequest>();
        var sideEffectSteps = new List<StepRequest>();
        bool serviceTaskFollowsCommit = false;

        bool isInitialTaskStart = processStateChange.OldProcessState?.CurrentTask is null;

        foreach (InstanceEvent instanceEvent in processStateChange.Events ?? [])
        {
            if (!Enum.TryParse(instanceEvent.EventType, true, out InstanceEventType instanceEventType))
                continue;

            string? altinnTaskType = instanceEvent.ProcessInfo?.CurrentTask?.AltinnTaskType;
            string? serviceTaskType = GetServiceTaskType(altinnTaskType);

            WorkflowCommandSet? workflowCommands = GetWorkflowStepsForInstanceEvent(
                instanceEvent,
                instanceEventType,
                serviceTaskType,
                isInitialTaskStart,
                isInstantiation,
                prefill,
                notification
            );
            if (workflowCommands != null)
            {
                serviceTaskFollowsCommit |= workflowCommands.ServiceTaskFollowsCommit;

                // The task this event's commands run against (start hooks/service task read the entering
                // task; end/abandon hooks read the leaving task). This is the same id each hook feeds into
                // ShouldRunForTask at execute time, so resolving the handler here yields the same match.
                string? eventTaskId = instanceEvent.ProcessInfo?.CurrentTask?.ElementId;

                // The BPMN element these commands run for, which is the task for every event that has one
                // and the end event for process end — where CurrentTask is deliberately null, the ended
                // state having no current task. Options resolution stays keyed on the task alone: an end
                // event is not a task and configures none of the per-task step options.
                string? eventElementId = eventTaskId ?? instanceEvent.ProcessInfo?.EndEvent;

                // Task-end/abandon commands go in the first group (they need OLD CurrentTask).
                // Task-start and process-end commands go in the second group (they need NEW CurrentTask).
                // MutateProcessState is inserted between the two groups to transition in-memory state.
                if (instanceEventType is InstanceEventType.process_EndTask or InstanceEventType.process_AbandonTask)
                {
                    taskEndSteps.AddRange(
                        workflowCommands
                            .Commands.ApplyStepOptions(_stepOptionsResolver, eventTaskId, serviceTaskType)
                            .WithProcessElement(eventElementId)
                    );
                }
                else
                {
                    taskStartSteps.AddRange(
                        workflowCommands
                            .Commands.ApplyStepOptions(_stepOptionsResolver, eventTaskId, serviceTaskType)
                            .WithProcessElement(eventElementId)
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
        if (acquireProcessingStatus)
        {
            commands.Add(CreateCommand(ProcessingStatusAcquirer.Key));
        }
        commands.AddRange(taskEndSteps);
        if (taskEndSteps.Count > 0)
        {
            commands.Add(CreateMutateProcessStateCommand(processStateChange));
        }
        commands.AddRange(taskStartSteps);
        commands.Add(CreateCommitProcessStateCommand(processStateChange, serviceTaskFollowsCommit));

        return new AssembledCommands(commands, criticalPostCommitSteps, sideEffectSteps);
    }

    private WorkflowCommandSet? GetWorkflowStepsForInstanceEvent(
        InstanceEvent instanceEvent,
        InstanceEventType eventType,
        string? serviceTaskType,
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
                return WorkflowCommandSet.GetTaskStartSteps(
                    new TaskStartContext
                    {
                        TaskId = GetRequiredEventTaskId(instanceEvent, eventType),
                        ServiceTask = ResolveServiceTask(serviceTaskType),
                        IsInitialTaskStart = isInitialTaskStart,
                        IsInstantiation = isInstantiation,
                        Prefill = isInitialTaskStart ? prefill : null,
                        Notification = isInitialTaskStart ? notification : null,
                        RegisterEvents = _appSettings.RegisterEventsWithEventsComponent,
                    }
                );
            }
            case InstanceEventType.process_EndTask:
                return WorkflowCommandSet.GetTaskEndSteps(GetRequiredEventTaskId(instanceEvent, eventType));
            case InstanceEventType.process_AbandonTask:
                return WorkflowCommandSet.GetTaskAbandonSteps();
            case InstanceEventType.process_EndEvent:
                return WorkflowCommandSet.GetProcessEndSteps(
                    new ProcessEndContext { RegisterEvents = _appSettings.RegisterEventsWithEventsComponent }
                );
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

    private static string GetRequiredEventTaskId(InstanceEvent instanceEvent, InstanceEventType eventType) =>
        instanceEvent.ProcessInfo?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException($"Workflow event {eventType} is missing current task information.");

    /// <summary>
    /// The actor the chain's callbacks run on behalf of, from the current request's authentication.
    /// </summary>
    /// <param name="language">
    /// The language the caller chose in the app, sent with process/next or instantiation, or null when the request
    /// has none. Every callback of the chain restores its data mutator in the actor's language, so the caller's
    /// profile language (nb for anyone but a user) is only the fallback. Like the rest of the actor it
    /// rides in the context, outside the engine's idempotency hash and the callback token's actor hash.
    /// </param>
    private async Task<Actor> ExtractActor(string? language)
    {
        Authenticated currentAuth = _authenticationContext.Current;
        if (currentAuth is Authenticated.User user)
        {
            Authenticated.User.Details details = await user.LoadDetails(validateSelectedParty: true);
            return new Actor
            {
                UserId = user.UserId,
                AuthenticationLevel = user.AuthenticationLevel,
                NationalIdentityNumber = details.Profile.Party.SSN,
                Language = await currentAuth.GetLanguage(language),
            };
        }

        string resolvedLanguage = await currentAuth.GetLanguage(language);
        return currentAuth switch
        {
            // Organization authentication currently emits an empty PlatformUser in process events.
            Authenticated.Org => new Actor { Language = resolvedLanguage },
            Authenticated.ServiceOwner serviceOwner => new Actor
            {
                OrgId = serviceOwner.Name,
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
        var payload = new ProcessStateChangePayload(processStateChange);
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

    private StepRequest CreateCommitProcessStateCommand(ProcessStateChange processStateChange, bool serviceTaskFollows)
    {
        var payload = new ProcessStateChangePayload(processStateChange, serviceTaskFollows);
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        var step = new StepRequest
        {
            OperationId = CommitProcessState.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = CommitProcessState.Key, Payload = serializedPayload }
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

    private StepRequest CreateCommand(string commandKey, CommandRequestPayload? payload = null)
    {
        var step = new StepRequest
        {
            OperationId = commandKey,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = commandKey, Payload = CommandPayloadSerializer.Serialize(payload) }
            ),
        };
        return step.ApplyStepOptions(_stepOptionsResolver, taskId: null, serviceTaskType: null);
    }
}
