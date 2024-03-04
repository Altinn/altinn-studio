using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public class KubernetesWrapperClient : IKubernetesWrapperClient
{
    private const string PATH_TO_AZURE_ENV = "/kuberneteswrapper/api/v1/deployments";
    private readonly HttpClient _client;
    private readonly ILogger<DeploymentService> _logger;

    public KubernetesWrapperClient(HttpClient httpClient,
            ILogger<DeploymentService> logger)
    {
        _client = httpClient;
        _logger = logger;
    }

    public async Task<KubernetesDeployment> GetDeploymentAsync(string org, string app, EnvironmentModel env)
    {
        // @todo We doesn't have a good way to mock this service locally. Unfortunately subdomains is not supported.
        // The issue have been discussed but we have not been able to find an agreement on how this should be solved. :-/
        string baseUrl = (env.Hostname == "host.docker.internal:6161")
            ? "http://host.docker.internal:6161"
            : $"https://{org}.{env.AppPrefix}.{env.Hostname}";

        string pathToAzureEnv = baseUrl + $"{PATH_TO_AZURE_ENV}?labelSelector=release={org}-{app}";
        try
        {
            using HttpResponseMessage response = await _client.GetAsync(pathToAzureEnv);
            response.EnsureSuccessStatusCode();
            List<KubernetesDeployment> deployments = await response.Content.ReadAsAsync<List<KubernetesDeployment>>();
            KubernetesDeployment deployment = deployments.FirstOrDefault() ?? new KubernetesDeployment { Status = KubernetesDeploymentStatus.None };
            deployment.EnvName = env.Name;
            return deployment;
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Kubernetes wrapper not reachable. Make sure the requested environment, {EnvName}, exists", env.Hostname);
        }

        return null;
    }
}
