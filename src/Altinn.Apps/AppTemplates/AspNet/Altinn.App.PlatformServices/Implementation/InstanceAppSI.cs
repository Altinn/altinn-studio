using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The Http client accessor </param>
        /// <param name="settings">The application settings.</param>
        public InstanceAppSI(
            ILogger<InstanceAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IHttpClientAccessor httpClientAccessor,
            IOptionsMonitor<AppSettings> settings)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            _client = httpClientAccessor.StorageClient;
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceGuid)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";

            string apiUrl = $"instances/{instanceIdentifier}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }
            else
            {
                _logger.LogError($"Unable to fetch instance with instance id {instanceGuid}");
                throw new PlatformHttpException(response);
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
        /// Get instances of an instance owner.
        public async Task<List<Instance>> GetInstances(int instanceOwnerPartyId)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(instanceData);

                return instances;
            }
            else if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }
            else
            {
                _logger.LogError("Unable to fetch instances");
                throw new PlatformHttpException(response);
            }
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateInstance(Instance instance)
        {
            string apiUrl = $"instances/{instance.Id}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            StringContent httpContent = new StringContent(instance.ToString(), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PutAsync(apiUrl, httpContent);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(instanceData);

                return updatedInstance;
            }

            _logger.LogError($"Unable to update instance with instance id {instance.Id}");
            throw new PlatformHttpException(response);
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateProcess(Instance instance)
        {
            ProcessState processState = instance.Process;

            string apiUrl = $"instances/{instance.Id}/process";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            string processStateString = JsonConvert.SerializeObject(processState);
            _logger.LogInformation($"update process state: {processStateString}");

            StringContent httpContent = new StringContent(processStateString, Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PutAsync(apiUrl, httpContent);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(instanceData);

                return updatedInstance;
            }
            else
            {
                _logger.LogError($"Unable to update instance process with instance id {instance.Id}");
                throw new PlatformHttpException(response);
            }
        }

        /// <inheritdoc/>
        public async Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            string apiUrl = $"instances?appId={org}/{app}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            StringContent content = new StringContent(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PostAsync(apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

                return createdInstance;
            }

            _logger.LogError($"Unable to create instance {response.StatusCode} - {await response.Content?.ReadAsStringAsync()}");
            throw new PlatformHttpException(response);
        }
    }
}
