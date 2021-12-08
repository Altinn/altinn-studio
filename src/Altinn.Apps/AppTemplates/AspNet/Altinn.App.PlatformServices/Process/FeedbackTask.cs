using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.PlatformServices.Process
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
        public override async Task HandleTaskAbandon(ProcessChangeContext processChange)
        {
            await _altinnApp.OnAbandonProcessTask(processChange.ElementToBeProcessed, processChange.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskComplete(ProcessChangeContext processChange)
        {
            await _altinnApp.OnEndProcessTask(processChange.ElementToBeProcessed, processChange.Instance);
        }

        /// <inheritdoc/>
        public override async Task HandleTaskStart(ProcessChangeContext processChange)
        {
            await _altinnApp.OnStartProcessTask(processChange.ElementToBeProcessed, processChange.Instance, processChange.Prefill);
        }
    }
}
