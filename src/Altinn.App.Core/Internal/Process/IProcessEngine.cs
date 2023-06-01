using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process
{
    /// <summary>
    /// Process engine interface that defines the Altinn App process engine
    /// </summary>
    public interface IProcessEngine
    {
        /// <summary>
        /// Method to start a new process
        /// </summary>
        Task<ProcessChangeResult> StartProcess(ProcessStartRequest processStartRequest);

        /// <summary>
        /// Method to move process to next task/event
        /// </summary>
        Task<ProcessChangeResult> Next(ProcessNextRequest request);

        /// <summary>
        /// Update Instance and rerun instance events
        /// </summary>
        /// <param name="startRequest"></param>
        /// <param name="events"></param>
        /// <returns></returns>
        Task<Instance> UpdateInstanceAndRerunEvents(ProcessStartRequest startRequest, List<InstanceEvent>? events);
    }
}
