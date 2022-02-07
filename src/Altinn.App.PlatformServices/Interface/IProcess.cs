using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Process service that encapsulate reading of the BPMN process definition.
    /// </summary>
    public interface IProcess
    {
        /// <summary>
        /// Returns a stream that contains the process definition.
        /// </summary>
        /// <returns>the stream</returns>
        Stream GetProcessDefinition();

        /// <summary>
        /// Dispatches process events to storage.
        /// </summary>
        /// <param name="instance">the instance</param>
        /// <param name="events">process events</param>
        /// <returns></returns>
        public Task DispatchProcessEventsToStorage(Instance instance, List<InstanceEvent> events);

        /// <summary>
        /// Gets the instance process events related to the instance matching the instance id. 
        /// </summary>
        Task<ProcessHistoryList> GetProcessHistory(string instanceGuid, string instanceOwnerPartyId);
    }
}
