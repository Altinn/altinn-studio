using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2DelegationMigration
{
    public class Altinn2DelegationMigrationClient : IAltinn2DelegationMigrationClient
    {
        private readonly HttpClient _httpClient;
        private readonly PlatformSettings _platformSettings;
        private readonly ResourceRegistryIntegrationSettings _resourceRegistrySettings;
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase, WriteIndented = true };

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
            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}{relativeUrl}");
            using HttpResponseMessage response = await _httpClient.SendAsync(request);

            return await response.Content.ReadAsAsync<DelegationCountOverview>();
        }

        public async Task<ActionResult> StartMigrateDelegations(ExportDelegationsRequestBE delegationRequest, string environment)
        {
            string baseUrl = !environment.ToLower().Equals("dev")
                ? $"{GetResourceRegistryBaseUrl(environment)}"
                : $"{_platformSettings.ResourceRegistryDefaultBaseUrl}";

            string relativeUrl = $"/resourceregistry/api/v1/altinn2export/exportdelegations";
            string serializedContent = JsonSerializer.Serialize(delegationRequest, _serializerOptions);
            using HttpRequestMessage request = new HttpRequestMessage()
            {
                RequestUri = new Uri($"{baseUrl}{relativeUrl}"),
                Method = HttpMethod.Post,
                Content = new StringContent(serializedContent, Encoding.UTF8, "application/json"),
            };

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