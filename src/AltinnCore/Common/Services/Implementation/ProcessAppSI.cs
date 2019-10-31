using System;
using System.IO;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// The app implementation of the process service.
    /// </summary>
    public class ProcessAppSI : IProcess
    {
        private readonly ServiceRepositorySettings repositorySettings;
        private readonly ILogger<ProcessAppSI> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            ILogger<ProcessAppSI> logger)
        {
            this.repositorySettings = repositorySettings.Value;
            this.logger = logger;
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition(string org, string app)
        {
            string bpmnFilePath = repositorySettings.GetWorkflowPath(org, app, null) + repositorySettings.WorkflowFileName;

            Stream processModel = File.OpenRead(bpmnFilePath);

            return processModel;
        }
    }
}
