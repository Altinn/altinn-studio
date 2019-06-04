using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
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
        private readonly PlatformSettings _platformSettings;
        private readonly IWorkflow _workflow;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceAppSI"/> class.
        /// </summary>
        /// <param name="data">form service</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="workflowSI">the workflow service</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The Http client accessor </param>
        public InstanceAppSI(
            IData data,
            IOptions<PlatformSettings> platformSettings,
            IWorkflow workflowSI,
            ILogger<InstanceAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _data = data;
            _platformSettings = platformSettings.Value;
            _workflow = workflowSI;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.Client;
        }

        /// <inheritdoc />
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            Guid instanceId;
            Instance instance = null;
            string applicationOwnerId = startServiceModel.Org;
            string applicationId = ApplicationHelper.GetFormattedApplicationId(applicationOwnerId, startServiceModel.Service);
            int instanceOwnerId = startServiceModel.ReporteeID;

            string apiUrl = $"instances/?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            _client.DefaultRequestHeaders.Accept.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            try
            {
                HttpResponseMessage response = await _client.PostAsync(apiUrl, null);
                string id = await response.Content.ReadAsAsync<string>();
                instanceId = Guid.Parse(id);
            }
            catch
            {
                return instance;
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
            string apiUrl = $"instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            _client.DefaultRequestHeaders.Accept.Clear();

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
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

        /// <inheritdoc />
        public async Task<List<Instance>> GetInstances(string applicationId, string applicationOwnerId, int instanceOwnerId)
        {
            List<Instance> instances = null;
            applicationId = ApplicationHelper.GetFormattedApplicationId(applicationOwnerId, applicationId);
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances?instanceOwnerId={instanceOwnerId}&applicationId={applicationId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            _client.DefaultRequestHeaders.Accept.Clear();

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
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

        /// <inheritdoc />
        public async Task<Instance> UpdateInstance(object dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = new Instance();
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            _client.DefaultRequestHeaders.Accept.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            string jsonData = JsonConvert.SerializeObject(dataToSerialize);
            StringContent httpContent = new StringContent(jsonData, Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PutAsync(apiUrl, httpContent);
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
