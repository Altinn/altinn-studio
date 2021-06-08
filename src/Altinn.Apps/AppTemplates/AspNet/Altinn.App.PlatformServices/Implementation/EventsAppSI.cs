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
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Represents an implementation of <see cref="IEvents"/> that acts as a client for the platform Events component.
    /// </summary>
    public class EventsAppSI : IEvents
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly HttpClient _client;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly IAppResources _appResources;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">The platform settings.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="httpClient">A HttpClient.</param>
        /// <param name="accessTokenGenerator">The access token generator service.</param>
        /// <param name="appResources">The app resoure service.</param>
        /// <param name="settings">The application settings.</param>
        /// <param name="generalSettings">The general settings of the application.</param>
        public EventsAppSI(
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IAccessTokenGenerator accessTokenGenerator,
            IAppResources appResources,
            IOptionsMonitor<AppSettings> settings,
            IOptions<GeneralSettings> generalSettings)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            _generalSettings = generalSettings.Value;
            _accessTokenGenerator = accessTokenGenerator;
            _appResources = appResources;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiEventsEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
        }

        /// <inheritdoc/>
        public async Task<string> AddEvent(string eventType, Instance instance)
        {
            string alternativeSubject = null;
            if (!string.IsNullOrWhiteSpace(instance.InstanceOwner.OrganisationNumber))
            {
                alternativeSubject = $"/org/{instance.InstanceOwner.OrganisationNumber}";
            }

            if (!string.IsNullOrWhiteSpace(instance.InstanceOwner.PersonNumber))
            {
                alternativeSubject = $"/person/{instance.InstanceOwner.PersonNumber}";
            }

            CloudEvent cloudEvent = new CloudEvent
            {
                Subject = $"/party/{instance.InstanceOwner.PartyId}",
                Type = eventType,
                AlternativeSubject = alternativeSubject,
                Time = DateTime.UtcNow,
                SpecVersion = "1.0",
                Source = new Uri($"https://{instance.Org}.apps.{_generalSettings.HostName}/{instance.AppId}/instances/{instance.Id}")
            };

            string accessToken = _accessTokenGenerator.GenerateAccessToken(_appResources.GetApplication().Org, _appResources.GetApplication().Id.Split("/")[1]);

            string token =
                JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            string serializedCloudEvent = JsonSerializer.Serialize(cloudEvent);

            HttpResponseMessage response = await _client.PostAsync(
                token,
                "app",
                new StringContent(serializedCloudEvent, Encoding.UTF8, "application/json"),
                accessToken);

            if (response.IsSuccessStatusCode)
            {
                string eventId = await response.Content.ReadAsStringAsync();
                return eventId;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }
    }
}
