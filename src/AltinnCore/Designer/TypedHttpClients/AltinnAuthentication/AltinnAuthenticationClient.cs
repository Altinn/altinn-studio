using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.TypedHttpClients.AltinnAuthentication
{
    /// <summary>
    /// AltinnAuthenticationClient
    /// </summary>
    public class AltinnAuthenticationClient : IAltinnAuthenticationClient
    {
        private readonly HttpClient _httpClient;
        private readonly PlatformSettings _platformSettings;
        private const string SubscriptionKeyHeaderName = "Ocp-Apim-Subscription-Key";
        private readonly ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        /// <param name="options">Platform Settings</param>
        /// <param name="logger">The logger.</param>
        public AltinnAuthenticationClient(
            HttpClient httpClient,
            IOptionsMonitor<PlatformSettings> options,
            ILogger<AltinnAuthenticationClient> logger)
        {
            _httpClient = httpClient;
            _platformSettings = options.CurrentValue;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> ConvertTokenAsync(string token, Uri uri)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            _logger.LogInformation($"//AltinnAuthenticationClient // ConvertTokenAsync // Checking if environment is tt02");

            if (uri.Host.Contains("tt02", StringComparison.InvariantCultureIgnoreCase))
            {
                _logger.LogInformation($"//AltinnAuthenticationClient // ConvertTokenAsync // Env matched tt02. Setting subscription key in header.");
                _httpClient.DefaultRequestHeaders.Add(SubscriptionKeyHeaderName, _platformSettings.SubscriptionKeyTT02);
            }

            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the endpoint is built up in that way
             */
            HttpRequestMessage message = new HttpRequestMessage
            {
                RequestUri = new Uri($"{uri.Scheme}://{uri.Host}/{_platformSettings.ApiAuthenticationConvertUri}")
            };

            HttpResponseMessage response = await _httpClient.SendAsync(message);

            _logger.LogInformation($"//AltinnAuthenticationClient // ConvertTokenAsync // Response: {response}");
            return await response.Content.ReadAsAsync<string>();
        }
    }
}
