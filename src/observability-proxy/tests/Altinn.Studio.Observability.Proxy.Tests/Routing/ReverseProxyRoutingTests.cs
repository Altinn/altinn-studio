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
                ["ObservabilityProxy:Downstreams:Metrics:Address"] = downstream.Address,
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "grafana-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "platform-grafana",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "metrics",
            }
        );

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "/internal/observability/metrics/api/v1/write?tenant=studio"
        );
        request.Headers.Authorization = new("Bearer", "grafana-token");
        request.Headers.Add("X-Grafana-Org-Id", "1");
        request.Content = new StringContent("request-body", Encoding.UTF8, "application/x-protobuf");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal("request-body", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        Assert.Equal("POST", response.Headers.GetValues("X-Observed-Method").Single());
        Assert.Equal("/api/v1/write?tenant=studio", response.Headers.GetValues("X-Observed-Path").Single());
        Assert.Equal("1", response.Headers.GetValues("X-Observed-Grafana-Org").Single());
        Assert.Equal("platform-grafana", response.Headers.GetValues("X-Observed-Source").Single());
        Assert.False(response.Headers.TryGetValues("X-Observed-Authorization", out _));
    }
}
