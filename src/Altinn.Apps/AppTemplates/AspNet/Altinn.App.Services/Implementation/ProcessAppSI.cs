using System;
using System.IO;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// The app implementation of the process service.
    /// </summary>
    public class ProcessAppSI : IProcess
    {
        private readonly AppSettings repositorySettings;
        private readonly ILogger<ProcessAppSI> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<AppSettings> repositorySettings,
            ILogger<ProcessAppSI> logger)
        {
            this.repositorySettings = repositorySettings.Value;
            this.logger = logger;
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition(string org, string app)
        {
            string bpmnFilePath = repositorySettings.GetWorkflowPath(org, app, null) + repositorySettings.WorkflowFileName;

            try
            {                
                Stream processModel = File.OpenRead(bpmnFilePath);

                return processModel;
            }
            catch (Exception processDefinitionException)
            {
                logger.LogError($"Cannot find process definition file for {org}/{app}. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}");
                throw;
            }            
        }
    }
}
