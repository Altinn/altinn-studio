using System.Globalization;
using System.Net;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AppProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;
using IAuthorizationService = Altinn.App.Core.Internal.Auth.IAuthorizationService;

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
    private readonly IValidationService _validationService;
    private readonly IAuthorizationService _authorization;
    private readonly IProcessEngine _processEngine;
    private readonly IProcessReader _processReader;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IProcessEngineAuthorizer _processEngineAuthorizer;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessController"/>
    /// </summary>
    public ProcessController(
        ILogger<ProcessController> logger,
        IInstanceClient instanceClient,
        IProcessClient processClient,
        IValidationService validationService,
        IAuthorizationService authorization,
        IProcessReader processReader,
        IProcessEngine processEngine,
        IServiceProvider serviceProvider,
        IProcessEngineAuthorizer processEngineAuthorizer
    )
    {
        _logger = logger;
        _instanceClient = instanceClient;
        _processClient = processClient;
        _validationService = validationService;
        _authorization = authorization;
        _processReader = processReader;
        _processEngine = processEngine;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _processEngineAuthorizer = processEngineAuthorizer;
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
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            AppProcessState appProcessState = await ConvertAndAuthorizeActions(instance, instance.Process);

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
            instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

            var request = new ProcessStartRequest()
            {
                Instance = instance,
                StartEventId = startEvent,
                User = User,
            };
            ProcessChangeResult result = await _processEngine.GenerateProcessStartEvents(request);
            if (!result.Success)
            {
                return Conflict(result.ErrorMessage);
            }

            await _processEngine.HandleEventsAndUpdateStorage(instance, null, result.ProcessStateChange?.Events);

            AppProcessState appProcessState = await ConvertAndAuthorizeActions(
                instance,
                result.ProcessStateChange?.NewProcessState
            );
            return Ok(appProcessState);
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
            instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

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

    /// <summary>
    /// Change the instance's process state to next process element in accordance with process definition.
    /// </summary>
    /// <returns>new process state</returns>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="ct">Cancellation token, populated by the framework</param>
    /// <param name="elementId">obsolete: alias for action</param>
    /// <param name="language">Signal the language to use for pdf generation, error messages...</param>
    /// <param name="processNext">The body of the request containing possible actions to perform before advancing the process</param>
    [HttpPut("next")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AppProcessState>> NextElement(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken ct,
        [FromQuery] string? elementId = null,
        [FromQuery] string? language = null,
        [FromBody] ProcessNext? processNext = null
    )
    {
        try
        {
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

            string? currentTaskId = instance.Process.CurrentTask?.ElementId;

            if (currentTaskId is null)
            {
                return Conflict(
                    new ProblemDetails()
                    {
                        Status = StatusCodes.Status409Conflict,
                        Title = "Process is not started. Use start!",
                    }
                );
            }

            if (instance.Process.Ended.HasValue)
            {
                return Conflict(
                    new ProblemDetails() { Status = StatusCodes.Status409Conflict, Title = "Process is ended." }
                );
            }

            string? altinnTaskType = instance.Process.CurrentTask?.AltinnTaskType;

            if (altinnTaskType == null)
            {
                return Conflict(
                    new ProblemDetails()
                    {
                        Status = StatusCodes.Status409Conflict,
                        Title = "Instance does not have current altinn task type information!",
                    }
                );
            }

            bool authorized = await _processEngineAuthorizer.AuthorizeProcessNext(instance, processNext?.Action);

            if (!authorized)
            {
                return StatusCode(
                    403,
                    new ProblemDetails()
                    {
                        Status = StatusCodes.Status403Forbidden,
                        Detail =
                            $"User is not authorized to perform process next. Task ID: {currentTaskId}. Task type: {altinnTaskType}. Action: {processNext?.Action ?? "none"}.",
                        Title = "Unauthorized",
                    }
                );
            }

            _logger.LogDebug(
                "User successfully authorized to perform process next. Task ID: {CurrentTaskId}. Task type: {AltinnTaskType}. Action: {ProcessNextAction}.",
                currentTaskId,
                altinnTaskType,
                LogSanitizer.Sanitize(processNext?.Action ?? "none")
            );

            string checkedAction = processNext?.Action ?? ConvertTaskTypeToAction(altinnTaskType);

            var request = new ProcessNextRequest()
            {
                Instance = instance,
                User = User,
                Action = checkedAction,
                ActionOnBehalfOf = processNext?.ActionOnBehalfOf,
                Language = language,
            };

            if (processNext?.Action is not null)
            {
                UserActionResult userActionResult = await _processEngine.HandleUserAction(request, ct);
                if (userActionResult.ResultType is ResultType.Failure)
                {
                    var failedUserActionResult = new ProcessChangeResult()
                    {
                        Success = false,
                        ErrorMessage = $"Action handler for action {request.Action} failed!",
                        ErrorType = userActionResult.ErrorType,
                    };

                    return GetResultForError(failedUserActionResult);
                }
            }

            // If the action is 'reject' the task is being abandoned, and we should skip validation, but only if reject has been allowed for the task in bpmn.
            if (checkedAction == "reject" && _processReader.IsActionAllowedForTask(currentTaskId, checkedAction))
            {
                _logger.LogInformation(
                    "Skipping validation during process next because the action is 'reject' and the task is being abandoned."
                );
            }
            else
            {
                ProblemDetails? validationProblem = await GetValidationProblemDetails(
                    instance,
                    currentTaskId,
                    language
                );
                if (validationProblem is not null)
                {
                    return Conflict(validationProblem);
                }
            }

            ProcessChangeResult result = await _processEngine.Next(request);

            if (!result.Success)
            {
                return GetResultForError(result);
            }

            AppProcessState appProcessState = await ConvertAndAuthorizeActions(
                instance,
                result.ProcessStateChange.NewProcessState
            );

            return Ok(appProcessState);
        }
        catch (PlatformHttpException e)
        {
            _logger.LogError("Platform exception when processing next. {message}", e.Message);
            return HandlePlatformHttpException(e, "Process next failed.");
        }
        catch (Exception exception)
        {
            return ExceptionResponse(exception, "Process next failed.");
        }
    }

    private ActionResult<AppProcessState> GetResultForError(ProcessChangeResult result)
    {
        switch (result.ErrorType)
        {
            case ProcessErrorType.Conflict:
                return Conflict(
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status409Conflict,
                        Title = "Conflict",
                    }
                );
            case ProcessErrorType.Internal:
                return StatusCode(
                    500,
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status500InternalServerError,
                        Title = "Internal server error",
                    }
                );
            case ProcessErrorType.Unauthorized:
                return StatusCode(
                    403,
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status403Forbidden,
                        Title = "Unauthorized",
                    }
                );
            default:
                return StatusCode(
                    500,
                    new ProblemDetails()
                    {
                        Detail = $"Unknown ProcessErrorType {result.ErrorType}",
                        Status = StatusCodes.Status500InternalServerError,
                        Title = "Internal server error",
                    }
                );
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
            instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
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
                ProcessNextRequest request = new ProcessNextRequest()
                {
                    Instance = instance,
                    User = User,
                    Action = ConvertTaskTypeToAction(instance.Process.CurrentTask.AltinnTaskType),
                    Language = language,
                };
                var result = await _processEngine.Next(request);

                if (!result.Success)
                {
                    return GetResultForError(result);
                }
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

        AppProcessState appProcessState = await ConvertAndAuthorizeActions(instance, instance.Process);
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

    private async Task<AppProcessState> ConvertAndAuthorizeActions(Instance instance, ProcessState? processState)
    {
        AppProcessState appProcessState = new AppProcessState(processState);
        if (appProcessState.CurrentTask?.ElementId != null)
        {
            var flowElement = _processReader.GetFlowElement(appProcessState.CurrentTask.ElementId);
            if (flowElement is ProcessTask processTask)
            {
                appProcessState.CurrentTask.Actions = new Dictionary<string, bool>();
                List<AltinnAction> actions = new List<AltinnAction>() { new("read"), new("write") };
                actions.AddRange(
                    processTask.ExtensionElements?.TaskExtension?.AltinnActions ?? new List<AltinnAction>()
                );
                var authDecisions = await AuthorizeActions(actions, instance);
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

    private async Task<List<UserAction>> AuthorizeActions(List<AltinnAction> actions, Instance instance)
    {
        return await _authorization.AuthorizeActions(instance, HttpContext.User, actions);
    }

    private static string ConvertTaskTypeToAction(string actionOrTaskType)
    {
        switch (actionOrTaskType)
        {
            case "data":
            case "feedback":
                return "write";
            case "confirmation":
                return "confirm";
            case "signing":
                return "sign";
            default:
                // Not any known task type, so assume it is an action type
                return actionOrTaskType;
        }
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
}
