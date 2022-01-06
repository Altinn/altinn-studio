using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.Core.Interface
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
        /// Handle complete task and move to 
        /// </summary>
        /// <returns></returns>
        Task<ProcessChangeContext> HandleCompleteCurrentAndMoveToNext(ProcessChangeContext processChange);

        /// <summary>
        /// Handle navigation to ext
        /// </summary>
        /// <returns></returns>
        Task<ProcessChangeContext> HandleAbandonCurrentReturnToNext(ProcessChangeContext processChange);

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
