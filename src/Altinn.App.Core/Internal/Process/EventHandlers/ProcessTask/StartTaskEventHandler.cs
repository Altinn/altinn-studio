using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask
{
    /// <summary>
    /// This event handler is responsible for handling the start event for a process task.
    /// </summary>
    public class StartTaskEventHandler : IStartTaskEventHandler
    {
        private readonly IProcessTaskDataLocker _processTaskDataLocker;
        private readonly IProcessTaskInitializer _processTaskInitializer;
        private readonly IEnumerable<IProcessTaskStart> _processTaskStarts;

        /// <summary>
        /// This event handler is responsible for handling the start event for a process task.
        /// </summary>
        public StartTaskEventHandler(
            IProcessTaskDataLocker processTaskDataLocker,
            IProcessTaskInitializer processTaskInitializer,
            IEnumerable<IProcessTaskStart> processTaskStarts
        )
        {
            _processTaskDataLocker = processTaskDataLocker;
            _processTaskInitializer = processTaskInitializer;
            _processTaskStarts = processTaskStarts;
        }

        /// <summary>
        /// Execute the event handler logic.
        /// </summary>
        /// <param name="processTask"></param>
        /// <param name="taskId"></param>
        /// <param name="instance"></param>
        /// <param name="prefill"></param>
        /// <returns></returns>
        public async Task Execute(IProcessTask processTask, string taskId, Instance instance,
            Dictionary<string, string>? prefill)
        {
            await _processTaskDataLocker.Unlock(taskId, instance);
            await RunAppDefinedProcessTaskStartHandlers(taskId, instance, prefill);
            await _processTaskInitializer.Initialize(taskId, instance, prefill);
            await processTask.Start(taskId, instance);
        }

        /// <summary>
        /// Runs IProcessTaskStarts defined in the app.
        /// </summary>
        /// <param name="taskId"></param>
        /// <param name="instance"></param>
        /// <param name="prefill"></param>
        /// <returns></returns>
        private async Task RunAppDefinedProcessTaskStartHandlers(string taskId, Instance instance,
            Dictionary<string, string>? prefill)
        {
            foreach (IProcessTaskStart processTaskStarts in _processTaskStarts)
            {
                await processTaskStarts.Start(taskId, instance, prefill ?? []);
            }
        }
    }
}