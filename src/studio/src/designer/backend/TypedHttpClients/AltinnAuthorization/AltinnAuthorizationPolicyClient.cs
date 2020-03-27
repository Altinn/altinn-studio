using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization
{
    /// <summary>
    /// AltinnAuthorizationPolicyClient
    /// </summary>
    public class AltinnAuthorizationPolicyClient : IAltinnAuthorizationPolicyClient
    {
        private readonly HttpClient _httpClient;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        /// <param name="options">OptionsMonitor of type PlatformSettings</param>
        public AltinnAuthorizationPolicyClient(
            HttpClient httpClient,
            IOptionsMonitor<PlatformSettings> options)
        {
            _httpClient = httpClient;
            _platformSettings = options.CurrentValue;
        }

        /// <inheritdoc />
        public async Task SavePolicy(string org, string app, string policyFile, EnvironmentModel environmentModel)
        {
            string uriString = $"https://{environmentModel.PlatformPrefix}.{environmentModel.Hostname}/{_platformSettings.ApiAuthorizationPolicyUri}";
            Uri uri = new Uri($"{uriString}?org={org}&app={app}");

            if (uri.Host.Contains("tt02", StringComparison.InvariantCultureIgnoreCase))
            {
                _httpClient.DefaultRequestHeaders.Add(_platformSettings.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKeyTT02);
            }
            else if (uri.Host.Contains("yt01", StringComparison.InvariantCultureIgnoreCase))
            {
                _httpClient.DefaultRequestHeaders.Add(_platformSettings.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKeyYT01);
            }

            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the base address can change on each request and after HttpClient gets initial base address,
             * it is not advised (and not allowed) to change base address.
             */
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(policyFile, Encoding.UTF8, "application/xml"),
            };

            await _httpClient.SendAsync(request);
        }
    }
}
