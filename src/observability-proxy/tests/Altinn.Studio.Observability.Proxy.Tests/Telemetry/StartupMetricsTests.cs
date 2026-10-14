using System.Globalization;

namespace Altinn.Studio.Observability.Proxy.Tests.Telemetry;

/// <summary>
/// The metrics of requests the proxy sends while it starts. These depend on timing, so they run on
/// their own rather than beside the rest of the suite, whose load would stretch the timings.
/// </summary>
[Collection(nameof(StartupMetricsTests))]
[CollectionDefinition(nameof(StartupMetricsTests), DisableParallelization = true)]
public sealed class StartupMetricsTests
{
    [Fact]
    public async Task HealthProbesUnderWayAtStartup_LeaveNoActiveRequestsBehind()
    {
        // The reverse proxy sends its first health probes as its routes are mapped, before the host
        // starts. Unless metrics are collected from before then, a probe that finishes around host
        // start can be counted as finished but not as started, which leaves the backend's
        // http.client.active_requests below zero for good. On one start that happens about every
        // other time, so several proxies start at once, each with probes that take two seconds.
        var results = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => StartWithSlowProbesAsync()));

        Assert.All(
            results,
            result =>
            {
                Assert.True(result.Probes >= 3, $"{result.Probes} probes counted");
                Assert.Equal(0, result.ActiveRequests);
            }
        );
    }

    private static async Task<(double Probes, double ActiveRequests)> StartWithSlowProbesAsync()
    {
        await using var slowHealth = await TestWebApplication.StartDownstreamAsync(async context =>
        {
            if (context.Request.Path == "/health")
            {
                await Task.Delay(TimeSpan.FromSeconds(2), context.RequestAborted);
            }
        });
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(slowHealth.Address)
        );
        var backend = ("server_port", new Uri(slowHealth.Address).Port.ToString(CultureInfo.InvariantCulture));

        // The first probe of each of the three storage pairs.
        var metrics = await proxy.ScrapeUntilAsync(scraped =>
            scraped.Sum("http_client_request_duration_seconds_count", backend) >= 3
        );
        return (
            metrics.Sum("http_client_request_duration_seconds_count", backend),
            metrics.Sum("http_client_active_requests", backend)
        );
    }
}
