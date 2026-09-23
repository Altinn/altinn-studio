using System.Text;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

public sealed class ReverseProxyRoutingTests
{
    [Fact]
    public async Task MetricsRoute_ForwardsMethodBodyAndHeaders_WithPublicPrefixRemoved()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = downstream.Address,
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "grafana-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "platform-grafana",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "metrics",
            }
        );

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "/internal/observability/metrics/api/v1/query_range?nocache=1"
        );
        request.Headers.Authorization = new("Bearer", "grafana-token");
        request.Headers.Add("X-Grafana-Org-Id", "1");
        request.Content = new StringContent("query=up", Encoding.UTF8, "application/x-www-form-urlencoded");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal("query=up", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        Assert.Equal("POST", response.Headers.GetValues("X-Observed-Method").Single());
        Assert.Equal("/api/v1/query_range?nocache=1", response.Headers.GetValues("X-Observed-Path").Single());
        Assert.Equal("1", response.Headers.GetValues("X-Observed-Grafana-Org").Single());
        Assert.Equal("platform-grafana", response.Headers.GetValues("X-Observed-Source").Single());
        Assert.False(response.Headers.TryGetValues("X-Observed-Authorization", out _));
    }

    [Fact]
    public async Task TracesRoute_ReachesTheTempoApiRatherThanTheBackendRoot()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            QueryToken(("ObservabilityProxy:Downstreams:Storage:Traces:0", downstream.Address))
        );

        using var request = new HttpRequestMessage(HttpMethod.Get, "/internal/observability/traces/api/v2/search/tags");
        request.Headers.Authorization = new("Bearer", "query-token");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal("/select/tempo/api/v2/search/tags", response.Headers.GetValues("X-Observed-Path").Single());
    }

    [Fact]
    public async Task LogsRoute_IsRoutedAtAll()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            QueryToken(("ObservabilityProxy:Downstreams:Storage:Logs:0", downstream.Address))
        );

        using var request = new HttpRequestMessage(HttpMethod.Get, "/internal/observability/logs/select/logsql/query");
        request.Headers.Authorization = new("Bearer", "query-token");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal("/select/logsql/query", response.Headers.GetValues("X-Observed-Path").Single());
    }

    [Theory]
    [InlineData("traces", "/insert/opentelemetry/v1/traces")]
    [InlineData("metrics", "/opentelemetry/v1/metrics")]
    [InlineData("logs", "/insert/opentelemetry/v1/logs")]
    public async Task OtlpWrites_ReachTheAgentForTheirSignal(string signal, string expectedAgentPath)
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                [$"ObservabilityProxy:Downstreams:Agents:{signal}"] = downstream.Address,
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "ingest-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "runtime-prod",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "otlp",
            }
        );

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/internal/observability/otlp/v1/{signal}");
        request.Headers.Authorization = new("Bearer", "ingest-token");
        request.Content = new StringContent("payload", Encoding.UTF8, "application/x-protobuf");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal(expectedAgentPath, response.Headers.GetValues("X-Observed-Path").Single());
        Assert.Equal("runtime-prod", response.Headers.GetValues("X-Observed-Source").Single());
    }

    private static Dictionary<string, string?> QueryToken((string Key, string Value) downstream)
    {
        return new Dictionary<string, string?>
        {
            [downstream.Key] = downstream.Value,
            ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "query-token",
            ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "platform-grafana",
            ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "traces",
            ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:1"] = "metrics",
            ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:2"] = "logs",
        };
    }
}
