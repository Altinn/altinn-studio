using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;

using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// App implementation of the instance events service, for saving to and retrieving from Platform Storage.
    /// </summary>
    public class EventsAppSI : IEvents
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="httpClient">The Http client accessor </param>
        /// <param name="settings">The application settings.</param>
        public EventsAppSI(
            IOptions<PlatformSettings> platformSettings,
            ILogger<EventsAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IOptionsMonitor<AppSettings> settings)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiEventsEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
        }

        /// <inheritdoc/>
        public async Task<string> AddEvent(CloudEvent cloudEvent)
        {
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            string serializedCloudEvent = JsonSerializer.Serialize(cloudEvent);

            HttpResponseMessage response = await _client.PostAsync(
                token,
                "events",
                new StringContent(serializedCloudEvent, Encoding.UTF8, "application/json"));

            if (response.IsSuccessStatusCode)
            {
                string eventId = await response.Content.ReadAsStringAsync();
                return eventId;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }
    }
}
