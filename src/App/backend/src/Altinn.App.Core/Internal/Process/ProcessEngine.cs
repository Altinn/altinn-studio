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
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.Storage;
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
    private readonly ProcessTransitionBuilder _transitionBuilder;
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
    private readonly IInstanceClientWithStorageMetadata _instanceClient;

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
        _transitionBuilder = new ProcessTransitionBuilder(processReader, telemetry);
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
        _instanceClient = serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>();
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
        // A gateway after the start event sees the language the first task's workflow callbacks get, and reads data
        // as the app, like the gateways of every transition after it.
        InstanceDataUnitOfWork dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            request.Instance,
            StorageVersionMetadata.Empty,
            taskId: null,
            language: await _authenticationContext.Current.GetLanguage(request.Language),
            StorageAuthenticationMethod.ServiceOwner()
        );
        ProcessStateChange? nextChange = await MoveProcessStateToNextAndGenerateEvents(dataAccessor);
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
        StorageVersionMetadata versions,
        ProcessStateChange processStateChange,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        // Capture instance + form data state for transport to the workflow engine
        string state;
        try
        {
            string? taskId = instance.Process?.CurrentTask?.ElementId;
            InstanceDataUnitOfWork unitOfWork = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                versions,
                taskId,
                language: null,
                StorageAuthenticationMethod.ServiceOwner()
            );
            state = await _workflowCallbackStateService.CaptureState(unitOfWork);
        }
        catch (DataElementContentConflictException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw WorkflowSubmissionFailedException.NotAccepted(
                "Runtime failed to prepare callback state before submitting the initial process workflow.",
                innerException: ex
            );
        }

        ProcessNextWorkflowResult result = await _workflowEngineService.EnqueueAndWaitForInitialProcessState(
            instance,
            versions,
            processStateChange,
            state,
            isInstantiation,
            prefill: prefill,
            notification: notification,
            language: language,
            cancellationToken: cancellationToken
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
    public async Task<ProcessChangeResult> Next(
        ProcessNextRequest request,
        CancellationToken cancellationToken = default
    )
    {
        Instance instance = request.Instance;

        using Activity? activity = _telemetry?.StartProcessNextActivity(instance, request.Action);

        ProcessChangeResult result = await ProcessNext(request, cancellationToken);
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
    public async Task<ProcessChangeResult> ResumeCurrentTask(
        ProcessNextRequest request,
        CancellationToken cancellationToken = default
    )
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

        bool authorized = await _processEngineAuthorizer.AuthorizeProcessNext(
            instance,
            request.Action,
            cancellationToken
        );

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

        // The same status the instance read shows the client, so a task shown as failed is the task that can be
        // resumed here.
        WorkflowTaskStatus workflowStatus = await _workflowEngineService.ResolveWorkflowTaskStatus(
            instance,
            cancellationToken
        );

        if (workflowStatus.Status == WorkflowActivityStatus.Processing)
        {
            ProcessChangeResult retryingResult = CreateCurrentTaskWorkflowBlockedResult(ProcessNextState.Retrying);
            activity?.SetProcessChangeResult(retryingResult);
            return retryingResult;
        }

        if (
            workflowStatus.Status != WorkflowActivityStatus.Failed
            || (workflowStatus.Failure?.RetryTargetWorkflowId ?? workflowStatus.Failure?.WorkflowId)
                is not Guid failedWorkflowId
        )
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
            failedWorkflowId,
            cancellationToken
        );

        if (workflowResult.WorkflowFailure is not null)
        {
            var failureResult = new ProcessChangeResult(workflowResult.Instance, workflowResult.InstanceVersions)
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

        var changeResult = new ProcessChangeResult(workflowResult.Instance, workflowResult.InstanceVersions)
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

    private async Task<ProcessChangeResult> ProcessNext(
        ProcessNextRequest request,
        CancellationToken cancellationToken = default
    )
    {
        using Activity? activity = _telemetry?.StartProcessNextActivity(request.Instance, request.Action);

        Instance instance = request.Instance;
        StorageVersionMetadata versions = request.InstanceVersions;

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

        bool authorized = await _processEngineAuthorizer.AuthorizeProcessNext(
            instance,
            request.Action,
            cancellationToken
        );

        if (!authorized)
        {
            if (
                request.Mode is ProcessNextMode.CompleteProcess
                && !await _processEngineAuthorizer.AuthorizeProcessNext(instance, cancellationToken: cancellationToken)
            )
            {
                ProcessChangeResult completeProcessAuthorizationFailedResult =
                    CreateCompleteProcessAuthorizationFailedResult(currentTaskId, altinnTaskType);
                activity?.SetProcessChangeResult(completeProcessAuthorizationFailedResult);
                return completeProcessAuthorizationFailedResult;
            }

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

        string checkedAction = request.Action ?? ConvertTaskTypeToAction(altinnTaskType);
        bool isServiceTask = CheckIfServiceTask(altinnTaskType) is not null;
        string? processNextAction = request.Action;

        // A reject abandons the task; it is only honored when the bpmn allows it for this task.
        bool rejectAllowedForTask =
            checkedAction == "reject" && _processReader.IsActionAllowedForTask(currentTaskId, checkedAction);

        // Collection dependencies fence earlier workflows; checking them here would race the enqueue.
        // Only the process status refuses up front, and the task's workflow says whether to wait or resume.
        ProcessStatus? blockingProcessStatus = ProcessStatusHelper.GetBlockingStatus(instance);
        if (blockingProcessStatus is not null)
        {
            ProcessChangeResult blockedResult = await CreateProcessStatusBlockedResult(
                instance,
                blockingProcessStatus.Value,
                cancellationToken
            );
            activity?.SetProcessChangeResult(blockedResult);
            return blockedResult;
        }

        if (request.Mode is ProcessNextMode.CompleteProcess)
        {
            bool completeProcessAuthorized = await _processEngineAuthorizer.AuthorizeProcessNext(
                instance,
                cancellationToken: cancellationToken
            );
            if (!completeProcessAuthorized)
            {
                ProcessChangeResult unauthorizedResult = CreateCompleteProcessAuthorizationFailedResult(
                    currentTaskId,
                    altinnTaskType
                );
                activity?.SetProcessChangeResult(unauthorizedResult);
                return unauthorizedResult;
            }

            if (
                await GetValidationError(instance, versions, currentTaskId, request.Language) is
                { } completeValidationError
            )
            {
                activity?.SetProcessChangeResult(completeValidationError);
                return completeValidationError;
            }
        }

        if (request.Action is not "reject")
        {
            if (request.Action is not null)
            {
                (UserActionResult userActionResult, InstanceWithStorageMetadata? refreshedInstance) =
                    await HandleUserAction(instance, request, versions, cancellationToken);

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

                if (refreshedInstance is not null)
                {
                    instance = refreshedInstance.Instance;
                    versions = refreshedInstance.Metadata;
                    if (
                        !TryGetCurrentTaskIdAndAltinnTaskType(
                            instance,
                            out CurrentTaskIdAndAltinnTaskType? refreshedTask,
                            out ProcessChangeResult? refreshedProcessStateError
                        )
                    )
                    {
                        activity?.SetProcessChangeResult(refreshedProcessStateError);
                        return refreshedProcessStateError;
                    }

                    (currentTaskId, altinnTaskType) = refreshedTask;
                    isServiceTask = CheckIfServiceTask(altinnTaskType) is not null;
                }
            }
        }

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
            if (await GetValidationError(instance, versions, currentTaskId, request.Language) is { } validationError)
            {
                activity?.SetProcessChangeResult(validationError);
                return validationError;
            }
        }

        // The authorized action is complete; gateways now read data as ServiceOwner.
        InstanceDataUnitOfWork transitionData = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            versions,
            currentTaskId,
            await _authenticationContext.Current.GetLanguage(request.Language),
            StorageAuthenticationMethod.ServiceOwner()
        );
        ProcessElement nextElement;
        try
        {
            nextElement = await GetNextElement(transitionData, processNextAction);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Could not decide where the process goes from task {CurrentTaskId}. Action: {ProcessNextAction}.",
                LogSanitizer.Sanitize(currentTaskId),
                LogSanitizer.Sanitize(processNextAction ?? "none")
            );
            var nextElementFailedResult = new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorTitle = "The process could not move on from the current task.",
                ErrorMessage =
                    "Where the process goes from the current task could not be decided, so nothing was changed.",
            };
            activity?.SetProcessChangeResult(nextElementFailedResult);
            return nextElementFailedResult;
        }

        ProcessNextWorkflowResult workflowResult = await HandleMoveToNext(
            transitionData,
            processNextAction,
            nextElement,
            request.Language,
            cancellationToken
        );

        if (workflowResult.WorkflowFailure?.Kind == WorkflowFailureKind.DependencyFailed)
        {
            ProcessChangeResult blockedResult = CreateCurrentTaskWorkflowBlockedResult(ProcessNextState.ResumeRequired);
            activity?.SetProcessChangeResult(blockedResult);
            return blockedResult;
        }

        if (workflowResult.WorkflowFailure is not null)
        {
            var failureResult = new ProcessChangeResult(workflowResult.Instance, workflowResult.InstanceVersions)
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorTitle = "Something went wrong while moving to the next task.",
                ErrorMessage = CreateWorkflowFailureMessage(workflowResult.WorkflowFailure),
                WorkflowFailure = workflowResult.WorkflowFailure,
                ProcessStateOnFailure = workflowResult.ProcessStateChanged ? workflowResult.Instance.Process : null,
            };
            activity?.SetProcessChangeResult(failureResult);
            return failureResult;
        }

        // A superseded acquire succeeds without moving the process; check task identity as well.
        ProcessState? newProcessState = workflowResult.Instance.Process;
        if (!HasAdvanced(instance.Process, newProcessState))
        {
            var instanceChangedResult = new ProcessChangeResult(
                workflowResult.Instance,
                workflowResult.InstanceVersions
            )
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorTitle = "The instance changed before the transition started.",
                ErrorMessage =
                    "The instance changed after this request read it, so the process did not move on. Refresh the instance and try again.",
                ProcessNextState = ProcessNextState.InstanceChanged,
            };
            activity?.SetProcessChangeResult(instanceChangedResult);
            return instanceChangedResult;
        }

        var changeResult = new ProcessChangeResult(workflowResult.Instance, workflowResult.InstanceVersions)
        {
            Success = true,
            ProcessStateChange = new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = newProcessState,
            },
        };

        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    // Flow distinguishes a new visit when a gateway returns to the same task.
    private static bool HasAdvanced(ProcessState? oldProcessState, ProcessState? newProcessState) =>
        ProcessNextRequestFactory.CreateProcessNextId(oldProcessState?.CurrentTask)
        != ProcessNextRequestFactory.CreateProcessNextId(newProcessState?.CurrentTask);

    private async Task<ProcessChangeResult?> GetValidationError(
        Instance instance,
        StorageVersionMetadata versions,
        string currentTaskId,
        string? language
    )
    {
        InstanceDataUnitOfWork dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            versions,
            currentTaskId,
            language
        );
        List<ValidationIssueWithSource> validationIssues = await _validationService.ValidateInstanceAtTask(
            dataAccessor,
            currentTaskId,
            ignoredValidators: null,
            onlyIncrementalValidators: null,
            language: language
        );

        int errorCount = validationIssues.Count(v => v.Severity == ValidationIssueSeverity.Error);
        if (errorCount == 0)
        {
            return null;
        }

        return new ProcessChangeResult
        {
            Success = false,
            ErrorType = ProcessErrorType.Conflict,
            ErrorTitle = "Validation failed for task",
            ErrorMessage = $"{errorCount} validation errors found for task {currentTaskId}",
            ValidationIssues = validationIssues,
        };
    }

    private async Task<(UserActionResult Result, InstanceWithStorageMetadata? RefreshedInstance)> HandleUserAction(
        Instance instance,
        ProcessNextRequest request,
        StorageVersionMetadata versions,
        CancellationToken cancellationToken
    )
    {
        using var activity = _telemetry?.StartProcessHandleUserActionActivity(instance, request.Action);

        Authenticated currentAuth = _authenticationContext.Current;
        IUserAction? actionHandler = _userActionService.GetActionHandler(request.Action);

        if (actionHandler is null)
            return (UserActionResult.SuccessResult(), null);

        InstanceDataUnitOfWork cachedDataMutator = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            versions,
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
                cancellationToken: cancellationToken
            )
        );

        if (actionResult.ResultType == ResultType.Failure)
        {
            return (actionResult, null);
        }

        if (cachedDataMutator.HasAbandonIssues)
        {
            throw new InvalidOperationException(
                "Abandon issues found in data elements. Abandon issues should be handled by the action handler."
            );
        }

        DataElementChanges changes = cachedDataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await cachedDataMutator.SaveChanges(changes);
        InstanceWithStorageMetadata refreshedInstance = await _instanceClient.GetInstanceWithStorageMetadata(
            cachedDataMutator.Instance,
            authenticationMethod: null,
            cancellationToken
        );

        return (actionResult, refreshedInstance);
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
            ProcessTransitionBuilder.CreateInstanceEvent(
                InstanceEventType.process_StartEvent.ToString(),
                instance,
                startState,
                user,
                now
            ),
        ];

        // ! TODO: should probably improve nullability handling in the next major version
        return new ProcessStateChange
        {
            OldProcessState = null!,
            NewProcessState = startState,
            Events = events,
        };
    }

    private async Task<ProcessStateChange?> MoveProcessStateToNextAndGenerateEvents(
        IInstanceDataAccessor dataAccessor,
        string? action = null
    )
    {
        Instance instance = dataAccessor.Instance;
        if (instance.Process == null)
        {
            return null;
        }

        PlatformUser user = await ExtractPlatformUser();
        ProcessStateChange result = await ComputeNextTransition(dataAccessor, action, user, DateTime.UtcNow);

        instance.Process = result.NewProcessState;

        return result;
    }

    private async Task<ProcessStateChange> ComputeNextTransition(
        IInstanceDataAccessor dataAccessor,
        string? action,
        PlatformUser user,
        DateTime now
    )
    {
        ProcessElement nextElement = await GetNextElement(dataAccessor, action);
        return _transitionBuilder.Build(dataAccessor.Instance, nextElement, action, user, now);
    }

    private async Task<ProcessElement> GetNextElement(IInstanceDataAccessor dataAccessor, string? action)
    {
        ProcessState process = dataAccessor.Instance.Process ?? throw new ProcessException("Process is null");
        string currentTaskId =
            process.CurrentTask?.ElementId ?? throw new ProcessException("Current task element ID is null");

        return await _processNavigator.GetNextTask(dataAccessor, currentTaskId, action)
            ?? throw new ProcessException("Next process element was unexpectedly null");
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
                    SystemUserOwnerOrgNo = auth.SystemUserOrgNr.Get(Models.OrganizationNumberFormat.Local),
                    SystemUserName = null, // TODO: will get this name later when a lookup API is implemented or the name is passed in token
                    AuthenticationLevel = auth.AuthenticationLevel,
                };
            default:
                throw new InvalidOperationException($"Unknown authentication context: {currentAuth.GetType().Name}");
        }
    }

    private async Task<ProcessNextWorkflowResult> HandleMoveToNext(
        InstanceDataUnitOfWork transitionData,
        string? action,
        ProcessElement nextElement,
        string? language,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartProcessMoveToNextActivity(transitionData.Instance, action);

        // Capture the same snapshot and form data used by the gateways for the acquire fence.
        string state = await _workflowCallbackStateService.CaptureState(transitionData);

        return await _workflowEngineService.EnqueueAndWaitForProcessNext(
            transitionData.Instance,
            transitionData.StorageVersions,
            state,
            action,
            nextElement,
            language,
            cancellationToken: cancellationToken
        );
    }

    /// <inheritdoc/>
    public async Task EnqueueProcessNext(
        IInstanceDataAccessor dataAccessor,
        Actor actor,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        DateTimeOffset executionReferenceTime,
        string? action = null,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default
    )
    {
        Instance instance = dataAccessor.Instance;
        ProcessStateChange processStateChange = await ComputeNextTransition(
            dataAccessor,
            action,
            ProcessTransitionBuilder.CreatePlatformUser(actor),
            executionReferenceTime.UtcDateTime
        );

        await _workflowEngineService.EnqueueDependentProcessNext(
            instance,
            processStateChange,
            dependsOnWorkflowId,
            collectionKey,
            state,
            actor,
            idempotencyKey,
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Selects the action performed by process/completeProcess, or the implicit reject for process/next.
    /// </summary>
    /// <remarks>
    /// This differs from the authorization table: unmapped task types keep their name, so <c>payment</c> does not
    /// invoke the <c>pay</c> action handler.
    /// </remarks>
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

    private static ProcessChangeResult CreateCompleteProcessAuthorizationFailedResult(
        string currentTaskId,
        string altinnTaskType
    ) =>
        new()
        {
            Success = false,
            ErrorType = ProcessErrorType.Unauthorized,
            ErrorMessage =
                $"User is not authorized to complete the current task. Task ID: {LogSanitizer.Sanitize(currentTaskId)}. Task type: {LogSanitizer.Sanitize(altinnTaskType)}.",
            CompleteProcessAuthorizationFailed = true,
        };

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

    private async Task<ProcessChangeResult> CreateProcessStatusBlockedResult(
        Instance instance,
        ProcessStatus currentStatus,
        CancellationToken cancellationToken
    )
    {
        WorkflowTaskStatus workflowStatus = await _workflowEngineService.ResolveWorkflowTaskStatus(
            instance,
            cancellationToken
        );
        if (workflowStatus.Status == WorkflowActivityStatus.Processing)
        {
            return CreateCurrentTaskWorkflowBlockedResult(ProcessNextState.Retrying);
        }

        if (workflowStatus.Status == WorkflowActivityStatus.Failed)
        {
            return CreateCurrentTaskWorkflowBlockedResult(ProcessNextState.ResumeRequired);
        }

        // Idle: the transition finished after the read, or nothing owns the instance; only the status is certain.
        var problem = ProcessStatusHelper.CreateMutationProblem(currentStatus);
        return new ProcessChangeResult
        {
            Success = false,
            ErrorType = ProcessErrorType.Conflict,
            ErrorTitle = problem.Title,
            ErrorMessage = problem.Detail,
            BlockingProcessStatus = currentStatus,
        };
    }

    private IPipelineServiceTask? CheckIfServiceTask(string? altinnTaskType)
    {
        if (altinnTaskType is null)
            return null;

        return _appImplementationFactory.FindServiceTask(altinnTaskType);
    }

    private sealed record CurrentTaskIdAndAltinnTaskType(string CurrentTaskId, string AltinnTaskType);
}
