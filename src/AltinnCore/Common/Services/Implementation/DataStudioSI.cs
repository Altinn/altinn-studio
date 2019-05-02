using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service implementation for integration test
    /// </summary>
    public class DataStudioSI : IData
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string FORM_ID = "default";

        /// <summary>
        /// Initializes a new instance of the <see cref="DataStudioSI"/> class.
        /// </summary>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public DataStudioSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IOptions<GeneralSettings> generalSettings,
            ILogger<DataStudioSI> logger)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _logger = logger;
        }

        /// <inheritdoc/>
        public Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer);
            string dataPath = $"{testDataForParty}{instanceOwnerId}/{instanceId}/data";
            if (!Directory.Exists(dataPath))
            {
                Directory.CreateDirectory(dataPath);
            }

            string instanceFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceId}/{instanceId}.json";
            string instanceData = File.ReadAllText(instanceFilePath);
            Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            string dataId = Guid.NewGuid().ToString();
            Data data = new Data
            {
                Id = dataId,
                FormId = FORM_ID,
                ContentType = "application/Xml",
                FileName = $"{dataId}.xml",
                StorageUrl = $"{applicationId}/{instanceId}/data/{dataId}",
                CreatedBy = instanceOwnerId.ToString(),
                CreatedDateTime = DateTime.UtcNow,
                LastChangedBy = instanceOwnerId.ToString(),
                LastChangedDateTime = DateTime.UtcNow,
            };

            instance.Data = new List<Data> { data };
            string instanceDataAsString = JsonConvert.SerializeObject(instance);
            File.WriteAllText(instanceFilePath, instanceDataAsString);

            string formDataFilePath = $"{dataPath}/{dataId}.xml";
            try
            {
                using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    serializer.Serialize(stream, dataToSerialize);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Unable to insert data into xml file: ", ex);
            }

            return Task.FromResult(instance);
        }

        /// <inheritdoc/>
        public void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string dataPath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/{instanceId}/data";
            string formDataFilePath = $"{dataPath}/{dataId}.xml";
            try
            {
                using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    serializer.Serialize(stream, dataToSerialize);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Unable to save form model", ex);
            }
        }

        /// <inheritdoc/>
        public object GetFormData(Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string testDataForParty = _settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string formDataFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceId}/data/{dataId}.xml";
            XmlSerializer serializer = new XmlSerializer(type);
            try
            {
                using (Stream stream = File.Open(formDataFilePath, FileMode.Open, FileAccess.Read))
                {
                    return serializer.Deserialize(stream);
                }
            }
            catch
            {
                return Activator.CreateInstance(type);
            }
        }

        /// <inheritdoc />
        public List<AttachmentList> GetFormAttachments(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string attachmentsPath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/{instanceId}/data/";
            DirectoryInfo rootDirectory = new DirectoryInfo(attachmentsPath);
            List<AttachmentList> allAttachments = new List<AttachmentList>();
            foreach (DirectoryInfo typeDirectory in rootDirectory.EnumerateDirectories())
            {
                List<Attachment> attachments = new List<Attachment>();
                foreach (DirectoryInfo fileDirectory in typeDirectory.EnumerateDirectories())
                {
                    foreach (FileInfo file in fileDirectory.EnumerateFiles())
                    {
                        attachments.Add(new Attachment { Name = file.Name, Id = fileDirectory.Name, Size = file.Length });
                    }
                }

                if (attachments.Count > 0)
                {
                    allAttachments.Add(new AttachmentList { Type = typeDirectory.Name, Attachments = attachments });
                }
            }

            return allAttachments;
        }

        /// <inheritdoc />
        public void DeleteFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string pathToDelete = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/{instanceId}/data/{attachmentType}/{attachmentId}";
            DirectoryInfo directory = new DirectoryInfo(pathToDelete);
            foreach (FileInfo file in directory.EnumerateFiles())
            {
                file.Delete();
            }

            directory.Delete();
        }

        /// <inheritdoc />
        public async Task<Guid> SaveFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentName, HttpRequest request)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Guid guid = Guid.NewGuid();
            string pathToSaveTo = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/{instanceId}/data/{attachmentType}/{guid}/";
            Directory.CreateDirectory(pathToSaveTo);
            string fileToWriteTo = $"{pathToSaveTo}/{attachmentName}";
            using (Stream streamToWriteTo = System.IO.File.Open(fileToWriteTo, FileMode.OpenOrCreate))
            {
                await request.StreamFile(streamToWriteTo);
                streamToWriteTo.Flush();
            }

            return guid;
        }
    }
}
