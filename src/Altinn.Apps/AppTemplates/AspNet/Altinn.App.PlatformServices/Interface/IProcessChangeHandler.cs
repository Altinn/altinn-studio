using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Interface for Process Change Handler. Responsible for triggering events
    /// </summary>
    public interface IProcessChangeHandler
    {
        /// <summary>
        /// Handle start of process
        /// </summary>
        Task<ProcessChangeContext> HandleStart(ProcessChangeContext processChange);

        /// <summary>
        /// Handle navigation to ext
        /// </summary>
        /// <returns></returns>
        Task<ProcessChangeContext> HandleNext(ProcessChangeContext processChange);

        /// <summary>
        /// Handle start task
        /// </summary>
        Task<ProcessChangeContext> HandleStartTask(ProcessChangeContext processChange);

        /// <summary>
        /// Check if current task can be completed
        /// </summary>
        /// <returns></returns>
        Task<bool> CanTaskBeEnded(ProcessChangeContext processChange);
    }
}
