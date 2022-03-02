using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Extensions;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Profile.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Client service for profile
    /// </summary>
    public class ProfileService : IProfile
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly HttpClient _client;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileService"/> class
        /// </summary>
        public ProfileService(
            IOptions<PlatformSettings> platformSettings,
            ILogger<ProfileService> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IAccessTokenGenerator accessTokenGenerator,
            IOptions<GeneralSettings> generalSettings)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiProfileEndpoint);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _accessTokenGenerator = accessTokenGenerator;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUserProfile(int userId)
        {
            UserProfile userProfile = null;

            string endpointUrl = $"users/{userId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _generalSettings.JwtCookieName);
            string accessToken = _accessTokenGenerator.GenerateAccessToken("platform", "events");

            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl, accessToken);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                userProfile = await response.Content.ReadAsAsync<UserProfile>();
            }
            else
            {
                _logger.LogError("Getting user profile with userId {userId} failed with statuscode {response.StatusCode}", userId, response.StatusCode);
            }

            return userProfile;
        }
    }
}
