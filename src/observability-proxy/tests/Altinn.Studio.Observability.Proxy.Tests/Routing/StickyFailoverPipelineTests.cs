namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

/// <summary>
/// Failover through the real proxy pipeline and its active health checks. YARP consults a load
/// balancing policy only when more than one destination is healthy, so a failover has to be seen
/// before load balancing, which only this path exercises.
/// </summary>
public sealed class StickyFailoverPipelineTests
{
    private const string ReadPath = "/internal/observability/metrics/api/v1/query";

    [Fact]
    public async Task Reads_StayOnTheSecondCopy_AfterTheFirstRecovers()
    {
        var firstHealthy = true;
        await using var first = await TestWebApplication.StartNamedDownstreamAsync(
            "a",
            () => Volatile.Read(ref firstHealthy)
        );
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        var configuration = ProxyConfiguration.WithBothTokens(first.Address);
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = first.Address;
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:1"] = second.Address;
        configuration["ObservabilityProxy:Downstreams:Storage:HealthCheckIntervalSeconds"] = "1";
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        Assert.Equal("a", await ReadAsync(proxy));

        Volatile.Write(ref firstHealthy, false);
        await EventuallyReadsFromAsync(proxy, "b");

        // Well past the consecutive failures threshold and the probe interval, so the first copy
        // is healthy again in the proxy's eyes.
        Volatile.Write(ref firstHealthy, true);
        await Task.Delay(TimeSpan.FromSeconds(4), TestContext.Current.CancellationToken);
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal("b", await ReadAsync(proxy));
        }
    }

    private static async Task EventuallyReadsFromAsync(TestWebApplication proxy, string expected)
    {
        var deadline = DateTime.UtcNow.AddSeconds(15);
        while (await ReadAsync(proxy) != expected)
        {
            Assert.True(DateTime.UtcNow < deadline, $"Reads did not move to {expected}");
            await Task.Delay(TimeSpan.FromMilliseconds(250), TestContext.Current.CancellationToken);
        }
    }

    private static async Task<string> ReadAsync(TestWebApplication proxy)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{ReadPath}?query=up");
        request.Headers.Authorization = new("Bearer", ProxyConfiguration.QueryToken);
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
        return await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
    }
}
