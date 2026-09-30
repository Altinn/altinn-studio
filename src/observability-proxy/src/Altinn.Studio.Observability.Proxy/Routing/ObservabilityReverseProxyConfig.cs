using Altinn.Studio.Observability.Proxy.Configuration;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Health;
using Yarp.ReverseProxy.LoadBalancing;

namespace Altinn.Studio.Observability.Proxy.Routing;

internal static class ObservabilityReverseProxyConfig
{
    private const string WriteClusterPrefix = "otlp-";
    private const string SignalMetadataKey = "Signal";
    private const string StoragePairMetadataKey = "StoragePair";

    public static IReadOnlyList<RouteConfig> CreateRoutes(ObservabilityProxyOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var pathPrefix = ObservabilityPaths.NormalizePrefix(options.PathPrefix);
        var routes = new List<RouteConfig>();

        foreach (var signal in ObservabilitySignal.All)
        {
            routes.Add(CreateWriteRoute(pathPrefix, signal));
            routes.Add(CreateReadRoute(pathPrefix, signal));
        }

        return routes;
    }

    public static IReadOnlyList<ClusterConfig> CreateClusters(ObservabilityProxyOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var clusters = new List<ClusterConfig>();

        foreach (var signal in ObservabilitySignal.All)
        {
            clusters.Add(CreateWriteCluster(signal, options.Downstreams.Agents.For(signal)));
            clusters.Add(
                CreateReadCluster(
                    signal,
                    options.Downstreams.Storage.For(signal),
                    options.Downstreams.Storage.HealthCheckIntervalSeconds
                )
            );
        }

        return clusters;
    }

    /// <summary>The route group <paramref name="route"/> requires, or <c>null</c> when it names none.</summary>
    public static string? RouteGroupOf(RouteConfig? route)
    {
        return route?.Metadata?.GetValueOrDefault(ObservabilityPaths.RouteGroupMetadataKey);
    }

    /// <summary>Whether <paramref name="cluster"/> is a storage pair, whose reads <see cref="StickyFailover"/> directs.</summary>
    public static bool IsStoragePair(ClusterConfig? cluster)
    {
        return cluster?.Metadata?.ContainsKey(StoragePairMetadataKey) == true;
    }

    /// <summary>The signal <paramref name="route"/> writes, or <c>null</c> when it is not a write route.</summary>
    public static ObservabilitySignal? WriteSignalOf(RouteConfig? route)
    {
        return route?.Metadata?.GetValueOrDefault(SignalMetadataKey) is { } routeGroup
            ? ObservabilitySignal.ForReadRouteGroup(routeGroup)
            : null;
    }

    /// <summary>
    /// One OTLP write route per signal. The three public paths under <c>/otlp</c> reach three
    /// different agents, so they cannot share a cluster, but they share the <c>otlp</c> route group
    /// that a token is granted. OTLP/HTTP only ever POSTs.
    /// </summary>
    private static RouteConfig CreateWriteRoute(string pathPrefix, ObservabilitySignal signal)
    {
        return new RouteConfig
        {
            RouteId = WriteClusterPrefix + signal.RouteGroup,
            ClusterId = WriteClusterPrefix + signal.RouteGroup,
            Match = new RouteMatch
            {
                Path = $"{pathPrefix}/{ObservabilityPaths.OtlpRouteGroup}{signal.PublicWritePath}",
                Methods = [HttpMethods.Post],
            },
            Transforms =
            [
                new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["PathSet"] = signal.AgentWritePath,
                },
            ],
            Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                [ObservabilityPaths.RouteGroupMetadataKey] = ObservabilityPaths.OtlpRouteGroup,
                [SignalMetadataKey] = signal.RouteGroup,
            },
        };
    }

    /// <summary>
    /// One read route per signal. The public prefix is stripped and the backend's own path put in
    /// its place, so the datasource's base URL is the public prefix and nothing else has to know
    /// where the backend serves its query API. Which paths below the prefix a token may reach is
    /// the signal's <see cref="ObservabilitySignal.ReadEndpoints"/>, checked before forwarding.
    /// </summary>
    private static RouteConfig CreateReadRoute(string pathPrefix, ObservabilitySignal signal)
    {
        var transforms = new List<Dictionary<string, string>>
        {
            new(StringComparer.OrdinalIgnoreCase) { ["PathRemovePrefix"] = $"{pathPrefix}/{signal.RouteGroup}" },
        };

        if (!string.IsNullOrEmpty(signal.StorageReadPath))
        {
            transforms.Add(
                new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["PathPrefix"] = signal.StorageReadPath,
                }
            );
        }

        return new RouteConfig
        {
            RouteId = signal.RouteGroup,
            ClusterId = signal.RouteGroup,
            Match = new RouteMatch
            {
                Path = $"{pathPrefix}/{signal.RouteGroup}/{{**{ObservabilityPaths.ReadPathRouteValue}}}",
            },
            Transforms = transforms,
            Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                [ObservabilityPaths.RouteGroupMetadataKey] = signal.RouteGroup,
            },
        };
    }

    private static ClusterConfig CreateWriteCluster(ObservabilitySignal signal, string address)
    {
        return new ClusterConfig
        {
            ClusterId = WriteClusterPrefix + signal.RouteGroup,
            Destinations = new Dictionary<string, DestinationConfig>(StringComparer.OrdinalIgnoreCase)
            {
                ["agent"] = new() { Address = EnsureTrailingSlash(address) },
            },
        };
    }

    /// <summary>
    /// The storage pair, as failover rather than load balancing. Neither instance can merge results
    /// with the other, so spreading reads across them would return a partial answer half the time.
    /// <see cref="StickyFailover"/> sends every read to the first healthy destination, and the
    /// destination keys are ordered so that is the first configured address. After a failover,
    /// reads stay on the second instance until the proxy restarts; see there for why they do not
    /// return on their own.
    /// </summary>
    private static ClusterConfig CreateReadCluster(
        ObservabilitySignal signal,
        IReadOnlyList<string> addresses,
        int healthCheckIntervalSeconds
    )
    {
        var destinations = new Dictionary<string, DestinationConfig>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < addresses.Count; index++)
        {
            destinations[$"instance-{index}"] = new DestinationConfig
            {
                Address = EnsureTrailingSlash(addresses[index]),
                // Probed at the backend's root, not through the query path the route prepends.
                Health = EnsureTrailingSlash(addresses[index]),
            };
        }

        return new ClusterConfig
        {
            ClusterId = signal.RouteGroup,
            // Only the destination StickyFailover chose reaches load balancing.
            LoadBalancingPolicy = LoadBalancingPolicies.FirstAlphabetical,
            Destinations = destinations,
            HealthCheck = new HealthCheckConfig
            {
                Active = new ActiveHealthCheckConfig
                {
                    Enabled = true,
                    Interval = TimeSpan.FromSeconds(healthCheckIntervalSeconds),
                    Timeout = TimeSpan.FromSeconds(5),
                    Policy = HealthCheckConstants.ActivePolicy.ConsecutiveFailures,
                    Path = "/health",
                },
            },
            Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                [ConsecutiveFailuresHealthPolicyOptions.ThresholdMetadataName] = "2",
                [StoragePairMetadataKey] = "true",
            },
        };
    }

    private static string EnsureTrailingSlash(string address)
    {
        return string.IsNullOrEmpty(address) || address[^1] == '/' ? address : $"{address}/";
    }
}
