using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Api.Telemetry;
using Azure.Monitor.Query.Logs.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Tests;

// v8 apps report the app libraries' metrics under Prometheus-style names, v9 apps under dotted ones. The gateway
// reports both under the v8 name, summed per bucket, so an app moving to v9 keeps one series.
public sealed class AzureMonitorAppMetricsTests
{
    private const string Started = "altinn_app_lib_processes_started";
    private const string Ended = "altinn_app_lib_processes_ended";

    private static readonly DateTimeOffset _laterBucket = new(2026, 6, 30, 4, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset _earlierBucket = _laterBucket.AddHours(-14);

    private static readonly DateTimeOffset _weekStart = new(2026, 6, 29, 0, 0, 0, TimeSpan.FromHours(2));
    private static readonly DateTimeOffset _weekEnd = _weekStart.AddDays(7);

    private static readonly LogsTableColumn[] _columns =
    [
        LogsQueryModelFactory.LogsTableColumn("Name", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("AppRoleName", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("DateTimeOffset", LogsColumnType.Datetime),
        LogsQueryModelFactory.LogsTableColumn("Count", LogsColumnType.Real),
    ];

    [Fact]
    public async Task GetAppMetrics_QueriesBothNamesAndSumsThemUnderTheV8Name()
    {
        var logsQueryClient = new StubLogsQueryClient(
            _columns,
            _ =>
                [
                    Row(Started, "app-a", _laterBucket, 3),
                    Row("altinn.app_lib.processes.started", "app-a", _laterBucket, 4),
                    Row("altinn.app_lib.processes.started", "app-a", _earlierBucket, 2),
                    Row("altinn.app_lib.processes.ended", "app-a", _laterBucket, 1),
                ]
        );

        var result = (
            await CreateAzureMonitorClient(logsQueryClient)
                .GetAppMetrics("app-a", 10080, TestContext.Current.CancellationToken)
        ).ToDictionary(metric => metric.Name);

        var query = Assert.Single(logsQueryClient.Queries);
        Assert.Contains("'altinn_app_lib_processes_started'", query, StringComparison.Ordinal);
        Assert.Contains("'altinn.app_lib.processes.started'", query, StringComparison.Ordinal);
        Assert.Contains("'altinn.app_lib.processes.ended'", query, StringComparison.Ordinal);
        Assert.Equal([Ended, Started], result.Keys.Order());
        Assert.Equal(
            [_laterBucket.ToUnixTimeMilliseconds(), _earlierBucket.ToUnixTimeMilliseconds()],
            result[Started].Timestamps
        );
        Assert.Equal([7, 2], result[Started].Counts);
        Assert.Equal([1], result[Ended].Counts);
    }

    [Fact]
    public async Task GetMetrics_SumsBothNamesUnderTheV8NameForEachApp()
    {
        var logsQueryClient = new StubLogsQueryClient(
            _columns,
            _ =>
                [
                    Row(Started, "app-a", _laterBucket, 3),
                    Row("altinn.app_lib.processes.started", "app-a", _laterBucket, 4),
                    Row("altinn.app_lib.processes.ended", "app-b", _earlierBucket, 5),
                ]
        );

        var result = (
            await CreateAzureMonitorClient(logsQueryClient)
                .GetMetrics(_weekStart, _weekEnd, TestContext.Current.CancellationToken)
        ).ToDictionary(metric => (metric.AppName, metric.Name));

        Assert.Equal(2, result.Count);
        Assert.Equal([7], result[("app-a", Started)].Counts);
        Assert.Equal([5], result[("app-b", Ended)].Counts);
    }

    private static LogsTableRow Row(string name, string app, DateTimeOffset bucket, double count) =>
        LogsQueryModelFactory.LogsTableRow(_columns, [name, app, bucket.ToString("O"), count]);

    private static AzureMonitorClient CreateAzureMonitorClient(StubLogsQueryClient logsQueryClient) =>
        new(
            new StaticOptionsMonitor<GatewayContext>(
                new GatewayContext
                {
                    AzureSubscriptionId = Guid.Empty.ToString(),
                    ServiceOwner = "ttd",
                    Environment = "tt02",
                }
            ),
            logsQueryClient,
            new GatewayMetrics(TestMeterFactory.Shared),
            NullLogger<AzureMonitorClient>.Instance
        );

    private sealed class StaticOptionsMonitor<T>(T currentValue) : IOptionsMonitor<T>
    {
        public T CurrentValue => currentValue;

        public T Get(string? name) => currentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }
}
