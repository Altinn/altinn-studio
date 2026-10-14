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
            foreach (var readApi in signal.ReadApis)
            {
                routes.Add(CreateReadRoute(pathPrefix, signal, readApi));
            }
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

    /// <summary>The signal <paramref name="route"/> writes or reads, or <c>null</c> when it is not a proxy route.</summary>
    public static ObservabilitySignal? SignalOf(RouteConfig? route)
    {
        return route?.Metadata?.GetValueOrDefault(SignalMetadataKey) is { } signalName
            ? ObservabilitySignal.Named(signalName)
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
            RouteId = WriteClusterPrefix + signal.Name,
            ClusterId = WriteClusterPrefix + signal.Name,
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
                [SignalMetadataKey] = signal.Name,
            },
        };
    }

    /// <summary>
    /// One read route per read API, to the signal's storage pair. The public prefix is stripped and
    /// the backend's own path put in its place, so the datasource's base URL is the public prefix
    /// and nothing else has to know where the backend serves its query API. Which paths below the
    /// prefix a token may reach is the API's <see cref="ReadApi.Endpoints"/>, checked before
    /// forwarding. A signal's read APIs share its cluster, so they all read from the instance
    /// failover chose.
    /// </summary>
    private static RouteConfig CreateReadRoute(string pathPrefix, ObservabilitySignal signal, ReadApi readApi)
    {
        var transforms = new List<Dictionary<string, string>>
        {
            new(StringComparer.OrdinalIgnoreCase) { ["PathRemovePrefix"] = $"{pathPrefix}/{readApi.RouteGroup}" },
        };

        if (!string.IsNullOrEmpty(readApi.StoragePath))
        {
            transforms.Add(
                new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["PathPrefix"] = readApi.StoragePath,
                }
            );
        }

        return new RouteConfig
        {
            RouteId = readApi.RouteGroup,
            ClusterId = signal.Name,
            Match = new RouteMatch
            {
                Path = $"{pathPrefix}/{readApi.RouteGroup}/{{**{ObservabilityPaths.ReadPathRouteValue}}}",
            },
            Transforms = transforms,
            Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                [ObservabilityPaths.RouteGroupMetadataKey] = readApi.RouteGroup,
                [SignalMetadataKey] = signal.Name,
            },
        };
    }

    private static ClusterConfig CreateWriteCluster(ObservabilitySignal signal, string address)
    {
        return new ClusterConfig
        {
            ClusterId = WriteClusterPrefix + signal.Name,
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
    ///
    /// The keys are the copies' letters in configuration order, <c>a</c> and <c>b</c>, which is how
    /// the storage instances are named. Logs and metrics name a destination by its key.
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
            destinations[CopyName(index)] = new DestinationConfig
            {
                Address = EnsureTrailingSlash(addresses[index]),
                // Probed at the backend's root, not through the query path the route prepends.
                Health = EnsureTrailingSlash(addresses[index]),
            };
        }

        return new ClusterConfig
        {
            ClusterId = signal.Name,
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

    private static string CopyName(int index) => new((char)('a' + index), 1);

    private static string EnsureTrailingSlash(string address)
    {
        return string.IsNullOrEmpty(address) || address[^1] == '/' ? address : $"{address}/";
    }
}
