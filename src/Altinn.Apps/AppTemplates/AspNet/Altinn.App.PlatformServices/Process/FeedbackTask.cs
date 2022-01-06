using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Process
{
    /// <summary>
    /// Defines the task of type data 
    /// </summary>
    public class FeedbackTask : TaskBase
    {
        private readonly IAltinnApp _altinnApp;

        /// <summary>
        /// Constructor
        /// </summary>
        public FeedbackTask(IAltinnApp altinnApp)
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
            await _altinnApp.OnEndProcessTask(processChangeContext.ElementToBeProcessed, prprocessChangeContextocessChangeContext.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskStart(ProcessChangeContext processChange)
        {
            await _altinnApp.OnStartProcessTask(processChange.ElementToBeProcessed, processChange.Instance, processChange.Prefill);
        }
    }
}
