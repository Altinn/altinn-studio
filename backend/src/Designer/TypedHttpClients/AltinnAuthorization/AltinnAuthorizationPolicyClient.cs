using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
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
        private readonly IEnvironmentsService _environmentsService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        /// <param name="environmentsService">environmentsService</param>
        /// <param name="options">OptionsMonitor of type PlatformSettings</param>
        public AltinnAuthorizationPolicyClient(
            HttpClient httpClient,
            IEnvironmentsService environmentsService,
            IOptionsMonitor<PlatformSettings> options)
        {
            _httpClient = httpClient;
            _platformSettings = options.CurrentValue;
            _environmentsService = environmentsService;
        }

        /// <inheritdoc />
        public async Task SavePolicy(string org, string app, string policyFile, string envName)
        {
            var platformUri = await _environmentsService.CreatePlatformUri(envName);
            Uri uri = new Uri($"{platformUri}{_platformSettings.ApiAuthorizationPolicyUri}?org={org}&app={app}");
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
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
