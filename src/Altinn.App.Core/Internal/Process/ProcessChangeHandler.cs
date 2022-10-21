using System.Security.Claims;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process
{
    /// <summary>
    /// Handler that implements needed logic related to different process changes. Identifies the correct types of tasks and trigger the different task and event
    ///
    /// While ProcessEngine.cs only understand standard BPMN process this handler fully understand the Altinn App context
    /// </summary>
    public class ProcessChangeHandler : IProcessChangeHandler
    {
        private readonly IInstance _instanceClient;
        private readonly IProcess _processService;
        private readonly IProcessReader _processReader;
        private readonly ILogger<ProcessChangeHandler> _logger;
        private readonly IValidation _validationService;
        private readonly IEvents _eventsService;
        private readonly IProfile _profileClient;
        private readonly AppSettings _appSettings;
        private readonly IAppEvents _appEvents;
        private readonly ITaskEvents _taskEvents;

        /// <summary>
        /// Altinn App specific process change handler
        /// </summary>
        public ProcessChangeHandler(
            ILogger<ProcessChangeHandler> logger,
            IProcess processService,
            IProcessReader processReader,
            IInstance instanceClient,
            IValidation validationService,
            IEvents eventsService,
            IProfile profileClient,
            IOptions<AppSettings> appSettings,
            IAppEvents appEvents,
            ITaskEvents taskEvents)
        {
            _logger = logger;
            _processService = processService;
            _instanceClient = instanceClient;
            _processReader = processReader;
            _validationService = validationService;
            _eventsService = eventsService;
            _profileClient = profileClient;
            _appSettings = appSettings.Value;
            _appEvents = appEvents;
            _taskEvents = taskEvents;
        }

        /// <inheritdoc />
        public async Task<ProcessChangeContext> HandleMoveToNext(ProcessChangeContext processChange)
        {
            processChange.ProcessStateChange = await ProcessNext(processChange.Instance, processChange.RequestedProcessElementId, processChange.User);
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
            ProcessStateChange startChange = await ProcessStart(processChange.Instance, processChange.ProcessFlowElements[0], processChange.User);
            InstanceEvent startEvent = CopyInstanceEventValue(startChange.Events.First());

            ProcessStateChange nextChange = await ProcessNext(processChange.Instance, processChange.ProcessFlowElements[1], processChange.User);
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

                canEndTask = await ProcessHelper.CanEndProcessTask(processChange.Instance, validationIssues);
            }
            else
            {
                canEndTask = await ProcessHelper.CanEndProcessTask(processChange.Instance, validationIssues);
            }

            return canEndTask;
        }

        /// <summary>
        /// Identify the correct task implementation
        /// </summary>
        /// <returns></returns>
        private ITask GetProcessTask(string? altinnTaskType)
        {
            if (string.IsNullOrEmpty(altinnTaskType))
            {
                return new NullTask();
            }

            ITask task = new DataTask(_taskEvents);
            if (altinnTaskType.Equals("confirmation"))
            {
                task = new ConfirmationTask(_taskEvents);
            }
            else if (altinnTaskType.Equals("feedback"))
            {
                task = new FeedbackTask(_taskEvents);
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
                            await _instanceClient.UpdateProcess(processChangeContext.Instance);
                            break;
                        case InstanceEventType.process_EndEvent:
                            processChangeContext.ElementToBeProcessed = processEvent.ProcessInfo?.EndEvent;
                            await _appEvents.OnEndAppEvent(processEvent.ProcessInfo?.EndEvent, processChangeContext.Instance);
                            break;
                    }
                }
            }
        }

        /// <summary>
        /// Does not save process. Instance is updated.
        /// </summary>
        private async Task<ProcessStateChange> ProcessStart(Instance instance, string startEvent, ClaimsPrincipal user)
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
                    await GenerateProcessChangeEvent(InstanceEventType.process_StartEvent.ToString(), instance, now, user),
                };

                return new ProcessStateChange
                {
                    OldProcessState = null!,
                    NewProcessState = startState,
                    Events = events,
                };
            }

            return null;
        }

        private async Task<InstanceEvent> GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now, ClaimsPrincipal user)
        {
            int? userId = user.GetUserIdAsInt();
            InstanceEvent instanceEvent = new InstanceEvent
            {
                InstanceId = instance.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                EventType = eventType,
                Created = now,
                User = new PlatformUser
                {
                    UserId = userId,
                    AuthenticationLevel = user.GetAuthenticationLevel(),
                    OrgId = user.GetOrg()
                },
                ProcessInfo = instance.Process,
            };

            if (string.IsNullOrEmpty(instanceEvent.User.OrgId) && userId != null)
            {
                UserProfile up = await _profileClient.GetUserProfile((int)userId);
                instanceEvent.User.NationalIdentityNumber = up.Party.SSN;
            }

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
                    UserId = e.User.UserId,
                    NationalIdentityNumber = e.User?.NationalIdentityNumber
                }
            };
        }

        /// <summary>
        /// Moves instance's process to nextElement id. Returns the instance together with process events.
        /// </summary>
        public async Task<ProcessStateChange> ProcessNext(Instance instance, string? nextElementId, ClaimsPrincipal userContext)
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

                result.Events = await MoveProcessToNext(instance, nextElementId, userContext);
                result.NewProcessState = instance.Process;
                return result;
            }

            return null;
        }

        /// <summary>
        /// Assumes that nextElementId is a valid task/state
        /// </summary>
        private async Task<List<InstanceEvent>> MoveProcessToNext(
            Instance instance,
            string? nextElementId,
            ClaimsPrincipal user)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            ProcessState previousState = Copy(instance.Process);
            ProcessState currentState = instance.Process;
            string? previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo? nextElementInfo = _processReader.GetElementInfo(nextElementId);
            List<SequenceFlow> flows = _processReader.GetSequenceFlowsBetween(previousElementId, nextElementId);
            ProcessSequenceFlowType sequenceFlowType = ProcessHelper.GetSequenceFlowType(flows);
            DateTime now = DateTime.UtcNow;
            bool previousIsProcessTask = _processReader.IsProcessTask(previousElementId);
            // ending previous element if task
            if (previousIsProcessTask && sequenceFlowType.Equals(ProcessSequenceFlowType.CompleteCurrentMoveToNext))
            {
                instance.Process = previousState;
                events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_EndTask.ToString(), instance, now, user));
                instance.Process = currentState;
            }
            else if (previousIsProcessTask)
            {
                instance.Process = previousState;
                events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_AbandonTask.ToString(), instance, now, user));
                instance.Process = currentState;
            }

            // ending process if next element is end event
            if (_processReader.IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_EndEvent.ToString(), instance, now, user));

                // add submit event (to support Altinn2 SBL)
                events.Add(await GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
            }
            else if (_processReader.IsProcessTask(nextElementId))
            {
                currentState.CurrentTask = new ProcessElementInfo
                {
                    Flow = currentState.CurrentTask.Flow + 1,
                    ElementId = nextElementId,
                    Name = nextElementInfo?.Name,
                    Started = now,
                    AltinnTaskType = nextElementInfo?.AltinnTaskType,
                    Validated = null,
                    FlowType = sequenceFlowType.ToString(),
                };

                events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now, user));
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
                    _logger.LogWarning(exception, "Exception when sending event with the Events component");
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
