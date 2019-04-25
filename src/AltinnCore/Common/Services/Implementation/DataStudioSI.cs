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
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string GetFormModelApiMethod = "GetFormModel";
        private const string SaveFormModelApiMethod = "SaveFormModel";        

        /// <summary>
        /// Initializes a new instance of the <see cref="DataStudioSI"/> class.
        /// </summary>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="generalSettings">the general settings</param>
        public DataStudioSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IOptions<GeneralSettings> generalSettings)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
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
        public async Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string org, string service, int partyId)
        {
            Instance instance;
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveFormModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";

            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    HttpResponseMessage response = await client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }

                    string instanceData = await response.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
            }

            return instance;
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
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveFormModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            if (dataId != Guid.Empty)
            {
                apiUrl = $"{apiUrl}&dataId={dataId}";
            }

            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    Task<HttpResponseMessage> response = client.PutAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }
                }
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
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetFormModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}&dataId={dataId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.IsSuccessStatusCode)
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    try
                    {
                        using (Stream stream = response.Result.Content.ReadAsStreamAsync().Result)
                        {
                            return serializer.Deserialize(stream);
                        }
                    }
                    catch
                    {
                        return Activator.CreateInstance(type);
                    }
                }
                else
                {
                    return Activator.CreateInstance(type);
                }
            }
        }
    }
}
