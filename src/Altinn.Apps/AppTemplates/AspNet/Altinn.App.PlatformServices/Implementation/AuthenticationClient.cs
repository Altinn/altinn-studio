using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;

using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// A client for authentication actions in Altinn Platform.
    /// </summary>
    public class AuthenticationClient : IAuthentication
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationClient"/> class
        /// </summary>
        /// <param name="platformSettings">The current platform settings.</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="httpClient">A HttpClient provided by the HttpClientFactory.</param>
        public AuthenticationClient(
            IOptions<PlatformSettings> platformSettings,
            ILogger<AuthenticationClient> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiAuthenticationEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<string> RefreshToken()
        {
            string endpointUrl = $"refresh";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, Constants.General.RuntimeCookieName);
            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string refreshedToken = await response.Content.ReadAsStringAsync();
                refreshedToken = refreshedToken.Replace('"', ' ').Trim();
                return refreshedToken;
            }

            _logger.LogError($"Refreshing JwtToken failed with status code {response.StatusCode}");
            return string.Empty;
        }
    }
}
