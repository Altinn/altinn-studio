using System.Threading.Tasks;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Process
{
    /// <summary>
    /// TaskBase with default implentation
    /// </summary>
    public abstract class TaskBase: ITask
    {
        /// <summary>
        /// hallooo asdf
        /// </summary>
        public abstract Task HandleTaskComplete(ProcessChangeContext processChangeContext);

        /// <summary>
        /// Handle task start
        /// </summary>
        public abstract Task HandleTaskStart(ProcessChangeContext processChangeContext);

        /// <summary>
        /// Handle task abandon
        /// </summary>
        public abstract Task HandleTaskAbandon(ProcessChangeContext processChangeContext);
    }
}
