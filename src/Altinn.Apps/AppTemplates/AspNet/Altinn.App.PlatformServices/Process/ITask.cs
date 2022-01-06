using System.Threading.Tasks;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Process
{
    /// <summary>
    /// Interface desbring the basic task
    /// </summary>
    public interface ITask
    {
        /// <summary>
        /// This operations triggers process logic needed to start the current task. The logic depend on the different types of task
        /// </summary>
        Task HandleTaskStart(ProcessChangeContext processChangeContext);

        /// <summary>
        /// This operatin triggers process logic need to complete a given task. The Logic depend on the different types of task.
        /// </summary>
        Task HandleTaskComplete(ProcessChangeContext processChangeContext);

        /// <summary>
        /// This operatin triggers process logic need to abandon a Task without completing it
        /// </summary>
        Task HandleTaskAbandon(ProcessChangeContext processChangeContext);
    }
}
