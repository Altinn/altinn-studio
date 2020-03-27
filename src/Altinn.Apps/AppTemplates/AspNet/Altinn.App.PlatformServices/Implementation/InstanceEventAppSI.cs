using System;
using System.Collections.Generic;
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
    /// App implementation of the instance events service, for saving to and retrieving from Platform Storage.
    /// </summary>
    public class InstanceEventAppSI : IInstanceEvent
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The Http client accessor </param>
        /// <param name="settings">The application settings.</param>
        public InstanceEventAppSI(
            ILogger<InstanceEventAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IHttpClientAccessor httpClientAccessor,
            IOptionsMonitor<AppSettings> settings)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _client = httpClientAccessor.StorageClient;
            _settings = settings.CurrentValue;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnerId, string org, string app)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";
            string apiUrl = $"instances/{instanceIdentifier}/events";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.DeleteAsync(apiUrl);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            throw await PlatformHttpException.CreateAsync(response);            
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnerId, string org, string app, string[] eventTypes, string from, string to)
        {
            string apiUrl = $"{instanceOwnerId}/{instanceId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            if (eventTypes != null)
            {
                StringBuilder bld = new StringBuilder();
                foreach (string type in eventTypes)
                {
                    bld.Append($"&eventTypes={type}");
                }

                apiUrl += bld.ToString();
            }

            if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
            {
                apiUrl += $"&from={from}&to={to}";
            }

            HttpResponseMessage response = await _client.GetAsync(apiUrl);

            if (response.IsSuccessStatusCode)
            {
                string eventData = await response.Content.ReadAsStringAsync();
                List<InstanceEvent> instanceEvents = JsonConvert.DeserializeObject<List<InstanceEvent>>(eventData);

                return instanceEvents;
            }

            throw await PlatformHttpException.CreateAsync(response);                              
        }

        /// <inheritdoc/>
        public async Task<string> SaveInstanceEvent(object dataToSerialize, string org, string app)
        {
            InstanceEvent instanceEvent = (InstanceEvent)dataToSerialize;
            instanceEvent.Created = DateTime.UtcNow;
            string apiUrl = $"instances/{instanceEvent.InstanceId}/events";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            
            HttpResponseMessage response = await _client.PostAsync(apiUrl, new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json"));

            if (response.IsSuccessStatusCode)
            {
                string eventData = await response.Content.ReadAsStringAsync();
                InstanceEvent result = JsonConvert.DeserializeObject<InstanceEvent>(eventData);
                return result.Id.ToString();
            }

            throw await PlatformHttpException.CreateAsync(response);
        }
    }
}
