using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance for saving in disk
    /// </summary>
    public class InstanceStudioSI : IInstance
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string SaveInstanceMethod = "SaveInstanceToFile";
        private const string GetInstanceMethod = "GetInstanceFromFile";
        private const string GetFormInstancesApiMethod = "GetFormInstances";
        private const string ArchiveInstanceMethod = "ArchiveServiceModel";
        private readonly IForm _form;
        private readonly IData _data;
        private readonly IWorkflow _workflow;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceStudioSI"/> class.
        /// </summary>
        /// <param name="repositorySettings">repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="formService">form service</param>
        /// <param name="data">the data service</param>
        /// <param name="workflowSI">the workflow serviec</param>
        public InstanceStudioSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IForm formService,
            IData data,
            IWorkflow workflowSI)            
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _form = formService;
            _workflow = workflowSI;
            _data = data;
        }

        /// <summary>
        /// Generates a new service instanceID for a service.
        /// </summary>
        /// <returns>A new instanceId.</returns>
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            Guid instanceId = Guid.NewGuid();
            string applicationId = startServiceModel.Service;
            string applicationOwnerId = startServiceModel.Org;
            int instanceOwnerId = startServiceModel.ReporteeID;

            ServiceState currentState = _workflow.GetInitialServiceState(applicationOwnerId, applicationId, instanceOwnerId);

            Instance instance = new Instance
            {
                Id = instanceId.ToString(),
                InstanceOwnerId = instanceOwnerId.ToString(),
                ApplicationId = applicationId,
                CreatedBy = instanceOwnerId,
                CreatedDateTime = DateTime.UtcNow,
                CurrentWorkflowStep = currentState.State.ToString(),
            };         

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveInstanceMethod, applicationOwnerId, applicationId, developer, instanceOwnerId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);

                using (MemoryStream stream = new MemoryStream())
                {
                    var jsonData = JsonConvert.SerializeObject(instance);
                    StreamWriter writer = new StreamWriter(stream);
                    writer.Write(jsonData);
                    writer.Flush();
                    stream.Position = 0;

                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save instance");
                    }
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

            return instance;
        }

        /// <summary>
        /// Saves instance meta data
        /// </summary>
        public async Task<Instance> UpdateInstance(object dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveInstanceMethod, applicationOwnerId, applicationId, developer, instanceOwnerId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);

                using (MemoryStream stream = new MemoryStream())
                {
                    var jsonData = JsonConvert.SerializeObject(dataToSerialize);
                    StreamWriter writer = new StreamWriter(stream);
                    writer.Write(jsonData);
                    writer.Flush();
                    stream.Position = 0;

                    HttpResponseMessage response = await client.PostAsync(apiUrl, new StreamContent(stream));
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
            }

            return instance;            
        }

        /// <summary>
        /// Get instance
        /// </summary>
        /// <param name="applicationId">application id</param>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="instanceId">the instance id</param>
        /// <returns></returns>
        public async Task<Instance> GetInstance(string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetInstanceMethod, applicationOwnerId, applicationId, developer, instanceOwnerId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
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
        /// Get instance
        /// </summary>
        /// <param name="applicationId">application id</param>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <returns></returns>
        public async Task<List<Instance>> GetInstances(string applicationId, string applicationOwnerId, int instanceOwnerId)
        {
            List<Instance> instances;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetFormInstancesApiMethod, applicationOwnerId, applicationId, developer, instanceOwnerId)}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
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

        /// <inheritdoc/>
        public async Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string applicationId, string applicationOwnerId,  int instanceOwnerId, Guid instanceId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(ArchiveInstanceMethod, applicationOwnerId, applicationId, developer, instanceOwnerId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to archive service");
                    }
                }
            }

            Instance instance = GetInstance(applicationId, applicationOwnerId, instanceOwnerId, instanceId).Result;

            instance.IsCompleted = true;
            instance.CurrentWorkflowStep = WorkflowStep.Archived.ToString();

            instance = await UpdateInstance(instance, applicationId, applicationOwnerId, instanceOwnerId, instanceId);
            return instance;
        }
    }
}
