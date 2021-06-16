using System;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;

namespace Altinn.Platform.Authentication.Services
{
    /// <inheritdoc/>
    public class EnterpriseUserAuthenticationService : IEnterpriseUserAuthenticationService
    {
        /// <summary>
        /// Method for authenticating enterpriseuser at the SBLbridge
        /// </summary>
        /// <param name="credentials">Credentials of the enterpriseuser</param>
        /// <param name="bridgeApiEndpoint">SBLbridge-endpoint</param>
        public ConfiguredTaskAwaitable<HttpResponseMessage> GetResponseMessage(EnterpriseUserCredentials credentials, string bridgeApiEndpoint)
        {
            HttpClient client = new HttpClient();
            string credentialsJson = JsonSerializer.Serialize(credentials);

            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Post,
                RequestUri = new Uri(bridgeApiEndpoint),
                Content = new StringContent(credentialsJson.ToString(), Encoding.UTF8, "application/json")
            };

            return client.SendAsync(request).ConfigureAwait(false);
        }
    }
}
