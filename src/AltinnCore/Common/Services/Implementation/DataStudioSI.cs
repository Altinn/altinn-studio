using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Studio implementation of the data handling service.
    /// </summary>
    public class DataStudioSI : IData
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string FORM_ID = "default";

        private static readonly Dictionary<Guid, object> InstanceGuard = new Dictionary<Guid, object>();
        private static object instanceGuardLock = new object();

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
        public Task<Instance> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, app, developer);
            string dataPath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/data";
            if (!Directory.Exists(dataPath))
            {
                Directory.CreateDirectory(dataPath);
            }

            string instanceFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/{instanceGuid}.json";

            string dataId = Guid.NewGuid().ToString();
            Instance instance = null;

            lock (Guard(instanceGuid))
            {
                string instanceData = File.ReadAllText(instanceFilePath);
                instance = JsonConvert.DeserializeObject<Instance>(instanceData);

                DataElement data = new DataElement
                {
                    Id = dataId,
                    ElementType = FORM_ID,
                    ContentType = "application/Xml",
                    FileName = $"{dataId}.xml",
                    StorageUrl = $"{app}/{instanceGuid}/data/{dataId}",
                    CreatedBy = instanceOwnerId.ToString(),
                    CreatedDateTime = DateTime.UtcNow,
                    LastChangedBy = instanceOwnerId.ToString(),
                    LastChangedDateTime = DateTime.UtcNow,
                };

                instance.Data = new List<DataElement> { data };
                string instanceDataAsString = JsonConvert.SerializeObject(instance);

                File.WriteAllText(instanceFilePath, instanceDataAsString);
            }

            string formDataFilePath = $"{dataPath}/{dataId}";
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

        private static object Guard(Guid instanceGuid)
        {
            object result;

            lock (instanceGuardLock)
            {
                if (!InstanceGuard.ContainsKey(instanceGuid))
                {
                    InstanceGuard.Add(instanceGuid, new object());
                }

                result = InstanceGuard[instanceGuid];
            }

            return result;
        }

        /// <inheritdoc/>
        public Task<Instance> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string dataPath = $"{_settings.GetTestdataForPartyPath(org, app, developer)}{instanceOwnerId}/{instanceGuid}/data";
            string formDataFilePath = $"{dataPath}/{dataId}";
            try
            {
                using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    serializer.Serialize(stream, dataToSerialize);
                }

                string testDataForParty = _settings.GetTestdataForPartyPath(org, app, developer);
                string instanceFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/{instanceGuid}.json";

                lock (Guard(instanceGuid))
                {
                    string instanceData = File.ReadAllText(instanceFilePath);

                    Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);

                    instance.Data.Where(d => d.Id == dataId.ToString()).ToList().ForEach(d =>
                    {
                        d.LastChangedBy = instanceOwnerId.ToString();
                        d.LastChangedDateTime = DateTime.UtcNow;
                    });

                    string instanceDataAsString = JsonConvert.SerializeObject(instance);

                    File.WriteAllText(instanceFilePath, instanceDataAsString);
                    return Task.FromResult(instance);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Unable to save form model", ex);
            }

            return Task.FromResult<Instance>(null);
        }

        /// <inheritdoc />
        public Task<Stream> GetBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string testDataForParty = _settings.GetTestdataForPartyPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string formDataFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/data/{dataId}";

            return Task.FromResult<Stream>(File.OpenRead(formDataFilePath));
        }

        /// <inheritdoc/>
        public object GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string testDataForParty = _settings.GetTestdataForPartyPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string formDataFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/data/{dataId}";
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

        /// <inheritdoc/>
        public Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            Instance instance;
            List<AttachmentList> attachmentList = new List<AttachmentList>();
            List<Attachment> attachments = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, app, developer);
            string formDataFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/{instanceGuid}.json";

            lock (Guard(instanceGuid))
            {
                string instanceData = File.ReadAllText(formDataFilePath, Encoding.UTF8);
                instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            }

            if (instance == null)
            {
                _logger.Log(LogLevel.Error, "Instance not found for instanceGuid {0}", instanceGuid);
                return Task.FromResult(attachmentList);
            }

            IEnumerable<DataElement> attachmentTypes = instance.Data.GroupBy(m => m.ElementType).Select(m => m.FirstOrDefault());

            foreach (DataElement attachmentType in attachmentTypes)
            {
                attachments = new List<Attachment>();
                foreach (DataElement data in instance.Data)
                {
                    if (data.ElementType != "default" && data.ElementType == attachmentType.ElementType)
                    {
                        attachments.Add(new Attachment
                        {
                            Id = data.Id,
                            Name = data.FileName,
                            Size = data.FileSize
                        });
                    }
                }

                if (attachments.Count > 0)
                {
                    attachmentList.Add(new AttachmentList { Type = attachmentType.ElementType, Attachments = attachments });
                }
            }

            return Task.FromResult(attachmentList);
        }

        /// <inheritdoc />
        public Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, app, developer);
            string instanceFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/{instanceGuid}.json";

            lock (Guard(instanceGuid))
            {
                string instanceData = File.ReadAllText(instanceFilePath);

                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                DataElement removeFile = instance.Data.Find(m => m.Id == dataGuid.ToString());

                instance.Data.Remove(removeFile);

                string instanceDataAsString = JsonConvert.SerializeObject(instance);
                File.WriteAllText(instanceFilePath, instanceDataAsString);
            }

            string pathToDelete = $"{_settings.GetTestdataForPartyPath(org, app, developer)}{instanceOwnerId}/{instanceGuid}/data/{dataGuid.ToString().AsFileName()}";
            File.Delete(pathToDelete);

            return Task.FromResult(true);
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string attachmentType, string attachmentName, HttpRequest request)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Guid dataId = Guid.NewGuid();
            long filesize;
            string pathToSaveTo = $"{_settings.GetTestdataForPartyPath(org, app, developer)}{instanceOwnerId}/{instanceGuid}/data";
            Directory.CreateDirectory(pathToSaveTo);
            string fileToWriteTo = $"{pathToSaveTo}/{dataId}";
            using (Stream streamToWriteTo = File.Open(fileToWriteTo, FileMode.OpenOrCreate))
            {
                await request.StreamFile(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
            }

            string testDataForParty = _settings.GetTestdataForPartyPath(org, app, developer);
            string instanceFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/{instanceGuid}.json";
            FileExtensionContentTypeProvider provider = new FileExtensionContentTypeProvider();
            provider.TryGetContentType(attachmentName, out string contentType);

            lock (Guard(instanceGuid))
            {
                string instanceData = File.ReadAllText(instanceFilePath);

                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);

                DataElement data = new DataElement
                {
                    Id = dataId.ToString(),
                    ElementType = attachmentType,
                    ContentType = contentType,
                    FileName = attachmentName,
                    StorageUrl = $"{app}/{instanceGuid}/data/{dataId}",
                    CreatedBy = instanceOwnerId.ToString(),
                    CreatedDateTime = DateTime.UtcNow,
                    LastChangedBy = instanceOwnerId.ToString(),
                    LastChangedDateTime = DateTime.UtcNow,
                    FileSize = filesize
                };

                if (instance.Data == null)
                {
                    instance.Data = new List<DataElement>();
                }

                instance.Data.Add(data);

                string instanceDataAsString = JsonConvert.SerializeObject(instance);

                File.WriteAllText(instanceFilePath, instanceDataAsString);
                return data;
            }
        }

        /// <inheritdoc />
        public async Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Guid dataId = Guid.NewGuid();
            long filesize;
            string pathToSaveTo = $"{_settings.GetTestdataForPartyPath(org, app, developer)}{instanceOwnerId}/{instanceGuid}/data";
            string fileToWriteTo = $"{pathToSaveTo}/{dataId}";

            try
            {
                if (!File.Exists(fileToWriteTo))
                {
                    throw new FileNotFoundException("Cannot find file to update.");
                }

                using (Stream streamToWriteTo = File.Open(fileToWriteTo, FileMode.Create, FileAccess.ReadWrite))
                {
                    await request.StreamFile(streamToWriteTo);
                    streamToWriteTo.Flush();
                    filesize = streamToWriteTo.Length;
                }

                string testDataForParty = _settings.GetTestdataForPartyPath(org, app, developer);
                string instanceFilePath = $"{testDataForParty}{instanceOwnerId}/{instanceGuid}/{instanceGuid}.json";

                lock (Guard(instanceGuid))
                {
                    string instanceData = File.ReadAllText(instanceFilePath);

                    Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);

                    instance.Data.Where(d => d.Id == dataGuid.ToString()).ToList().ForEach(d =>
                         {
                             d.LastChangedBy = instanceOwnerId.ToString();
                             d.LastChangedDateTime = DateTime.UtcNow;
                             d.FileSize = filesize;
                         });

                    string instanceDataAsString = JsonConvert.SerializeObject(instance);

                    File.WriteAllText(instanceFilePath, instanceDataAsString);

                    return instance.Data.First(d => d.Id == dataGuid.ToString());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Updating attachment {dataGuid} for instance {instanceGuid} failed. Exception message: {ex.Message}");
                return null;
            }
        }
    }
}
