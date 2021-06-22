using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Services
{
    /// <inheritdoc/>
    public class EnterpriseUserAuthenticationService : IEnterpriseUserAuthenticationService
    {
        private readonly GeneralSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initialize a new instance of <see cref="EnterpriseUserAuthenticationService"/> with settings for SBL Bridge endpoints.
        /// </summary>
        /// <param name="httpClient">Httpclient from httpclientfactory</param>
        /// <param name="settings">General settings for the authentication application</param>
        public EnterpriseUserAuthenticationService(HttpClient httpClient, IOptions<GeneralSettings> settings)
        {
            _client = httpClient;
            _settings = settings.Value;
        }

        /// <summary>
        /// Method for authenticating enterpriseuser at the SBLbridge
        /// </summary>
        /// <param name="credentials">Credentials of the enterpriseuser</param>
        public async Task<HttpResponseMessage> AuthenticateEnterpriseUser(EnterpriseUserCredentials credentials)
        {
            string credentialsJson = JsonSerializer.Serialize(credentials);
            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Post,
                RequestUri = new Uri(_settings.BridgeAuthnApiEndpoint + "enterpriseuser"),
                Content = new StringContent(credentialsJson.ToString(), Encoding.UTF8, "application/json")
            };

            return await _client.SendAsync(request).ConfigureAwait(false);
        }
    }
}
