using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace AltinnCore.Designer.TypedHttpClients.AltinnAuthentication
{
    /// <summary>
    /// AltinnAuthenticationClient
    /// </summary>
    public class AltinnAuthenticationClient : IAltinnAuthenticationClient
    {
        private readonly HttpClient _httpClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        public AltinnAuthenticationClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<string> ConvertTokenAsync(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the endpoint is built up in that way
             */
            HttpRequestMessage message = new HttpRequestMessage
            {
                RequestUri = new Uri($"{_httpClient.BaseAddress}convert") // TODO Move 'convert' out to config
            };
            HttpResponseMessage response = await _httpClient.SendAsync(message);
            return await response.Content.ReadAsStringAsync();
        }
    }
}
