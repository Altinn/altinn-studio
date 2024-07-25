using System;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2DelegationMigration
{
    public class Altinn2DelegationMigrationClient : IAltinn2DelegationMigrationClient
    {
        private readonly HttpClient _httpClient;
        private readonly PlatformSettings _platformSettings;
        private readonly ResourceRegistryIntegrationSettings _resourceRegistrySettings;

        public Altinn2DelegationMigrationClient(HttpClient httpClient, PlatformSettings platformSettings, IOptions<ResourceRegistryIntegrationSettings> resourceRegistryEnvironment)
        {
            _httpClient = httpClient;
            _platformSettings = platformSettings;
            _resourceRegistrySettings = resourceRegistryEnvironment.Value;
        }

        public async Task<DelegationCountOverview> GetNumberOfDelegations(string serviceCode, int serviceEditionCode, string environment)
        {
            string baseUrl = !environment.ToLower().Equals("dev")
                ? $"{GetResourceRegistryBaseUrl(environment)}"
                : $"{_platformSettings.ResourceRegistryDefaultBaseUrl}";

            string relativeUrl = $"/resourceregistry/api/v1/altinn2export/delegationcount/?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}";
            Uri uri = new($"{baseUrl}{relativeUrl}");
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, uri);
            using HttpResponseMessage response = await _httpClient.SendAsync(request);

            return await response.Content.ReadAsAsync<DelegationCountOverview>();
        }

        private string GetResourceRegistryBaseUrl(string env)
        {
            if (!_resourceRegistrySettings.TryGetValue(env, out ResourceRegistryEnvironmentSettings envSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing environment config for {env}");
            }

            return envSettings.ResourceRegistryEnvBaseUrl;
        }
    }
}
