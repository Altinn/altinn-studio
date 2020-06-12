using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Receipt.Clients;
using Altinn.Platform.Receipt.Configuration;
using Altinn.Platform.Receipt.Extensions;
using Altinn.Platform.Receipt.Helpers;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Wrapper for Altinn Platform Profile services
    /// </summary>
    public class ProfileWrapper : IProfile
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _contextaccessor;
        private readonly PlatformSettings _platformSettings;
        private readonly IAccessTokenGenerator _accessTokenGenerator;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileWrapper"/> class
        /// </summary>
        public ProfileWrapper(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, IOptions<PlatformSettings> platformSettings, IAccessTokenGenerator accessTokenGenerator)
        {
            _platformSettings = platformSettings.Value;
            httpClient.BaseAddress = new Uri(_platformSettings.ApiProfileEndpoint);
            httpClient.DefaultRequestHeaders.Add(_platformSettings.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _contextaccessor = httpContextAccessor;
            _accessTokenGenerator = accessTokenGenerator;
        }

        /// <inheritdoc/>
        public async Task<UserProfile> GetUser(int userId)
        {
            string token = JwtTokenUtil.GetTokenFromContext(_contextaccessor.HttpContext, "AltinnStudioRuntime");
            string url = $"users/{userId}";

            HttpResponseMessage response = await _client.GetAsync(token, url, _accessTokenGenerator.GenerateAccessToken("platform", "receipt"));

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                UserProfile profile = await response.Content.ReadAsAsync<UserProfile>();
                return profile;
            }

            throw new PlatformHttpException(response, string.Empty);
        }
    }
}
