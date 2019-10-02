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
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public AuthenticationAppSI(
            ILogger<AuthenticationAppSI> logger,
            IOptions<GeneralSettings> generalSettings,
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _platformSettings = platformSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.AuthenticationClient;
        }

        /// <inheritdoc />
        public async Task<HttpResponseMessage> RefreshToken()
        {
            string endpointUrl = $"refresh";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            _logger.LogInformation($"Token from token utility{token}");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string refreshedToken = GetCookieValueFromResponse(response, Constants.General.RuntimeCookieName);
                HttpResponseMessage result = new HttpResponseMessage(response.StatusCode);
                result.Content = new StringContent(refreshedToken);
                return result;
            }

            _logger.LogError($"Refreshing JwtToken failed with status code {response.StatusCode}");
            return new HttpResponseMessage(response.StatusCode);
        }

        private string GetCookieValueFromResponse(HttpResponseMessage response, string cookieName)
        {
            var value = string.Empty;

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

            return value;
        }
    }
}
