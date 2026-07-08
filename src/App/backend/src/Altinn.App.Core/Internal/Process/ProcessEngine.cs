using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProcessNextRequest = Altinn.App.Core.Models.Process.ProcessNextRequest;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of the <see cref="IProcessEngine"/>
/// </summary>
internal class ProcessEngine : IProcessEngine
{
    private readonly IProcessReader _processReader;
    private readonly IProcessNavigator _processNavigator;
    private readonly UserActionService _userActionService;
    private readonly Telemetry? _telemetry;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IProcessEngineAuthorizer _processEngineAuthorizer;
    private readonly ILogger<ProcessEngine> _logger;
    private readonly IValidationService _validationService;
    private readonly WorkflowCallbackStateService _workflowCallbackStateService;
    private readonly IWorkflowEngineService _workflowEngineService;
    private readonly IInstanceLocker _instanceLocker;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessEngine"/> class.
    /// </summary>
    public ProcessEngine(
        IProcessReader processReader,
        IProcessNavigator processNavigator,
        UserActionService userActionService,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider,
        IProcessEngineAuthorizer processEngineAuthorizer,
        IValidationService validationService,
        IWorkflowEngineService workflowEngineService,
        ILogger<ProcessEngine> logger,
        Telemetry? telemetry = null
    )
    {
        _processReader = processReader;
        _processNavigator = processNavigator;
        _userActionService = userActionService;
        _telemetry = telemetry;
        _authenticationContext = authenticationContext;
        _processEngineAuthorizer = processEngineAuthorizer;
        _validationService = validationService;
        _logger = logger;
        _workflowEngineService = workflowEngineService;
        _workflowCallbackStateService = serviceProvider.GetRequiredService<WorkflowCallbackStateService>();
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _instanceLocker = serviceProvider.GetRequiredService<IInstanceLocker>();
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> CreateInitialProcessState(ProcessStartRequest request)
    {
        using var activity = _telemetry?.StartProcessStartActivity(request.Instance);

        if (request.Instance.Process != null)
        {
            var result = new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = "Process is already started. Use next.",
                ErrorType = ProcessErrorType.Conflict,
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        string validStartElement;
        try
        {
            validStartElement = ProcessHelper.GetValidStartEventOrError(
                request.StartEventId,
                _processReader.GetStartEventIds()
            );
        }
        catch (ProcessException e)
        {
            var result = new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = e.Message,
                ErrorType = ProcessErrorType.Conflict,
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        // start process
        ProcessStateChange? startChange = await ProcessStart(request.Instance, validStartElement);
        InstanceEvent? startEvent = startChange?.Events?[0].CopyValues();
        ProcessStateChange? nextChange = await MoveProcessStateToNextAndGenerateEvents(request.Instance);
        InstanceEvent? goToNextEvent = nextChange?.Events?[0].CopyValues();
        List<InstanceEvent> events = [];
        if (startEvent is not null)
        {
            events.Add(startEvent);
        }

        if (goToNextEvent is not null)
        {
            events.Add(goToNextEvent);
        }

        ProcessStateChange processStateChange = new()
        {
            OldProcessState = startChange?.OldProcessState,
            NewProcessState = nextChange?.NewProcessState,
            Events = events,
        };

        _telemetry?.ProcessStarted();

        var changeResult = new ProcessChangeResult() { Success = true, ProcessStateChange = processStateChange };
        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    /// <inheritdoc/>
    public async Task<Instance> SubmitInitialProcessState(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    )
    {
        // Capture instance + form data state for transport to the workflow engine
        string state;
        try
        {
            string? taskId = instance.Process?.CurrentTask?.ElementId;
            var unitOfWork = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                taskId,
                language: null,
                StorageAuthenticationMethod.ServiceOwner()
            );
            state = await _workflowCallbackStateService.CaptureState(unitOfWork);
        }
        catch (Exception ex)
        {
            throw WorkflowSubmissionFailedException.NotAccepted(
                "Runtime failed to prepare callback state before submitting the initial process workflow.",
                innerException: ex
            );
        }

        ProcessNextWorkflowResult result = await _workflowEngineService.EnqueueAndWaitForProcessNext(
            instance,
            processStateChange,
            resolvedAction: "start",
            lockToken,
            state,
            isInstantiation,
            prefill: prefill,
            notification: notification,
            ct: ct
        );
        if (result.WorkflowFailure is null)
        {
            return result.Instance;
        }

        throw new WorkflowExecutionFailedException(
            result.Instance,
            result.WorkflowFailure,
            result.ProcessStateChanged,
            CreateWorkflowFailureMessage(result.WorkflowFailure)
        );
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> Next(ProcessNextRequest request, CancellationToken ct = default)
    {
        Instance instance = request.Instance;

        using Activity? activity = _telemetry?.StartProcessNextActivity(instance, request.Action);

        await using var instanceLock = _instanceLocker.InitLock();

        ProcessChangeResult result = await ProcessNext(request, instanceLock, ct);
        if (result.Success && result.MutatedInstance is null)
        {
            throw new ProcessException(
                "ProcessNext returned successfully, but ProcessChangeResult.MutatedInstance is null. Conundrum."
            );
        }

        activity?.SetProcessChangeResult(result);
        return result;
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> ResumeCurrentTask(ProcessNextRequest request, CancellationToken ct = default)
    {
        Instance instance = request.Instance;

        using Activity? activity = _telemetry?.StartProcessNextActivity(instance, "resume");

        if (
            !TryGetCurrentTaskIdAndAltinnTaskType(
                instance,
                out CurrentTaskIdAndAltinnTaskType? currentTaskIdAndAltinnTaskType,
                out ProcessChangeResult? invalidProcessStateError
            )
        )
        {
            activity?.SetProcessChangeResult(invalidProcessStateError);
            return invalidProcessStateError;
        }

        (string currentTaskId, string altinnTaskType) = currentTaskIdAndAltinnTaskType;

        bool authorized = await _processEngineAuthorizer.AuthorizeProcessNext(instance, request.Action);

        if (!authorized)
        {
            var result = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Unauthorized,
                ErrorMessage =
                    $"User is not authorized to resume the current task. Task ID: {LogSanitizer.Sanitize(currentTaskId)}. Task type: {LogSanitizer.Sanitize(altinnTaskType)}.",
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        await using var instanceLock = _instanceLocker.InitLock();
        await instanceLock.Lock();

        CurrentTaskWorkflowState currentTaskWorkflowState = await _workflowEngineService.GetCurrentTaskWorkflowState(
            instance,
            ct
        );

        if (currentTaskWorkflowState is CurrentTaskWorkflowState.Retrying)
        {
            ProcessChangeResult retryingResult = CreateCurrentTaskWorkflowBlockedResult(ProcessNextState.Retrying);
            activity?.SetProcessChangeResult(retryingResult);
            return retryingResult;
        }

        if (currentTaskWorkflowState is not CurrentTaskWorkflowState.ResumeRequired failedWorkflow)
        {
            var result = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorTitle = "Task does not need to be resumed.",
                ErrorMessage = "The current task does not have a failed workflow that can be resumed.",
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        ProcessNextWorkflowResult workflowResult = await _workflowEngineService.ResumeAndWaitForWorkflow(
            instance,
            failedWorkflow.WorkflowId,
            failedWorkflow.CollectionKey,
            ct
        );

        if (workflowResult.WorkflowFailure is not null)
        {
            var failureResult = new ProcessChangeResult(mutatedInstance: workflowResult.Instance)
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorTitle = "Something went wrong while resuming the current task.",
                ErrorMessage = CreateWorkflowFailureMessage(workflowResult.WorkflowFailure),
                WorkflowFailure = workflowResult.WorkflowFailure,
                ProcessStateOnFailure = workflowResult.ProcessStateChanged ? workflowResult.Instance.Process : null,
            };
            activity?.SetProcessChangeResult(failureResult);
            return failureResult;
        }

        var changeResult = new ProcessChangeResult(mutatedInstance: workflowResult.Instance)
        {
            Success = true,
            ProcessStateChange = new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = workflowResult.Instance.Process,
                Events = [],
            },
        };

        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    /// <summary>
    /// Internal method that performs a single process next operation without automatic service task handling.
    /// </summary>
    private async Task<ProcessChangeResult> ProcessNext(
        ProcessNextRequest request,
        IInstanceLock instanceLock,
        CancellationToken ct = default
    )
    {
        using Activity? activity = _telemetry?.StartProcessNextActivity(request.Instance, request.Action);

        Instance instance = request.Instance;

        if (
            !TryGetCurrentTaskIdAndAltinnTaskType(
                instance,
                out CurrentTaskIdAndAltinnTaskType? currentTaskIdAndAltinnTaskType,
                out ProcessChangeResult? invalidProcessStateError
            )
        )
        {
            activity?.SetProcessChangeResult(invalidProcessStateError);
            return invalidProcessStateError;
        }

        (string currentTaskId, string altinnTaskType) = currentTaskIdAndAltinnTaskType;

        bool authorized = await _processEngineAuthorizer.AuthorizeProcessNext(instance, request.Action);

        if (!authorized)
        {
            var result = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Unauthorized,
                ErrorMessage =
                    $"User is not authorized to perform process next. Task ID: {LogSanitizer.Sanitize(currentTaskId)}. Task type: {LogSanitizer.Sanitize(altinnTaskType)}. Action: {LogSanitizer.Sanitize(request.Action ?? "none")}.",
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        _logger.LogDebug(
            "User successfully authorized to perform process next. Task ID: {CurrentTaskId}. Task type: {AltinnTaskType}. Action: {ProcessNextAction}.",
            LogSanitizer.Sanitize(currentTaskId),
            LogSanitizer.Sanitize(altinnTaskType),
            LogSanitizer.Sanitize(request.Action ?? "none")
        );

        await instanceLock.Lock();

        string checkedAction = request.Action ?? ConvertTaskTypeToAction(altinnTaskType);
        bool isServiceTask = CheckIfServiceTask(altinnTaskType) is not null;
        string? processNextAction = request.Action;

        // A reject abandons the task; it is only honoured when the bpmn allows it for this task.
        bool rejectAllowedForTask =
            checkedAction == "reject" && _processReader.IsActionAllowedForTask(currentTaskId, checkedAction);

        Guid? abandonedWorkflowId = null;
        CurrentTaskWorkflowState currentTaskWorkflowState = await _workflowEngineService.GetCurrentTaskWorkflowState(
            instance,
            ct
        );
        switch (currentTaskWorkflowState)
        {
            case CurrentTaskWorkflowState.Unblocked:
                break;

            case CurrentTaskWorkflowState.Retrying:
            {
                ProcessChangeResult blockedResult = CreateCurrentTaskWorkflowBlockedResult(ProcessNextState.Retrying);
                activity?.SetProcessChangeResult(blockedResult);
                return blockedResult;
            }

            // A terminally failed workflow normally requires an explicit resume before the process
            // can continue. The one exception is a bpmn-allowed 'reject': the user is abandoning
            // the task (e.g. backing out of a failed service task from its failure screen, which
            // offers both retry and go-back).
            case CurrentTaskWorkflowState.ResumeRequired failedWorkflow
                when request.Action is "reject" && rejectAllowedForTask:
            {
                // Write the failed workflow off in the engine (-> Abandoned) before enqueueing the
                // reject: Abandoned is terminal but no longer condemns dependents, so the reject's
                // ordinary dependency on it lets the reject run.
                bool abandoned = await _workflowEngineService.AbandonWorkflow(failedWorkflow.WorkflowId, ct);
                if (!abandoned)
                {
                    // The engine's compare-and-set lost a race with a concurrent resume: the failed
                    // workflow is running again, so the reject must wait like any other action.
                    ProcessChangeResult raceLostResult = CreateCurrentTaskWorkflowBlockedResult(
                        ProcessNextState.Retrying
                    );
                    activity?.SetProcessChangeResult(raceLostResult);
                    return raceLostResult;
                }

                abandonedWorkflowId = failedWorkflow.WorkflowId;
                break;
            }

            case CurrentTaskWorkflowState.ResumeRequired:
            {
                ProcessChangeResult blockedResult = CreateCurrentTaskWorkflowBlockedResult(
                    ProcessNextState.ResumeRequired
                );
                activity?.SetProcessChangeResult(blockedResult);
                return blockedResult;
            }

            default:
                throw new UnreachableException(
                    $"Unknown current-task workflow state: {currentTaskWorkflowState.GetType().Name}"
                );
        }

        // If the action is 'reject', we should not run any service task and there is no need to check for a user action handler, since 'reject' doesn't have one.
        if (request.Action is not "reject")
        {
            if (request.Action is not null)
            {
                UserActionResult userActionResult = await HandleUserAction(instance, request, ct);

                if (userActionResult.ResultType is ResultType.Failure)
                {
                    var result = new ProcessChangeResult()
                    {
                        Success = false,
                        ErrorMessage = $"Action handler for action {LogSanitizer.Sanitize(request.Action)} failed!",
                        ErrorType = userActionResult.ErrorType,
                    };
                    activity?.SetProcessChangeResult(result);
                    return result;
                }
            }
        }

        // If the action is 'reject' the task is being abandoned, and we should skip validation, but only if reject has been allowed for the task in bpmn.
        if (rejectAllowedForTask)
        {
            _logger.LogInformation(
                "Skipping validation during process next because the action is 'reject' and the task is being abandoned."
            );
        }
        else if (isServiceTask)
        {
            _logger.LogInformation("Skipping validation during process next because the task is a service task.");
        }
        else
        {
            InstanceDataUnitOfWork dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                currentTaskId,
                request.Language
            );

            List<ValidationIssueWithSource> validationIssues = await _validationService.ValidateInstanceAtTask(
                dataAccessor,
                currentTaskId, // run full validation
                ignoredValidators: null,
                onlyIncrementalValidators: null,
                language: request.Language
            );

            int errorCount = validationIssues.Count(v => v.Severity == ValidationIssueSeverity.Error);

            if (errorCount > 0)
            {
                var result = new ProcessChangeResult
                {
                    Success = false,
                    ErrorType = ProcessErrorType.Conflict,
                    ErrorTitle = "Validation failed for task",
                    ErrorMessage = $"{errorCount} validation errors found for task {currentTaskId}",
                    ValidationIssues = validationIssues,
                };
                activity?.SetProcessChangeResult(result);
                return result;
            }
        }

        MoveToNextResult moveToNextResult;
        try
        {
            moveToNextResult = await HandleMoveToNext(
                instance,
                processNextAction,
                checkedAction,
                _instanceLocker.CurrentLockToken
                    ?? throw new InvalidOperationException("Lock token must be set after acquiring instance lock"),
                ct
            );
        }
        catch (WorkflowSubmissionFailedException exception) when (abandonedWorkflowId is Guid writtenOffWorkflowId)
        {
            // The failed workflow was written off, but the superseding reject never made it into
            // the engine. The write-off is not undone: the abandoned workflow no longer blocks the
            // task, and the engine released its idempotency key on abandon, so retrying the reject
            // submits a fresh workflow.
            _logger.LogWarning(
                exception,
                "The reject was not enqueued after workflow {AbandonedWorkflowId} was abandoned. Instance: {InstanceId}. Task: {TaskId}. Action: {ProcessNextAction}. The reject can be retried.",
                writtenOffWorkflowId,
                instance.Id,
                LogSanitizer.Sanitize(currentTaskId),
                LogSanitizer.Sanitize(request.Action ?? "none")
            );

            var submissionFailureResult = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorTitle = "The reject was not submitted.",
                ErrorMessage =
                    "The failed workflow was written off, but the reject was not submitted to the workflow engine. Try the reject again.",
            };
            activity?.SetProcessChangeResult(submissionFailureResult);
            return submissionFailureResult;
        }

        if (moveToNextResult.WorkflowFailure is not null)
        {
            var failureResult = new ProcessChangeResult(mutatedInstance: moveToNextResult.Instance)
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorTitle = "Something went wrong while moving to the next task.",
                ErrorMessage = CreateWorkflowFailureMessage(moveToNextResult.WorkflowFailure),
                WorkflowFailure = moveToNextResult.WorkflowFailure,
                ProcessStateOnFailure = moveToNextResult.ProcessStateChanged ? moveToNextResult.Instance.Process : null,
            };
            activity?.SetProcessChangeResult(failureResult);
            return failureResult;
        }

        var changeResult = new ProcessChangeResult(mutatedInstance: moveToNextResult.Instance)
        {
            Success = true,
            ProcessStateChange = moveToNextResult.ProcessStateChange,
        };

        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    private async Task<UserActionResult> HandleUserAction(
        Instance instance,
        ProcessNextRequest request,
        CancellationToken ct
    )
    {
        using var activity = _telemetry?.StartProcessHandleUserActionActivity(instance, request.Action);

        Authenticated currentAuth = _authenticationContext.Current;
        IUserAction? actionHandler = _userActionService.GetActionHandler(request.Action);

        if (actionHandler is null)
            return UserActionResult.SuccessResult();

        InstanceDataUnitOfWork cachedDataMutator = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            taskId: null,
            request.Language
        );

        int? userId = currentAuth switch
        {
            Authenticated.User auth => auth.UserId,
            _ => null,
        };

        UserActionResult actionResult = await actionHandler.HandleAction(
            new UserActionContext(
                cachedDataMutator,
                userId,
                language: request.Language,
                authentication: currentAuth,
                onBehalfOf: request.ActionOnBehalfOf,
                cancellationToken: ct
            )
        );

        if (actionResult.ResultType == ResultType.Failure)
        {
            return actionResult;
        }

        if (cachedDataMutator.HasAbandonIssues)
        {
            throw new InvalidOperationException(
                "Abandon issues found in data elements. Abandon issues should be handled by the action handler."
            );
        }

        DataElementChanges changes = cachedDataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await cachedDataMutator.UpdateInstanceData(changes);
        await cachedDataMutator.SaveChanges(changes);

        return actionResult;
    }

    /// <summary>
    /// Does not save process. Instance object is updated.
    /// </summary>
    private async Task<ProcessStateChange?> ProcessStart(Instance instance, string startEvent)
    {
        if (instance.Process != null)
        {
            return null;
        }

        DateTime now = DateTime.UtcNow;
        ProcessState startState = new()
        {
            Started = now,
            StartEvent = startEvent,
            CurrentTask = new ProcessElementInfo { Flow = 1, ElementId = startEvent },
        };

        instance.Process = startState;

        PlatformUser user = await ExtractPlatformUser();
        List<InstanceEvent> events =
        [
            CreateInstanceEvent(InstanceEventType.process_StartEvent.ToString(), instance, startState, user, now),
        ];

        // ! TODO: should probably improve nullability handling in the next major version
        return new ProcessStateChange
        {
            OldProcessState = null!,
            NewProcessState = startState,
            Events = events,
        };
    }

    /// <summary>
    /// Computes the next transition and updates instance.Process to reflect the new state.
    /// </summary>
    private async Task<ProcessStateChange?> MoveProcessStateToNextAndGenerateEvents(
        Instance instance,
        string? action = null
    )
    {
        if (instance.Process == null)
        {
            return null;
        }

        string changeEventType = action is "reject"
            ? InstanceEventType.process_AbandonTask.ToString()
            : InstanceEventType.process_EndTask.ToString();
        using var activity = _telemetry?.StartProcessGenerateChangeEventActivity(instance, changeEventType);

        PlatformUser user = await ExtractPlatformUser();
        ProcessStateChange result = await ComputeNextTransition(instance, action, user);

        // Apply the mutation so callers see the updated process state on the instance
        instance.Process = result.NewProcessState;

        return result;
    }

    /// <summary>
    /// Core BPMN transition logic. Computes the ProcessStateChange for moving from the current task
    /// to the next element. Does NOT mutate instance.Process.
    /// Used by both the normal process-next flow and auto-advance.
    /// </summary>
    private async Task<ProcessStateChange> ComputeNextTransition(Instance instance, string? action, PlatformUser user)
    {
        ProcessState process = instance.Process ?? throw new ProcessException("Process is null");
        string currentTaskId =
            process.CurrentTask?.ElementId ?? throw new ProcessException("Current task element ID is null");

        ProcessElement? nextElement = await _processNavigator.GetNextTask(instance, currentTaskId, action);
        if (nextElement is null)
            throw new ProcessException("Next process element was unexpectedly null");

        DateTime now = DateTime.UtcNow;
        var events = new List<InstanceEvent>();

        ProcessState oldProcessState = new()
        {
            Started = process.Started,
            CurrentTask = process.CurrentTask,
            StartEvent = process.StartEvent,
        };

        // End current task event
        if (_processReader.IsProcessTask(currentTaskId))
        {
            string eventType = action is "reject"
                ? InstanceEventType.process_AbandonTask.ToString()
                : InstanceEventType.process_EndTask.ToString();
            events.Add(CreateInstanceEvent(eventType, instance, oldProcessState, user, now));
        }

        // Build new process state based on next element
        ProcessState newProcessState = new() { Started = process.Started, StartEvent = process.StartEvent };
        string nextElementId = nextElement.Id;

        if (_processReader.IsEndEvent(nextElementId))
        {
            using var activity = _telemetry?.StartProcessEndActivity(instance);

            newProcessState.CurrentTask = null;
            newProcessState.Ended = now;
            newProcessState.EndEvent = nextElementId;

            events.Add(
                CreateInstanceEvent(InstanceEventType.process_EndEvent.ToString(), instance, newProcessState, user, now)
            );
            // Submit event (to support Altinn2 SBL)
            events.Add(
                CreateInstanceEvent(InstanceEventType.Submited.ToString(), instance, newProcessState, user, now)
            );
        }
        else if (_processReader.IsProcessTask(nextElementId))
        {
            var task = nextElement as ProcessTask;
            newProcessState.CurrentTask = new ProcessElementInfo
            {
                Flow = (process.CurrentTask?.Flow ?? 0) + 1,
                ElementId = nextElementId,
                Name = nextElement.Name,
                Started = now,
                AltinnTaskType = task?.ExtensionElements?.TaskExtension?.TaskType,
                FlowType = action is "reject"
                    ? ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString()
                    : ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
            };

            events.Add(
                CreateInstanceEvent(
                    InstanceEventType.process_StartTask.ToString(),
                    instance,
                    newProcessState,
                    user,
                    now
                )
            );
        }

        return new ProcessStateChange
        {
            OldProcessState = oldProcessState,
            NewProcessState = newProcessState,
            Events = events,
        };
    }

    private async Task<PlatformUser> ExtractPlatformUser()
    {
        var currentAuth = _authenticationContext.Current;
        switch (currentAuth)
        {
            case Authenticated.User auth:
            {
                Authenticated.User.Details details;
                using (_telemetry?.StartProcessLoadAuthDetailsActivity(nameof(Authenticated.User)))
                {
                    details = await auth.LoadDetails(validateSelectedParty: true);
                }
                return new PlatformUser
                {
                    UserId = auth.UserId,
                    AuthenticationLevel = auth.AuthenticationLevel,
                    NationalIdentityNumber = details.Profile.Party.SSN,
                };
            }
            case Authenticated.Org:
                return new PlatformUser { }; // TODO: what do we do here?
            case Authenticated.ServiceOwner auth:
                return new PlatformUser { OrgId = auth.Name, AuthenticationLevel = auth.AuthenticationLevel };
            case Authenticated.SystemUser auth:
                return new PlatformUser
                {
                    SystemUserId = auth.SystemUserId[0],
                    SystemUserOwnerOrgNo = auth.SystemUserOrgNr.Get(Models.OrganisationNumberFormat.Local),
                    SystemUserName = null, // TODO: will get this name later when a lookup API is implemented or the name is passed in token
                    AuthenticationLevel = auth.AuthenticationLevel,
                };
            default:
                throw new InvalidOperationException($"Unknown authentication context: {currentAuth.GetType().Name}");
        }
    }

    private async Task<MoveToNextResult> HandleMoveToNext(
        Instance instance,
        string? action,
        string resolvedAction,
        string lockToken,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartProcessMoveToNextActivity(instance, action);

        // Compute the transition without mutating instance.Process, then capture the old instance/form-data
        // snapshot before mutating instance.Process so the callback starts from the task being left.
        string? currentTaskId = instance.Process?.CurrentTask?.ElementId;
        InstanceDataUnitOfWork unitOfWork = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            currentTaskId,
            language: null,
            StorageAuthenticationMethod.ServiceOwner()
        );

        string state = await _workflowCallbackStateService.CaptureState(unitOfWork);
        ProcessStateChange? processStateChange = await MoveProcessStateToNextAndGenerateEvents(instance, action);
        if (processStateChange is null)
        {
            throw new InvalidOperationException("Process state was unexpectedly null when moving to the next task.");
        }

        ProcessNextWorkflowResult result = await _workflowEngineService.EnqueueAndWaitForProcessNext(
            instance,
            processStateChange,
            resolvedAction,
            lockToken,
            state,
            ct: ct
        );

        ProcessStateChange finalProcessStateChange = new()
        {
            OldProcessState = processStateChange.OldProcessState,
            NewProcessState = result.Instance.Process ?? processStateChange.NewProcessState,
            Events = processStateChange.Events,
        };

        return new MoveToNextResult(
            result.Instance,
            finalProcessStateChange,
            result.WorkflowFailure,
            result.ProcessStateChanged
        );
    }

    /// <inheritdoc/>
    public async Task EnqueueProcessNext(
        Instance instance,
        Actor actor,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        string? action = null,
        CancellationToken ct = default
    )
    {
        PlatformUser user = CreatePlatformUser(actor);
        ProcessStateChange processStateChange = await ComputeNextTransition(instance, action, user);

        await _workflowEngineService.EnqueueDependentProcessNext(
            instance,
            processStateChange,
            lockToken,
            dependsOnWorkflowId,
            collectionKey,
            state,
            actor,
            ct: ct
        );
    }

    private static InstanceEvent CreateInstanceEvent(
        string eventType,
        Instance instance,
        ProcessState processInfo,
        PlatformUser user,
        DateTime now
    )
    {
        return new InstanceEvent
        {
            InstanceId = instance.Id,
            InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
            EventType = eventType,
            Created = now,
            User = user,
            ProcessInfo = processInfo,
        };
    }

    private static PlatformUser CreatePlatformUser(Actor actor)
    {
        if (actor.UserId is int userId)
        {
            var platformUser = new PlatformUser
            {
                UserId = userId,
                NationalIdentityNumber = actor.NationalIdentityNumber,
            };
            if (actor.AuthenticationLevel is int authenticationLevel)
            {
                platformUser.AuthenticationLevel = authenticationLevel;
            }
            return platformUser;
        }

        if (actor.SystemUserId is Guid systemUserId)
        {
            var platformUser = new PlatformUser
            {
                SystemUserId = systemUserId,
                SystemUserOwnerOrgNo = actor.SystemUserOwnerOrgNo,
                SystemUserName = actor.SystemUserName,
            };
            if (actor.AuthenticationLevel is int authenticationLevel)
            {
                platformUser.AuthenticationLevel = authenticationLevel;
            }
            return platformUser;
        }

        var orgPlatformUser = new PlatformUser { OrgId = actor.OrgId };
        if (actor.AuthenticationLevel is int orgAuthenticationLevel)
        {
            orgPlatformUser.AuthenticationLevel = orgAuthenticationLevel;
        }
        return orgPlatformUser;
    }

    private sealed record MoveToNextResult(
        Instance Instance,
        ProcessStateChange? ProcessStateChange,
        WorkflowFailure? WorkflowFailure = null,
        bool ProcessStateChanged = false
    )
    {
        [MemberNotNullWhen(true, nameof(ProcessStateChange))]
        public bool IsEndEvent => ProcessStateChange?.NewProcessState?.Ended is not null;
    };

    internal static string ConvertTaskTypeToAction(string actionOrTaskType)
    {
        switch (actionOrTaskType)
        {
            case AltinnTaskTypes.Data:
            case AltinnTaskTypes.Feedback:
            case AltinnTaskTypes.Pdf:
            case AltinnTaskTypes.EFormidling:
            case AltinnTaskTypes.FiksArkiv:
                return "write";
            case AltinnTaskTypes.Confirmation:
                return "confirm";
            case AltinnTaskTypes.Signing:
                return "sign";
            default:
                // Not any known task type, so assume it is an action type
                return actionOrTaskType;
        }
    }

    private static bool TryGetCurrentTaskIdAndAltinnTaskType(
        Instance instance,
        [NotNullWhen(true)] out CurrentTaskIdAndAltinnTaskType? state,
        [NotNullWhen(false)] out ProcessChangeResult? error
    )
    {
        state = null; // allowed because the method may return false
        error = null;

        ProcessState? process = instance.Process;

        if (process is null)
        {
            error = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorMessage = "The instance is missing process information.",
            };
            return false;
        }

        if (process.Ended is not null)
        {
            error = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorMessage = "Process is ended.",
            };
            return false;
        }

        if (process.CurrentTask?.ElementId is not string taskId)
        {
            error = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorMessage = "Process is not started. Use start!",
            };
            return false;
        }

        if (process.CurrentTask.AltinnTaskType is not string taskType)
        {
            error = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorMessage = "Instance does not have current altinn task type information!",
            };
            return false;
        }

