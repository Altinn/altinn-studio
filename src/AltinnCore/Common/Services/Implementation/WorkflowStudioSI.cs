using System;
using System.IO;
using System.Text;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Studio implementation of the workflow service.
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
        public ServiceState GetInitialServiceState(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string workflowFullFilePath = _settings.GetWorkflowPath(org, app, developer) + _settings.WorkflowFileName;
            string workflowData = File.ReadAllText(workflowFullFilePath, Encoding.UTF8);
            return WorkflowHelper.GetInitialWorkflowState(workflowData);
        }

        /// <inheritdoc/>
        public ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string org, string app, int instanceOwnerId)
        {
            ServiceState currentState = GetCurrentState(instanceId, org, app, instanceOwnerId);
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string workflowFullFilePath = _settings.GetWorkflowPath(org, app, developer) + _settings.WorkflowFileName;
            string workflowData = File.ReadAllText(workflowFullFilePath, Encoding.UTF8);
            return WorkflowHelper.UpdateCurrentState(workflowData, currentState);
        }

        /// <inheritdoc/>
        public string GetUrlForCurrentState(Guid instanceId, string org, string app, WorkflowStep currentState)
        {
            return WorkflowHelper.GetUrlForCurrentState(instanceId, org, app, currentState);
        }

        /// <inheritdoc/>
        public ServiceState GetCurrentState(Guid instanceId, string org, string app, int instanceOwnerId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string serviceStatePath = $"{_settings.GetTestdataForPartyPath(org, app, developer)}{instanceOwnerId}/{instanceId}/{instanceId}.json";
            string currentStateAsString = File.ReadAllText(serviceStatePath, Encoding.UTF8);
            Instance instance = JsonConvert.DeserializeObject<Instance>(currentStateAsString);
            Enum.TryParse<WorkflowStep>(instance.Process.CurrentTask.ProcessElementId, out WorkflowStep current);
            return new ServiceState
            {
                State = current,
            };
        }
    }
}
