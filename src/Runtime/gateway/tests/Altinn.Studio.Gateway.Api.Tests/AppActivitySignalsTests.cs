using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Altinn.Studio.Gateway.Api.Application;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Metrics;
using Azure;
using Azure.Core;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class AppActivitySignalsTests
{
    private static readonly DateTimeOffset _now = new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

    // Same naming policy and resolver as the HTTP JSON options in Program.cs.
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        TypeInfoResolver = AppJsonSerializerContext.Default,
    };

    [Fact]
    public async Task GetAppActivitySignals_WhenMetricsClientStatusIsOk_ReturnsSignalsGroupedByApp()
    {
        var metricsClient = new FakeMetricsClient(
            appActivitySignalsResult: new AppActivitySignalsResult
            {
                Status = ActivityStatus.Ok,
                Signals =
                [
                    new("app-b", AppActivitySignalCategory.Write, 42, _now.AddHours(-4)),
                    new("app-a", AppActivitySignalCategory.Read, 11.5, _now.AddHours(-2)),
                    new("app-a", AppActivitySignalCategory.Write, 3, _now.AddDays(-1)),
                ],
            }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivitySignals(
            serviceProvider,
            BuildMetricsClientSettings(),
            new FakeTimeProvider(_now),
            windowDays: null,
            TestContext.Current.CancellationToken
        );

        var okResult = Assert.IsType<Ok<AppActivitySignalsResponse>>(result);
        var payload = Assert.IsType<AppActivitySignalsResponse>(okResult.Value);
        Assert.Equal("ok", payload.Status);
        Assert.Equal(2, payload.WindowDays);
        Assert.Equal(_now, payload.GeneratedAt);
        Assert.Equal([2], metricsClient.RequestedWindowDays);
        Assert.Collection(
            payload.Apps,
            appA =>
            {
                Assert.Equal("app-a", appA.App);
                Assert.Collection(
                    appA.Signals,
                    signal =>
                    {
                        Assert.Equal("read", signal.Category);
                        Assert.Equal(11.5, signal.Count);
                        Assert.Equal(_now.AddHours(-2), signal.LastSeenAt);
                    },
                    signal =>
                    {
                        Assert.Equal("write", signal.Category);
                        Assert.Equal(3, signal.Count);
                        Assert.Equal(_now.AddDays(-1), signal.LastSeenAt);
                    }
                );
            },
            appB =>
            {
                Assert.Equal("app-b", appB.App);
                var signal = Assert.Single(appB.Signals);
                Assert.Equal("write", signal.Category);
                Assert.Equal(42, signal.Count);
            }
        );
    }

    [Fact]
    public void AppActivitySignalsResponse_SerializesToContractShape()
    {
        var response = new AppActivitySignalsResponse
        {
            Status = "ok",
            WindowDays = 29,
            GeneratedAt = _now,
            Apps =
            [
                new AppActivitySignalsApp
                {
                    App = "my-app",
                    Signals =
                    [
                        new AppActivitySignal
                        {
                            Category = "write",
                            Count = 42,
                            LastSeenAt = _now.AddHours(-4),
                        },
                    ],
                },
            ],
        };
        var json = JsonSerializer.Serialize(response, _jsonOptions);

        Assert.Equal(
            """{"status":"ok","windowDays":29,"generatedAt":"2026-10-13T12:00:00+00:00","apps":[{"app":"my-app","signals":[{"category":"write","count":42,"lastSeenAt":"2026-10-13T08:00:00+00:00"}]}]}""",
            json
        );
    }

    [Theory]
    [InlineData("unavailable")]
    [InlineData("error")]
    public async Task GetAppActivitySignals_WhenMetricsClientStatusIsNotOk_ReturnsStatusAndNoApps(string expectedStatus)
    {
        var status = expectedStatus == "unavailable" ? ActivityStatus.Unavailable : ActivityStatus.Error;
        var metricsClient = new FakeMetricsClient(
            appActivitySignalsResult: new AppActivitySignalsResult
            {
                Status = status,
                Signals = [new("stale-app", AppActivitySignalCategory.Write, 99, _now)],
            }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivitySignals(
            serviceProvider,
            BuildMetricsClientSettings(),
            new FakeTimeProvider(_now),
            windowDays: 29,
            TestContext.Current.CancellationToken
        );

        var okResult = Assert.IsType<Ok<AppActivitySignalsResponse>>(result);
        var payload = Assert.IsType<AppActivitySignalsResponse>(okResult.Value);
        Assert.Equal(expectedStatus, payload.Status);
        Assert.Empty(payload.Apps);
        Assert.Equal(29, payload.WindowDays);
        Assert.Equal(_now, payload.GeneratedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(31)]
    public async Task GetAppActivitySignals_WhenWindowDaysIsInvalid_ReturnsBadRequest(int windowDays)
    {
        var metricsClient = new FakeMetricsClient(
            appActivitySignalsResult: new AppActivitySignalsResult { Status = ActivityStatus.Ok, Signals = [] }
        );
        using var serviceProvider = BuildServiceProvider(metricsClient);

        var result = await HandleMetrics.GetAppActivitySignals(
            serviceProvider,
            BuildMetricsClientSettings(),
            new FakeTimeProvider(_now),
            windowDays,
            TestContext.Current.CancellationToken
        );

        var badRequestResult = Assert.IsType<BadRequest<string>>(result);
        Assert.Equal("windowDays must be between 1 and 30.", badRequestResult.Value);
        Assert.Empty(metricsClient.RequestedWindowDays);
    }

    [Fact]
    public async Task AzureMonitorClient_GetAppActivitySignals_ReturnsQueryRows()
    {
        var logsQueryClient = new StubLogsQueryClient(
            _columns,
            _ =>
                [
                    Row("app-a", AppActivitySignalCategory.Read, 10, _now.AddHours(-1)),
                    Row("app-a", AppActivitySignalCategory.Write, 4, _now.AddHours(-3)),
                    Row("", AppActivitySignalCategory.Write, 7, _now),
                ]
        );
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = await metricsClient.GetAppActivitySignals(7, TestContext.Current.CancellationToken);

        Assert.Equal(ActivityStatus.Ok, result.Status);
        Assert.Equal(
            [
                new AppActivitySignalRow("app-a", AppActivitySignalCategory.Read, 10, _now.AddHours(-1)),
                new AppActivitySignalRow("app-a", AppActivitySignalCategory.Write, 4, _now.AddHours(-3)),
            ],
            result.Signals
        );
        Assert.Equal(AppActivitySignalQueries.BuildQuery(7), Assert.Single(logsQueryClient.Queries));
        Assert.Equal(TimeSpan.FromDays(7), Assert.Single(logsQueryClient.TimeRanges).Duration);
    }

    [Fact]
    public async Task AzureMonitorClient_GetAppActivitySignals_WhenRequestFails_ReturnsUnavailable()
    {
        var logsQueryClient = new StubLogsQueryClient(_columns, _ => throw new RequestFailedException("boom"));
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = await metricsClient.GetAppActivitySignals(2, TestContext.Current.CancellationToken);

        Assert.Equal(ActivityStatus.Unavailable, result.Status);
        Assert.Empty(result.Signals);
    }

    [Fact]
    public async Task AzureMonitorClient_GetAppActivitySignals_WhenUnexpectedErrorOccurs_ReturnsError()
    {
        var logsQueryClient = new StubLogsQueryClient(_columns, _ => throw new InvalidOperationException("boom"));
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = await metricsClient.GetAppActivitySignals(2, TestContext.Current.CancellationToken);

        Assert.Equal(ActivityStatus.Error, result.Status);
        Assert.Empty(result.Signals);
    }

    [Fact]
    public async Task AzureMonitorClient_GetAppActivitySignals_WhenCancelled_Throws()
    {
        using var cancellationTokenSource = new CancellationTokenSource();
        await cancellationTokenSource.CancelAsync();
        var logsQueryClient = new StubLogsQueryClient(_columns, _ => throw new OperationCanceledException());
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            metricsClient.GetAppActivitySignals(2, cancellationTokenSource.Token)
        );
    }

    [Fact]
    public async Task AzureMonitorClient_GetAppActivitySignals_WhenRequestTimesOut_ReturnsUnavailable()
    {
        var logsQueryClient = new StubLogsQueryClient(_columns, _ => throw new TaskCanceledException("timeout"));
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = await metricsClient.GetAppActivitySignals(2, TestContext.Current.CancellationToken);

        Assert.Equal(ActivityStatus.Unavailable, result.Status);
        Assert.Empty(result.Signals);
    }

    private static readonly LogsTableColumn[] _columns =
    [
        LogsQueryModelFactory.LogsTableColumn("AppRoleName", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("Category", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("Count", LogsColumnType.Real),
        LogsQueryModelFactory.LogsTableColumn("LastSeenAt", LogsColumnType.Datetime),
    ];

    private static LogsTableRow Row(string app, string category, double count, DateTimeOffset lastSeenAt) =>
        LogsQueryModelFactory.LogsTableRow(_columns, [app, category, count, lastSeenAt.ToString("O")]);

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

    private static AzureMonitorClient CreateAzureMonitorClient(LogsQueryClient logsQueryClient) =>
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
            NullLogger<AzureMonitorClient>.Instance
        );

    private sealed class StaticOptionsMonitor<T>(T currentValue) : IOptionsMonitor<T>
    {
        public T CurrentValue => currentValue;

        public T Get(string? name) => currentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }
}
