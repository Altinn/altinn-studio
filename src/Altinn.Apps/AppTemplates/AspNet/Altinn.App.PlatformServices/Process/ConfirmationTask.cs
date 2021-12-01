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
    public class ConfirmationTask : TaskBase
    {
        private readonly IProcess _processService;

        private readonly IAltinnApp _altinnApp;

        private readonly IInstance _instanceClient;

        /// <summary>
        /// Constructor
        /// </summary>
        public ConfirmationTask(IAltinnApp altinnApp)
        {
            _altinnApp = altinnApp;
        }

        /// <inheritdoc/>
        public override Task HandleTaskComplete(ProcessChangeContext processChange)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public override async Task HandleTaskStart(ProcessChangeContext processChange)
        {
            throw new NotImplementedException();
        }
    }
}
