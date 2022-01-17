using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Common.Process;
using Altinn.App.Common.Process.Elements;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models;
using Altinn.App.Core.Process;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Implementation
{
    /// <summary>
    /// Handler that implements needed logic related to different process changes. Identifies the correct types of tasks and trigger the different task and event
    ///
    /// While ProcessEngine.cs only understand standard BPMN process this handler fully understand the Altinn App context
    /// </summary>
    public class ProcessChangeHandler : IProcessChangeHandler
    {
        private readonly IAltinnApp _altinnApp;
        private readonly IInstance _instanceClient;
        private readonly IProcess _processService;
        private readonly ProcessHelper _processHelper;
        private readonly ILogger<ProcessChangeHandler> _logger;
        private readonly IValidation _validationService;

        private readonly IEvents _eventsService;
        private readonly AppSettings _appSettings;

        /// <summary>
        /// Altinn App specific process change handler
        /// </summary>
        public ProcessChangeHandler(
            IAltinnApp altinnApp,
            ILogger<ProcessChangeHandler> logger,
            IProcess processService,
            IInstance instanceClient,
            IValidation validationService,
            IEvents eventsService,
            IOptions<AppSettings> appSettings)
        {
            _altinnApp = altinnApp;
            _logger = logger;
            _processService = processService;
            _instanceClient = instanceClient;
            using Stream bpmnStream = _processService.GetProcessDefinition();
            _processHelper = new ProcessHelper(bpmnStream);
            _validationService = validationService;
            _eventsService = eventsService;
            _appSettings = appSettings.Value;
        }

        /// <inheritdoc />
        public async Task<ProcessChangeContext> HandleMoveToNext(ProcessChangeContext processChange)
        {
            processChange.ProcessStateChange = ProcessNext(processChange.Instance, processChange.RequestedProcessElementId, processChange.User);
            if (processChange.ProcessStateChange != null)
            {
                processChange.Instance = await UpdateProcessAndDispatchEvents(processChange);

                await RegisterEventWithEventsComponent(processChange.Instance);
            }

            return processChange;
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
            processChange.ProcessStateChange = processStateChange;

            if (!processChange.DontUpdateProcessAndDispatchEvents)
            {
                processChange.Instance = await UpdateProcessAndDispatchEvents(processChange);
            }
           
            return processChange;
        }

        /// <inheritdoc />
        public async Task<ProcessChangeContext> HandleStartTask(ProcessChangeContext processChange)
        {
            processChange.Instance = await UpdateProcessAndDispatchEvents(processChange);
            return processChange;
        }

        /// <inheritdoc />
        public async Task<bool> CanTaskBeEnded(ProcessChangeContext processChange)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            bool canEndTask;

            if (processChange.Instance.Process?.CurrentTask?.Validated == null || !processChange.Instance.Process.CurrentTask.Validated.CanCompleteTask)
            {
                validationIssues = await _validationService.ValidateAndUpdateProcess(processChange.Instance, processChange.Instance.Process.CurrentTask?.ElementId);

                canEndTask = await _altinnApp.CanEndProcessTask(processChange.Instance.Process.CurrentTask?.ElementId, processChange.Instance, validationIssues);
            }
            else
            {
                canEndTask = await _altinnApp.CanEndProcessTask(processChange.Instance.Process.CurrentTask?.ElementId, processChange.Instance, validationIssues);
            }

            return canEndTask;
        }

        /// <summary>
        /// Identify the correct task implementation
        /// </summary>
        /// <returns></returns>
        private ITask GetProcessTask(string altinnTaskType)
        {
            if (string.IsNullOrEmpty(altinnTaskType))
            {
                return null;
            }

            ITask task = new DataTask(_altinnApp);
            if (altinnTaskType.Equals("confirmation"))
            {
                task = new ConfirmationTask(_altinnApp);
            }
            else if (altinnTaskType.Equals("feedback"))
            {
                task = new FeedbackTask(_altinnApp);
            }

            return task;
        }

        /// <summary>
        /// This 
        /// </summary>
        private async Task<Instance> UpdateProcessAndDispatchEvents(ProcessChangeContext processChangeContext)
        {
            await HandleProcessChanges(processChangeContext);

            // need to update the instance process and then the instance in case appbase has changed it, e.g. endEvent sets status.archived
            Instance updatedInstance = await _instanceClient.UpdateProcess(processChangeContext.Instance);

            await _processService.DispatchProcessEventsToStorage(updatedInstance, processChangeContext.ProcessStateChange.Events);

            // remember to get the instance anew since AppBase can have updated a data element or stored something in the database.
            updatedInstance = await _instanceClient.GetInstance(updatedInstance);

            return updatedInstance;
        }

        /// <summary>
        /// Will for each process change trigger relevant Process Elements to perform the relevant change actions.
        ///
        /// Each implementation 
        /// </summary>
        internal async Task HandleProcessChanges(ProcessChangeContext processChangeContext)
        {
            foreach (InstanceEvent processEvent in processChangeContext.ProcessStateChange.Events)
            {
                if (Enum.TryParse<InstanceEventType>(processEvent.EventType, true, out InstanceEventType eventType))
                {
                    processChangeContext.ElementToBeProcessed = processEvent.ProcessInfo?.CurrentTask?.ElementId;
                    ITask task = GetProcessTask(processEvent.ProcessInfo?.CurrentTask?.AltinnTaskType);
                    switch (eventType)
                    {
                        case InstanceEventType.process_StartEvent:
                            break;
                        case InstanceEventType.process_StartTask:
                            await task.HandleTaskStart(processChangeContext);
                            break;
                        case InstanceEventType.process_EndTask:
                            await task.HandleTaskComplete(processChangeContext);
                            break;
                        case InstanceEventType.process_AbandonTask:
                            await task.HandleTaskAbandon(processChangeContext);
                            break;
                        case InstanceEventType.process_EndEvent:
                            processChangeContext.ElementToBeProcessed = processEvent.ProcessInfo?.EndEvent;
                            await _altinnApp.OnEndProcess(processEvent.ProcessInfo?.EndEvent, processChangeContext.Instance);
                            break;
                    }
                }
            }
        }

        /// <summary>
        /// Does not save process. Instance is updated.
        /// </summary>
        private static ProcessStateChange ProcessStart(Instance instance, string startEvent, ClaimsPrincipal user)
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

        private static InstanceEvent GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now, ClaimsPrincipal user)
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

        private static InstanceEvent CopyInstanceEventValue(InstanceEvent e)
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

            return null;
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

            ProcessState previousState = Copy(instance.Process);
            ProcessState currentState = instance.Process;
            string previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo nextElementInfo = _processHelper.Process.GetElementInfo(nextElementId);
            ProcessSequenceFlowType sequenceFlowType = _processHelper.GetSequenceFlowType(previousElementId, nextElementId);
            DateTime now = DateTime.UtcNow;

            // ending previous element if task
            if (_processHelper.IsTask(previousElementId) && sequenceFlowType.Equals(ProcessSequenceFlowType.CompleteCurrentMoveToNext))
            {
                instance.Process = previousState;
                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_EndTask.ToString(), instance, now, user));
                instance.Process = currentState;
            }
            else if (_processHelper.IsTask(previousElementId))
            {
                instance.Process = previousState;
                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_AbandonTask.ToString(), instance, now, user));
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
                    FlowType = sequenceFlowType.ToString(),
                };

                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now, user));
            }

            // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
            instance.Process = currentState;

            return events;
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

        private static ProcessState Copy(ProcessState original)
        {
            ProcessState processState = new ProcessState();

            if (original.CurrentTask != null)
            {
                processState.CurrentTask = new ProcessElementInfo();
                processState.CurrentTask.FlowType = original.CurrentTask.FlowType;
                processState.CurrentTask.Name = original.CurrentTask.Name;
                processState.CurrentTask.Validated = original.CurrentTask.Validated;
                processState.CurrentTask.AltinnTaskType = original.CurrentTask.AltinnTaskType;
                processState.CurrentTask.Flow = original.CurrentTask.Flow;
                processState.CurrentTask.ElementId = original.CurrentTask.ElementId;
                processState.CurrentTask.Started = original.CurrentTask.Started;
                processState.CurrentTask.Ended = original.CurrentTask.Ended;
            }

            processState.EndEvent = original.EndEvent;
            processState.Started = original.Started;
            processState.Ended = original.Ended;
            processState.StartEvent = original.StartEvent;

            return processState;
        }
    }
}
