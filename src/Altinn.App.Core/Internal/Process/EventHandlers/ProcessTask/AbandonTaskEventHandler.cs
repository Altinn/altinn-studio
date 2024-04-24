using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask
{
    /// <summary>
    /// This event handler is responsible for handling the abandon event for a process task.
    /// </summary>
    public class AbandonTaskEventHandler : IAbandonTaskEventHandler
    {
        private readonly IEnumerable<IProcessTaskAbandon> _processTaskAbondons;

        /// <summary>
        /// This event handler is responsible for handling the abandon event for a process task.
        /// </summary>
        public AbandonTaskEventHandler(IEnumerable<IProcessTaskAbandon> processTaskAbondons)
        {
            _processTaskAbondons = processTaskAbondons;
        }

        /// <summary>
        /// Handles the abandon event for a process task.
        /// </summary>
        public async Task Execute(IProcessTask processTask, string taskId, Instance instance)
        {
            await processTask.Abandon(taskId, instance);
            await RunAppDefinedProcessTaskAbandonHandlers(taskId, instance);
        }

        /// <summary>
        /// Runs IProcessTaskAbandons defined in the app.
        /// </summary>
        private async Task RunAppDefinedProcessTaskAbandonHandlers(string taskId, Instance instance)
        {
            foreach (IProcessTaskAbandon taskAbandon in _processTaskAbondons)
            {
                await taskAbandon.Abandon(taskId, instance);
            }
        }
    }
}
