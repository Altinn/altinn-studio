using System.Net.Http;
using System.Threading.Tasks;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// App implementation of the authentication service.
    /// </summary>
    public class AuthenticationAppSI : IAuthentication
    {
        private readonly ILogger _logger;
        private readonly PlatformSettings _platformSettings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;        
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public AuthenticationAppSI(
            ILogger<AuthenticationAppSI> logger,
            IOptions<GeneralSettings> generalSettings,
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,            
            IHttpClientAccessor httpClientAccessor)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _platformSettings = platformSettings.Value;
            _httpContextAccessor = httpContextAccessor;            
            _client = httpClientAccessor.AuthenticationClient;
        }

        /// <inheritdoc />
        public async Task<string> RefreshToken()
        {
            string endpointUrl = $"refresh";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, Constants.General.RuntimeCookieName);
            _logger.LogInformation($"Adding request header in api");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                _logger.LogInformation($"Refreshed token with status code ok");
                string refreshedToken = response.Content.ReadAsStringAsync().Result;
                refreshedToken = refreshedToken.Replace('"', ' ').Trim();
                _logger.LogInformation($"refreshedtoken");
                return refreshedToken;
            }

            _logger.LogError($"Refreshing JwtToken failed with status code {response.StatusCode}");
            return string.Empty;
        }

        private string GetCookieValueFromResponse(HttpResponseMessage response, string cookieName)
        {
            var value = string.Empty;
            _logger.LogInformation($"Getting cookie value from response");
            foreach (var header in response.Headers.GetValues("Set-Cookie"))
            {
                if (!header.Trim().StartsWith($"{cookieName}="))
                {
                    continue;
                }

                var p1 = header.IndexOf('=');
                var p2 = header.IndexOf(';');

                value = header.Substring(p1 + 1, p2 - p1 - 1);
            }

            _logger.LogInformation($"value empty: {string.IsNullOrEmpty(value)}");
            return value;
        }
    }
}
