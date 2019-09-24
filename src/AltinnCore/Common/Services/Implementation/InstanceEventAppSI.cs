using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// App implementation of the instance events service, for saving to and retrieving from Platform Storage.
    /// </summary>
    public class InstanceEventAppSI : IInstanceEvent
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The Http client accessor </param>
        public InstanceEventAppSI(
            IOptions<PlatformSettings> platformSettings,
            ILogger<InstanceEventAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.StorageClient;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnerId, string org, string app)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";
            string apiUrl = $"instances/{instanceIdentifier}/events";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            try
            {
                HttpResponseMessage response = await _client.DeleteAsync(apiUrl);
                response.EnsureSuccessStatusCode();
                return true;
            }
            catch
            {
                _logger.LogError($"Unable to delete instance events");
                return false;
            }
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnerId, string org, string app, string[] eventTypes, string from, string to)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";
            string apiUrl = $"{instanceOwnerId}/{instanceId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
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

            try
            {
                HttpResponseMessage response = await _client.GetAsync(apiUrl);
                string eventData = await response.Content.ReadAsStringAsync();
                List<InstanceEvent> instanceEvents = JsonConvert.DeserializeObject<List<InstanceEvent>>(eventData);

                return instanceEvents;
            }
            catch (Exception)
            {
                _logger.LogError($"Unable to retrieve instance event");
                return null;
            }
        }

        /// <inheritdoc/>
        public async Task<string> SaveInstanceEvent(object dataToSerialize, string org, string app)
        {
            InstanceEvent instanceEvent = (InstanceEvent)dataToSerialize;
            instanceEvent.CreatedDateTime = DateTime.UtcNow;
            string apiUrl = $"instances/{instanceEvent.InstanceId}/events";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            try
            {
                HttpResponseMessage response = await _client.PostAsync(apiUrl, new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json"));
                string eventData = await response.Content.ReadAsStringAsync();
                InstanceEvent result = JsonConvert.DeserializeObject<InstanceEvent>(eventData);
                return result.Id.ToString();
            }
            catch
            {
                _logger.LogError($"Unable to store instance event");
                return null;
            }
        }
    }
}
