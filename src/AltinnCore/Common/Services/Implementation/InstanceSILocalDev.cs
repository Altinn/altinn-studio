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
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance for saving in disk
    /// </summary>
    public class InstanceSILocalDev : IInstanceLocalDev
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string SaveInstanceMethod = "SaveInstanceToFile";
        private const string GetInstanceMethod = "GetInstanceFromFile";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceSILocalDev"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        public InstanceSILocalDev(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IOptions<TestdataRepositorySettings> testdataRepositorySettings)            
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            this._testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <summary>
        /// Generates a new service instanceID for a service.
        /// </summary>
        /// <returns>A new instanceId.</returns>
        public Guid InstantiateInstance(string applicationId, string applicationOwnerId, int instanceOwnerId)
        {
            Guid instanceId = Guid.NewGuid();
            Instance instance = new Instance
            {
                Id = instanceId.ToString(),
                InstanceOwnerId = instanceOwnerId.ToString(),
                ApplicationId = "S1234",
                CreatedBy = Convert.ToInt32(instanceOwnerId),
                CreatedDateTime = DateTime.UtcNow,
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

                    //var httpcontent = new StringContent(jsonData, Encoding.UTF8, "application/json");

                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save instance");
                    }
                }
            }

            return instanceId;
        }

        /// <summary>
        ///Saves instance meta data
        /// </summary>
        public void SaveInstance<T>(T dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
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

                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to update instance");
                    }
                }
            }
        }

        /// <summary>
        /// Get instance
        /// </summary>
        /// <param name="applicationId">application id</param>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <param name="instanceOwnerId">instance owner id</param>
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
    }
}
