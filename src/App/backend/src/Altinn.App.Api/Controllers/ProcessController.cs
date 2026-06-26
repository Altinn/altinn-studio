using System.Globalization;
using System.Net;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AppProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for setting and moving process flow of an instance.
/// </summary>
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process")]
[ApiController]
[Authorize]
[AutoValidateAntiforgeryTokenIfAuthCookie]
public class ProcessController : ControllerBase
{
    private const int MaxIterationsAllowed = 100;

    private readonly ILogger<ProcessController> _logger;
    private readonly IInstanceClient _instanceClient;
    private readonly IProcessClient _processClient;
    private readonly IProcessEngine _processEngine;
    private readonly IProcessReader _processReader;
    private readonly IProcessEngineAuthorizer _processEngineAuthorizer;
    private readonly IValidationService _validationService;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly ProcessStateEnricher _processStateEnricher;
    private readonly IRegisterClient _registerClient;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;
    private readonly IInstanceLocker _instanceLocker;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessController"/>
    /// </summary>
    public ProcessController(
        ILogger<ProcessController> logger,
        IInstanceClient instanceClient,
        IProcessClient processClient,
        IValidationService validationService,
        IProcessReader processReader,
        IServiceProvider serviceProvider,
        IProcessEngineAuthorizer processEngineAuthorizer,
        ProcessStateEnricher processStateEnricher
    )
    {
        _logger = logger;
        _instanceClient = instanceClient;
        _processClient = processClient;
        _processReader = processReader;
        _processEngine = serviceProvider.GetRequiredService<IProcessEngine>();
        _processEngineAuthorizer = processEngineAuthorizer;
        _validationService = validationService;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _processStateEnricher = processStateEnricher;
        _registerClient = serviceProvider.GetRequiredService<IRegisterClient>();
        _dataElementAccessChecker = serviceProvider.GetRequiredService<IDataElementAccessChecker>();
        _instanceLocker = serviceProvider.GetRequiredService<IInstanceLocker>();
    }

