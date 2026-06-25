using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Repository.Implementation;

public class ResourceRegistryRepository(
    PlatformSettings platformSettings,
    IOptions<ResourceRegistryIntegrationSettings> resourceRegistrySettings
) : IResourceRegistryRepository
{
    public async Task<List<ServiceResource>> GetServiceResources(
        string env,
        bool includeApps = false,
        bool includeMigratedApps = false
    )
    {
        using (HttpClient httpClient = new HttpClient())
        {
            string resourceListUrl = GetResourceRegistryResourceListUrl(
                env,
                includeApps,
                includeMigratedApps
            );
            HttpResponseMessage getResourceResponse = await httpClient.GetAsync(resourceListUrl);
            getResourceResponse.EnsureSuccessStatusCode();
            return await getResourceResponse.Content.ReadAsAsync<List<ServiceResource>>();
        }
    }

    private string GetResourceRegistryBaseUrl(string env)
    {
        return !resourceRegistrySettings.Value.TryGetValue(env, out ResourceRegistryEnvironmentSettings? envSettings)
            ? throw new ArgumentException($"Invalid environment. Missing environment config for {env}")
            : $"{envSettings.ResourceRegistryEnvBaseUrl}{platformSettings.ResourceRegistryUrl}";
    }

    private string GetResourceRegistryResourceListUrl(
        string env,
        bool includeApps,
        bool includeMigratedApps
    )
    {
        return $"{GetResourceRegistryBaseUrl(env)}/resourcelist?includeApps={includeApps}&includeMigratedApps={includeMigratedApps}";
    }
}
