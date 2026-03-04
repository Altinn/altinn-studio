using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Repository.Implementation;

public class ResourceRegistryRepository(
    PlatformSettings platformSettings,
    IMaskinportenService maskinPortenService,
    IClientDefinition maskinportenClientDefinition,
    IOptions<ResourceRegistryIntegrationSettings> resourceRegistrySettings,
    IOptions<ResourceRegistryMaskinportenIntegrationSettings> maskinportenIntegrationSettings,
    HttpClient httpClient,
    IHttpClientFactory httpClientFactory
) : IResourceRegistryRepository
{
    public async Task<List<ServiceResource>> GetServiceResources(
        string env,
        bool includeApps = false,
        bool includeAltinn2 = false
    )
    {
        maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(env);
        TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();

        httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer",
            tokenResponse.AccessToken
        );
        string resourceListUrl = GetResourceRegistryResourceListUrl(env, includeApps, includeAltinn2);
        HttpResponseMessage getResourceResponse = await httpClient.GetAsync(resourceListUrl);
        getResourceResponse.EnsureSuccessStatusCode();
        return await getResourceResponse.Content.ReadAsAsync<List<ServiceResource>>();
    }

    private string GetResourceRegistryBaseUrl(string env)
    {
        return !resourceRegistrySettings.Value.TryGetValue(env, out ResourceRegistryEnvironmentSettings? envSettings)
            ? throw new ArgumentException($"Invalid environment. Missing environment config for {env}")
            : $"{envSettings.ResourceRegistryEnvBaseUrl}{platformSettings.ResourceRegistryUrl}";
    }

    private string GetResourceRegistryResourceListUrl(string env, bool includeApps, bool includeAltinn2)
    {
        return $"{GetResourceRegistryBaseUrl(env)}{platformSettings.ResourceRegistryUrl}/resourcelist?includeApps={includeApps}&includeAltinn2={includeAltinn2}";
    }

    private async Task<TokenResponse> GetBearerTokenFromMaskinporten()
    {
        return await maskinPortenService.GetToken(
            maskinportenClientDefinition.ClientSettings.EncodedJwk,
            maskinportenClientDefinition.ClientSettings.Environment,
            maskinportenClientDefinition.ClientSettings.ClientId,
            maskinportenClientDefinition.ClientSettings.Scope,
            maskinportenClientDefinition.ClientSettings.Resource,
            maskinportenClientDefinition.ClientSettings.ConsumerOrgNo
        );
    }

    private MaskinportenClientSettings GetMaskinportenIntegrationSettings(string env)
    {
        string maskinportenEnvironment = env == "prod" ? "prod" : "test";
        if (
            !maskinportenIntegrationSettings.Value.TryGetValue(
                maskinportenEnvironment,
                out MaskinportenClientSettings? maskinportenClientSettings
            )
        )
        {
            throw new ArgumentException($"Invalid environment. Missing Maskinporten config for {env}");
        }

        return maskinportenClientSettings;
    }
}