    /// <summary>
    /// Get the process state of an instance.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <returns>the instance's process state</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    public async Task<ActionResult<AppProcessState>> GetProcessState(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid
    )
    {
        try
        {
            Instance instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );
            AppProcessState appProcessState = await _processStateEnricher.Enrich(instance, instance.Process, User);

            return Ok(appProcessState);
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}"
            );
        }
        catch (Exception exception)
        {
            _logger.LogError($"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}");
            return ExceptionResponse(exception, $"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}");
        }
    }

    /// <summary>
    /// Starts the process of an instance.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="startEvent">a specific start event id to start the process, must be used if there are more than one start events</param>
    /// <returns>The process state</returns>
    [HttpPost("start")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(WorkflowInitializationProblemDetails), StatusCodes.Status500InternalServerError)]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_INSTANTIATE)]
    public async Task<ActionResult<AppProcessState>> StartProcess(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? startEvent = null
    )
    {
        Instance? instance = null;

        try
        {
            instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );

            var request = new ProcessStartRequest()
            {
                Instance = instance,
                StartEventId = startEvent,
                User = User,
            };
            ProcessChangeResult result = await _processEngine.CreateInitialProcessState(request);
            if (!result.Success)
            {
                return Conflict(result.ErrorMessage);
            }

            if (result.ProcessStateChange is not null)
            {
                await using var instanceLock = _instanceLocker.InitLock(instanceOwnerPartyId, instanceGuid);
                await instanceLock.Lock();
                instance = await _processEngine.SubmitInitialProcessState(
                    instance,
                    result.ProcessStateChange,
                    _instanceLocker.CurrentLockToken
                        ?? throw new InvalidOperationException("Lock token must be set after acquiring instance lock")
                );
            }

            AppProcessState appProcessState = await _processStateEnricher.Enrich(instance, instance.Process, User);
            return Ok(appProcessState);
        }
        catch (WorkflowSubmissionFailedException exception)
        {
            // The existing instance is intentionally retained; unlike instantiation we never delete it here.
            return HandleStartProcessWorkflowSubmissionFailure(
                exception,
                instance,
                $"Process workflow submission failed for instance {instance?.Id} of {instance?.AppId}"
            );
        }
        catch (WorkflowExecutionFailedException exception)
        {
            // Workflow was accepted but execution failed; the process state may have changed, so steer the
            // client to resume rather than starting the process again.
            return HandleStartProcessWorkflowExecutionFailure(
                exception,
                $"Process workflow execution failed for instance {exception.Instance.Id} of {exception.Instance.AppId}",
                org,
                app
            );
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Unable to start the process for instance {instance?.Id} of {instance?.AppId}"
            );
        }
        catch (Exception startException)
        {
            _logger.LogError(
                $"Unable to start the process for instance {instance?.Id} of {instance?.AppId}. Due to {startException}"
            );
            return ExceptionResponse(
                startException,
                $"Unable to start the process for instance {instance?.Id} of {instance?.AppId}"
            );
        }
    }

    /// <summary>
    /// Gets a list of the next process elements that can be reached from the current process element.
    /// If process is not started it returns the possible start events.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <returns>list of next process element identifiers (tasks or events)</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [HttpGet("next")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [Obsolete(
        "From v8 of nuget package navigation is done by sending performed action to the next api. Available actions are returned in the GET /process endpoint"
    )]
    public async Task<ActionResult<List<string>>> GetNextElements(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid
    )
    {
        Instance? instance = null;
        string? currentTaskId = null;

        try
        {
            instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );

            if (instance.Process == null)
            {
                return Ok(_processReader.GetStartEventIds());
            }

            currentTaskId = instance.Process.CurrentTask?.ElementId;

            if (currentTaskId == null)
            {
                return Conflict($"Instance does not have valid info about currentTask");
            }

            return Ok(new List<string>());
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Unable to find next process element for instance {instance?.Id} and current task {currentTaskId}. Exception was {e.Message}. Is the process file OK?"
            );
        }
        catch (Exception processException)
        {
            _logger.LogError(
                $"Unable to find next process element for instance {instance?.Id} and current task {currentTaskId}. {processException}"
            );
            return ExceptionResponse(
                processException,
                $"Unable to find next process element for instance {instance?.Id} and current task {currentTaskId}. Exception was {processException.Message}. Is the process file OK?"
            );
        }
    }

    /// <summary>
    /// Change the instance's process state to next process element in accordance with process definition.
    /// </summary>
    /// <returns>new process state, or the full enriched instance when <paramref name="returnInstance"/> is true</returns>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="ct">Cancellation token, populated by the framework</param>
    /// <param name="elementId">obsolete: alias for action</param>
    /// <param name="language">Signal the language to use for pdf generation, error messages...</param>
    /// <param name="returnInstance">When true, the response body is <see cref="EnrichedInstanceResponse"/> reflecting the post-transition instance state. Defaults to false for backward compatibility.</param>
    /// <param name="processNext">The body of the request containing possible actions to perform before advancing the process</param>
    [HttpPut("next")]
    [ProducesResponseType(typeof(AppProcessState), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(EnrichedInstanceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> NextElement(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken ct,
        [FromQuery] string? elementId = null,
        [FromQuery] string? language = null,
        [FromQuery] bool returnInstance = false,
        [FromBody] ProcessNext? processNext = null
    )
    {
        try
        {
            Instance instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                null,
                ct
            );

            var processNextRequest = new ProcessNextRequest
            {
                User = User,
                Instance = instance,
                Action = processNext?.Action,
                ActionOnBehalfOf = processNext?.ActionOnBehalfOf,
                Language = language,
            };

            ProcessChangeResult result = await _processEngine.Next(processNextRequest, ct);

            if (!result.Success)
            {
                return GetResultForError(result);
            }

            if (returnInstance)
            {
                // Reload the instance so data elements, dataValues, presentationTexts etc.
                // reflect any mutations the process engine made (e.g. generated PDF, locked elements).
                instance = await _instanceClient.GetInstance(
                    app,
                    org,
                    instanceOwnerPartyId,
                    instanceGuid,
                    authenticationMethod: null,
                    ct
                );
                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

                var instanceOwnerPartyTask = _registerClient.GetPartyUnchecked(
                    instanceOwnerPartyId,
                    cancellationToken: ct
                );
                var processStateTask = _processStateEnricher.Enrich(
                    instance,
                    result.ProcessStateChange.NewProcessState,
                    User
                );
                await Task.WhenAll(instanceOwnerPartyTask, processStateTask);

                var dto = EnrichedInstanceResponse.From(
                    await instance.WithOnlyAccessibleDataElements(_dataElementAccessChecker),
                    await instanceOwnerPartyTask,
                    await processStateTask
                );

                return Ok(dto);
            }

            AppProcessState appProcessState = await _processStateEnricher.Enrich(
                instance,
                result.ProcessStateChange.NewProcessState,
                User
            );

            return Ok(appProcessState);
        }
        catch (PlatformHttpException e)
        {
            _logger.LogError("Platform exception when processing next. {Message}", e.Message);
            return HandlePlatformHttpException(e, "Process next failed.");
        }
        catch (Exception exception)
        {
            return ExceptionResponse(exception, "Process next failed.");
        }
    }

    /// <summary>
    /// Resumes the workflow that established the instance's current task.
    /// </summary>
    [HttpPost("resume")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AppProcessState>> ResumeCurrentTask(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken ct
    )
    {
        try
        {
            Instance instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                null,
                ct
            );

            ProcessChangeResult result = await _processEngine.ResumeCurrentTask(
                new ProcessNextRequest
                {
                    User = User,
                    Instance = instance,
                    Action = null,
                    Language = null,
                },
                ct
            );

            if (!result.Success)
            {
                return GetResultForError(result);
            }

            Instance freshInstance = result.MutatedInstance ?? instance;
            AppProcessState appProcessState = await _processStateEnricher.Enrich(
                freshInstance,
                freshInstance.Process,
                User
            );

            return Ok(appProcessState);
        }
        catch (PlatformHttpException e)
        {
            _logger.LogError("Platform exception when resuming current task. {Message}", e.Message);
            return HandlePlatformHttpException(e, "Resume current task failed.");
        }
        catch (Exception exception)
        {
            return ExceptionResponse(exception, "Resume current task failed.");
        }
    }

    /// <summary>
    /// Attemts to end the process by running next until an end event is reached.
    /// Notice that process must have been started.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns>current process status</returns>
    [HttpPut("completeProcess")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AppProcessState>> CompleteProcess(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? language = null
    )
    {
        Instance instance;

        try
        {
            instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(e, "Could not complete process.");
        }

        if (instance.Process == null)
        {
            return Conflict(
                new ProblemDetails()
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Process is not started. Use start!",
                }
            );
        }
        else
        {
            if (instance.Process.Ended.HasValue)
            {
                return Conflict($"Process is ended. It cannot be restarted.");
            }
        }

        string currentTaskId = instance.Process.CurrentTask?.ElementId ?? instance.Process.StartEvent;

        if (currentTaskId == null)
        {
            return Conflict($"Instance does not have valid currentTask");
        }

        // do next until end event is reached or task cannot be completed.
        int counter = 0;

        while (
            instance.Process.EndEvent is null
            && instance.Process.CurrentTask is not null
            && counter++ < MaxIterationsAllowed
        )
        {
            bool authorizeProcessNext = await _processEngineAuthorizer.AuthorizeProcessNext(instance);

            if (!authorizeProcessNext)
            {
                return Forbid();
            }

            var validationProblem = await GetValidationProblemDetails(
                instance,
                instance.Process.CurrentTask.ElementId,
                language
            );
            if (validationProblem is not null)
            {
                return Conflict(validationProblem);
            }

            try
            {
                ProcessNextRequest request = new()
                {
                    Instance = instance,
                    User = User,
                    Action = Altinn.App.Core.Internal.Process.ProcessEngine.ConvertTaskTypeToAction(
                        instance.Process.CurrentTask.AltinnTaskType
                    ),
                    Language = language,
                };
                ProcessChangeResult result = await _processEngine.Next(request);

                if (!result.Success)
                {
                    return GetResultForError(result);
                }

                instance = result.MutatedInstance ?? instance;
            }
            catch (Exception ex)
            {
                return ExceptionResponse(ex, "Complete process failed.");
            }
        }

        if (counter >= MaxIterationsAllowed)
        {
            _logger.LogError(
                $"More than {MaxIterationsAllowed} iterations detected in process. Possible loop. Fix app's process definition!"
            );
            return StatusCode(
                500,
                $"More than {counter} iterations detected in process. Possible loop. Fix app process definition!"
            );
        }

        AppProcessState appProcessState = await _processStateEnricher.Enrich(instance, instance.Process, User);
        return Ok(appProcessState);
    }

    /// <summary>
    /// Get the process history for an instance.
    /// </summary>
    /// <returns>Returns a list of the process events.</returns>
    [HttpGet("history")]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProcessHistoryList>> GetProcessHistory(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid
    )
    {
        try
        {
            return Ok(
                await _processClient.GetProcessHistory(
                    instanceGuid.ToString(),
                    instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture)
                )
            );
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {e}"
            );
        }
        catch (Exception processException)
        {
            _logger.LogError(
                $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {processException}"
            );
            return ExceptionResponse(
                processException,
                $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {processException}"
            );
        }
    }

    private ActionResult GetResultForError(ProcessChangeResult result)
    {
        if (result.WorkflowFailure is not null)
        {
            int statusCode =
                result.WorkflowFailure.Kind == WorkflowFailureKind.Timeout
                    ? StatusCodes.Status504GatewayTimeout
                    : StatusCodes.Status500InternalServerError;

            var problemDetails = new ProblemDetails
            {
                Detail = result.ErrorMessage,
                Status = statusCode,
                Title = "Something went wrong while moving to the next task.",
            };
            problemDetails.Extensions["workflowFailure"] = result.WorkflowFailure;
            if (result.ProcessStateOnFailure is not null)
            {
                problemDetails.Extensions["processStateChanged"] = true;
                problemDetails.Extensions["processState"] = result.ProcessStateOnFailure;
            }

            return StatusCode(statusCode, problemDetails);
        }

        switch (result.ErrorType)
        {
            case ProcessErrorType.Conflict:
                Dictionary<string, object?> extensions = new() { { "validationIssues", result.ValidationIssues } };
                if (result.ProcessNextState is { } processNextState)
                {
                    extensions["processNextState"] = ToProcessNextStateValue(processNextState);
                }

                return Conflict(
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status409Conflict,
                        Title = result.ErrorTitle,
                        Extensions = extensions,
                    }
                );
            case ProcessErrorType.Internal:
                return StatusCode(
                    500,
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status500InternalServerError,
                        Title = result.ErrorTitle ?? "Internal server error",
                    }
                );
            case ProcessErrorType.Unauthorized:
                return StatusCode(
                    403,
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status403Forbidden,
                        Title = result.ErrorTitle ?? "Unauthorized",
                    }
                );
            default:
                return StatusCode(
                    500,
                    new ProblemDetails()
                    {
                        Detail = $"Unknown ProcessErrorType {result.ErrorType}",
                        Status = StatusCodes.Status500InternalServerError,
                        Title = result.ErrorTitle ?? "Internal server error",
                    }
                );
        }
    }

    private ObjectResult HandleStartProcessWorkflowSubmissionFailure(
        WorkflowSubmissionFailedException exception,
        Instance? instance,
        string message
    )
    {
        // Derive the (state, action) pair together so they cannot drift apart. NotAccepted means the engine
        // rejected the submission and the existing instance was left untouched, so retrying the start is safe.
        // Unknown means we could not confirm whether it was accepted, so retrying could double-apply: inspect first.
        (WorkflowInitializationState state, WorkflowRecommendedAction recommendedAction) = exception.Kind switch
        {
            WorkflowSubmissionFailureKind.NotAccepted => (
                WorkflowInitializationState.WorkflowNotAccepted,
                WorkflowRecommendedAction.RetryStartProcess
            ),
            _ => (WorkflowInitializationState.WorkflowAcceptanceUnknown, WorkflowRecommendedAction.InspectInstance),
        };

        return WorkflowInitializationProblem.Create(
            _logger,
            WorkflowInitializationFlow.ProcessStart,
            exception,
            message,
            state,
            instance,
            recommendedAction,
            submissionFailureKind: exception.Kind,
            submissionStatusCode: exception.StatusCode,
            collectionKey: exception.CollectionKey
        );
    }

    private ObjectResult HandleStartProcessWorkflowExecutionFailure(
        WorkflowExecutionFailedException exception,
        string message,
        string org,
        string app
    )
    {
        return WorkflowInitializationProblem.Create(
            _logger,
            WorkflowInitializationFlow.ProcessStart,
            exception,
            message,
            state: WorkflowInitializationState.WorkflowFailed,
            instance: exception.Instance,
            recommendedAction: WorkflowRecommendedAction.ResumeCurrentTask,
            resumeEndpoint: WorkflowInitializationProblem.CreateProcessResumeEndpoint(org, app, exception.Instance),
            workflowFailure: exception.WorkflowFailure,
            workflowAccepted: true,
            processStateChanged: exception.ProcessStateChanged
        );
    }

    private ObjectResult ExceptionResponse(Exception exception, string message)
    {
        _logger.LogError(exception, message);

        if (exception is PlatformHttpResponseSnapshotException phse)
        {
            return StatusCode(
                phse.StatusCode,
                new ProblemDetails()
                {
                    Detail = phse.Message,
                    Status = phse.StatusCode,
                    Title = message,
                }
            );
        }

        if (exception is PlatformHttpException phe)
        {
            return StatusCode(
                (int)phe.Response.StatusCode,
                new ProblemDetails()
                {
                    Detail = phe.Message,
                    Status = (int)phe.Response.StatusCode,
                    Title = message,
                }
            );
        }

        if (exception is ServiceException se)
        {
            return StatusCode(
                (int)se.StatusCode,
                new ProblemDetails()
                {
                    Detail = se.Message,
                    Status = (int)se.StatusCode,
                    Title = message,
                }
            );
        }

        return StatusCode(
            500,
            new ProblemDetails()
            {
                Detail = exception.Message,
                Status = 500,
                Title = message,
            }
        );
    }

    private async Task<ProblemDetails?> GetValidationProblemDetails(
        Instance instance,
        string currentTaskId,
        string? language
    )
    {
        var dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(instance, currentTaskId, language);

        var validationIssues = await _validationService.ValidateInstanceAtTask(
            dataAccessor,
            currentTaskId, // run full validation
            ignoredValidators: null,
            onlyIncrementalValidators: null,
            language: language
        );
        var success = validationIssues.TrueForAll(v => v.Severity != ValidationIssueSeverity.Error);

        if (!success)
        {
            var errorCount = validationIssues.Count(v => v.Severity == ValidationIssueSeverity.Error);
            return new ProblemDetails()
            {
                Detail = $"{errorCount} validation errors found for task {currentTaskId}",
                Status = StatusCodes.Status409Conflict,
                Title = "Validation failed for task",
                Extensions = new Dictionary<string, object?>() { { "validationIssues", validationIssues } },
            };
        }

        return null;
    }

    private ActionResult HandlePlatformHttpException(PlatformHttpException e, string defaultMessage)
    {
        if (e.Response.StatusCode == HttpStatusCode.Forbidden)
        {
            return Forbid();
        }

        if (e.Response.StatusCode == HttpStatusCode.NotFound)
        {
            return NotFound();
        }

        if (e.Response.StatusCode == HttpStatusCode.Conflict)
        {
            return Conflict();
        }

        return ExceptionResponse(e, defaultMessage);
    }

    private static string ToProcessNextStateValue(ProcessNextState processNextState) =>
        processNextState switch
        {
            ProcessNextState.Retrying => "retrying",
            ProcessNextState.ResumeRequired => "resumeRequired",
            _ => throw new ArgumentOutOfRangeException(nameof(processNextState), processNextState, null),
        };
}
