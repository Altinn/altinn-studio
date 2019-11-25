using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
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
        private readonly AppSettings appSettings;
        private readonly ILogger<ProcessAppSI> logger;
        private readonly IInstance instanceService;
        private readonly IInstanceEvent eventService;
        private readonly UserHelper userHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<AppSettings> appSettings,
            ILogger<ProcessAppSI> logger,
            IInstanceEvent eventService,
            IInstance instanceService,
            IProfile profileService,
            IRegister registerService,
            IOptions<GeneralSettings> settings)
        {
            this.appSettings = appSettings.Value;
            this.logger = logger;
            this.eventService = eventService;
            this.instanceService = instanceService;

            userHelper = new UserHelper(profileService, registerService, settings);
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition()
        {
            string bpmnFilePath = appSettings.ConfigurationFolder + appSettings.ProcessFolder + appSettings.ProcessFileName;

            try
            {                
                Stream processModel = File.OpenRead(bpmnFilePath);

                return processModel;
            }
            catch (Exception processDefinitionException)
            {
                logger.LogError($"Cannot find process definition file for this app. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}");
                throw;
            }            
        }
      
        public async Task<Instance> ProcessStart(Instance instance, string validStartElement, UserContext userContext)
        {
            if (instance.Process == null)
            {
                DateTime now = DateTime.UtcNow;

                instance.Process = new ProcessState
                {
                    Started = now,
                    StartEvent = validStartElement,
                };
                Instance updatedInstance = await instanceService.UpdateInstance(instance);
                List<InstanceEvent> events = new List<InstanceEvent>
                {
                    GenerateProcessChangeEvent("process:StartEvent", updatedInstance, now, userContext),
                };

                await DispatchEvents(instance, events);

                return updatedInstance;
            }

            return instance;
        }

        public async Task<Instance> ProcessStartAndNext(Instance instance, string validStartElement, UserContext userContext)
        {
            // trigger start event
            Instance updatedInstance = await ProcessStart(instance, validStartElement, userContext);

            ProcessHelper processHelper = new ProcessHelper(GetProcessDefinition());
            // trigger next task
            string nextValidElement = processHelper.GetValidNextElementOrError(validStartElement, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                return null;
            }

            updatedInstance = ProcessNext(updatedInstance, nextValidElement, processHelper, userContext, out List<InstanceEvent> events);

            return updatedInstance;
        }



        public Instance ProcessNext(Instance instance, string nextElementId, ProcessHelper processModel, UserContext userContext, out List<InstanceEvent> events)
        {            
            events = ChangeProcessStateAndGenerateEvents(instance, nextElementId, processModel, userContext);

            Instance changedInstance = instanceService.UpdateInstance(instance).Result;
            _ = DispatchEvents(instance, events);

            return changedInstance ;
        }

        private async Task DispatchEvents(Instance instance, List<InstanceEvent> events)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (InstanceEvent instanceEvent in events)
            {
                await eventService.SaveInstanceEvent(instanceEvent, org, app);
            }
        }

        private List<InstanceEvent> ChangeProcessStateAndGenerateEvents(Instance instance, string nextElementId, ProcessHelper processModel, UserContext userContext)
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
