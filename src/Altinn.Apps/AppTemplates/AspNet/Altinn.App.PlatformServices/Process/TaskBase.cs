using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

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
        public abstract Task HandleTaskComplete(ProcessChangeContext processChange);

        /// <summary>
        /// Handle task start
        /// </summary>
        public abstract Task HandleTaskStart(ProcessChangeContext processChange);

        /// <summary>
        /// Handle task abandon
        /// </summary>
        public abstract Task HandleTaskAbandon(ProcessChangeContext processChange);
    }
}
