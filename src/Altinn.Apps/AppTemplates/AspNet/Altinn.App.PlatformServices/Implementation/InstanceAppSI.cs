using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the instance service that talks to platform storage.
    /// </summary>
    public class InstanceAppSI : IInstance
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly HttpClient _client;
        private readonly AppSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="httpClient">A HttpClient that can be used to perform HTTP requests against the platform.</param>
        /// <param name="settings">The application settings.</param>
        public InstanceAppSI(
            IOptions<PlatformSettings> platformSettings,
            ILogger<InstanceAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IOptionsMonitor<AppSettings> settings)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceGuid)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";

            string apiUrl = $"instances/{instanceIdentifier}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }
            else
            {
                _logger.LogError($"Unable to fetch instance with instance id {instanceGuid}");
                throw await PlatformHttpException.CreateAsync(response);
            }
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(Instance instance)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            return await GetInstance(app, org, instanceOwnerId, instanceGuid);
        }

        /// <inheritdoc />
        public async Task<List<Instance>> GetInstances(Dictionary<string, StringValues> queryParams)
        {
            StringBuilder apiUrl = new ($"instances?");

            foreach (var queryParameter in queryParams)
            {
                foreach (string value in queryParameter.Value)
                {
                    apiUrl.Append($"&{queryParameter.Key}={queryParameter.Value}");
                }
            }

            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl.ToString());
            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(instanceData);

                return instances;
            }          
            else
            {
                _logger.LogError("Unable to fetch instances");
                throw await PlatformHttpException.CreateAsync(response);
            }
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateProcess(Instance instance)
        {
            ProcessState processState = instance.Process;

            string apiUrl = $"instances/{instance.Id}/process";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            string processStateString = JsonConvert.SerializeObject(processState);
            _logger.LogInformation($"update process state: {processStateString}");

            StringContent httpContent = new StringContent(processStateString, Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, httpContent);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(instanceData);

                return updatedInstance;
            }
            else
            {
                _logger.LogError($"Unable to update instance process with instance id {instance.Id}");
                throw await PlatformHttpException.CreateAsync(response);
            }
        }

        /// <inheritdoc/>
        public async Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            string apiUrl = $"instances?appId={org}/{app}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            StringContent content = new StringContent(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

                return createdInstance;
            }

            _logger.LogError($"Unable to create instance {response.StatusCode} - {await response.Content.ReadAsStringAsync()}");
            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc/>
        public async Task<Instance> AddCompleteConfirmation(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/complete";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.PostAsync(token, apiUrl, new StringContent(string.Empty));

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc/>
        public async Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/readstatus?status={readStatus}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, new StringContent(string.Empty));

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            _logger.LogError($"Could not update read status for instance {instanceOwnerPartyId}/{instanceGuid}. Request failed with status code {response.StatusCode}");
            return null;
        }

        /// <inheritdoc/>
        public async Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/substatus";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, new StringContent(JsonConvert.SerializeObject(substatus), Encoding.UTF8, "application/json"));

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<Instance> UpdatePresentationTexts(int instanceOwnerPartyId, Guid instanceGuid, PresentationTexts presentationTexts)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, new StringContent(JsonConvert.SerializeObject(presentationTexts), Encoding.UTF8, "application/json"));

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/datavalues";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, new StringContent(JsonConvert.SerializeObject(dataValues), Encoding.UTF8, "application/json"));

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<Instance> DeleteInstance(int instanceOwnerPartyId, Guid instanceGuid, bool hard)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}?hard={hard}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }
    }
}
