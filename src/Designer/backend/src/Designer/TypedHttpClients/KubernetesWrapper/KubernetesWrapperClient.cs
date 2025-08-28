using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public class KubernetesWrapperClient : IKubernetesWrapperClient
{
    private const string PATH_TO_AZURE_ENV = "/kuberneteswrapper/api/v1/deployments";
    private readonly HttpClient _client;

    public KubernetesWrapperClient(HttpClient httpClient)
    {
        _client = httpClient;
    }

    public async Task<KubernetesDeployment> GetDeploymentAsync(string org, string app, EnvironmentModel env)
    {
        // @todo We doesn't have a good way to mock this service locally. Unfortunately subdomains is not supported.
        // The issue have been discussed but we have not been able to find an agreement on how this should be solved. :-/
        string baseUrl = (env.Hostname == "host.docker.internal:6161")
            ? "http://host.docker.internal:6161"
            : $"https://{org}.{env.AppPrefix}.{env.Hostname}";

        string pathToAzureEnv = baseUrl + $"{PATH_TO_AZURE_ENV}?labelSelector=release={org}-{app}&envName={env.Name}";
        try
        {
            using HttpResponseMessage response = await _client.GetAsync(pathToAzureEnv);
            response.EnsureSuccessStatusCode();
            List<KubernetesDeployment> deployments = await response.Content.ReadAsAsync<List<KubernetesDeployment>>();
            return deployments.FirstOrDefault();
        }
        catch (Exception e)
        {
            throw new KubernetesWrapperResponseException("Kubernetes wrapper not reachable", e);
        }
    }
}
