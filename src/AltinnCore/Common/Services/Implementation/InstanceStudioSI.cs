using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
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

        /// <inheritdoc/>
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            Guid instanceId = Guid.NewGuid();
            string applicationId = startServiceModel.Service;
            string applicationOwnerId = startServiceModel.Org;
            int instanceOwnerId = startServiceModel.ReporteeID;

            ServiceState currentState = _workflow.GetInitialServiceState(applicationOwnerId, applicationId);

            Instance instance = new Instance
            {
                Id = instanceId.ToString(),
                InstanceOwnerId = instanceOwnerId.ToString(),
                ApplicationId = applicationId,
                CreatedBy = instanceOwnerId.ToString(),
                CreatedDateTime = DateTime.UtcNow,
                CurrentWorkflowStep = currentState.State.ToString(),
                LastChangedDateTime = DateTime.UtcNow,
                LastChangedBy = instanceOwnerId.ToString(),
            };         

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}";
            string folderForInstance = Path.Combine(testDataForParty, instanceId.ToString());
            Directory.CreateDirectory(folderForInstance);
            string instanceFilePath = $"{testDataForParty}/{instanceId}/{instanceId}.json";

            File.WriteAllText(instanceFilePath, JsonConvert.SerializeObject(instance).ToString(), Encoding.UTF8);

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

        /// <inheritdoc/>
        public Task<Instance> UpdateInstance(object dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}";
            string folderForInstance = Path.Combine(testDataForParty, instanceId.ToString());
            if (!Directory.Exists(folderForInstance))
            {
                Directory.CreateDirectory(folderForInstance);
            }

            string instanceFilePath = $"{testDataForParty}/{instanceId}/{instanceId}.json";
            Instance instance = (Instance)dataToSerialize;
            File.WriteAllText(instanceFilePath, JsonConvert.SerializeObject(dataToSerialize).ToString(), Encoding.UTF8);

            return System.Threading.Tasks.Task.FromResult(instance);            
        }

        /// <inheritdoc/>
        public Task<Instance> GetInstance(string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer);
            string formDataFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceId}/{instanceId}.json";
            string instanceData = File.ReadAllText(formDataFilePath, Encoding.UTF8);
            instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            return System.Threading.Tasks.Task.FromResult(instance);
        }

        /// <inheritdoc/>
        public Task<List<Instance>> GetInstances(string applicationId, string applicationOwnerId, int instanceOwnerId)
        {
            List<Instance> formInstances = new List<Instance>();
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string instancesPath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}";
            string archiveFolderPath = $"{instancesPath}/Archive/";
            if (!Directory.Exists(archiveFolderPath))
            {
                Directory.CreateDirectory(archiveFolderPath);
            }

            string[] files = Directory.GetDirectories(instancesPath);
            foreach (string file in files)
            {
                string instanceFolderName = new DirectoryInfo(file).Name;
                if (instanceFolderName != "Archive")
                {
                    string instanceFileName = $"{instanceFolderName}.json";

                    string instanceData = File.ReadAllText($"{instancesPath}/{instanceFolderName}/{instanceFileName}");
                    Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                    formInstances.Add(instance);
                }
            }

            return System.Threading.Tasks.Task.FromResult(formInstances);
        }

        /// <inheritdoc/>
        public async Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string applicationId, string applicationOwnerId,  int instanceOwnerId, Guid instanceId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string archiveDirectory = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/Archive/";
            if (!Directory.Exists(archiveDirectory))
            {
                Directory.CreateDirectory(archiveDirectory);
            }

            string formDataFilePath = $"{archiveDirectory}{instanceId}.xml";
            using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
            {
                XmlSerializer serializer = new XmlSerializer(type);
                serializer.Serialize(stream, dataToSerialize);
            }
            
            Instance instance = await GetInstance(applicationId, applicationOwnerId, instanceOwnerId, instanceId);

            instance.IsCompleted = true;
            instance.CurrentWorkflowStep = WorkflowStep.Archived.ToString();

            instance = await UpdateInstance(instance, applicationId, applicationOwnerId, instanceOwnerId, instanceId);
            return instance;
        }
    }
}
