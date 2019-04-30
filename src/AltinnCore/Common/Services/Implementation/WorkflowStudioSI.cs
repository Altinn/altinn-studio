using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service that handles functionality used for workflow
    /// </summary>
    public class WorkflowStudioSI : IWorkflow
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkflowStudioSI"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="testdataRepositorySettings">The test data repository settings</param>
        /// <param name="logger">the logger service</param>
        public WorkflowStudioSI(IOptions<ServiceRepositorySettings> repositorySettings, IOptions<TestdataRepositorySettings> testdataRepositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<WorkflowStudioSI> logger)
        {
            _settings = repositorySettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <inheritdoc/>
        public ServiceState GetInitialServiceState(string applicationOwnerId, string applicationId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string workflowFullFilePath = _settings.GetWorkflowPath(applicationOwnerId, applicationId, developer) + _settings.WorkflowFileName;
            string workflowData = File.ReadAllText(workflowFullFilePath, Encoding.UTF8);
            return WorkflowHelper.GetInitialWorkflowState(workflowData);
        }

        /// <inheritdoc/>
        public ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            ServiceState currentState = GetCurrentState(instanceId, applicationOwnerId, applicationId, instanceOwnerId);
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string workflowFullFilePath = _settings.GetWorkflowPath(applicationOwnerId, applicationId, developer) + _settings.WorkflowFileName;
            string workflowData = File.ReadAllText(workflowFullFilePath, Encoding.UTF8);
            return WorkflowHelper.UpdateCurrentState(workflowData, currentState);
        }

        /// <inheritdoc/>
        public string GetUrlForCurrentState(Guid instanceId, string applicationOwnerId, string applicationId, WorkflowStep currentState)
        {
            return WorkflowHelper.GetUrlForCurrentState(instanceId, applicationOwnerId, applicationId, currentState);
        }

        /// <inheritdoc/>
        public ServiceState GetCurrentState(Guid instanceId, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string serviceStatePath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/{instanceId}/{instanceId}.json";
            string currentStateAsString = File.ReadAllText(serviceStatePath, Encoding.UTF8);
            Instance instance = JsonConvert.DeserializeObject<Instance>(currentStateAsString);
            Enum.TryParse<WorkflowStep>(instance.CurrentWorkflowStep, out WorkflowStep current);
            return new ServiceState
            {
                State = current,
            };
        }
    }
}
