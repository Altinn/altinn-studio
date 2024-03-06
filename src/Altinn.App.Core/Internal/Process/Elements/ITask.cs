using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.Elements
{
    /// <summary>
    /// Interface desbring the basic task
    /// </summary>
    public interface ITask
    {
        /// <summary>
        /// This operations triggers process logic needed to start the current task. The logic depend on the different types of task
        /// </summary>
        Task HandleTaskStart(string elementId, Instance instance, Dictionary<string, string> prefill);

        /// <summary>
        /// This operatin triggers process logic need to complete a given task. The Logic depend on the different types of task.
        /// </summary>
        Task HandleTaskComplete(string elementId, Instance instance);

        /// <summary>
        /// This operatin triggers process logic need to abandon a Task without completing it
        /// </summary>
        Task HandleTaskAbandon(string elementId, Instance instance);
    }
}
