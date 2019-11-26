using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Common.Process;
using Altinn.App.Common.Process.Elements;
using Altinn.App.Service.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller for setting and moving process flow of an instance.
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceGuid:guid}/process")]
    [ApiController]
    [Authorize]
    public class ProcessController : ControllerBase
    {
        private const int MAX_ITERATIONS_ALLOWED = 1000;
        private readonly ILogger<ProcessController> _logger;
        private readonly IInstance _instanceService;
        private readonly IProcess _processService;
        private readonly IInstanceEvent _eventService;
        private readonly IAltinnApp _altinnApp;
        private readonly IValidation _validationService;

        private readonly UserHelper userHelper;

        private BpmnReader ProcessModel { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessController"/>
        /// </summary>
        public ProcessController(
            ILogger<ProcessController> logger,
            IInstance instanceService,
            IProcess processService,
            IInstanceEvent eventService,
            IProfile profileService,
            IRegister registerService,            
            IOptions<GeneralSettings> generalSettings,
            IAltinnApp altinnApp,
            IValidation validationService)
        {
            _logger = logger;
            _instanceService = instanceService;
            _processService = processService;
            _eventService = eventService;
            _altinnApp = altinnApp;
            _validationService = validationService;

            userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        /// Get the process state of an instance.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <returns>the instance's process state</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize(Policy = "InstanceRead")]
        public async Task<ActionResult<ProcessState>> GetProcessState(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {            
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

            if (instance == null)
            {
                return NotFound();
            }

            ProcessState processState = instance.Process;

            return Ok(processState);
        }

        /// <summary>
        /// Starts the process of an instance.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
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
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string startEvent = null)
        {
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            if (instance.Process != null)
            {
                return Conflict($"Process is already started. Use next.");
            }

            LoadProcessModel(org, app);

            string validStartElement = GetValidStartEventOrError(startEvent, out ActionResult startEventError);
            if (startEventError != null)
            {
                return startEventError;
            }

            // trigger start event
            Instance updatedInstance = await StartProcessOfInstance(org, app, instance, validStartElement);

            // trigger next task
            string nextValidElement = GetValidNextElementOrError(validStartElement, out ActionResult nextElementError);
            if (nextElementError != null)
            {
                return nextElementError;
            }

            updatedInstance = await UpdateProcessStateToNextElement(org, app, updatedInstance, nextValidElement);

            if (updatedInstance != null)
            {
                return Ok(updatedInstance.Process);
            }

            _logger.LogError($"Unknown error. Unable to update next process state for instance {instance.Id}!");
            return StatusCode(500, $"Unknown error. Cannot change process state!");
        }

        /// <summary>
        /// Gets a list of the next process elements that can be reached from the current process element.
        /// If process is not started it returns the possible start events.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
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
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            LoadProcessModel(org, app);

            if (instance.Process == null)
            {
                return Ok(ProcessModel.StartEvents());
            }

            string currentTaskId = instance.Process.CurrentTask?.ElementId;

            if (currentTaskId == null)
            {
                return Conflict($"Instance does not have valid info about currentTask");
            }

            try
            {
                List<string> nextElementIds = ProcessModel.NextElements(currentTaskId);

                if (nextElementIds.Count == 0)
                {
                    return NotFound("Cannot find any valid process elements that can be reached from current task");
                }

                return Ok(nextElementIds);
            }
            catch (Exception processException)
            {
                _logger.LogError($"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. {processException}");
                return Conflict($"Unable to find next process element for instance {instance.Id} and current task {currentTaskId}. Exception was {processException.Message}. Is the process file OK?");
            }
        }

        /// <summary>
        /// Change the instance's process state to next process element in accordance with process definition.
        /// </summary>
        /// <returns>new process state</returns>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
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
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string elementId = null)
        {
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
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

            LoadProcessModel(org, app);

            if (!string.IsNullOrEmpty(elementId))
            {
                ElementInfo elemInfo = ProcessModel.GetElementInfo(elementId);
                if (elemInfo == null)
                {
                    return BadRequest($"Requested element id {elementId} is not found in process definition");
                }
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

            string nextElement = GetValidNextElementOrError(currentElementId, elementId, out ActionResult nextElementError);
            if (nextElementError != null)
            {
                return nextElementError;
            }
         
            if (await CanTaskBeEnded(instance, currentElementId))
            {
                Instance changedInstance = await UpdateProcessStateToNextElement(org, app, instance, nextElement);

                return Ok(changedInstance.Process);
            }

            return Conflict($"Cannot complete/close current task {currentElementId}. The data element(s) assigned to the task are not valid!");            
        }

        private async Task<bool> CanTaskBeEnded(Instance instance, string currentElementId)
        {
            bool canEndTask = false;

            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

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
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <returns>current process status</returns>
        [HttpPut("completeProcess")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<ProcessState>> CompleteProcess(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

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

            LoadProcessModel(org, app);

            // do next until end event is reached or task cannot be completed.
            int counter = 0;
            do
            {
                if (!await CanTaskBeEnded(instance, currentTaskId))
                {                 
                    return Conflict($"Instance is not valid for task {currentTaskId}. Automatic completion of process is stopped");
                }

                List<string> nextElements = ProcessModel.NextElements(currentTaskId);

                if (nextElements.Count > 1)
                {
                    return Conflict($"Cannot complete process. Multiple outgoing sequence flows detected from task {currentTaskId}. Please select manually among {nextElements}");
                }

                string nextElement = nextElements.First();

                instance = await UpdateProcessStateToNextElement(org, app, instance, nextElement);

                currentTaskId = instance.Process.CurrentTask?.ElementId;
            }
            while (instance.Process.EndEvent == null || counter > MAX_ITERATIONS_ALLOWED);

            if (counter > 1000)
            {
                _logger.LogError($"More than {counter} iterations detected in process. Possible loop. Fix app {org}/{app}'s process definition!");
                return StatusCode(500, $"More than {counter} iterations detected in process. Possible loop. Fix app process definition!");
            }

            return Ok(instance.Process);
        }

        private void LoadProcessModel(string org, string app)
        {
            using Stream definitions = _processService.GetProcessDefinition(org, app);
            
            ProcessModel = BpmnReader.Create(definitions);
        }

        private string GetValidNextElementOrError(string currentElement, out ActionResult nextElementError)
        {
            nextElementError = null;
            string nextElementId = null;

            List<string> nextElements = ProcessModel.NextElements(currentElement);

            if (nextElements.Count > 1)
            {
                nextElementError = Conflict($"There is more than one element reachable from element {currentElement}");
            }
            else
            {
                nextElementId = nextElements.First();
            }

            return nextElementId;
        }

        private string GetValidStartEventOrError(string proposedStartEvent, out ActionResult startEventError)
        {
            startEventError = null;

            List<string> possibleStartEvents = ProcessModel.StartEvents();

            if (!string.IsNullOrEmpty(proposedStartEvent))
            {
                if (possibleStartEvents.Contains(proposedStartEvent))
                {
                    return proposedStartEvent;
                }
                else
                {
                    startEventError = Conflict($"There is no such start event as '{proposedStartEvent}' in the process definition.");
                    return null;
                }
            }

            if (possibleStartEvents.Count == 1)
            {
                return possibleStartEvents.First();
            }
            else if (possibleStartEvents.Count > 1)
            {
                startEventError = Conflict($"There are more than one start events available. Chose one: {possibleStartEvents}");
                return null;
            }
            else
            {
                startEventError = Conflict($"There is no start events in process definition. Cannot start process!");
                return null;
            }
        }

        private async Task<Instance> StartProcessOfInstance(string org, string app, Instance instance, string validStartElement)
        {
            DateTime now = DateTime.UtcNow;

            instance.Process = new ProcessState
            {
                Started = now,
                StartEvent = validStartElement,
            };
            Instance updatedInstance = await _instanceService.UpdateInstance(instance);
            List<InstanceEvent> events = new List<InstanceEvent>
            {
                GenerateProcessChangeEvent("process:StartEvent", updatedInstance, now)
            };

            await DispatchEvents(org, app, events);

            return updatedInstance;
        }

        private async Task<Instance> UpdateProcessStateToNextElement(string org, string app, Instance instance, string nextElementId)
        {
            List<InstanceEvent> events = ChangeProcessStateAndGenerateEvents(instance, nextElementId);

            Instance changedInstance = await _instanceService.UpdateInstance(instance);
            
            await DispatchEvents(org, app, events);

            return changedInstance;
        }

        private async Task DispatchEvents(string org, string app, List<InstanceEvent> events)
        {
            foreach (InstanceEvent instanceEvent in events)
            {
                await _eventService.SaveInstanceEvent(instanceEvent, org, app);
            }
        }

        private string GetValidNextElementOrError(string currentElementId, string proposedElementId, out ActionResult nextElementError)
        {
            nextElementError = null;

            List<string> possibleNextElements = ProcessModel.NextElements(currentElementId);

            if (!string.IsNullOrEmpty(proposedElementId))
            {
                if (possibleNextElements.Contains(proposedElementId))
                {
                    return proposedElementId;
                }
                else
                {                    
                    nextElementError = Conflict($"The proposed next element id '{proposedElementId}' is not among the available next process elements");
                    return null;
                }
            }

            if (possibleNextElements.Count == 1)
            {
                return possibleNextElements.First();
            }
            
            if (possibleNextElements.Count > 1)
            {
                nextElementError = Conflict($"There are more than one outgoing sequence flows, please select one '{possibleNextElements}'");
                return null;
            }

            if (possibleNextElements.Count == 0)
            {
                nextElementError = Conflict($"There are no outoging sequence flows from current element. Cannot find next process element. Error in bpmn file!");
                return null;
            }

            return null;
        }

        private List<InstanceEvent> ChangeProcessStateAndGenerateEvents(Instance instance, string nextElementId)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            ProcessState currentState = instance.Process;

            string previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo nextElementInfo = ProcessModel.GetElementInfo(nextElementId);

            DateTime now = DateTime.UtcNow;
            int flow = 1;

            if (previousElementId == null && instance.Process.StartEvent != null)
            {
                _altinnApp.OnStartProcess(previousElementId, instance);
                flow = 1;
            }

            if (IsTask(previousElementId))
            {
                if (currentState.CurrentTask != null && currentState.CurrentTask.Flow.HasValue)
                {
                    flow = currentState.CurrentTask.Flow.Value;
                }

                _altinnApp.OnEndProcessTask(previousElementId, instance);
                events.Add(GenerateProcessChangeEvent("process:EndTask", instance, now));
            }

            if (IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                _altinnApp.OnEndProcess(nextElementId, instance);
                events.Add(GenerateProcessChangeEvent("process:EndEvent", instance, now));
            }
            else if (IsTask(nextElementId))
            {
                currentState.CurrentTask = new ProcessElementInfo
                {
                    Flow = flow + 1, 
                    ElementId = nextElementId,
                    Name = nextElementInfo.Name,
                    Started = now,
                    AltinnTaskType = nextElementInfo.AltinnTaskType,
                    Validated = null,
                };

                _altinnApp.OnStartProcessTask(nextElementId, instance);
                events.Add(GenerateProcessChangeEvent("process:StartTask", instance, now));
            }

            // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
            instance.Process = currentState;

            return events;
        }

        private InstanceEvent GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now)
        {
            UserContext userContext = userHelper.GetUserContext(HttpContext).Result;

            InstanceEvent instanceEvent = new InstanceEvent
            {
                InstanceId = instance.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                EventType = eventType,
                Created = now,
                User = new PlatformUser
                {
                    UserId = userContext.UserId,
                    AuthenticationLevel = userContext.AuthenticationLevel,
                },
                ProcessInfo = instance.Process,
            };

            return instanceEvent;
        }

        private bool IsTask(string nextElementId)
        {
            List<string> tasks = ProcessModel.Tasks();
            return tasks.Contains(nextElementId);            
        }

        private bool IsStartEvent(string startEventId)
        {
            List<string> startEvents = ProcessModel.StartEvents();

            return startEvents.Contains(startEventId);
        }

        private bool IsEndEvent(string nextElementId)
        {
            List<string> endEvents = ProcessModel.EndEvents();

            return endEvents.Contains(nextElementId);            
        }
    }   
}
