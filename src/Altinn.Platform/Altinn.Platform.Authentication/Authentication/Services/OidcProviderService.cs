using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Oidc provider for exchanging authorization code in token
    /// </summary>
    public class OidcProviderService : IOidcProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="OidcProviderService"/> class.
        /// </summary>
        public OidcProviderService(HttpClient httpClient, ILogger<OidcProviderService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        /// <summary>
        /// Performs a AccessToken Request as described in https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
        /// </summary>
        public async Task<OidcCodeResponse> GetTokens(string authorizationCode, OidcProvider provider, string redirect_uri)
        {
            OidcCodeResponse codeResponse = null;
            Dictionary<string, string> kvps = new Dictionary<string, string>();
 
            // REQUIRED.  The authorization code received from the authorization server.
            kvps.Add("code", authorizationCode);

            // REQUIRED, if the "redirect_uri" parameter was included in the
            // authorization request as described in Section 4.1.1, and their values MUST be identical.
            kvps.Add("redirect_uri", redirect_uri);

            // REQUIRED.  Value MUST be set to "authorization_code".
            kvps.Add("grant_type", "authorization_code");

            // REQUIRED.  Value MUST be set to "client_id".
            kvps.Add("client_id", provider.ClientId);

            // Client secret. Set if configured
            if (!string.IsNullOrEmpty(provider.ClientSecret))
            {
                kvps.Add("client_secret", provider.ClientSecret);
            }

            FormUrlEncodedContent formUrlEncodedContent = new FormUrlEncodedContent(kvps);
            
            HttpResponseMessage response = await _httpClient.PostAsync(provider.TokenEndpoint, formUrlEncodedContent);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string content = await response.Content.ReadAsStringAsync();
                codeResponse = JsonSerializer.Deserialize<OidcCodeResponse>(content);
            }
            else
            {
                _logger.LogError($"Getting tokens from code failed with statuscode {response.StatusCode}");
            }

            return codeResponse;
        }
    }
}
