using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.KubernetesWrapper.Configuration;
using Altinn.Studio.KubernetesWrapper.Models;
using Altinn.Studio.KubernetesWrapper.Services.Interfaces;
using k8s;
using k8s.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.KubernetesWrapper.Services.Implementation;

internal sealed class KubernetesApiWrapper : IKubernetesApiWrapper, IDisposable
{
    private const string DefaultNamespace = "default";

    private readonly Kubernetes _client;
    private readonly TimeSpan _cacheTtl;
    private readonly int _kubernetesRequestTimeoutSeconds;
    private readonly SemaphoreSlim _deploymentsCacheLock = new(1, 1);
    private readonly SemaphoreSlim _daemonSetsCacheLock = new(1, 1);

    private CacheEntry? _deploymentsCache;
    private CacheEntry? _daemonSetsCache;

    private sealed record CacheEntry(IReadOnlyList<DeployedResource> Value, DateTimeOffset ExpiresAtUtc);

    public KubernetesApiWrapper(IOptions<GeneralSettings> options)
    {
        var config = KubernetesClientConfiguration.InClusterConfig();
        _client = new Kubernetes(config);

        GeneralSettings value = options.Value;
        _cacheTtl = TimeSpan.FromSeconds(value.CacheTtlSeconds);
        _kubernetesRequestTimeoutSeconds = value.KubernetesRequestTimeoutSeconds;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<DeployedResource>> GetDeployedResources(
        ResourceType resourceType,
        string? fieldSelector = null,
        string? labelSelector = null,
        CancellationToken cancellationToken = default
    )
    {
        string? normalizedFieldSelector = NormalizeSelector(fieldSelector);
        string? normalizedLabelSelector = NormalizeSelector(labelSelector);

        switch (resourceType)
        {
            case ResourceType.Deployment:
                if (ShouldUseCache(normalizedFieldSelector, normalizedLabelSelector))
                {
                    return await GetCachedDeployments(cancellationToken);
                }

                V1DeploymentList deployments = await ListDeploymentsAsync(
                    normalizedFieldSelector,
                    normalizedLabelSelector,
                    cancellationToken
                );
                return MapDeployments(deployments.Items);
            case ResourceType.DaemonSet:
                if (ShouldUseCache(normalizedFieldSelector, normalizedLabelSelector))
                {
                    return await GetCachedDaemonSets(cancellationToken);
                }

                V1DaemonSetList daemonSets = await ListDaemonSetsAsync(
                    normalizedFieldSelector,
                    normalizedLabelSelector,
                    cancellationToken
                );
                return MapDaemonSets(daemonSets.Items);
            default:
                return [];
        }
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        _deploymentsCacheLock.Dispose();
        _daemonSetsCacheLock.Dispose();
        _client.Dispose();
    }

    private async Task<V1DeploymentList> ListDeploymentsAsync(
        string? fieldSelector,
        string? labelSelector,
        CancellationToken cancellationToken
    )
    {
        int boundedTimeoutSeconds = _kubernetesRequestTimeoutSeconds;
        using CancellationTokenSource timeoutTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken
        );
        timeoutTokenSource.CancelAfter(TimeSpan.FromSeconds(boundedTimeoutSeconds));

        return await _client.ListNamespacedDeploymentAsync(
            namespaceParameter: DefaultNamespace,
            allowWatchBookmarks: null,
            continueParameter: null,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector,
            limit: null,
            resourceVersion: null,
            resourceVersionMatch: null,
            sendInitialEvents: null,
            timeoutSeconds: boundedTimeoutSeconds,
            pretty: null,
            cancellationToken: timeoutTokenSource.Token
        );
    }

    private async Task<V1DaemonSetList> ListDaemonSetsAsync(
        string? fieldSelector,
        string? labelSelector,
        CancellationToken cancellationToken
    )
    {
        int boundedTimeoutSeconds = _kubernetesRequestTimeoutSeconds;
        using CancellationTokenSource timeoutTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken
        );
        timeoutTokenSource.CancelAfter(TimeSpan.FromSeconds(boundedTimeoutSeconds));

        return await _client.ListNamespacedDaemonSetAsync(
            namespaceParameter: DefaultNamespace,
            allowWatchBookmarks: null,
            continueParameter: null,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector,
            limit: null,
            resourceVersion: null,
            resourceVersionMatch: null,
            sendInitialEvents: null,
            timeoutSeconds: boundedTimeoutSeconds,
            pretty: null,
            cancellationToken: timeoutTokenSource.Token
        );
    }

    private async Task<IReadOnlyList<DeployedResource>> GetCachedDeployments(CancellationToken cancellationToken)
    {
        if (TryGetCacheValue(Volatile.Read(ref _deploymentsCache), out IReadOnlyList<DeployedResource>? cachedValue))
        {
            return cachedValue;
        }

        await _deploymentsCacheLock.WaitAsync(cancellationToken);
        try
        {
            if (TryGetCacheValue(Volatile.Read(ref _deploymentsCache), out cachedValue))
            {
                return cachedValue;
            }

            V1DeploymentList deployments = await ListDeploymentsAsync(
                fieldSelector: null,
                labelSelector: null,
                cancellationToken: CancellationToken.None
            );
            IReadOnlyList<DeployedResource> mappedDeployments = MapDeployments(deployments.Items);
            Volatile.Write(
                ref _deploymentsCache,
                new CacheEntry(mappedDeployments, DateTimeOffset.UtcNow.Add(_cacheTtl))
            );
            return mappedDeployments;
        }
        finally
        {
            _deploymentsCacheLock.Release();
        }
    }

    private async Task<IReadOnlyList<DeployedResource>> GetCachedDaemonSets(CancellationToken cancellationToken)
    {
        if (TryGetCacheValue(Volatile.Read(ref _daemonSetsCache), out IReadOnlyList<DeployedResource>? cachedValue))
        {
            return cachedValue;
        }

        await _daemonSetsCacheLock.WaitAsync(cancellationToken);
        try
        {
            if (TryGetCacheValue(Volatile.Read(ref _daemonSetsCache), out cachedValue))
            {
                return cachedValue;
            }

            V1DaemonSetList daemonSets = await ListDaemonSetsAsync(
                fieldSelector: null,
                labelSelector: null,
                cancellationToken: CancellationToken.None
            );
            IReadOnlyList<DeployedResource> mappedDaemonSets = MapDaemonSets(daemonSets.Items);
            Volatile.Write(
                ref _daemonSetsCache,
                new CacheEntry(mappedDaemonSets, DateTimeOffset.UtcNow.Add(_cacheTtl))
            );
            return mappedDaemonSets;
        }
        finally
        {
            _daemonSetsCacheLock.Release();
        }
    }

    private static bool ShouldUseCache(string? fieldSelector, string? labelSelector) =>
        string.IsNullOrWhiteSpace(fieldSelector) && string.IsNullOrWhiteSpace(labelSelector);

    private static string? NormalizeSelector(string? selector) => string.IsNullOrWhiteSpace(selector) ? null : selector;

    private static bool TryGetCacheValue(
        CacheEntry? cacheEntry,
        [NotNullWhen(true)] out IReadOnlyList<DeployedResource>? cacheValue
    )
    {
        if (cacheEntry is not null && cacheEntry.ExpiresAtUtc > DateTimeOffset.UtcNow)
        {
            cacheValue = cacheEntry.Value;
            return true;
        }

        cacheValue = null;
        return false;
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
