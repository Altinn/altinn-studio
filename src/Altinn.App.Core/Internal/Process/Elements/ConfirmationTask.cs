using Altinn.App.Core.Interface;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Process.Elements
{
    /// <summary>
    /// Represents the process task responsible for collecting user confirmation.
    /// </summary>
    public class ConfirmationTask : TaskBase
    {
        private readonly ITaskEvents _taskEvents;

        /// <summary>
        /// Initializes a new instance of the <see cref="ConfirmationTask"/> class.
        /// </summary>
        public ConfirmationTask(ITaskEvents taskEvents)
        {
            _taskEvents = taskEvents;
        }

        /// <inheritdoc/>
        public override async Task HandleTaskAbandon(ProcessChangeContext processChangeContext)
        {
            await _taskEvents.OnAbandonProcessTask(processChangeContext.ElementToBeProcessed, processChangeContext.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskComplete(ProcessChangeContext processChangeContext)
        {
            await _taskEvents.OnEndProcessTask(processChangeContext.ElementToBeProcessed, processChangeContext.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskStart(ProcessChangeContext processChangeContext)
        {
            await _taskEvents.OnStartProcessTask(processChangeContext.ElementToBeProcessed, processChangeContext.Instance, processChangeContext.Prefill);
        }
    }
}
