using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.WebUtilities;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public class KubernetesWrapperClient : IKubernetesWrapperClient
{
    private const string PATH_TO_DEPLOYMENTS = "/kuberneteswrapper/api/v1/deployments";

    private readonly HttpClient _client;
    private readonly PlatformSettings _platformSettings;

    public KubernetesWrapperClient(HttpClient httpClient, PlatformSettings platformSettings)
    {
        _client = httpClient;
        _platformSettings = platformSettings;
    }

    // TODO: the KubernetesWrapper API does not return EnvName, this is added in <see cref="KubernetesDeploymentsService"/>. Why are we pretending that it gets returned here?
    public async Task<KubernetesDeployment> GetDeploymentAsync(
        string org,
        string app,
        EnvironmentModel env,
        CancellationToken ct
    )
    {
        var deploymentsUrl = QueryHelpers.AddQueryString(
            GetDeploymentsUrl(org, env),
            new Dictionary<string, string> { ["labelSelector"] = $"release={org}-{app}" }
        );

        try
        {
            using HttpResponseMessage response = await _client.GetAsync(deploymentsUrl, ct);
            response.EnsureSuccessStatusCode();
            var deployments = await response.Content.ReadAsAsync<List<KubernetesDeployment>>();
            return deployments.FirstOrDefault();
        }
        catch (Exception e)
        {
            throw new KubernetesWrapperResponseException("Kubernetes wrapper not reachable", e);
        }
    }

    public async Task<IEnumerable<KubernetesDeployment>> GetDeploymentsAsync(
        string org,
        EnvironmentModel env,
        CancellationToken ct
    )
    {
        var deploymentsUrl = GetDeploymentsUrl(org, env);

        try
        {
            using HttpResponseMessage response = await _client.GetAsync(deploymentsUrl, ct);
            response.EnsureSuccessStatusCode();
            var deployments = await response.Content.ReadAsAsync<List<KubernetesDeployment>>();

            return deployments.Where(deployment =>
                !deployment.Release.Equals(
                    "kuberneteswrapper",
                    StringComparison.InvariantCultureIgnoreCase
                )
            );
        }
        catch (Exception e)
        {
            throw new KubernetesWrapperResponseException("Kubernetes wrapper not reachable", e);
        }
    }

    private string GetDeploymentsUrl(string org, EnvironmentModel env)
    {
        return _platformSettings
                .AppClusterUrl.Replace("{org}", org)
                .Replace("{appPrefix}", env.AppPrefix)
                .Replace("{hostName}", env.Hostname)
                .Replace("{env}", env.Name) + PATH_TO_DEPLOYMENTS;
    }
}
