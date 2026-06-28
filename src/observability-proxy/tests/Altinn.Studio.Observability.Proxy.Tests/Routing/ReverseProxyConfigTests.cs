using Altinn.Studio.Observability.Proxy.Configuration;
using Altinn.Studio.Observability.Proxy.Routing;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

public sealed class ReverseProxyConfigTests
{
    [Fact]
    public void CreateRoutes_MapsPublicPrefixesToExpectedClusters()
    {
        var options = new ObservabilityProxyOptions();

        var routes = ObservabilityReverseProxyConfig.CreateRoutes(options);
        var clusters = ObservabilityReverseProxyConfig.CreateClusters(options);

        AssertRoute(routes, "otlp", "/internal/observability/otlp/{**catch-all}", "/internal/observability/otlp");
        AssertRoute(routes, "traces", "/internal/observability/traces/{**catch-all}", "/internal/observability/traces");
        AssertRoute(
            routes,
            "metrics",
            "/internal/observability/metrics/{**catch-all}",
            "/internal/observability/metrics"
        );

        Assert.Equal(["metrics", "otlp", "traces"], clusters.Select(cluster => cluster.ClusterId).Order());
    }

    private static void AssertRoute(
        IReadOnlyList<global::Yarp.ReverseProxy.Configuration.RouteConfig> routes,
        string routeId,
        string expectedPath,
        string expectedRemovedPrefix
    )
    {
        var route = Assert.Single(routes, candidate => candidate.RouteId == routeId);

        Assert.Equal(routeId, route.ClusterId);
        Assert.Equal(expectedPath, route.Match.Path);
        Assert.NotNull(route.Transforms);
        var transform = Assert.Single(route.Transforms);
        Assert.Equal(expectedRemovedPrefix, transform["PathRemovePrefix"]);
    }
}
