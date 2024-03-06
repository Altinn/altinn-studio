using Altinn.Platform.Storage.Interface.Models;

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
        public override async Task HandleTaskAbandon(string elementId, Instance instance)
        {
            await _taskEvents.OnAbandonProcessTask(elementId, instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskComplete(string elementId, Instance instance)
        {
            await _taskEvents.OnEndProcessTask(elementId, instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskStart(string elementId, Instance instance, Dictionary<string, string> prefill)
        {
            await _taskEvents.OnStartProcessTask(elementId, instance, prefill);
        }
    }
}
