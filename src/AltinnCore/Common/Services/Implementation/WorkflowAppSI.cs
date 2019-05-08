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
        private readonly PlatformStorageSettings _platformStorageSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkflowAppSI"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="testdataRepositorySettings">The test data repository settings</param>
        /// <param name="platformStorageSettings">the platform storage settings</param>
        /// <param name="generalSettings">the general settings</param>
        public WorkflowAppSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<PlatformStorageSettings> platformStorageSettings,
            IOptions<GeneralSettings> generalSettings)
        {
            _settings = repositorySettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _platformStorageSettings = platformStorageSettings.Value;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritdoc/>
        public ServiceState GetInitialServiceState(string applicationOwnerId, string applicationId)
        {            
            // Read the workflow template
            string workflowData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);
            return WorkflowHelper.GetInitialWorkflowState(workflowData);
        }

        /// <inheritdoc/>
        public string GetUrlForCurrentState(Guid instanceId, string applicationOwnerId, string applicationId, WorkflowStep currentState)
        {
            return WorkflowHelper.GetUrlForCurrentState(instanceId, applicationOwnerId, applicationId, currentState);
        }

        /// <inheritdoc/>
        public ServiceState GetCurrentState(Guid instanceId, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
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

                Enum.TryParse<WorkflowStep>(instance.CurrentWorkflowStep, out WorkflowStep currentWorkflowState);

                return new ServiceState
                {
                    State = currentWorkflowState
                };
            }
        }

        /// <inheritdoc/>
        public ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            ServiceState currentState = GetCurrentState(instanceId, applicationOwnerId, applicationId, instanceOwnerId);
            string workflowData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);
            return WorkflowHelper.UpdateCurrentState(workflowData, currentState);
        }
    }
}
