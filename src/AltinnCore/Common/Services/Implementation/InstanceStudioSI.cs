using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Storage.Interface.Models;
using Task = System.Threading.Tasks.Task;

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
        [Obsolete("Method is deprecated, please use CreateInstance instead")]
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            string appName = startServiceModel.Service;
            string org = startServiceModel.Org;
            int instanceOwnerId = startServiceModel.PartyId;

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.ToString(),
                Process = new ProcessState()
                {
                    CurrentTask = _workflow.GetInitialServiceState(org, appName).State.ToString(),
                    IsComplete = false,
                },
            };

            Instance instance = await CreateInstance(org, appName, instanceTemplate);

            if (instance == null)
            {
                return null;
            }

            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            // Save instantiated form model
            instance = await _data.InsertData(
                serviceModel,
                instanceGuid,
                serviceImplementation.GetServiceModelType(),
                org,
                appName,
                instanceOwnerId);

            return instance;
        }

        /// <inheritdoc/>
        public Task<Instance> UpdateInstance(object dataToSerialize, string appName, string org, int instanceOwnerId, Guid instanceId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = $"{_settings.GetTestdataForPartyPath(org, appName, developer)}{instanceOwnerId}";
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
        public Task<Instance> GetInstance(string appName, string org, int instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, appName, developer);
            string formDataFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceId}/{instanceId}.json";
            string instanceData = File.ReadAllText(formDataFilePath, Encoding.UTF8);
            instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            return System.Threading.Tasks.Task.FromResult(instance);
        }

        /// <inheritdoc/>
        public Task<List<Instance>> GetInstances(string appName, string org, int instanceOwnerId)
        {
            List<Instance> formInstances = new List<Instance>();
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string instancesPath = $"{_settings.GetTestdataForPartyPath(org, appName, developer)}{instanceOwnerId}";
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
                    try
                    {
                        string instanceFileName = $"{instanceFolderName}.json";

                        string instanceData = File.ReadAllText($"{instancesPath}/{instanceFolderName}/{instanceFileName}");
                        Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                        formInstances.Add(instance);
                    }
                    catch
                    {
                        /* Avoid problems with wrong directories that may have occured in previous testing sessions */
                    }
                }
            }

            return System.Threading.Tasks.Task.FromResult(formInstances);
        }

        /// <inheritdoc/>
        public async Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string appName, string org, int instanceOwnerId, Guid instanceId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string archiveDirectory = $"{_settings.GetTestdataForPartyPath(org, appName, developer)}{instanceOwnerId}/Archive/";
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

            Instance instance = await GetInstance(appName, org, instanceOwnerId, instanceId);

            instance.Process = instance.Process ?? new Storage.Interface.Models.ProcessState();
            instance.Process.IsComplete = true;
            instance.Process.CurrentTask = WorkflowStep.Archived.ToString();

            instance.InstanceState = instance.InstanceState ?? new Storage.Interface.Models.InstanceState();
            instance.InstanceState.IsArchived = true;
            instance.InstanceState.ArchivedDateTime = DateTime.UtcNow;

            instance = await UpdateInstance(instance, appName, org, instanceOwnerId, instanceId);
            return instance;
        }

        /// <inheritdoc/>
        public async Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            Guid instanceGuid = Guid.NewGuid();

            string userId = AuthenticationHelper.GetUserId(_httpContextAccessor.HttpContext).ToString();
            string instanceOwnerId = instanceTemplate.InstanceOwnerId;

            Instance instance = new Instance
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = instanceOwnerId.ToString(),
                AppId = $"{org}/{app}",
                Org = org,
                CreatedBy = userId,
                CreatedDateTime = DateTime.UtcNow,
                Process = instanceTemplate.Process,
                InstanceState = new Storage.Interface.Models.InstanceState()
                {
                    IsArchived = false,
                    IsDeleted = false,
                    IsMarkedForHardDelete = false,
                },
                LastChangedDateTime = DateTime.UtcNow,
                LastChangedBy = userId,
            };

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = $"{_settings.GetTestdataForPartyPath(org, app, developer)}{instanceOwnerId}";
            string folderForInstance = Path.Combine(testDataForParty, instanceGuid.ToString());

            await Task.Run(() =>
            {
                Directory.CreateDirectory(folderForInstance);
                string instanceFilePath = $"{testDataForParty}/{instanceGuid}/{instanceGuid}.json";

                File.WriteAllText(instanceFilePath, JsonConvert.SerializeObject(instance).ToString(), Encoding.UTF8);
            });

            return instance;
        }
    }
}
