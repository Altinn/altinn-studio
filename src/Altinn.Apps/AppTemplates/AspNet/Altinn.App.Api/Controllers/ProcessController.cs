using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller for setting and moving process flow of an instance.
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process")]
    [ApiController]
    [Authorize]
    public class ProcessController : ControllerBase
    {
        private const int MAX_ITERATIONS_ALLOWED = 100;
        private readonly ILogger<ProcessController> _logger;
        private readonly IInstance _instanceService;
        private readonly IProcess _processService;
        private readonly IAltinnApp _altinnApp;
        private readonly IValidation _validationService;
        private readonly IPDP _pdp;

        private readonly ProcessHelper processHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/>
        /// </summary>
        public ProcessController(
            ILogger<ProcessController> logger,
            IInstance instanceService,
            IProcess processService,
            IAltinnApp altinnApp,
            IValidation validationService,
            IPDP pdp)
        {
            _logger = logger;
            _instanceService = instanceService;
            _processService = processService;
            _altinnApp = altinnApp;
            _validationService = validationService;
            _pdp = pdp;

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
                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                if (instance == null)
                {
                    return NotFound();
                }

                ProcessState processState = instance.Process;

                return Ok(processState);
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
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            if (instance.Process != null)
            {
                return Conflict($"Process is already started. Use next.");
            }

            string validStartElement = processHelper.GetValidStartEventOrError(startEvent, out ProcessError startEventError);
            if (startEventError != null)
            {
                return Conflict(startEventError.Text);
            }

            try
            {
                // trigger start event and goto next task
                ProcessStateChange processStateChange = _processService.ProcessStartAndGotoNextTask(instance, validStartElement, User);
                Instance updatedInstance = await UpdateInstanceAndDispatchEvents(instance, processStateChange);

                return Ok(updatedInstance.Process);
            }
            catch (Exception startException)
            {
                _logger.LogError($"Unable to start the process for instance {instance.Id} of {instance.AppId}. Due to {startException}");
                return ExceptionResponse(startException, "Unable to start the process for instance {instance.Id} of {instance.AppId}");                
            }
        }

        private async Task<Instance> UpdateInstanceAndDispatchEvents(Instance instance, ProcessStateChange processStateChange)
        {
            await NotifyAppAboutEvents(_altinnApp, instance, processStateChange.Events);

            // need to update the instance process and then the instance in case appbase has changed it, e.g. endEvent sets status.archived
            Instance instanceWithUpdatedProcess = await _instanceService.UpdateProcess(instance);
            Instance updatedInstance = await _instanceService.UpdateInstance(instanceWithUpdatedProcess);
            await _processService.DispatchProcessEventsToStorage(updatedInstance, processStateChange.Events);

            // remember to get the instance anew since AppBase can have updated a data element or stored something in the database.
            updatedInstance = await _instanceService.GetInstance(updatedInstance);

            return updatedInstance;
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
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            if (instance.Process == null)
            {
                return Ok(processHelper.Process.StartEvents());
            }

            string currentTaskId = instance.Process.CurrentTask?.ElementId;

            if (currentTaskId == null)
            {
                return Conflict($"Instance does not have valid info about currentTask");
            }

            try
            {
                List<string> nextElementIds = processHelper.Process.NextElements(currentTaskId);

                if (nextElementIds.Count == 0)
                {
                    return NotFound("Cannot find any valid process elements that can be reached from current task");
                }

                return Ok(nextElementIds);
            }
            catch (Exception processException)
            {
                _logger.LogError($"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. {processException}");
                return ExceptionResponse(processException, $"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. Exception was {processException.Message}. Is the process file OK?");
            }
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
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Cannot find instance!");
            }

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

            bool authorized = await AuthorizeAction(altinnTaskType, org, app, instance.Id);                    
            if (!authorized)
            {
                return Forbid();
            }

            string currentElementId = instance.Process.CurrentTask?.ElementId;

            if (currentElementId == null)
            {
                return Conflict($"Instance does not have current task information!");
            }

            if (currentElementId.Equals(elementId))
            {
                return Conflict($"Requested process element {elementId} is same as instance's current task. Cannot change process.");
            }

            string nextElement = processHelper.GetValidNextElementOrError(currentElementId, elementId, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                return Conflict(nextElementError.Text);
            }

            try
            {
                if (await CanTaskBeEnded(instance, currentElementId))
                {
                    ProcessStateChange nextResult = _processService.ProcessNext(instance, nextElement, User);
                    if (nextResult != null)
                    {
                        Instance changedInstance = await UpdateInstanceAndDispatchEvents(instance, nextResult);

                        return Ok(changedInstance.Process);
                    }
                }
                return Conflict($"Cannot complete/close current task {currentElementId}. The data element(s) assigned to the task are not valid!");
            }
            catch (Exception exception)
            {
                return ExceptionResponse(exception, "Process next failed.");
            }
            
        }

        private async Task<bool> CanTaskBeEnded(Instance instance, string currentElementId)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            bool canEndTask;
            // check if 
            if (instance.Process?.CurrentTask?.Validated == null || !instance.Process.CurrentTask.Validated.CanCompleteTask)
            {
                validationIssues = await _validationService.ValidateAndUpdateInstance(instance, currentElementId);

                canEndTask = await _altinnApp.CanEndProcessTask(currentElementId, instance, validationIssues);
            }
            else
            {
                canEndTask = await _altinnApp.CanEndProcessTask(currentElementId, instance, validationIssues);
            }

            return canEndTask;
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
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

            if (instance == null)
            {
                return NotFound("Cannot find instance");
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

                bool authorized = await AuthorizeAction(altinnTaskType, org, app, instance.Id);
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
                    ProcessStateChange nextResult = _processService.ProcessNext(instance, nextElement, User);

                    if (nextResult != null)
                    {
                        instance = await UpdateInstanceAndDispatchEvents(instance, nextResult);

                        currentTaskId = instance.Process.CurrentTask?.ElementId;
                    }
                    else
                    {
                        return Conflict($"Cannot complete process. Unable to move to next element {nextElement}");
                    }
                }
                catch (Exception ex)
                {
                    return ExceptionResponse(ex, "Complete process failed.");
                }

                counter++;
            }
            while (instance.Process.EndEvent == null || counter > MAX_ITERATIONS_ALLOWED);

            if (counter > MAX_ITERATIONS_ALLOWED)
            {
                _logger.LogError($"More than {counter} iterations detected in process. Possible loop. Fix app {org}/{app}'s process definition!");
                return StatusCode(500, $"More than {counter} iterations detected in process. Possible loop. Fix app process definition!");
            }

            return Ok(instance.Process);
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

        internal static async Task NotifyAppAboutEvents(IAltinnApp altinnApp, Instance instance, List<InstanceEvent> events)
        {                        
            foreach (InstanceEvent processEvent in events)
            {                
                switch (processEvent.EventType)
                {
                    case "process:StartEvent":
                        await altinnApp.OnStartProcess(processEvent.ProcessInfo?.StartEvent, instance);
                        break;

                    case "process:StartTask":
                        await altinnApp.OnStartProcessTask(processEvent.ProcessInfo?.CurrentTask?.ElementId, instance);
                        break;

                    case "process:EndTask":
                        await altinnApp.OnEndProcessTask(processEvent.ProcessInfo?.CurrentTask?.ElementId, instance);
                        break;

                    case "process:EndEvent":
                        await altinnApp.OnEndProcess(processEvent.ProcessInfo?.EndEvent, instance);                        
                        break;
                }
            }          
        }

        private async Task<bool> AuthorizeAction(string currenTaskType, string org, string app, string instanceId)
        {
            string actionType = currenTaskType.Equals("data") ? "write" : null;
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(org, app, HttpContext.User, actionType, null, instanceId);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
            if (response?.Response == null)
            {
                _logger.LogInformation($"// Process Controller // Authorization of moving process forward failed with request: {JsonConvert.SerializeObject(request)}.");
                return false;
            }
            bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, HttpContext.User);
            return authorized;
        }
    }   
}
