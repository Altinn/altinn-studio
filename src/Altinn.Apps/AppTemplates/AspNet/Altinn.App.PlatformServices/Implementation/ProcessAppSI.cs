using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Extentions;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// The app implementation of the process service.
    /// </summary>
    public class ProcessAppSI : IProcess
    {
        private readonly AppSettings _appSettings;
        private readonly ILogger<ProcessAppSI> _logger;
        private readonly IInstanceEvent _eventService;

        public ProcessHelper ProcessHelper { get;  }

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<AppSettings> appSettings,
            IInstanceEvent eventService,
            ILogger<ProcessAppSI> logger)
        {
            _appSettings = appSettings.Value;
            _eventService = eventService;
            _logger = logger;
            ProcessHelper = new ProcessHelper(GetProcessDefinition());
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition()
        {
            string bpmnFilePath = _appSettings.AppBasePath + _appSettings.ConfigurationFolder + _appSettings.ProcessFolder + _appSettings.ProcessFileName;

            try
            {
                Stream processModel = File.OpenRead(bpmnFilePath);

                return processModel;
            }
            catch (Exception processDefinitionException)
            {
                _logger.LogError($"Cannot find process definition file for this app. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}");
                throw;
            }
        }

        /// <summary>
        /// Does not save process. Instance is updated.
        /// </summary>
        public ProcessStateChange ProcessStart(Instance instance, string proposedStartEvent, ClaimsPrincipal user)
        {
            if (instance.Process == null)
            {
                DateTime now = DateTime.UtcNow;

                string validStartEvent = CheckStartEvent(instance, proposedStartEvent);

                ProcessState startState = new ProcessState
                {
                    Started = now,
                    StartEvent = validStartEvent,
                };

                List<InstanceEvent> events = new List<InstanceEvent>
                {
                    GenerateProcessChangeEvent("process:StartEvent", instance, now, user),
                };

                instance.Process = startState;

                return new ProcessStateChange
                {
                    OldProcessState = null,
                    NewProcessState = startState,
                    Events = events,
                };
            }

            return null;
        }
      
        /// <summary>
        /// Start process start and goto next. Returns
        /// </summary>
        public ProcessStateChange ProcessStartAndGotoNextTask(Instance instance, string proposedStartEvent, ClaimsPrincipal user)
        {
            _logger.LogInformation($"ProcessStartAndGotoNextTask for {instance.Id}");

            // start process
            ProcessStateChange startChange = ProcessStart(instance, proposedStartEvent, user);

            string nextValidElement = GetNextElement(instance.Process.StartEvent);

            // move next
            ProcessStateChange nextChange = ProcessNext(instance, nextValidElement, user);

            // consolidate events
            startChange.Events.AddRange(nextChange.Events);
            startChange.NewProcessState = nextChange.NewProcessState;

            return startChange;
        }      

        /// <summary>
        /// Moves instance's process to nextElement id. Returns the instance together with process events.
        /// </summary>
        public ProcessStateChange ProcessNext(Instance instance, string nextElementId, ClaimsPrincipal userContext)
        {
            if (instance.Process != null)
            {
                string validNextEmentId = CheckNextElementId(instance, nextElementId);

                ProcessStateChange result = new ProcessStateChange
                {
                    OldProcessState = instance.Process,                  
                };

                result.Events = MoveProcessToNext(instance, validNextEmentId, userContext);
                result.NewProcessState = instance.Process;
                
                return result;
            }

            return null;
        }

        private string GetNextElement(string proposedStartEvent)
        {
            // find next task
            string nextValidElement = ProcessHelper.GetValidNextElementOrError(proposedStartEvent, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                throw new ArgumentException($"Unable to goto next element due to {nextElementError.Code} - {nextElementError.Text}");
            }

            return nextValidElement;
        }

        private string CheckStartEvent(Instance instance, string proposedStartEvent)
        {
            string validStartEvent = ProcessHelper.GetValidStartEventOrError(proposedStartEvent, out ProcessError startEventError);
            if (startEventError != null)
            {
                throw new ArgumentException($"Start event {validStartEvent} is not valid for this an instance of {instance.AppId}");
            }

            return validStartEvent;
        }


        private string CheckNextElementId(Instance instance, string proposedNextElementId)
        {
            string currentElementId = instance.Process?.CurrentTask?.ElementId ?? instance.Process?.StartEvent;
            if (currentElementId == null)
            {
                throw new ArgumentException("Process has not started");
            }
                
            if (instance.Process?.EndEvent != null)
            {
                throw new ArgumentException("Process has ended. Cannot do next");
            }

            string validNextElementId = ProcessHelper.GetValidNextElementOrError(currentElementId, proposedNextElementId, out ProcessError nextElementError);

            if (nextElementError != null)
            {
                throw new ArgumentException($"Wanted next element id {proposedNextElementId} is not a possible move from {currentElementId} in process model. {nextElementError.Text}");
            }

            return validNextElementId;
        }

        public async Task DispatchProcessEventsToStorage(Instance instance, List<InstanceEvent> events)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (InstanceEvent instanceEvent in events)
            {
                instanceEvent.InstanceId = instance.Id;
                await _eventService.SaveInstanceEvent(instanceEvent, org, app);
            }
        }
      
        /// <summary>
        /// Assumes that nextElementId is a valid task/state
        /// </summary>
        private List<InstanceEvent> MoveProcessToNext(
            Instance instance,
            string nextElementId,
            ClaimsPrincipal user)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            ProcessState currentState = instance.Process;

            string previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo nextElementInfo = ProcessHelper.Process.GetElementInfo(nextElementId);

            DateTime now = DateTime.UtcNow;
            int flow = 1;

            if (previousElementId == null && instance.Process.StartEvent != null)
            {
                flow = 1;
            }

            if (ProcessHelper.IsTask(previousElementId))
            {
                if (currentState.CurrentTask != null && currentState.CurrentTask.Flow.HasValue)
                {
                    flow = currentState.CurrentTask.Flow.Value;
                }

                events.Add(GenerateProcessChangeEvent("process:EndTask", instance, now, user));
            }

            if (ProcessHelper.IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(GenerateProcessChangeEvent("process:EndEvent", instance, now, user));

                // add submit event (to support Altinn2 SBL)
                events.Add(GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
            }
            else if (ProcessHelper.IsTask(nextElementId))
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

                events.Add(GenerateProcessChangeEvent("process:StartTask", instance, now, user));
            }

            // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
            instance.Process = currentState;

            return events;
        }

        private InstanceEvent GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now, ClaimsPrincipal user)
        {
            InstanceEvent instanceEvent = new InstanceEvent
            {
                InstanceId = instance.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                EventType = eventType,
                Created = now,
                User = new PlatformUser
                {
                    UserId = user.GetUserIdAsInt(),
                    AuthenticationLevel = user.GetAuthenticationLevel(),
                    OrgId = user.GetOrg()
                },
                ProcessInfo = instance.Process,
            };

            return instanceEvent;
       }
    }
}
