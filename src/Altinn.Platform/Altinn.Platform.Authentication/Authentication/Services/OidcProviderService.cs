using System.Collections.Generic;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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

        /// <inheritdoc/>
        public async Task<OidcCodeResponse> GetTokens(string authorizationCode, OidcProvider provider)
        {
            OidcCodeResponse codeResponse = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(OidcCodeResponse));
            List<KeyValuePair<string, string>> kvps = new List<KeyValuePair<string, string>>();
            KeyValuePair<string, string> kvp = new KeyValuePair<string, string>("code", authorizationCode);
            kvps.Add(kvp);
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
