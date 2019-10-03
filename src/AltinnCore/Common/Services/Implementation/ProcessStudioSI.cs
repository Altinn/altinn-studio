using System.IO;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// The studio implementation of the process service.
    /// </summary>
    public class ProcessStudioSI : IProcess
    {
        private readonly ServiceRepositorySettings repositorySettings;
        private readonly IHttpContextAccessor httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessStudioSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor)
        {
            this.repositorySettings = repositorySettings.Value;
            this.httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string bpmnFilePath = repositorySettings.GetWorkflowPath(org, app, developer) + repositorySettings.WorkflowFileName;
            return File.OpenRead(bpmnFilePath.AsFileName());
        }
    }
}
