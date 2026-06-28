using Altinn.Studio.Observability.Proxy.Configuration;
using Yarp.ReverseProxy.Configuration;

namespace Altinn.Studio.Observability.Proxy.Routing;

internal static class ObservabilityReverseProxyConfig
{
    public static IReadOnlyList<RouteConfig> CreateRoutes(ObservabilityProxyOptions options)
    {
        var pathPrefix = ObservabilityPaths.NormalizePrefix(options.PathPrefix);

        return
        [
            CreateRoute(
                ObservabilityPaths.OtlpRouteGroup,
                $"{pathPrefix}/{ObservabilityPaths.OtlpRouteGroup}/{{**catch-all}}",
                $"{pathPrefix}/{ObservabilityPaths.OtlpRouteGroup}"
            ),
            CreateRoute(
                ObservabilityPaths.TracesRouteGroup,
                $"{pathPrefix}/{ObservabilityPaths.TracesRouteGroup}/{{**catch-all}}",
                $"{pathPrefix}/{ObservabilityPaths.TracesRouteGroup}"
            ),
            CreateRoute(
                ObservabilityPaths.MetricsRouteGroup,
                $"{pathPrefix}/{ObservabilityPaths.MetricsRouteGroup}/{{**catch-all}}",
                $"{pathPrefix}/{ObservabilityPaths.MetricsRouteGroup}"
            ),
        ];
    }

    public static IReadOnlyList<ClusterConfig> CreateClusters(ObservabilityProxyOptions options)
    {
        return
        [
            CreateCluster(ObservabilityPaths.OtlpRouteGroup, options.Downstreams.Otlp.Address),
            CreateCluster(ObservabilityPaths.TracesRouteGroup, options.Downstreams.Traces.Address),
            CreateCluster(ObservabilityPaths.MetricsRouteGroup, options.Downstreams.Metrics.Address),
        ];
    }

    private static RouteConfig CreateRoute(string routeGroup, string pathPattern, string pathPrefixToRemove)
    {
        return new RouteConfig
        {
            RouteId = routeGroup,
            ClusterId = routeGroup,
            Match = new RouteMatch { Path = pathPattern },
            Transforms =
            [
                new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["PathRemovePrefix"] = pathPrefixToRemove,
                },
            ],
            Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["ObservabilityRouteGroup"] = routeGroup,
            },
        };
    }

    private static ClusterConfig CreateCluster(string clusterId, string address)
    {
        return new ClusterConfig
        {
            ClusterId = clusterId,
            Destinations = new Dictionary<string, DestinationConfig>(StringComparer.OrdinalIgnoreCase)
            {
                ["default"] = new() { Address = EnsureTrailingSlash(address) },
            },
        };
    }

    private static string EnsureTrailingSlash(string address)
    {
        return string.IsNullOrEmpty(address) || address[^1] == '/' ? address : $"{address}/";
    }
}
