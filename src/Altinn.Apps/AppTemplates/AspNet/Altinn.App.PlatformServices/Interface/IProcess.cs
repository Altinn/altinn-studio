using Altinn.App.Services.Helpers;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

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
        /// Starts the process with a given valid startEvent. If process is allready started the current instance is returned.
        /// </summary>
        /// <param name="instance">instance to start process on</param>
        /// <param name="validStartEvent">valid start event identifier</param>
        /// <returns>instance with started process</returns>
        Task<Instance> ProcessStart(Instance instance, string validStartEvent, UserContext userContext);

        /// <summary>
        /// Starts the process with a valid start element and moves it to its next task. If process is allready started operation is ignored.
        /// </summary>
        /// <param name="instance"></param>
        /// <param name="validStartEvent"></param>
        /// <param name="userContext"></param>
        /// <returns></returns>
        Task<Instance> ProcessStartAndGotoNextTask(Instance instance, string validStartEvent, UserContext userContext);

        /// <summary>
        /// Updates the process to the next element id (can be a task or end event)
        /// </summary>
        /// <param name="instance">instance to update</param>
        /// <param name="nextElementId">valid next element id</param>
        /// <param name="processModel">the process model to get info</param>
        /// <returns>instance with updated process</returns>
        Instance ProcessNext(Instance instance, string nextElementId, ProcessHelper processModel, UserContext userContext, out List<InstanceEvent> events);
    }
}
