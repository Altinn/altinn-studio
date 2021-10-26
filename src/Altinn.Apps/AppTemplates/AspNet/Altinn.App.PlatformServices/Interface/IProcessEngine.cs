using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Process engine interface that defines the Altinn App process engine
    /// </summary>
    public interface IProcessEngine
    {
        /// <summary>
        /// Method to start a new process
        /// </summary>
        Task<ProcessChangeContext> StartProcess(ProcessChangeContext processChange);

        /// <summary>
        /// Method to move process to next task/event
        /// </summary>
        Task<ProcessChangeContext> Next(ProcessChangeContext processChange);

        /// <summary>
        /// Method to Start Task
        /// </summary>
        Task<ProcessChangeContext> StartTask(ProcessChangeContext processChange);
    }
}
