using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.TypedHttpClients.AltinnAuthentication
{
    /// <summary>
    /// AltinnAuthenticationService
    /// </summary>
    public class AltinnAuthenticationService : IAltinnAuthenticationService
    {
        private readonly HttpClient _httpClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        public AltinnAuthenticationService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<string> ConvertTokenAsync(string token)
        {
            return await SendToken(token, "refresh");
        }

        private async Task<string> SendToken(string token, string requestUri)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage message = new HttpRequestMessage
            {
                RequestUri = new Uri(requestUri)
            };
            HttpResponseMessage response = await _httpClient.SendAsync(message);
            return await response.Content.ReadAsStringAsync();
        }
    }
}
