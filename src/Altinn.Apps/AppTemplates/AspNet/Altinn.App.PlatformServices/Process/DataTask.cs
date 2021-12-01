using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.PlatformServices.Process
{
    /// <summary>
    /// Defines the task of type data 
    /// </summary>
    public class DataTask : TaskBase
    {
        private readonly IProcess _processService;

        private readonly IAltinnApp _altinnApp;

        private readonly IInstance _instanceClient;

        /// <summary>
        /// Constructor
        /// </summary>
        public DataTask(IAltinnApp altinnApp, IProcess processService, IInstance instanceClient)
        {
            _altinnApp = altinnApp;
            _processService = processService;
            _instanceClient = instanceClient;
        }

        /// <inheritdoc/>
        public override void HandleTaskComplete(ProcessChangeContext processChange)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public override void HandleTaskStart(ProcessChangeContext processChange)
        {
            throw new NotImplementedException();
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
        /// Notify app logic about events
        /// </summary>
        /// <returns></returns>
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
    }
}
