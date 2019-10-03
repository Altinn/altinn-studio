using System;
using System.Collections.Generic;
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
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Storage.Interface.Clients;
using Storage.Interface.Models;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// App implementation of the instance service.
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
            _client = httpClientAccessor.StorageClient;
        }

        /// <inheritdoc />
        [Obsolete("Method is deprecated, please use CreateInstance instead")]
        public async Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            Guid instanceId;
            Instance instance = null;
            string org = startServiceModel.Org;
            string app = startServiceModel.Service;
            int instanceOwnerId = startServiceModel.PartyId;

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId.ToString(),
                Process = new ProcessState()
                {
                    Started = DateTime.UtcNow,
                    CurrentTask = new ProcessElementInfo
                    {
                        Started = DateTime.UtcNow,
                        
                        ElementId = _workflow.GetInitialServiceState(org, app).State.ToString(),
                    }
                },
            };

            Instance createdInstance = await CreateInstance(org, app, instanceTemplate);

            if (createdInstance == null)
            {
                return null;
            }

            instanceId = Guid.Parse(createdInstance.Id.Split("/")[1]);
           
            // Save instantiated form model
            instance = await _data.InsertData(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                app,
                instanceOwnerId);

            instance = await UpdateInstance(instance, app, org, instanceOwnerId, instanceId);

            return instance;
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            Instance instance = new Instance();
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));

            string apiUrl = $"instances/{instanceIdentifier}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            }
            else
            {
                _logger.LogError($"Unable to fetch instance with instance id {instanceId}");
                throw new PlatformClientException(response);
            }

            return instance;
        }

        /// <inheritdoc />
        /// TODO - fix logic, what are you using this for? It will only get instances for a instance owners the way storage is implemented now
        public async Task<List<Instance>> GetInstances(string app, string org, int instanceOwnerId)
        {
            List<Instance> instances = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string appId = ApplicationHelper.GetFormattedApplicationId(org, app);
            string apiUrl = $"instances?instanceOwnerId={instanceOwnerId}&appId={appId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

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
                throw new PlatformClientException(response);
            }

            return instances;
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateInstance(object dataToSerialize, string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";
            Instance instance = new Instance();
            string apiUrl = $"instances/{instanceIdentifier}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

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
                throw new PlatformClientException(response);
            }

            return instance;
        }

        /// <inheritdoc/>
        public async Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string app, string org, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = GetInstance(app, org, instanceOwnerId, instanceId).Result;

            instance.Process.Ended = DateTime.UtcNow;
            instance.Process.CurrentTask = new ProcessElementInfo
            {
                ElementId = WorkflowStep.Archived.ToString(),
            };

            instance.InstanceState.IsArchived = true;
            instance.InstanceState.ArchivedDateTime = DateTime.UtcNow;

            instance = await UpdateInstance(instance, app, org, instanceOwnerId, instanceId);
            return instance;
        }

        /// <inheritdoc/>
        public async Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            string apiUrl = $"instances?appId={org}/{app}&instanceOwnerId={instanceTemplate.InstanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            StringContent content = instanceTemplate.AsJson();
            HttpResponseMessage response = await _client.PostAsync(apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                Instance createdInstance = await response.Content.ReadAsAsync<Instance>();

                return createdInstance;
            }

            _logger.LogError($"Unable to create instance {response.StatusCode} - {response.Content?.ReadAsStringAsync().Result}");
            throw new PlatformClientException(response);            
        }
    }
}