        state = new CurrentTaskIdAndAltinnTaskType(taskId, taskType);
        return true;
    }

    private static string CreateWorkflowFailureMessage(WorkflowFailure workflowFailure) =>
        workflowFailure.Kind switch
        {
            WorkflowFailureKind.StepFailed => workflowFailure.LastError?.Message ?? "A workflow step failed.",
            WorkflowFailureKind.DependencyFailed => workflowFailure.LastError?.Message
                ?? "A workflow failed because a dependency failed.",
            WorkflowFailureKind.EngineFault => workflowFailure.LastError?.Message
                ?? "The workflow engine failed while moving to the next task.",
            WorkflowFailureKind.Timeout => "Timeout while waiting for workflows to complete.",
            _ => "Workflow execution failed.",
        };

    private static ProcessChangeResult CreateCurrentTaskWorkflowBlockedResult(ProcessNextState blockedState) =>
        blockedState switch
        {
            ProcessNextState.Retrying => new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorTitle = "Task is still being processed.",
                ErrorMessage =
                    "The current task is still being processed by the workflow engine. Wait for automatic retries to finish before trying again.",
                ProcessNextState = ProcessNextState.Retrying,
            },
            ProcessNextState.ResumeRequired => new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorTitle = "Task must be resumed before it can continue.",
                ErrorMessage = "The current task has a failed workflow that must be resumed before it can continue.",
                ProcessNextState = ProcessNextState.ResumeRequired,
            },
            _ => throw new ArgumentOutOfRangeException(nameof(blockedState), blockedState, null),
        };

    private IServiceTask? CheckIfServiceTask(string? altinnTaskType)
    {
        if (altinnTaskType is null)
            return null;

        IEnumerable<IServiceTask> serviceTasks = _appImplementationFactory.GetAll<IServiceTask>();
        IServiceTask? serviceTask = serviceTasks.FirstOrDefault(x =>
            x.Type.Equals(altinnTaskType, StringComparison.OrdinalIgnoreCase)
        );

        return serviceTask;
    }

    private sealed record CurrentTaskIdAndAltinnTaskType(string CurrentTaskId, string AltinnTaskType);
}
