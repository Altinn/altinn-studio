using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

/// <summary>
/// A read that cannot reach its storage copy while the health checks still pass it, as during the
/// first seconds of a node restart. The probe interval is far longer than any test, so the proxy
/// keeps both copies healthy throughout.
/// </summary>
public sealed class ReadRetryTests
{
    private const string ReadPath = "/internal/observability/metrics/api/v1/query";
    private const string ForwardingErrors = "altinn_observability_proxy_forwarding_errors_total";
    private const string Failovers = "altinn_observability_proxy_read_failovers_total";

    /// <summary>Nothing listens on port 1, so a connection there is refused.</summary>
    private const string RefusingAddress = "http://127.0.0.1:1";

    [Fact]
    public async Task Read_GoesToTheOtherCopy_WithoutMovingReads()
    {
        var firstAnswers = false;
        await using var first = await TestWebApplication.StartNamedDownstreamAsync(
            "a",
            () => true,
            () => Volatile.Read(ref firstAnswers)
        );
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(first.Address, second.Address);

        var (status, body) = await GetAsync(proxy);
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal("b", body);

        Volatile.Write(ref firstAnswers, true);
        Assert.Equal("a", (await GetAsync(proxy)).Body);

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(ForwardingErrors) >= 1);
        Assert.Equal(
            1,
            metrics.Sum(
                ForwardingErrors,
                ("altinn_observability_proxy_destination", "a"),
                ("altinn_observability_proxy_signal", "metrics"),
                ("error_type", "request")
            )
        );
        Assert.Equal(0, metrics.Sum(Failovers));
    }

    [Fact]
    public async Task FormRead_IsSentAgainWithItsBody()
    {
        // Grafana's Prometheus datasource sends its queries as a POSTed form.
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(RefusingAddress, second.Address);

        using var request = new HttpRequestMessage(HttpMethod.Post, ReadPath)
        {
            Content = new FormUrlEncodedContent([new("query", "up"), new("time", "1762041600")]),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ProxyConfiguration.QueryToken);
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "b query=up&time=1762041600",
            await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task Read_FailsAsBefore_WhenTheOtherCopyCannotBeReachedEither()
    {
        await using var proxy = await StartProxyAsync(RefusingAddress, RefusingAddress);

        Assert.Equal(HttpStatusCode.BadGateway, (await GetAsync(proxy)).Status);

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(ForwardingErrors) >= 2);
        Assert.Equal(1, metrics.Sum(ForwardingErrors, ("altinn_observability_proxy_destination", "a")));
        Assert.Equal(1, metrics.Sum(ForwardingErrors, ("altinn_observability_proxy_destination", "b")));
    }

    [Fact]
    public async Task ErrorResponse_IsNotRetried()
    {
        // A copy that answers is reachable, and its answer is the read's.
        await using var first = await TestWebApplication.StartDownstreamAsync(context =>
        {
            context.Response.StatusCode =
                context.Request.Path == "/health" ? StatusCodes.Status200OK : StatusCodes.Status422UnprocessableEntity;
            return Task.CompletedTask;
        });
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(first.Address, second.Address);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await GetAsync(proxy)).Status);
    }

    private static Task<TestWebApplication> StartProxyAsync(string first, string second)
    {
        var configuration = ProxyConfiguration.WithBothTokens(second);
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = first;
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:1"] = second;
        configuration["ObservabilityProxy:Downstreams:Storage:HealthCheckIntervalSeconds"] = "3600";
        return TestWebApplication.StartProxyAsync(configuration);
    }

    private static async Task<(HttpStatusCode Status, string Body)> GetAsync(TestWebApplication proxy)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{ReadPath}?query=up");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ProxyConfiguration.QueryToken);
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
        return (response.StatusCode, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}
