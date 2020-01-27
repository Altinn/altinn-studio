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
        /// Starts the process with a proposed startEvent. 
        /// ArgumentException if proposed start event does not exist in process model.
        /// </summary>
        /// <param name="instance">instance to start process on</param>
        /// <param name="proposedStartEvent">valid start event identifier</param>
        /// <returns>process state change containg prev process state, current state and events</returns>
        ProcessStateChange ProcessStart(Instance instance, string proposedStartEvent, ClaimsPrincipal user);

        /// <summary>
        /// Starts the process with a valid start element and moves it to its next task.
        /// This method does update the instance object with new process state.
        /// But does not store this in storage. Hence instance.Id is may not be set.
        /// </summary>
        /// <param name="instance">the instance to start</param>
        /// <param name="validStartEvent">valid start event</param>
        /// <param name="user">the user</param>
        /// <returns>process state change</returns>
        ProcessStateChange ProcessStartAndGotoNextTask(Instance instance, string validStartEvent, ClaimsPrincipal user);

        /// <summary>
        /// Updates the process to the next element id (can be a task or end event).
        /// Instance object gets new process state.
        /// </summary>
        /// <param name="instance">instance to update</param>
        /// <param name="nextElementId">valid next element id</param>
        /// <param name="processModel">the process model to get info</param>
        /// <returns>The state change</returns>
        ProcessStateChange ProcessNext(Instance instance, string nextElementId, ClaimsPrincipal user);

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
