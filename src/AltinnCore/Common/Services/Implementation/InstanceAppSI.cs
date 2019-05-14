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
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance
    /// </summary>
    public class InstanceAppSI : IInstance
    {
        private readonly IData _data;
        private readonly PlatformStorageSettings _platformStorageSettings;
        private readonly IWorkflow _workflow;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceAppSI"/> class.
        /// </summary>
        /// <param name="data">form service</param>
        /// <param name="platformStorageSettings">the platform storage settings</param>
        /// <param name="workflowSI">the workflow service</param>
        /// <param name="logger">the logger</param>
        public InstanceAppSI(IData data, IOptions<PlatformStorageSettings> platformStorageSettings, IWorkflow workflowSI, ILogger<InstanceAppSI> logger)
        {
            _data = data;
            _platformStorageSettings = platformStorageSettings.Value;
            _workflow = workflowSI;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            Guid instanceId;
            Instance instance = null;
            string applicationOwnerId = startServiceModel.Org;
            string applicationId = ApplicationHelper.GetFormattedApplicationId(applicationOwnerId, startServiceModel.Service);
            int instanceOwnerId = startServiceModel.ReporteeID;

            using (HttpClient client = new HttpClient())
            {
                string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}";
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                try
                {
                    HttpResponseMessage response = await client.PostAsync(apiUrl, null);
                    string id = await response.Content.ReadAsAsync<string>();
                    instanceId = Guid.Parse(id);
                }
                catch
                {
                    return instance;
                }                
            }
            
            // Save instantiated form model
            instance = await _data.InsertData(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                applicationOwnerId,
                applicationId,
                instanceOwnerId);

            ServiceState currentState = _workflow.GetInitialServiceState(applicationOwnerId, applicationId);

            // set initial workflow state
            instance.CurrentWorkflowStep = currentState.State.ToString();

            instance = await UpdateInstance(instance, applicationId, applicationOwnerId, instanceOwnerId, instanceId);

            return instance;
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = new Instance();
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                HttpResponseMessage response = await client.GetAsync(apiUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = await response.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
                else
                {
                    _logger.LogError($"Unable to fetch instance with instance id {instanceId}");
                }

                return instance;
            }
        }

        /// <inheritdoc />
        public async Task<List<Instance>> GetInstances(string applicationId, string applicationOwnerId, int instanceOwnerId)
        {
            List<Instance> instances = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            applicationId = ApplicationHelper.GetFormattedApplicationId(applicationOwnerId, applicationId);
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances?instanceOwnerId={instanceOwnerId}&applicationId={applicationId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                HttpResponseMessage response = await client.GetAsync(apiUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = await response.Content.ReadAsStringAsync();
                    instances = JsonConvert.DeserializeObject<List<Instance>>(instanceData);
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return instances;
                }
                else
                {
                    _logger.LogError("Unable to fetch instances");
                }

                return instances;
            }
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateInstance(object dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = new Instance();
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                string jsonData = JsonConvert.SerializeObject(dataToSerialize);
                StringContent httpContent = new StringContent(jsonData, Encoding.UTF8, "application/json");
                HttpResponseMessage response = await client.PutAsync(apiUrl, httpContent);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = await response.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
                else
                {
                    _logger.LogError($"Unable to update instance with instance id {instanceId}");
                }

                return instance;
            }
        }

        /// <inheritdoc/>
        public async Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = GetInstance(applicationId, applicationOwnerId, instanceOwnerId, instanceId).Result;

            instance.IsCompleted = true;
            instance.CurrentWorkflowStep = WorkflowStep.Archived.ToString();

            instance = await UpdateInstance(instance, applicationId, applicationOwnerId, instanceOwnerId, instanceId);
            return instance;
        }
    }
}
