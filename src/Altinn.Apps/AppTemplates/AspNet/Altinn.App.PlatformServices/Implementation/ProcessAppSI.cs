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
        public ProcessResult ProcessStart(Instance instance, string validStartElement, ClaimsPrincipal user)
        {
            if (instance.Process == null)
            {
                DateTime now = DateTime.UtcNow;

                instance.Process = new ProcessState
                {
                    Started = now,
                    StartEvent = validStartElement,
                };

                List<InstanceEvent> events = new List<InstanceEvent>
                {
                    GenerateProcessChangeEvent("process:StartEvent", instance, now, user),
                };

                return new ProcessResult
                {
                    Instance = instance,
                    Events = events,
                };
            }

            return null;
        }
      
        /// <summary>
        /// Start process start and goto next. Returns
        /// </summary>
        public ProcessResult ProcessStartAndGotoNextTask(Instance instance, string validStartElement, ClaimsPrincipal user)
        {
            _logger.LogInformation($"ProcessStartAndGotoNextTask for {instance.Id}");

            ProcessResult startResult =  ProcessStart(instance, validStartElement, user);

            ProcessHelper processHelper = new ProcessHelper(GetProcessDefinition());
            // trigger next task
            string nextValidElement = processHelper.GetValidNextElementOrError(validStartElement, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                throw new ArgumentException($"Unable to goto next element due to {nextElementError.Code} - {nextElementError.Text}");
            }

            ProcessResult nextResult = ProcessNext(startResult.Instance, nextValidElement, processHelper, user);

            List<InstanceEvent> allEvents = new List<InstanceEvent>();
            allEvents.AddRange(startResult.Events);
            allEvents.AddRange(nextResult.Events);

            ProcessResult result = new ProcessResult
            {
                Instance = instance,
                Events = allEvents,
            };

            return result;
        }

        /// <summary>
        /// Moves instance's process to nextElement id. Saves the instance and returns it together with process events.
        /// </summary>
        public ProcessResult ProcessNext(Instance instance, string nextElementId, ProcessHelper processModel, ClaimsPrincipal userContext)
        {
            if (instance.Process != null)
            {
                List<InstanceEvent> events = MoveProcessToNext(instance, nextElementId, processModel, userContext);

                ProcessResult result = new ProcessResult
                {
                    Instance = instance,
                    Events = events,
                };

                return result;
            }

            return null;
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

        private List<InstanceEvent> MoveProcessToNext(
            Instance instance,
            string nextElementId,
            ProcessHelper processModel,
            ClaimsPrincipal user)
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

                events.Add(GenerateProcessChangeEvent("process:EndTask", instance, now, user));
            }

            if (processModel.IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(GenerateProcessChangeEvent("process:EndEvent", instance, now, user));

                // add submit event (to support Altinn2 SBL)
                events.Add(GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
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
