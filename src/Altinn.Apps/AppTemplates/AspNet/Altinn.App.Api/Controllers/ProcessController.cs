using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.App.Api.Filters;
using Altinn.App.Common.Process;
using Altinn.App.Common.Process.Elements;
using Altinn.App.Core.Interface;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

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
        private readonly IAltinnApp _altinnApp;
        private readonly IValidation _validationService;
        private readonly IPDP _pdp;
        private readonly IEvents _eventsService;
        private readonly AppSettings _appSettings;
        private readonly IProcessEngine _processEngine;

        private readonly ProcessHelper processHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/>
        /// </summary>
        public ProcessController(
            ILogger<ProcessController> logger,
            IInstance instanceClient,
            IProcess processService,
            IAltinnApp altinnApp,
            IValidation validationService,
            IPDP pdp,
            IEvents eventsService,
            IOptions<AppSettings> appSettings,
            IProcessEngine processEngine)
        {
            _logger = logger;
            _instanceClient = instanceClient;
            _processService = processService;
            _altinnApp = altinnApp;
            _validationService = validationService;
            _pdp = pdp;
            _eventsService = eventsService;
            _appSettings = appSettings.Value;
            _processEngine = processEngine;
            using Stream bpmnStream = _processService.GetProcessDefinition();
            processHelper = new ProcessHelper(bpmnStream);
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
        public async Task<ActionResult<ProcessState>> GetProcessState(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                ProcessState processState = instance.Process;

                return Ok(processState);
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
        public async Task<ActionResult<ProcessState>> StartProcess(
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

                ProcessChangeContext changeContext = new ProcessChangeContext();
                changeContext.RequestedProcessElementId = startEvent;
                changeContext.Instance = instance;
                changeContext.User = User;
                changeContext = await _processEngine.StartProcess(changeContext);
                if (changeContext.FailedProcessChange)
                {
                    return Conflict(changeContext.ProcessMessages[0].Message);
                }

                return Ok(changeContext.Instance.Process);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Unable to start the process for instance {instance.Id} of {instance.AppId}");
            }
            catch (Exception startException)
            {
                _logger.LogError($"Unable to start the process for instance {instance.Id} of {instance.AppId}. Due to {startException}");
                return ExceptionResponse(startException, $"Unable to start the process for instance {instance.Id} of {instance.AppId}");
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
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
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
                    return Ok(processHelper.Process.StartEvents());
                }

                currentTaskId = instance.Process.CurrentTask?.ElementId;

                if (currentTaskId == null)
                {
                    return Conflict($"Instance does not have valid info about currentTask");
                }

                List<string> nextElementIds = processHelper.Process.NextElements(currentTaskId);

                if (nextElementIds.Count == 0)
                {
                    return NotFound("Cannot find any valid process elements that can be reached from current task");
                }

                return Ok(nextElementIds);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. Exception was {e.Message}. Is the process file OK?");
            }
            catch (Exception processException)
            {
                _logger.LogError($"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. {processException}");
                return ExceptionResponse(processException, $"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. Exception was {processException.Message}. Is the process file OK?");
            }
        }

        private async Task<bool> CanTaskBeEnded(Instance instance, string currentElementId)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            bool canEndTask;

            if (instance.Process?.CurrentTask?.Validated == null || !instance.Process.CurrentTask.Validated.CanCompleteTask)
            {
                validationIssues = await _validationService.ValidateAndUpdateProcess(instance, currentElementId);

                canEndTask = await _altinnApp.CanEndProcessTask(currentElementId, instance, validationIssues);
            }
            else
            {
                canEndTask = await _altinnApp.CanEndProcessTask(currentElementId, instance, validationIssues);
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
        /// <param name="elementId">the id of the next element to move to. Query parameter is optional,
        /// but must be specified if more than one element can be reached from the current process ellement.</param>
        [HttpPut("next")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<ProcessState>> NextElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string elementId = null)
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                if (instance.Process == null)
                {
                    return Conflict($"Process is not started. Use start!");
                }

                if (instance.Process.Ended.HasValue)
                {
                    return Conflict($"Process is ended.");
                }

                if (!string.IsNullOrEmpty(elementId))
                {
                    ElementInfo elemInfo = processHelper.Process.GetElementInfo(elementId);
                    if (elemInfo == null)
                    {
                        return BadRequest($"Requested element id {elementId} is not found in process definition");
                    }
                }

                string altinnTaskType = instance.Process.CurrentTask?.AltinnTaskType;

                if (altinnTaskType == null)
                {
                    return Conflict($"Instance does not have current altinn task type information!");
                }

                ProcessSequenceFlowType processSequenceFlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext;
                string targetElement = processHelper.GetValidNextElementOrError(instance.Process.CurrentTask?.ElementId, elementId, out ProcessError processError);

                if (!string.IsNullOrEmpty(elementId) && processError == null)
                {
                    processSequenceFlowType = processHelper.GetSequenceFlowType(instance.Process.CurrentTask?.ElementId, targetElement);
                }

                bool authorized = false;
                if (processSequenceFlowType.Equals(ProcessSequenceFlowType.CompleteCurrentMoveToNext))
                { 
                    authorized = await AuthorizeAction(altinnTaskType, org, app, instanceOwnerPartyId, instanceGuid);
                }
                else
                {
                    ElementInfo elemInfo = processHelper.Process.GetElementInfo(targetElement);
                    authorized = await AuthorizeAction(elemInfo.AltinnTaskType, org, app, instanceOwnerPartyId, instanceGuid, elemInfo.Id);
                }

                if (!authorized)
                {
                    return Forbid();
                }

                ProcessChangeContext changeContext = new ProcessChangeContext();
                changeContext.RequestedProcessElementId = elementId;
                changeContext.Instance = instance;
                changeContext.User = User;
                changeContext = await _processEngine.Next(changeContext);
                if (changeContext.FailedProcessChange)
                {
                    return Conflict(changeContext.ProcessMessages[0].Message);
                }

                await RegisterEventWithEventsComponent(changeContext.Instance);
                return Ok(changeContext.Instance.Process);
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
        public async Task<ActionResult<ProcessState>> CompleteProcess(
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
                string altinnTaskType = instance.Process.CurrentTask?.AltinnTaskType;

                bool authorized = await AuthorizeAction(altinnTaskType, org, app, instanceOwnerPartyId, instanceGuid);
                if (!authorized)
                {
                    return Forbid();
                }

                if (!await CanTaskBeEnded(instance, currentTaskId))
                {
                    return Conflict($"Instance is not valid for task {currentTaskId}. Automatic completion of process is stopped");
                }

                List<string> nextElements = processHelper.Process.NextElements(currentTaskId);

                if (nextElements.Count > 1)
                {
                    return Conflict($"Cannot complete process. Multiple outgoing sequence flows detected from task {currentTaskId}. Please select manually among {nextElements}");
                }

                string nextElement = nextElements.First();

                try
                {
                    ProcessChangeContext processChange = new ProcessChangeContext();
                    processChange.Instance = instance;
                    processChange.User = User;
                    processChange.RequestedProcessElementId = nextElement;
                    processChange = await _processEngine.Next(processChange);

                    if (processChange.FailedProcessChange)
                    {
                        return Conflict(processChange.ProcessMessages[0].Message);
                    }

                    currentTaskId = instance.Process.CurrentTask?.ElementId;
                    await RegisterEventWithEventsComponent(instance);
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

            return Ok(instance.Process);
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

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError($"{message}: {exception}");

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

        private async Task<bool> AuthorizeAction(string currentTaskType, string org, string app, int instanceOwnerPartyId, Guid instanceGuid, string taskId = null)
        {
            string actionType;

            switch (currentTaskType)
            {
                case "data":
                case "feedback":
                    actionType = "write";
                    break;
                case "confirmation":
                    actionType = "confirm";
                    break;
                default:
                    actionType = currentTaskType;
                    break;
            }

            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, actionType, instanceOwnerPartyId, instanceGuid, taskId);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
            if (response?.Response == null)
            {
                _logger.LogInformation($"// Process Controller // Authorization of moving process forward failed with request: {JsonConvert.SerializeObject(request)}.");
                return false;
            }

            bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, HttpContext.User);
            return authorized;
        }

        private ActionResult HandlePlatformHttpException(PlatformHttpException e, string defaultMessage)
        {
            if (e.Response.StatusCode == HttpStatusCode.Forbidden)
            {
                return Forbid();
            }
            else if (e.Response.StatusCode == HttpStatusCode.NotFound)
            {
                return NotFound();
            }
            else if (e.Response.StatusCode == HttpStatusCode.Conflict)
            {
                return Conflict();
            }
            else
            {
                return ExceptionResponse(e, defaultMessage);
            }
        }

        private async Task RegisterEventWithEventsComponent(Instance instance)
        {
            if (_appSettings.RegisterEventsWithEventsComponent)
            {
                try
                {
                    if (!string.IsNullOrWhiteSpace(instance.Process.CurrentTask?.ElementId))
                    {
                        await _eventsService.AddEvent($"app.instance.process.movedTo.{instance.Process.CurrentTask.ElementId}", instance);
                    }
                    else if (instance.Process.EndEvent != null)
                    {
                        await _eventsService.AddEvent("app.instance.process.completed", instance);
                    }
                }
                catch (Exception exception)
                {
                    _logger.LogWarning(exception, "Exception when sending event with the Events component.");
                }
            }
        }
    }
}
