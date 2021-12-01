using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Process
{
    /// <summary>
    /// TaskBase with default implentation
    /// </summary>
    public abstract class TaskBase: ITask
    {
        /// <summary>
        /// hallooo asdf
        /// </summary>
        public abstract void HandleTaskComplete(ProcessChangeContext processChange);

        /// <summary>
        /// Handle task start
        /// </summary>
        public abstract void HandleTaskStart(ProcessChangeContext processChange);
    }
}
