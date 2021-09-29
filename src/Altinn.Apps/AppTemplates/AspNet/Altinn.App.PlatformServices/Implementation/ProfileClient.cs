using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Profile.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// A client for retrieving profiles from Altinn Platform.
    /// </summary>
    public class ProfileClient : IProfile
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;
        private readonly IAppResources _appResources;
        private readonly IAccessTokenGenerator _accessTokenGenerator;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileClient"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The application settings.</param>
        /// <param name="httpClient">A HttpClient provided by the HttpClientFactory.</param>
        /// <param name="appResources">An instance of the AppResources service.</param>
        /// <param name="accessTokenGenerator">An instance of the AccessTokenGenerator service.</param>
        public ProfileClient(
            IOptions<PlatformSettings> platformSettings,
            ILogger<ProfileClient> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            HttpClient httpClient,
            IAppResources appResources,
            IAccessTokenGenerator accessTokenGenerator)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiProfileEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _appResources = appResources;
            _accessTokenGenerator = accessTokenGenerator;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUserProfile(int userId)
        {
            UserProfile userProfile = null;

            string endpointUrl = $"users/{userId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl, _accessTokenGenerator.GenerateAccessToken(_appResources.GetApplication().Org, _appResources.GetApplication().Id.Split("/")[1]));
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                userProfile = await response.Content.ReadAsAsync<UserProfile>();
            }
            else
            {
                _logger.LogError($"Getting user profile with userId {userId} failed with statuscode {response.StatusCode}");
            }

            return userProfile;
        }
    }
}
