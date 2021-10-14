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
        Task<ProcessChange> HandleStart(ProcessChange processChange);

        /// <summary>
        /// Handle navigation to ext
        /// </summary>
        /// <returns></returns>
        Task<ProcessChange> HandleNext(ProcessChange processChange);

        /// <summary>
        /// Handle start task
        /// </summary>
        Task<ProcessChange> HandleStartTask(ProcessChange processChange);
    }
}
