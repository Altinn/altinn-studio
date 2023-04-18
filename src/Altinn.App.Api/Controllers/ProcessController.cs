using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
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
        private readonly IValidation _validationService;
        private readonly IPDP _pdp;
        private readonly IProcessEngine _processEngine;
        private readonly IProcessReader _processReader;
        private readonly IFlowHydration _flowHydration;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/>
        /// </summary>
        public ProcessController(
            ILogger<ProcessController> logger,
            IInstance instanceClient,
            IProcess processService,
            IValidation validationService,
            IPDP pdp,
            IProcessEngine processEngine,
            IProcessReader processReader,
            IFlowHydration flowHydration)
        {
            _logger = logger;
            _instanceClient = instanceClient;
            _processService = processService;
            _validationService = validationService;
            _pdp = pdp;
            _processEngine = processEngine;
            _processReader = processReader;
            _flowHydration = flowHydration;
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

                ProcessChangeContext changeContext = new ProcessChangeContext(instance, User);
                changeContext.RequestedProcessElementId = startEvent;
                changeContext = await _processEngine.StartProcess(changeContext);
                if (changeContext.FailedProcessChange)
                {
                    return Conflict(changeContext.ProcessMessages[0].Message);
                }

                return Ok(changeContext.Instance.Process);
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
                
                List<ProcessElement> nextElements = await _flowHydration.NextFollowAndFilterGateways(instance, currentTaskId, false);

                return Ok(nextElements.Select(e => e.Id).ToList());
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
        /// <param name="elementId">the id of the next element to move to. Query parameter is optional,
        /// but must be specified if more than one element can be reached from the current process ellement.</param>
        /// <param name="lang">Optional parameter to pass on the language used in the form if this differs from the profile language,
        /// which otherwise is used automatically. The language is picked up when generating the PDF when leaving a step, 
        /// and is not used for anything else.
        /// </param>
        [HttpPut("next")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<ProcessState>> NextElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string elementId = null,
            [FromQuery] string lang = null)
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
                    ElementInfo elemInfo = _processReader.GetElementInfo(elementId);
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
                List<ProcessElement> possibleNextElements = await _flowHydration.NextFollowAndFilterGateways(instance, instance.Process.CurrentTask?.ElementId, elementId.IsNullOrEmpty());
                string targetElement = ProcessHelper.GetValidNextElementOrError(elementId, possibleNextElements.Select(e => e.Id).ToList(), out ProcessError processError);

                if (!string.IsNullOrEmpty(elementId) && processError == null)
                {
                    List<SequenceFlow> flows = _processReader.GetSequenceFlowsBetween(instance.Process.CurrentTask?.ElementId, targetElement);
                    processSequenceFlowType = ProcessHelper.GetSequenceFlowType(flows);
                }

                bool authorized;
                if (processSequenceFlowType.Equals(ProcessSequenceFlowType.CompleteCurrentMoveToNext))
                {
                    authorized = await AuthorizeAction(altinnTaskType, org, app, instanceOwnerPartyId, instanceGuid);
                }
                else
                {
                    ElementInfo elemInfo = _processReader.GetElementInfo(targetElement);
                    authorized = await AuthorizeAction(elemInfo.AltinnTaskType, org, app, instanceOwnerPartyId, instanceGuid, elemInfo.Id);
                }

                if (!authorized)
                {
                    return Forbid();
                }

                ProcessChangeContext changeContext = new ProcessChangeContext(instance, User);
                changeContext.RequestedProcessElementId = elementId;
                changeContext = await _processEngine.Next(changeContext);
                if (changeContext.FailedProcessChange)
                {
                    return Conflict(changeContext.ProcessMessages[0].Message);
                }

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

                List<ProcessElement> nextElements = await _flowHydration.NextFollowAndFilterGateways(instance, currentTaskId);

                if (nextElements.Count > 1)
                {
                    return Conflict($"Cannot complete process. Multiple outgoing sequence flows detected from task {currentTaskId}. Please select manually among {nextElements}");
                }

                string nextElement = nextElements.First().Id;

                try
                {
                    ProcessChangeContext processChange = new ProcessChangeContext(instance, User);
                    processChange.RequestedProcessElementId = nextElement;
                    processChange = await _processEngine.Next(processChange);

                    if (processChange.FailedProcessChange)
                    {
                        return Conflict(processChange.ProcessMessages[0].Message);
                    }

                    currentTaskId = instance.Process.CurrentTask?.ElementId;
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
    }
}
