using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.Elements
{
    /// <summary>
    /// TaskBase with default implentation
    /// </summary>
    public abstract class TaskBase: ITask
    {
        /// <summary>
        /// hallooo asdf
        /// </summary>
        public abstract Task HandleTaskComplete(string elementId, Instance instance);

        /// <summary>
        /// Handle task start
        /// </summary>
        public abstract Task HandleTaskStart(string elementId, Instance instance, Dictionary<string, string> prefill);

        /// <summary>
        /// Handle task abandon
        /// </summary>
        public abstract Task HandleTaskAbandon(string elementId, Instance instance);
    }
}
