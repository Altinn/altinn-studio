using Altinn.Studio.KubernetesWrapper.Models;
using Altinn.Studio.KubernetesWrapper.Services.Interfaces;
using k8s;
using k8s.Models;

namespace Altinn.Studio.KubernetesWrapper.Services.Implementation;

internal sealed class KubernetesApiWrapper : IKubernetesApiWrapper, IDisposable
{
    private const string DefaultNamespace = "default";

    private readonly Kubernetes _client;

    public KubernetesApiWrapper()
    {
        var config = KubernetesClientConfiguration.InClusterConfig();
        _client = new Kubernetes(config);
    }

    /// <inheritdoc/>
    public async Task<IList<DeployedResource>> GetDeployedResources(
        ResourceType resourceType,
        string? continueParameter = null,
        string? fieldSelector = null,
        string? labelSelector = null,
        int? limit = null,
        string? resourceVersion = null,
        int? timeoutSeconds = null,
        bool? pretty = null
    )
    {
        if (limit is < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(limit), "Value must be zero or greater.");
        }

        if (timeoutSeconds is < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(timeoutSeconds), "Value must be zero or greater.");
        }

        switch (resourceType)
        {
            case ResourceType.Deployment:
                V1DeploymentList deployments = await ListDeploymentsAsync(
                    continueParameter,
                    fieldSelector,
                    labelSelector,
                    limit,
                    resourceVersion,
                    timeoutSeconds,
                    pretty
                );
                return MapDeployments(deployments.Items);
            case ResourceType.DaemonSet:
                V1DaemonSetList daemonSets = await ListDaemonSetsAsync(
                    continueParameter,
                    fieldSelector,
                    labelSelector,
                    limit,
                    resourceVersion,
                    timeoutSeconds,
                    pretty
                );
                return MapDaemonSets(daemonSets.Items);
            default:
                return [];
        }
    }

    /// <inheritdoc/>
    public void Dispose() => _client.Dispose();

    private async Task<V1DeploymentList> ListDeploymentsAsync(
        string? continueParameter,
        string? fieldSelector,
        string? labelSelector,
        int? limit,
        string? resourceVersion,
        int? timeoutSeconds,
        bool? pretty
    )
    {
        return await _client.ListNamespacedDeploymentAsync(
            namespaceParameter: DefaultNamespace,
            allowWatchBookmarks: null,
            continueParameter: continueParameter,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector,
            limit: limit,
            resourceVersion: resourceVersion,
            resourceVersionMatch: null,
            sendInitialEvents: null,
            timeoutSeconds: timeoutSeconds,
            pretty: pretty,
            cancellationToken: default
        );
    }

    private async Task<V1DaemonSetList> ListDaemonSetsAsync(
        string? continueParameter,
        string? fieldSelector,
        string? labelSelector,
        int? limit,
        string? resourceVersion,
        int? timeoutSeconds,
        bool? pretty
    )
    {
        return await _client.ListNamespacedDaemonSetAsync(
            namespaceParameter: DefaultNamespace,
            allowWatchBookmarks: null,
            continueParameter: continueParameter,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector,
            limit: limit,
            resourceVersion: resourceVersion,
            resourceVersionMatch: null,
            sendInitialEvents: null,
            timeoutSeconds: timeoutSeconds,
            pretty: pretty,
            cancellationToken: default
        );
    }

    private static List<DeployedResource> MapDaemonSets(IList<V1DaemonSet> list)
    {
        List<DeployedResource> mappedList = new(list.Count);

        foreach (V1DaemonSet element in list)
        {
            IList<V1Container>? containers = element.Spec?.Template?.Spec?.Containers;
            if (containers is not { Count: > 0 })
            {
                continue;
            }

            DaemonSet daemonSet = new DaemonSet { Release = element.Metadata?.Name };

            string[]? splittedVersion = containers[0].Image?.Split(":");
            if (splittedVersion is { Length: > 1 })
            {
                daemonSet.Version = splittedVersion[1];
            }

            mappedList.Add(daemonSet);
        }

        return mappedList;
    }

    private static List<DeployedResource> MapDeployments(IList<V1Deployment> list)
    {
        List<DeployedResource> mappedList = new(list.Count);

        foreach (V1Deployment element in list)
        {
            Deployment deployment = new Deployment();
            IList<V1Container>? containers = element.Spec?.Template?.Spec?.Containers;
            if (containers is { Count: > 0 })
            {
                string[]? splittedVersion = containers[0].Image?.Split(":");
                if (splittedVersion is { Length: > 1 })
                {
                    deployment.Version = splittedVersion[1];
                }
            }

            var labels = element.Metadata?.Labels;

            if (labels != null && labels.TryGetValue("release", out string? release))
            {
                deployment.Release = release;
            }

            mappedList.Add(deployment);
        }

        return mappedList;
    }
}
