using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
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
        private readonly IInstance _instanceService;
        private readonly IInstanceEvent _eventService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<AppSettings> appSettings,
            ILogger<ProcessAppSI> logger,
            IInstanceEvent eventService,
            IInstance instanceService)
        {
            _appSettings = appSettings.Value;
            _logger = logger;
            _eventService = eventService;
            _instanceService = instanceService;
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
        public async Task<ProcessResult> ProcessStart(Instance instance, string validStartElement, UserContext userContext)
        {
            if (instance.Process == null)
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
                    GenerateProcessChangeEvent("process:StartEvent", updatedInstance, now, userContext),
                };

                await DispatchEventsToStorage(instance, events);

                return new ProcessResult
                {
                    Instance = updatedInstance,
                    Events = events,
                };
            }

            return null;
        }

        /// <summary>
        /// Start process start and goto next. Returns
        /// </summary>
        public async Task<ProcessResult> ProcessStartAndGotoNextTask(Instance instance, string validStartElement, UserContext userContext)
        {
            _logger.LogInformation($"ProcessStartAndGotoNextTask for {instance.Id}");

            // trigger start event
            ProcessResult startResult = await ProcessStart(instance, validStartElement, userContext);

            if (startResult != null)
            {
                ProcessHelper processHelper = new ProcessHelper(GetProcessDefinition());
                // trigger next task
                string nextValidElement = processHelper.GetValidNextElementOrError(validStartElement, out ProcessError nextElementError);
                if (nextElementError != null)
                {
                    throw new ArgumentException($"Unable to goto next element due to {nextElementError.Code} - {nextElementError.Text}");
                }

                ProcessResult nextResult = await ProcessNext(startResult.Instance, nextValidElement, processHelper, userContext);

                if (nextResult != null)
                {
                    List<InstanceEvent> allEvents = new List<InstanceEvent>();
                    allEvents.AddRange(startResult.Events);
                    allEvents.AddRange(nextResult.Events);

                    ProcessResult result = new ProcessResult
                    {
                        Instance = nextResult.Instance,
                        Events = allEvents,
                    };

                    return result;
                }
            }

            return null;
        }

        /// <summary>
        /// Moves instance's process to nextElement id. Saves the instance and returns it together with process events.
        /// </summary>
        public async Task<ProcessResult> ProcessNext(Instance instance, string nextElementId, ProcessHelper processModel, UserContext userContext)
        {
            if (instance.Process != null)
            {
                List<InstanceEvent> events = await ChangeProcessStateAndGenerateEvents(instance, nextElementId, processModel, userContext);

                Instance changedInstance = await _instanceService.UpdateInstance(instance);
                await DispatchEventsToStorage(instance, events);

                ProcessResult result = new ProcessResult
                {
                    Instance = changedInstance,
                    Events = events,
                };

                return result;
            }

            return null;
        }

        private async Task DispatchEventsToStorage(Instance instance, List<InstanceEvent> events)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (InstanceEvent instanceEvent in events)
            {
                await _eventService.SaveInstanceEvent(instanceEvent, org, app);
            }
        }

        private async Task<List<InstanceEvent>> ChangeProcessStateAndGenerateEvents(Instance instance, string nextElementId, ProcessHelper processModel, UserContext userContext)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            ProcessState currentState = instance.Process;

            string previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo nextElementInfo = processModel.Process.GetElementInfo(nextElementId);

            DateTime now = DateTime.UtcNow;
            int flow = 1;

            if (previousElementId == null && instance.Process.StartEvent != null)
            {
                flow = 1;
            }

            if (processModel.IsTask(previousElementId))
            {
                if (currentState.CurrentTask != null && currentState.CurrentTask.Flow.HasValue)
                {
                    flow = currentState.CurrentTask.Flow.Value;
                }

                events.Add(GenerateProcessChangeEvent("process:EndTask", instance, now, userContext));
            }

            if (processModel.IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(GenerateProcessChangeEvent("process:EndEvent", instance, now, userContext));

                // add submit event (to support Altinn2 SBL)
                events.Add(GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, userContext));
            }
            else if (processModel.IsTask(nextElementId))
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

                events.Add(GenerateProcessChangeEvent("process:StartTask", instance, now, userContext));
            }

            // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
            instance.Process = currentState;

            return events;
        }

        private InstanceEvent GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now, UserContext userContext)
        {
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
    }
}
