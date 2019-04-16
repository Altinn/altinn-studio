using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Workflow;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance
    /// </summary>
    public class InstanceAppSI : IInstance
    {
        private const string SaveInstanceMethod = "SaveInstanceToFile";
        private const string GetInstanceMethod = "GetInstanceFromFile";
        private readonly IData _data;
        private readonly PlatformStorageSettings _platformStorageSettings;
        private readonly IWorkflow _workflow;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceAppSI"/> class.
        /// </summary>
        /// <param name="data">form service</param>
        public InstanceAppSI(IData data, IOptions<PlatformStorageSettings> platformStorageSettings, IWorkflow workflowSI)
        {
            _data = data;
            _platformStorageSettings = platformStorageSettings.Value;
            _workflow = workflowSI;
        }

        /// <summary>
        /// This method creates new instance in database
        /// </summary>
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            Guid instanceId;
            Instance instance = null;
            string applicationId = startServiceModel.Service;
            string applicationOwnerId = startServiceModel.Org;
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

            ServiceState currentState = _workflow.GetInitialServiceState(applicationOwnerId, applicationId, instanceOwnerId);

            //set initial workflow state
            instance.CurrentWorkflowStep = currentState.State.ToString();

            instance = await UpdateInstance(instance, applicationId, applicationOwnerId, instanceOwnerId, instanceId);

            return instance;
        }

        /// <summary>
        /// Gets the instance
        /// </summary>
        /// <param name="applicationId">the application id</param>
        /// <param name="applicationOwnerId">the application owner id</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="instanceId">the instance id</param>
        /// <returns></returns>
        public async Task<Instance> GetInstance(string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/api/v1/instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
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
                    throw new Exception("Unable to fetch instance");
                }

                return instance;
            }
        }

        /// <summary>
        /// Gets the instance
        /// </summary>
        /// <param name="applicationId">the application id</param>
        /// <param name="applicationOwnerId">the application owner id</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns></returns>
        public async Task<List<Instance>> GetInstances(string applicationId, string applicationOwnerId, int instanceOwnerId)
        {
            List<Instance> instances;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/query?instanceOwnerId={instanceOwnerId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                HttpResponseMessage response = await client.GetAsync(apiUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = await response.Content.ReadAsStringAsync();
                    instances = JsonConvert.DeserializeObject<List<Instance>>(instanceData);
                }
                else
                {
                    throw new Exception("Unable to fetch instance");
                }

                return instances;
            }
        }

        /// <summary>
        /// Gets the instance
        /// </summary>
        /// <param name="dataToSerialize">instance meta data</param>
        /// <param name="applicationId">the application id</param>
        /// <param name="applicationOwnerId">the application owner id</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="instanceId">the instance id</param>
        /// <returns></returns>
        public async Task<Instance> UpdateInstance<T>(T dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                using (MemoryStream stream = new MemoryStream())
                {
                    var jsonData = JsonConvert.SerializeObject(dataToSerialize);
                    StreamWriter writer = new StreamWriter(stream);
                    writer.Write(jsonData);
                    writer.Flush();
                    stream.Position = 0;
                    HttpResponseMessage response = await client.PutAsJsonAsync(apiUrl, dataToSerialize);
                    if (response.StatusCode == System.Net.HttpStatusCode.OK)
                    {
                        string instanceData = await response.Content.ReadAsStringAsync();
                        instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                    }
                    else
                    {
                        throw new Exception("Unable to update instance");
                    }
                }

                return instance;
            }
        }
    }
}
