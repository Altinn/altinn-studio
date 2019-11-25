using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the authentication service.
    /// </summary>
    public class AuthenticationAppSI : IAuthentication
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public AuthenticationAppSI(
            ILogger<AuthenticationAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IHttpClientAccessor httpClientAccessor)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _client = httpClientAccessor.AuthenticationClient;
        }

        /// <inheritdoc />
        public async Task<string> RefreshToken()
        {
            string endpointUrl = $"refresh";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, Constants.General.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string refreshedToken = response.Content.ReadAsStringAsync().Result;
                refreshedToken = refreshedToken.Replace('"', ' ').Trim();
                return refreshedToken;
            }

            _logger.LogError($"Refreshing JwtToken failed with status code {response.StatusCode}");
            return string.Empty;
        }
    }
}
