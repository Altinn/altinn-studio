using System.Net;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using AppProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;

namespace Altinn.App.Api.Controllers
{
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
        private readonly IInstance _instanceClient;
        private readonly IProcess _processService;
        private readonly IValidation _validationService;
        private readonly IAuthorization _authorization;
        private readonly IProcessEngine _processEngine;
        private readonly IProcessReader _processReader;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/>
        /// </summary>
        public ProcessController(
            ILogger<ProcessController> logger,
            IInstance instanceClient,
            IProcess processService,
            IValidation validationService,
            IAuthorization authorization,
            IProcessReader processReader,
            IProcessEngine processEngine)
        {
            _logger = logger;
            _instanceClient = instanceClient;
            _processService = processService;
            _validationService = validationService;
            _authorization = authorization;
            _processReader = processReader;
            _processEngine = processEngine;
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
        [Authorize(Policy = "InstanceRead")]
        public async Task<ActionResult<AppProcessState>> GetProcessState(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                AppProcessState appProcessState = await ConvertAndAuthorizeActions(org, app, instanceOwnerPartyId, instanceGuid, instance.Process);

                return Ok(appProcessState);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}");
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
        [Authorize(Policy = "InstanceInstantiate")]
        public async Task<ActionResult<AppProcessState>> StartProcess(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string startEvent = null)
        {
            Instance instance = null;

            try
            {
                instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                var request = new ProcessStartRequest()
                {
                    Instance = instance,
                    StartEventId = startEvent,
                    User = User,
                    Dryrun = false
                };
                var result = await _processEngine.StartProcess(request);
                if (!result.Success)
                {
                    return Conflict(result.ErrorMessage);
                }
                
                AppProcessState appProcessState = await ConvertAndAuthorizeActions(org, app, instanceOwnerPartyId, instanceGuid, result.ProcessStateChange?.NewProcessState);
                return Ok(appProcessState);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Unable to start the process for instance {instance?.Id} of {instance?.AppId}");
            }
            catch (Exception startException)
            {
                _logger.LogError($"Unable to start the process for instance {instance?.Id} of {instance?.AppId}. Due to {startException}");
                return ExceptionResponse(startException, $"Unable to start the process for instance {instance?.Id} of {instance?.AppId}");
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
        [Authorize(Policy = "InstanceRead")]
        [HttpGet("next")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [Obsolete("From v8 of nuget package navigation is done by sending performed action to the next api. Available actions are returned in the GET /process endpoint")]
        public async Task<ActionResult<List<string>>> GetNextElements(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = null;
            string currentTaskId = null;

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
                return HandlePlatformHttpException(e, $"Unable to find next process element for instance {instance?.Id} and current task {currentTaskId}. Exception was {e.Message}. Is the process file OK?");
            }
            catch (Exception processException)
            {
                _logger.LogError($"Unable to find next process element for instance {instance?.Id} and current task {currentTaskId}. {processException}");
                return ExceptionResponse(processException, $"Unable to find next process element for instance {instance?.Id} and current task {currentTaskId}. Exception was {processException.Message}. Is the process file OK?");
            }
        }

        private async Task<bool> CanTaskBeEnded(Instance instance, string currentElementId)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            bool canEndTask;

            if (instance.Process?.CurrentTask?.Validated == null || !instance.Process.CurrentTask.Validated.CanCompleteTask)
            {
                validationIssues = await _validationService.ValidateAndUpdateProcess(instance, currentElementId);

                canEndTask = await ProcessHelper.CanEndProcessTask(instance, validationIssues);
            }
            else
            {
                canEndTask = await ProcessHelper.CanEndProcessTask(instance, validationIssues);
            }

            return canEndTask;
        }

        /// <summary>
        /// Change the instance's process state to next process element in accordance with process definition.
        /// </summary>
        /// <returns>new process state</returns>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="elementId">obsolete: alias for action</param>
        /// <param name="lang">Optional parameter to pass on the language used in the form if this differs from the profile language,
        /// which otherwise is used automatically. The language is picked up when generating the PDF when leaving a step, 
        /// and is not used for anything else.
        /// </param>
        [HttpPut("next")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AppProcessState>> NextElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string elementId = null,
            [FromQuery] string lang = null)
        {
            try
            {
                ProcessNext? processNext = null;
                if (Request.Body != null && Request.Body.CanRead)
                {
                    processNext = await DeserializeFromStream<ProcessNext>(Request.Body);
                }
                
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                if (instance.Process == null)
                {
                    return Conflict($"Process is not started. Use start!");
                }

                if (instance.Process.Ended.HasValue)
                {
                    return Conflict($"Process is ended.");
                }

                string altinnTaskType = instance.Process.CurrentTask?.AltinnTaskType;

                if (altinnTaskType == null)
                {
                    return Conflict($"Instance does not have current altinn task type information!");
                }

                bool authorized;
                string checkedAction = EnsureActionNotTaskType(processNext?.Action ?? altinnTaskType);
                authorized = await AuthorizeAction(checkedAction, org, app, instanceOwnerPartyId, instanceGuid);

                if (!authorized)
                {
                    return Forbid();
                }

                var request = new ProcessNextRequest()
                {
                    Instance = instance,
                    User = User,
                    Action = checkedAction
                };
                var result = await _processEngine.Next(request);
                if (!result.Success)
                {
                    return Conflict(result.ErrorMessage);
                }

                AppProcessState appProcessState = await ConvertAndAuthorizeActions(org, app, instanceOwnerPartyId, instanceGuid, result.ProcessStateChange?.NewProcessState);

                return Ok(appProcessState);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, "Process next failed.");
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, "Process next failed.");
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
        /// <returns>current process status</returns>
        [HttpPut("completeProcess")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AppProcessState>> CompleteProcess(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
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
                return Conflict($"Process is not started. Use start!");
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
            do
            {
                string altinnTaskType = EnsureActionNotTaskType(instance.Process.CurrentTask?.AltinnTaskType);

                bool authorized = await AuthorizeAction(altinnTaskType, org, app, instanceOwnerPartyId, instanceGuid);
                if (!authorized)
                {
                    return Forbid();
                }

                if (!await CanTaskBeEnded(instance, currentTaskId))
                {
                    return Conflict($"Instance is not valid for task {currentTaskId}. Automatic completion of process is stopped");
                }

                try
                {
                    ProcessNextRequest request = new ProcessNextRequest()
                    {
                        Instance = instance,
                        User = User,
                        Action = altinnTaskType
                    };
                    var result = await _processEngine.Next(request);

                    if (!result.Success)
                    {
                        return Conflict(result.ErrorMessage);
                    }

                    currentTaskId = result.ProcessStateChange?.NewProcessState.CurrentTask.ElementId;
                }
                catch (Exception ex)
                {
                    return ExceptionResponse(ex, "Complete process failed.");
                }

                counter++;
            }
            while (instance.Process.EndEvent == null || counter > MaxIterationsAllowed);

            if (counter > MaxIterationsAllowed)
            {
                _logger.LogError($"More than {counter} iterations detected in process. Possible loop. Fix app {org}/{app}'s process definition!");
                return StatusCode(500, $"More than {counter} iterations detected in process. Possible loop. Fix app process definition!");
            }

            AppProcessState appProcessState = await ConvertAndAuthorizeActions(org, app, instanceOwnerPartyId, instanceGuid, instance.Process);
            return Ok(appProcessState);
        }

        /// <summary>
        /// Get the process history for an instance.
        /// </summary>
        /// <returns>Returns a list of the process events.</returns>
        [HttpGet("history")]
        [Authorize(Policy = "InstanceRead")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult> GetProcessHistory(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            try
            {
                return Ok(await _processService.GetProcessHistory(instanceGuid.ToString(), instanceOwnerPartyId.ToString()));
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {e}");
            }
            catch (Exception processException)
            {
                _logger.LogError($"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {processException}");
                return ExceptionResponse(processException, $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {processException}");
            }
        }
        
        private async Task<AppProcessState> ConvertAndAuthorizeActions(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, ProcessState? processState)
        {
            AppProcessState appProcessState = new AppProcessState(processState);
            if (appProcessState.CurrentTask?.ElementId != null)
            {
                var flowElement = _processReader.GetFlowElement(appProcessState.CurrentTask.ElementId);
                if (flowElement is ProcessTask processTask)
                {
                    appProcessState.CurrentTask.Actions = new Dictionary<string, bool>();
                    foreach (AltinnAction action in processTask.ExtensionElements?.AltinnProperties?.AltinnActions ?? new List<AltinnAction>())
                    {
                        appProcessState.CurrentTask.Actions.Add(action.Id, await AuthorizeAction(action.Id, org, app, instanceOwnerPartyId, instanceGuid, flowElement.Id));
                    }

                    appProcessState.CurrentTask.HasWriteAccess = await AuthorizeAction("write", org, app, instanceOwnerPartyId, instanceGuid, flowElement.Id);
                    appProcessState.CurrentTask.HasReadAccess = await AuthorizeAction("read", org, app, instanceOwnerPartyId, instanceGuid, flowElement.Id);
                }
            }

            return appProcessState;
        }

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError(exception, message);

            if (exception is PlatformHttpException)
            {
                PlatformHttpException phe = exception as PlatformHttpException;
                return StatusCode((int)phe.Response.StatusCode, phe.Message);
            }
            else if (exception is ServiceException)
            {
                ServiceException se = exception as ServiceException;
                return StatusCode((int)se.StatusCode, se.Message);
            }

            return StatusCode(500, $"{message}");
        }

        private async Task<bool> AuthorizeAction(string action, string org, string app, int instanceOwnerPartyId, Guid instanceGuid, string taskId = null)
        {
            return await _authorization.AuthorizeAction(new AppIdentifier(org, app), new InstanceIdentifier(instanceOwnerPartyId, instanceGuid), HttpContext.User, action, taskId);
        }

        private static string EnsureActionNotTaskType(string actionOrTaskType)
        {
            switch (actionOrTaskType)
            {
                case "data":
                case "feedback":
                    return "write";
                case "confirmation":
                    return "confirm";
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
        
        private static async Task<T> DeserializeFromStream<T>(Stream stream)
        {
            using StreamReader reader = new StreamReader(stream);
            string text = await reader.ReadToEndAsync();
            return JsonConvert.DeserializeObject<T>(text);
        }
    }
}
