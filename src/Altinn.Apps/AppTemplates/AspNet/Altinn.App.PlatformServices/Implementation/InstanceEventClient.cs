using System;
using System.Collections.Generic;
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
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// A client for handling actions on instance events in Altinn Platform.
    /// </summary>
    public class InstanceEventClient : IInstanceEvent
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventClient"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="httpClient">The Http client</param>
        /// <param name="settings">The application settings.</param>
        public InstanceEventClient(
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IOptionsMonitor<AppSettings> settings)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
            _client = httpClient;
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnerPartyId, string org, string app, string[] eventTypes, string from, string to)
        {
            string apiUrl = $"{instanceOwnerPartyId}/{instanceId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

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

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

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

            HttpResponseMessage response = await _client.PostAsync(token, apiUrl, new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json"));

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
