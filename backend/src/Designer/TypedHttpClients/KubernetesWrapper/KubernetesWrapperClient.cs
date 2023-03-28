using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public class KubernetesWrapperClient : IKubernetesWrapperClient
{
    private const string PATH_TO_AZURE_ENV = "/kuberneteswrapper/api/v1/deployments";
    private readonly HttpClient _client;
    private readonly ILogger<KubernetesWrapperClient> _logger;
    private readonly IMemoryCache _cache;

    public KubernetesWrapperClient(HttpClient httpClient, ILogger<KubernetesWrapperClient> logger,
        IMemoryCache memoryCache)
    {
        _client = httpClient;
        _logger = logger;
        _cache = memoryCache;
    }

    public async Task<IList<Deployment>> GetDeploymentsInEnvAsync(string org, EnvironmentModel env)
    {
        List<Deployment> deployments;
        // @todo We doesn't have a good way to mock this service locally. Unfortunately subdomains is not supported.
        // The issue have been discussed but we have not been able to find an agreement on how this should be solved. :-/
        string baseUrl = (env.Hostname == "host.docker.internal:6161")
            ? "http://host.docker.internal:6161"
            : $"https://{org}.{env.AppPrefix}.{env.Hostname}";

        string pathToAzureEnv = baseUrl + $"{PATH_TO_AZURE_ENV}";
        string cacheKey = $"GetDeploymentsInEnvAsync-{org}-{env.Name}";
        if (!_cache.TryGetValue(cacheKey, out deployments))
        {
            try
            {
                _logger.LogInformation("Requesting: {PathToAzureEnv}", pathToAzureEnv);
                HttpResponseMessage response = await _client.GetAsync(pathToAzureEnv);
                deployments = await response.Content.ReadAsAsync<List<Deployment>>();

                _cache.Set(cacheKey, deployments, new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromSeconds(15)));
            }
            catch (Exception e)
            {
                throw new KubernetesWrapperResponseException("Kubernetes wrapper not reachable", e);
            }
        }

        return deployments;
    }
}
