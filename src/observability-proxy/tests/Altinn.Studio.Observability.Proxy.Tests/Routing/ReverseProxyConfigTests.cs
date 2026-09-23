using Altinn.Studio.Observability.Proxy.Configuration;
using Altinn.Studio.Observability.Proxy.Routing;
using Yarp.ReverseProxy.Configuration;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

public sealed class ReverseProxyConfigTests
{
    [Fact]
    public void CreateRoutes_GivesEachSignalItsOwnWriteAndReadRoute()
    {
        var routes = ObservabilityReverseProxyConfig.CreateRoutes(new ObservabilityProxyOptions());

        Assert.Equal(
            ["logs", "metrics", "otlp-logs", "otlp-metrics", "otlp-traces", "traces"],
            routes.Select(route => route.RouteId).Order()
        );
    }

    [Theory]
    [InlineData("otlp-traces", "/internal/observability/otlp/v1/traces", "/insert/opentelemetry/v1/traces")]
    [InlineData("otlp-metrics", "/internal/observability/otlp/v1/metrics", "/opentelemetry/v1/metrics")]
    [InlineData("otlp-logs", "/internal/observability/otlp/v1/logs", "/insert/opentelemetry/v1/logs")]
    public void WriteRoute_RewritesThePublicPathToTheAgentPath(string routeId, string publicPath, string agentPath)
    {
        var routes = ObservabilityReverseProxyConfig.CreateRoutes(new ObservabilityProxyOptions());

        var route = Assert.Single(routes, candidate => candidate.RouteId == routeId);
        Assert.Equal(publicPath, route.Match.Path);
        Assert.NotNull(route.Transforms);
        Assert.Equal(agentPath, Assert.Single(route.Transforms)["PathSet"]);
        Assert.NotNull(route.Metadata);
        Assert.Equal("otlp", route.Metadata["ObservabilityRouteGroup"]);
        Assert.Equal(["POST"], route.Match.Methods);
    }

    [Fact]
    public void TraceReadRoute_PutsTheTempoApiPathInPlaceOfThePublicPrefix()
    {
        var routes = ObservabilityReverseProxyConfig.CreateRoutes(new ObservabilityProxyOptions());

        var route = Assert.Single(routes, candidate => candidate.RouteId == "traces");
        Assert.Equal("/internal/observability/traces/{**readPath}", route.Match.Path);
        Assert.NotNull(route.Transforms);
        Assert.Equal("/internal/observability/traces", route.Transforms[0]["PathRemovePrefix"]);
        Assert.Equal("/select/tempo", route.Transforms[1]["PathPrefix"]);
    }

    [Theory]
    [InlineData("metrics")]
    [InlineData("logs")]
    public void OtherReadRoutes_OnlyStripThePublicPrefix(string routeId)
    {
        var routes = ObservabilityReverseProxyConfig.CreateRoutes(new ObservabilityProxyOptions());

        var route = Assert.Single(routes, candidate => candidate.RouteId == routeId);
        Assert.NotNull(route.Transforms);
        Assert.Equal($"/internal/observability/{routeId}", Assert.Single(route.Transforms)["PathRemovePrefix"]);
    }

    [Fact]
    public void ReadClusters_HoldBothInstancesAsFailoverRatherThanLoadBalanced()
    {
        var options = new ObservabilityProxyOptions();
        options.Downstreams.Storage.Traces.Add("http://traces-a:10428");
        options.Downstreams.Storage.Traces.Add("http://traces-b:10428");

        var cluster = Assert.Single(
            ObservabilityReverseProxyConfig.CreateClusters(options),
            candidate => candidate.ClusterId == "traces"
        );

        Assert.Equal("FirstAlphabetical", cluster.LoadBalancingPolicy);
        Assert.NotNull(cluster.Destinations);
        Assert.Equal(["instance-0", "instance-1"], cluster.Destinations.Keys.Order());
        Assert.Equal("http://traces-a:10428/", cluster.Destinations["instance-0"].Address);
        Assert.Equal("http://traces-b:10428/", cluster.Destinations["instance-1"].Address);

        // Probed at the root, not through the Tempo path the route prepends.
        Assert.Equal("http://traces-a:10428/", cluster.Destinations["instance-0"].Health);
        var activeHealthCheck = cluster.HealthCheck?.Active;
        Assert.NotNull(activeHealthCheck);
        Assert.True(activeHealthCheck.Enabled);
        Assert.Equal("/health", activeHealthCheck.Path);
    }

    [Fact]
    public void WriteClusters_HaveTheSingleAgentServiceAsTheirDestination()
    {
        var options = new ObservabilityProxyOptions();
        options.Downstreams.Agents.Logs = "http://vlagent-logs:9429";

        var cluster = Assert.Single(
            ObservabilityReverseProxyConfig.CreateClusters(options),
            candidate => candidate.ClusterId == "otlp-logs"
        );

        Assert.NotNull(cluster.Destinations);
        var destination = Assert.Single(cluster.Destinations);
        Assert.Equal("http://vlagent-logs:9429/", destination.Value.Address);
    }
}
