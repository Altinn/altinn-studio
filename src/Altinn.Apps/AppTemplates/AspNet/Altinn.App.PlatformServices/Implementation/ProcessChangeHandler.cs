using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.PlatformServices.Process;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Handler that implements needed logic related to different process changes. Identifies the correct types of tasks
    /// </summary>
    public class ProcessChangeHandler : IProcessChangeHandler
    {
        private readonly IAltinnApp _altinnApp;
        private readonly IInstance _instanceClient;
        private readonly IProcess _processService;
        private readonly ProcessHelper _processHelper;
        private readonly ILogger<ProcessChangeHandler> _logger;

        /// <summary>
        /// Altinn App specific process change handler
        /// </summary>
        public ProcessChangeHandler(IAltinnApp altinnApp, ILogger<ProcessChangeHandler> logger, IProcess processService, IInstance instanceClient)
        {
            _altinnApp = altinnApp;
            _logger = logger;
            _processService = processService;
            _instanceClient = instanceClient;
            using Stream bpmnStream = _processService.GetProcessDefinition();
            _processHelper = new ProcessHelper(bpmnStream);
        }

        /// <inheritdoc />
        public Task<ProcessChangeContext> HandleNext(ProcessChangeContext processChange)
        {
            ITask currentTask = GetProcessTask();
            currentTask.HandleTaskComplete(processChange);
            
            return Task.FromResult(processChange);
        }

        /// <inheritdoc />
        public async Task<ProcessChangeContext> HandleStart(ProcessChangeContext processChange)
        {
            // start process
            ProcessStateChange startChange = ProcessStart(processChange.Instance, processChange.ProcessFlowElements[0], processChange.User);
            InstanceEvent startEvent = CopyInstanceEventValue(startChange.Events.First());

            ProcessStateChange nextChange = ProcessNext(processChange.Instance, processChange.ProcessFlowElements[1], processChange.User);
            InstanceEvent goToNextEvent = CopyInstanceEventValue(nextChange.Events.First());

            ProcessStateChange processStateChange = new ProcessStateChange
            {
                OldProcessState = startChange.OldProcessState,
                NewProcessState = nextChange.NewProcessState,
                Events = new List<InstanceEvent> { startEvent, goToNextEvent }
            };

            processChange.Instance = await UpdateProcessAndDispatchEvents(processChange.Instance, processStateChange);
            processChange.ProcessStateChange = processStateChange;
            return processChange;
        }

        /// <inheritdoc />
        public Task<ProcessChangeContext> HandleStartTask(ProcessChangeContext processChange)
        {
            return Task.FromResult(processChange);
        }

        private ITask GetProcessTask()
        {
            ITask task = new DataTask(_altinnApp, _processService, _instanceClient);
            return task;
        }

        private async Task<Instance> UpdateProcessAndDispatchEvents(Instance instance, ProcessStateChange processStateChange)
        {
            await NotifyAppAboutEvents(_altinnApp, instance, processStateChange.Events);

            // need to update the instance process and then the instance in case appbase has changed it, e.g. endEvent sets status.archived
            Instance updatedInstance = await _instanceClient.UpdateProcess(instance);

            await _processService.DispatchProcessEventsToStorage(updatedInstance, processStateChange.Events);

            // remember to get the instance anew since AppBase can have updated a data element or stored something in the database.
            updatedInstance = await _instanceClient.GetInstance(updatedInstance);

            return updatedInstance;
        }

        /// <summary>
        /// Perform calls to the custom App logic.
        /// </summary>
        /// <param name="altinnApp">The application core logic.</param>
        /// <param name="instance">The currently loaded instance.</param>
        /// <param name="events">The events to trigger.</param>
        /// <param name="prefill">Prefill values.</param>
        /// <returns>A Task to enable async await.</returns>
        internal static async Task NotifyAppAboutEvents(IAltinnApp altinnApp, Instance instance, List<InstanceEvent> events, Dictionary<string, string> prefill = null)
        {
            foreach (InstanceEvent processEvent in events)
            {
                if (Enum.TryParse<InstanceEventType>(processEvent.EventType, true, out InstanceEventType eventType))
                {
                    switch (eventType)
                    {
                        case InstanceEventType.process_StartEvent:

                            break;

                        case InstanceEventType.process_StartTask:
                            await altinnApp.OnStartProcessTask(processEvent.ProcessInfo?.CurrentTask?.ElementId, instance, prefill);
                            break;

                        case InstanceEventType.process_EndTask:
                            await altinnApp.OnEndProcessTask(processEvent.ProcessInfo?.CurrentTask?.ElementId, instance);
                            break;

                        case InstanceEventType.process_EndEvent:
                            await altinnApp.OnEndProcess(processEvent.ProcessInfo?.EndEvent, instance);
                            break;
                    }
                }
            }
        }

        /// <summary>
        /// Does not save process. Instance is updated.
        /// </summary>
        private ProcessStateChange ProcessStart(Instance instance, string startEvent, ClaimsPrincipal user)
        {
            if (instance.Process == null)
            {
                DateTime now = DateTime.UtcNow;

                ProcessState startState = new ProcessState
                {
                    Started = now,
                    StartEvent = startEvent,
                    CurrentTask = new ProcessElementInfo { Flow = 1 }
                };

                instance.Process = startState;

                List<InstanceEvent> events = new List<InstanceEvent>
                {
                    GenerateProcessChangeEvent(InstanceEventType.process_StartEvent.ToString(), instance, now, user),
                };

                return new ProcessStateChange
                {
                    OldProcessState = null,
                    NewProcessState = startState,
                    Events = events,
                };
            }

            return null;
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

        private InstanceEvent CopyInstanceEventValue(InstanceEvent e)
        {
            return new InstanceEvent
            {
                Created = e.Created,
                DataId = e.DataId,
                EventType = e.EventType,
                Id = e.Id,
                InstanceId = e.InstanceId,
                InstanceOwnerPartyId = e.InstanceOwnerPartyId,
                ProcessInfo = new ProcessState
                {
                    Started = e.ProcessInfo?.Started,
                    CurrentTask = new ProcessElementInfo
                    {
                        Flow = e.ProcessInfo?.CurrentTask.Flow,
                        AltinnTaskType = e.ProcessInfo?.CurrentTask.AltinnTaskType,
                        ElementId = e.ProcessInfo?.CurrentTask.ElementId,
                        Name = e.ProcessInfo?.CurrentTask.Name,
                        Started = e.ProcessInfo?.CurrentTask.Started,
                        Ended = e.ProcessInfo?.CurrentTask.Ended,
                        Validated = new ValidationStatus
                        {
                            CanCompleteTask = e.ProcessInfo?.CurrentTask?.Validated?.CanCompleteTask ?? false,
                            Timestamp = e.ProcessInfo?.CurrentTask?.Validated?.Timestamp
                        }
                    },

                    StartEvent = e.ProcessInfo?.StartEvent
                },
                User = new PlatformUser
                {
                    AuthenticationLevel = e.User.AuthenticationLevel,
                    EndUserSystemId = e.User.EndUserSystemId,
                    OrgId = e.User.OrgId,
                    UserId = e.User.UserId
                }
            };
        }

        /// <summary>
        /// Moves instance's process to nextElement id. Returns the instance together with process events.
        /// </summary>
        public ProcessStateChange ProcessNext(Instance instance, string nextElementId, ClaimsPrincipal userContext)
        {
            if (instance.Process != null)
            {
                try
                {
                    ProcessStateChange result = new ProcessStateChange
                    {
                        OldProcessState = new ProcessState()
                        {
                            Started = instance.Process.Started,
                            CurrentTask = instance.Process.CurrentTask,
                            StartEvent = instance.Process.StartEvent
                        }
                    };

                    result.Events = MoveProcessToNext(instance, nextElementId, userContext);
                    result.NewProcessState = instance.Process;
                    return result;
                }
                catch
                {
                    _logger.LogError($"Unable to get next for {instance.Id}");
                }
            }

            return null;
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

            string validNextElementId = _processHelper.GetValidNextElementOrError(currentElementId, proposedNextElementId, out ProcessError nextElementError);

            if (nextElementError != null)
            {
                throw new ArgumentException($"Wanted next element id {proposedNextElementId} is not a possible move from {currentElementId} in process model. {nextElementError.Text}");
            }

            return validNextElementId;
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

            ProcessState previousState = JsonConvert.DeserializeObject<ProcessState>(JsonConvert.SerializeObject(instance.Process));
            ProcessState currentState = instance.Process;
            string previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo nextElementInfo = _processHelper.Process.GetElementInfo(nextElementId);

            DateTime now = DateTime.UtcNow;

            // ending previous element if task
            if (_processHelper.IsTask(previousElementId))
            {
                instance.Process = previousState;
                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_EndTask.ToString(), instance, now, user));
                instance.Process = currentState;
            }

            // ending process if next element is end event
            if (_processHelper.IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_EndEvent.ToString(), instance, now, user));

                // add submit event (to support Altinn2 SBL)
                events.Add(GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
            }
            else if (_processHelper.IsTask(nextElementId))
            {
                currentState.CurrentTask = new ProcessElementInfo
                {
                    Flow = currentState.CurrentTask.Flow + 1,
                    ElementId = nextElementId,
                    Name = nextElementInfo.Name,
                    Started = now,
                    AltinnTaskType = nextElementInfo.AltinnTaskType,
                    Validated = null,
                };

                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now, user));
            }

            // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
            instance.Process = currentState;

            return events;
        }
    }
}
