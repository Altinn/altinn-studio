using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Storage.Interface.Models;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Controller for setting and moving process flow of an instance.
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceGuid:guid}/process")]
    [ApiController]
    public class ProcessController : ControllerBase
    {
        private const int MAX_ITERATIONS_ALLOWED = 1000;
        private readonly ILogger<ProcessController> logger;
        private readonly IInstance instanceService;
        private readonly IProcess processService;
        private readonly IInstanceEvent eventService;

        private readonly UserHelper userHelper;

        private ProcessReader ProcessKeeper { get; set; }

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
            IOptions<GeneralSettings> generalSettings)
        {
            this.logger = logger;
            this.instanceService = instanceService;
            this.processService = processService;
            this.eventService = eventService;

            userHelper = new UserHelper(profileService, registerService, generalSettings);
        }        

        /// <summary>
        /// Get the process state of an instance.
        /// </summary>
        /// <returns>the instance's process state</returns>
        [HttpGet]
        public async Task<ActionResult<ProcessState>> GetProcessState(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

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
        /// <returns>The process state</returns>
        [HttpPost("start")]
        public async Task<ActionResult<ProcessState>> StartProcess(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string startEvent)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            if (instance.Process != null)
            {
                return Conflict($"Process is already started. Use next");
            }

            ProcessKeeper = ProcessReader.CreateProcessReader(processService.GetProcessDefinition(org, app));

            string validStartElement = GetValidStartEvenOrError(startEvent, out ActionResult startEventError);
            if (startEventError != null)
            {
                return startEventError;
            }

            ElementInfo eventInfo = ProcessKeeper.GetElementInfo(validStartElement);

            // trigger start event
            Instance updatedInstance = await StartProcess(org, app, instanceOwnerId, instanceGuid, instance, validStartElement);

            // trigger next task
            string nextValidElement = GetNextValidElementOrError(validStartElement, out ActionResult nextElementError);
            if (nextElementError != null)
            {
                return nextElementError;
            }

            updatedInstance = await UpdateProcessStateToNextElement(org, app, updatedInstance, instanceOwnerId, instanceGuid, nextValidElement);

            if (updatedInstance != null)
            {
                return Ok(updatedInstance.Process);
            }

            return StatusCode(500, $"Unknown error. Cannot goto next process element from start event {startEvent}");
        }        

        private string GetNextValidElementOrError(string validStartElement, out ActionResult nextElementError)
        {
            nextElementError = null;
            string nextElementId = null;

            List<string> nextElements = ProcessKeeper.NextElements(validStartElement);            

            if (nextElements.Count > 1)
            {
                nextElementError = Conflict($"There are more than one element reachable from start event {validStartElement}");
            }
            else
            {
                nextElementId = nextElements.First();
            }

            return nextElementId;
        }

        private string GetValidStartEvenOrError(string startEvent, out ActionResult startEventError)
        {
            startEventError = null;
            string validStartEvent = null;

            List<string> possibleStartEvents = ProcessKeeper.StartEvents();

            if (!string.IsNullOrEmpty(startEvent) && possibleStartEvents.Contains(startEvent))
            {
                validStartEvent = startEvent;
            }
            else if (possibleStartEvents.Count == 1)
            {
                validStartEvent = possibleStartEvents.First();
            }
            else if (!string.IsNullOrEmpty(startEvent))
            {
                startEventError = Conflict($"There is no such start event in the process definition.");
            }
            else if (possibleStartEvents.Count > 1)
            {
                startEventError = Conflict($"There are more than one start events available. Chose one: {possibleStartEvents}");
            }

            return validStartEvent;
        }

        /// <summary>
        /// Gets a list of the next process elements that can be reached from the current process element.
        /// </summary>
        /// <returns>list of next process elements (tasks or events)</returns>
        [HttpGet("next")]
        public async Task<ActionResult> GetNextElements(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            ProcessKeeper = ProcessReader.CreateProcessReader(processService.GetProcessDefinition(org, app));

            if (instance.Process == null)
            {
                return Conflict($"Process is not started. Use start!");
            }

            string currentTaskId = instance.Process.CurrentTask?.ProcessElementId;

            if (currentTaskId == null)
            {
                return Conflict($"Instance does not have valid info about currentTask");
            }

            List<string> nextElementIds = ProcessKeeper.NextElements(currentTaskId);

            if (nextElementIds.Count == 0)
            {
                return NotFound("Cannot find any valid process elements that can be reached from current task");
            }

            return Ok(nextElementIds);           
        }

        /// <summary>
        /// Changes process state by moving to next task or to a specific taskId.
        /// </summary>
        /// <returns>current process state</returns>
        [HttpPut("next")]
        public async Task<ActionResult<ProcessState>> NextElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string id)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Cannot find instance!");
            }

            if (instance.Process == null)
            {
                return Conflict($"Process is not started. Use start!");
            }

            ProcessKeeper = ProcessReader.CreateProcessReader(processService.GetProcessDefinition(org, app));

            string currentTaskId = instance.Process.CurrentTask?.ProcessElementId;

            if (currentTaskId == null)
            {
                return Conflict($"Instance does not have current task information");
            }            

            string nextElement = CheckOrGetValidNextElement(currentTaskId, id, out ActionResult nextElementError);
            if (nextElementError != null)
            {
                return nextElementError;
            }

            if (InstanceIsValid(instance))
            {
                Instance changedInstance = await UpdateProcessStateToNextElement(org, app, instance, instanceOwnerId, instanceGuid, nextElement);

                return Ok(changedInstance.Process);
            }
            else
            {
                return Conflict("Cannot complete/close current task {currentTaskId}. Task is not valid!");
            }
        }

        /// <summary>
        /// Attemts to close the process by running start and next until an end event is reached.
        /// </summary>
        /// <returns></returns>
        [HttpPut("completeProcess")]
        public async Task<ActionResult<ProcessState>> CompleteProcess(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Cannot find instance");
            }

            if (instance.Process == null)
            {
                await StartProcess(org, app, instanceOwnerId, instanceGuid, null);
                instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            }

            string currentTaskId = instance.Process.CurrentTask?.ProcessElementId;

            if (currentTaskId == null)
            {
                return Conflict($"Instance does not have valid currentTask");
            }

            ProcessKeeper = ProcessReader.CreateProcessReader(processService.GetProcessDefinition(org, app));

            // do next until end event is reached or task cannot be completed.
            int counter = 0;
            do
            {
                List<string> nextElementIds = ProcessKeeper.NextElements(currentTaskId);

                if (nextElementIds.Count > 1)
                {
                    return Conflict($"Cannot complete process. Multiple outgoing sequence flows detected from task {currentTaskId}. Please select manually among {nextElementIds}");
                }

                string nextElement = nextElementIds.First();

                if (InstanceIsValid(instance))
                {
                    instance = await UpdateProcessStateToNextElement(org, app, instance, instanceOwnerId, instanceGuid, nextElement);                    
                }
                else
                {
                    return Conflict($"Instance is not valid in task {currentTaskId}. Automatic completeion of process is stopped");
                }

                currentTaskId = instance.Process.CurrentTask?.ProcessElementId;
            }
            while (instance.Process.EndEvent == null || counter > MAX_ITERATIONS_ALLOWED);

            if (counter > 1000)
            {
                return StatusCode(500, $"More than {counter} iterations detected in process. Possible loop. Fix app process definition!");
            }

            return Ok(instance.Process);
        }

        private async Task<Instance> StartProcess(string org, string app, int instanceOwnerId, Guid instanceGuid, Instance instance, string validStartElement)
        {
            DateTime now = DateTime.UtcNow;

            instance.Process = new ProcessState
            {
                Started = now,
            };
            Instance updatedInstance = await instanceService.UpdateInstance(instance, app, org, instanceOwnerId, instanceGuid);
            List<InstanceEvent> events = new List<InstanceEvent>
            {
                GenerateProcessChangeEvent("process:StartEvent", updatedInstance, validStartElement, now)
            };

            await DispatchEvents(org, app, events);

            return updatedInstance;
        }

        private async Task<Instance> UpdateProcessStateToNextElement(string org, string app, Instance instance, int instanceOwnerId, Guid instanceGuid, string nextElementId)
        {
            List<InstanceEvent> events = ChangeProcessState(instance, nextElementId);

            Instance changedInstance = await instanceService.UpdateInstance(instance, app, org, instanceOwnerId, instanceGuid);

            await DispatchEvents(org, app, events);

            return changedInstance;
        }

        private async Task DispatchEvents(string org, string app, List<InstanceEvent> events)
        {
            foreach (InstanceEvent instanceEvent in events)
            {
                await eventService.SaveInstanceEvent(instanceEvent, org, app);
            }
        }

        private string CheckOrGetValidNextElement(string currentElementId, string proposedElementId, out ActionResult nextElementError)
        {
            nextElementError = null;
            string nextElement = null;

            List<string> possibleNextElements = ProcessKeeper.NextElements(currentElementId);
            
            if (!string.IsNullOrEmpty(proposedElementId) && possibleNextElements.Contains(proposedElementId))
            {
                nextElement = proposedElementId;
            }
            else if (possibleNextElements.Count == 1)
            {
                nextElement = possibleNextElements.First();
            }
            else if (!string.IsNullOrEmpty(proposedElementId))
            {
                nextElementError = Conflict($"Process element id '{proposedElementId}' is not found in app's process model (bpmn)");
            }
            else if (possibleNextElements.Count > 1)
            {
                nextElementError = Conflict($"There are more than one outgoing sequence flow, please select one '{possibleNextElements}'");
            }

            return nextElement;
        }

        private bool InstanceIsValid(Instance instance)
        {
            return true;            
        }

        private List<InstanceEvent> ChangeProcessState(Instance instance, string nextElementId)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            ProcessState currentState = instance.Process;

            string previousElementId = currentState.CurrentTask?.ProcessElementId;

            ElementInfo nextElementInfo = ProcessKeeper.GetElementInfo(nextElementId);

            DateTime now = DateTime.UtcNow;

            if (IsTask(previousElementId))
            {
                events.Add(GenerateProcessChangeEvent("process:EndTask", instance, null, now));
            }

            if (IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(GenerateProcessChangeEvent("process:EndEvent", instance, previousElementId, now));
            }
            else if (IsTask(nextElementId))
            {               
                currentState.CurrentTask = new TaskInfo
                {
                    ProcessElementId = nextElementId,
                    Started = now,
                    AltinnTaskType = nextElementInfo.AltinnTaskType,
                    Validated = null,
                };

                events.Add(GenerateProcessChangeEvent("process:StartTask", instance, previousElementId, now));
            }

            return events;
        }

        private InstanceEvent GenerateProcessChangeEvent(string eventType, Instance instance, string previousElementId, DateTime now)
        {
            UserContext userContext = userHelper.GetUserContext(HttpContext).Result;

            InstanceEvent instanceEvent = new InstanceEvent
            {
                InstanceId = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                EventType = eventType,
                CreatedDateTime = now,
                UserId = userContext.UserId,
                AuthenticationLevel = userContext.AuthenticationLevel,
                /* todo info */
            };

            return instanceEvent;
        }

        private bool IsTask(string nextElementId)
        {
            List<string> tasks = ProcessKeeper.Tasks();
            return tasks.Contains(nextElementId);            
        }

        private bool IsEndEvent(string nextElementId)
        {
            List<string> endStates = ProcessKeeper.EndEvents();

            return endStates.Contains(nextElementId);            
        }
    }

    /* todo integrate with bpmn process reader */
#pragma warning disable SA1600 // Elements should be documented
    internal class ProcessReader
    {
        public static ProcessReader CreateProcessReader(Stream bpmn)
        {
            return new ProcessReader();
        }

        public ElementInfo GetElementInfo(string elementId)
        {
            return new ElementInfo
            {
                Id = elementId,
            };
        }

        public List<string> NextElements(string elementId)
        {
            List<string> result = new List<string>();

            switch (elementId)
            {
                case "StartEvent_1":
                    result.Add("Data_1");
                    break;

                case "Data_1":
                    result.Add("Submit_1");
                    break;

                case "Submit_1":
                    result.Add("EndEvent_1");
                    break;
            }

            return result;
        }

        public List<string> StartEvents()
        {
            return new List<string>() { "StartEvent_1" };
        }

        public List<string> EndEvents()
        {
            return new List<string>() { "EndEvent_1" };
        }

        public List<string> Tasks()
        {
            return new List<string>() { "Data_1", "Submit_1" };
        }
    }

    internal class ElementInfo
    {
        public string Id { get; set; }

        public string ElementType { get; set; }

        public string Name { get; set; }

        public string AltinnTaskType { get; set; }
    }

#pragma warning restore SA1600 // Elements should be documented
}
