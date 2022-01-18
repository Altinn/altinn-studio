using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.App.Services.Interface;

namespace Altinn.App.Core.Process
{
    /// <summary>
    /// Represents the process task responsible for form filling steps. 
    /// </summary>
    public class DataTask : TaskBase
    {
        private readonly IAltinnApp _altinnApp;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataTask"/> class.
        /// </summary>
        public DataTask(IAltinnApp altinnApp)
        {
            _altinnApp = altinnApp;
        }

        /// <inheritdoc/>
        public override async Task HandleTaskAbandon(ProcessChangeContext processChangeContext)
        {
            await _altinnApp.OnAbandonProcessTask(processChangeContext.ElementToBeProcessed, processChangeContext.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskComplete(ProcessChangeContext processChangeContext)
        {
            await _altinnApp.OnEndProcessTask(processChangeContext.ElementToBeProcessed, processChangeContext.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskStart(ProcessChangeContext processChangeContext)
        {
            await _altinnApp.OnStartProcessTask(processChangeContext.ElementToBeProcessed, processChangeContext.Instance, processChangeContext.Prefill);
        }
    }
}
