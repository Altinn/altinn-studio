using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;

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
        private readonly ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        /// <param name="environmentsService">environmentsService</param>
        /// <param name="options">OptionsMonitor of type PlatformSettings</param>
        /// <param name="logger">logger</param>
        public AltinnAuthorizationPolicyClient(
            HttpClient httpClient,
            IEnvironmentsService environmentsService,
            PlatformSettings options,
             ILogger<AltinnAuthorizationPolicyClient> logger)
        {
            _httpClient = httpClient;
            _platformSettings = options;
            _environmentsService = environmentsService;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task SavePolicy(string org, string app, string policyFile, string envName)
        {
            var platformUri = await _environmentsService.CreatePlatformUri(envName);
            Uri uri = new Uri($"{platformUri}{_platformSettings.ApiAuthorizationPolicyUri}?org={org}&app={app}");
            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the base address can change on each request and after HttpClient gets initial base address,
             * it is not advised (and not allowed) to change base address.
             */
            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(policyFile, Encoding.UTF8, "application/xml"),
            };

            await _httpClient.SendAsync(request);

            /*
             * After the deploy of the Policy to authorization server, we need to refresh the subjects. 
             * This is a temporary fix until policy is directly published to resource registry endpoint
             */
            try
            {
                Uri refreshSubjectsUri = new($"{platformUri}{_platformSettings.ResourceRegistryUrl}/app_{org}_{app}/policy/subjects?reloadFromXacml=true");
                using HttpRequestMessage getRequest = new(HttpMethod.Get, refreshSubjectsUri);
                await _httpClient.SendAsync(getRequest);
            }
            catch (Exception ex)
            {
                // Log the exception
                _logger.LogError($"Error refreshing subjects: {ex.Message}", ex);
            }
        }
    }
}
