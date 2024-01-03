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

    public KubernetesWrapperClient(HttpClient httpClient, ILogger<KubernetesWrapperClient> logger)
    {
        _client = httpClient;
        _logger = logger;
    }

    public async Task<IList<Deployment>> GetDeploymentsInEnvAsync(string org, EnvironmentModel env)
    {
        // @todo We doesn't have a good way to mock this service locally. Unfortunately subdomains is not supported.
        // The issue have been discussed but we have not been able to find an agreement on how this should be solved. :-/
        string baseUrl = (env.Hostname == "host.docker.internal:6161")
            ? "http://host.docker.internal:6161"
            : $"https://{org}.{env.AppPrefix}.{env.Hostname}";

        string pathToAzureEnv = baseUrl + $"{PATH_TO_AZURE_ENV}";
        try
        {
            _logger.LogInformation("Requesting: {PathToAzureEnv}", pathToAzureEnv);
            using HttpResponseMessage response = await _client.GetAsync(pathToAzureEnv);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsAsync<List<Deployment>>();
        }
        catch (Exception e)
        {
            throw new KubernetesWrapperResponseException("Kubernetes wrapper not reachable", e);
        }
    }
}
