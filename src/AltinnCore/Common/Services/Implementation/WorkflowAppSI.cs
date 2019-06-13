using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// workflow Service implementation for deployed application
    /// </summary>
    public class WorkflowAppSI : IWorkflow
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly PlatformSettings _platformSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkflowAppSI"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="testdataRepositorySettings">The test data repository settings</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="generalSettings">the general settings</param>
        public WorkflowAppSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<PlatformSettings> platformSettings,
            IOptions<GeneralSettings> generalSettings)
        {
            _settings = repositorySettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _platformSettings = platformSettings.Value;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritdoc/>
        public ServiceState GetInitialServiceState(string org, string appName)
        {            
            // Read the workflow template
            string workflowData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);
            return WorkflowHelper.GetInitialWorkflowState(workflowData);
        }

        /// <inheritdoc/>
        public string GetUrlForCurrentState(Guid instanceId, string org, string appName, WorkflowStep currentState)
        {
            return WorkflowHelper.GetUrlForCurrentState(instanceId, org, appName, currentState);
        }

        /// <inheritdoc/>
        public ServiceState GetCurrentState(Guid instanceId, string org, string appName, int instanceOwnerId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = response.Result.Content.ReadAsStringAsync().Result;
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
                else
                {
                    throw new Exception("Unable to fetch workflow state");
                }

                Enum.TryParse<WorkflowStep>(instance.Workflow.CurrentStep, out WorkflowStep currentWorkflowState);

                return new ServiceState
                {
                    State = currentWorkflowState
                };
            }
        }

        /// <inheritdoc/>
        public ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string org, string appName, int instanceOwnerId)
        {
            ServiceState currentState = GetCurrentState(instanceId, org, appName, instanceOwnerId);
            string workflowData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);
            return WorkflowHelper.UpdateCurrentState(workflowData, currentState);
        }
    }
}
