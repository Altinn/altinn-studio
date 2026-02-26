using Altinn.Studio.Gateway.Api.Application;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Metrics;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class AppActivityMetricsTests
{
    [Fact]
    public async Task GetAppActivityMetrics_WhenMetricsClientStatusIsOk_ReturnsActiveAppRequestCountsAndMetadata()
    {
        var now = new DateTimeOffset(2026, 2, 12, 9, 30, 0, TimeSpan.Zero);
        var timeProvider = new FakeTimeProvider(now);
        var metricsClient = new FakeMetricsClient(
            new ActiveAppsResult
            {
                Status = ActivityStatus.Ok,
                ActiveAppRequestCounts = new Dictionary<string, double> { ["app-a"] = 11, ["app-b"] = 7 },
            }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivityMetrics(
            serviceProvider,
            BuildMetricsClientSettings(),
            timeProvider,
            windowDays: null,
            TestContext.Current.CancellationToken
        );

        var okResult = Assert.IsType<Ok<AppActivityMetricsResponse>>(result);
        var payload = Assert.IsType<AppActivityMetricsResponse>(okResult.Value);
        Assert.Equal("ok", payload.Status);
        Assert.Equal(11, payload.ActiveAppRequestCounts["app-a"]);
        Assert.Equal(7, payload.ActiveAppRequestCounts["app-b"]);
        Assert.Equal(7, payload.WindowDays);
        Assert.Equal(now, payload.GeneratedAt);
    }

    [Fact]
    public async Task GetAppActivityMetrics_WhenMetricsClientStatusIsUnavailable_ReturnsUnavailableAndNoActiveAppRequestCounts()
    {
        var now = new DateTimeOffset(2026, 2, 12, 9, 30, 0, TimeSpan.Zero);
        var timeProvider = new FakeTimeProvider(now);
        var metricsClient = new FakeMetricsClient(
            new ActiveAppsResult
            {
                Status = ActivityStatus.Unavailable,
                ActiveAppRequestCounts = new Dictionary<string, double> { ["stale-app"] = 99 },
            }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivityMetrics(
            serviceProvider,
            BuildMetricsClientSettings(),
            timeProvider,
            windowDays: null,
            TestContext.Current.CancellationToken
        );

        var okResult = Assert.IsType<Ok<AppActivityMetricsResponse>>(result);
        var payload = Assert.IsType<AppActivityMetricsResponse>(okResult.Value);
        Assert.Equal("unavailable", payload.Status);
        Assert.Empty(payload.ActiveAppRequestCounts);
        Assert.Equal(7, payload.WindowDays);
        Assert.Equal(now, payload.GeneratedAt);
    }

    [Fact]
    public async Task GetAppActivityMetrics_WhenMetricsClientStatusIsError_ReturnsErrorAndNoActiveAppRequestCounts()
    {
        var now = new DateTimeOffset(2026, 2, 12, 9, 30, 0, TimeSpan.Zero);
        var timeProvider = new FakeTimeProvider(now);
        var metricsClient = new FakeMetricsClient(
            new ActiveAppsResult
            {
                Status = ActivityStatus.Error,
                ActiveAppRequestCounts = new Dictionary<string, double> { ["stale-app"] = 99 },
            }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivityMetrics(
            serviceProvider,
            BuildMetricsClientSettings(),
            timeProvider,
            windowDays: null,
            TestContext.Current.CancellationToken
        );

        var okResult = Assert.IsType<Ok<AppActivityMetricsResponse>>(result);
        var payload = Assert.IsType<AppActivityMetricsResponse>(okResult.Value);
        Assert.Equal("error", payload.Status);
        Assert.Empty(payload.ActiveAppRequestCounts);
        Assert.Equal(7, payload.WindowDays);
        Assert.Equal(now, payload.GeneratedAt);
    }

    [Fact]
    public async Task GetAppActivityMetrics_WhenWindowDaysIsInvalid_ReturnsBadRequest()
    {
        var now = new DateTimeOffset(2026, 2, 12, 9, 30, 0, TimeSpan.Zero);
        var timeProvider = new FakeTimeProvider(now);
        var metricsClient = new FakeMetricsClient(
            new ActiveAppsResult
            {
                Status = ActivityStatus.Ok,
                ActiveAppRequestCounts = new Dictionary<string, double> { ["app-a"] = 1 },
            }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivityMetrics(
            serviceProvider,
            BuildMetricsClientSettings(),
            timeProvider,
            windowDays: 0,
            TestContext.Current.CancellationToken
        );

        var badRequestResult = Assert.IsType<BadRequest<string>>(result);
        Assert.Equal("windowDays must be between 1 and 30.", badRequestResult.Value);
    }

    private static IOptionsMonitor<MetricsClientSettings> BuildMetricsClientSettings() =>
        new StaticOptionsMonitor<MetricsClientSettings>(
            new MetricsClientSettings { Provider = MetricsClientSettings.MetricsClientProvider.AzureMonitor }
        );

    private static ServiceProvider BuildServiceProvider(IMetricsClient metricsClient)
    {
        var services = new ServiceCollection();
        services.AddKeyedSingleton<IMetricsClient>(
            MetricsClientSettings.MetricsClientProvider.AzureMonitor,
            metricsClient
        );
        return services.BuildServiceProvider();
    }

    private sealed class StaticOptionsMonitor<T>(T currentValue) : IOptionsMonitor<T>
    {
        public T CurrentValue => currentValue;

        public T Get(string? name) => currentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }

    private sealed class FakeMetricsClient(ActiveAppsResult activeAppsResult) : IMetricsClient
    {
        public Task<IEnumerable<FailedRequest>> GetFailedRequests(int range, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<ActiveAppsResult> GetActiveApps(int windowDays, CancellationToken cancellationToken) =>
            Task.FromResult(activeAppsResult);

        public Task<IEnumerable<AppFailedRequest>> GetAppFailedRequests(
            string app,
            int range,
            CancellationToken cancellationToken
        ) => throw new NotSupportedException();

        public Task<
            IEnumerable<Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor.AppMetric>
        > GetAppMetrics(string app, int range, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Uri GetLogsUrl(
            string subscriptionId,
            string org,
            string env,
            IReadOnlyCollection<string> apps,
            string metricName,
            DateTimeOffset from,
            DateTimeOffset to
        ) => throw new NotSupportedException();
    }
}
