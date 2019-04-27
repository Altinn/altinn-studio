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
        private readonly IExecution _execution;
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
        /// <param name="executionSI">The executionSI</param>
        public DataStudioSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IOptions<GeneralSettings> generalSettings,
            ILogger<DataStudioSI> logger,
            IExecution executionSI)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _logger = logger;
            _execution = executionSI;
        }

        /// <summary>
        /// This method serialized the form data and store it in test data folder based on serviceId and partyId
        /// </summary>
        /// <typeparam name="T">The input type</typeparam>
        /// <param name="dataToSerialize">The data to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        public Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string org, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, service, developer);
            string dataPath = $"{testDataForParty}{partyId}/{instanceId}/data";
            if (!Directory.Exists(dataPath))
            {
                Directory.CreateDirectory(dataPath);
            }

            string instanceFilePath = $"{testDataForParty}{partyId}/{instanceId}/{instanceId}.json";
            FileStream instanceData = _execution.GetFileStream(instanceFilePath);
            StreamReader reader = new StreamReader(instanceData);
            Instance instance = JsonConvert.DeserializeObject<Instance>(reader.ReadToEnd());
            instanceData.Close();

            string dataId = Guid.NewGuid().ToString();
            Data data = new Data
            {
                Id = dataId,
                FormId = FORM_ID,
                ContentType = "application/Xml",
                FileName = $"{dataId}.xml",
                StorageUrl = $"{service}/{instanceId}/data/{dataId}",
                CreatedBy = partyId.ToString(),
                CreatedDateTime = DateTime.UtcNow,
                LastChangedBy = partyId.ToString(),
                LastChangedDateTime = DateTime.UtcNow,
            };

            instance.Data = new List<Data>();
            instance.Data.Add(data);
            using (MemoryStream memoryStream = new MemoryStream())
            {
                var jsonData = JsonConvert.SerializeObject(instance);
                StreamWriter writer = new StreamWriter(memoryStream);
                writer.Write(jsonData);
                writer.Flush();
                memoryStream.Position = 0;
                using (Stream stream = File.Open(instanceFilePath, FileMode.Create, FileAccess.ReadWrite))
                {
                    memoryStream.CopyTo(stream);
                }
            }

            string formDataFilePath = $"{dataPath}/{dataId}.xml";
            using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
            {
                XmlSerializer serializer = new XmlSerializer(type);
                serializer.Serialize(stream, dataToSerialize);
            }

            return Task.FromResult(instance);
        }

        /// <summary>
        /// This method serialized the form model and store it in test data folder based on serviceId and partyId
        /// </summary>
        /// <typeparam name="T">The input type</typeparam>
        /// <param name="dataToSerialize">The data to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="dataId">the data id</param>
        public void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string org, string service, int partyId, Guid dataId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string dataPath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/data";
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

        /// <summary>
        /// Gets form data from disk
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="type">The type that form data will be serialized to</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId used to find the party on disc</param>
        /// <param name="dataId">The data id</param>
        /// <returns>The deserialized form model</returns>
        public object GetFormData(Guid instanceId, Type type, string org, string service, int partyId, Guid dataId)
        {
            string testDataForParty = _settings.GetTestdataForPartyPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string formDataFilePath = $"{testDataForParty}{partyId}/{instanceId}/data/{dataId}.xml";
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
    }
}
