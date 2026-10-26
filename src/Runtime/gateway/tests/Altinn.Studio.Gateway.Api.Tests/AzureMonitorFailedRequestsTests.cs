using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Azure.Monitor.Query.Logs.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class AzureMonitorFailedRequestsTests
{
    private const string InstanceCreation = "failed_instance_creation_requests";
    private const string ProcessNext = "failed_process_next_requests";

    private static readonly DateTimeOffset _laterBucket = new(2026, 6, 30, 4, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset _earlierBucket = _laterBucket.AddHours(-14);

    // The weekly report period in Norwegian summer time that contains both buckets: Monday 29 June to Monday 6 July.
    private static readonly DateTimeOffset _weekStart = new(2026, 6, 29, 0, 0, 0, TimeSpan.FromHours(2));
    private static readonly DateTimeOffset _weekEnd = _weekStart.AddDays(7);

    private static readonly LogsTableColumn[] _columns =
    [
        LogsQueryModelFactory.LogsTableColumn("AppRoleName", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("OperationName", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("DateTimeOffset", LogsColumnType.Datetime),
        LogsQueryModelFactory.LogsTableColumn("Count", LogsColumnType.Long),
    ];

    [Fact]
    public async Task GetAppFailedRequests_SumsOperationNamesOfTheSameMetricPerBucket()
    {
        var logsQueryClient = new StubLogsQueryClient(
            _columns,
            _ =>
                [
                    Row("app-a", "POST Instances/Post [app/org]", _laterBucket, 22),
                    Row("app-a", "POST {org}/{app}/instances", _laterBucket, 15),
                    Row("app-a", "POST {org}/{app}/instances", _earlierBucket, 4),
                    Row(
                        "app-a",
                        "PUT {org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process/next",
                        _laterBucket,
                        3
                    ),
                ]
        );
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = (
            await metricsClient.GetAppFailedRequests("app-a", 10080, TestContext.Current.CancellationToken)
        ).ToDictionary(request => request.Name);

        Assert.Equal(
            [_laterBucket.ToUnixTimeMilliseconds(), _earlierBucket.ToUnixTimeMilliseconds()],
            result[InstanceCreation].Timestamps
        );
        Assert.Equal([37, 4], result[InstanceCreation].Counts);
        Assert.Equal([_laterBucket.ToUnixTimeMilliseconds()], result[ProcessNext].Timestamps);
        Assert.Equal([3], result[ProcessNext].Counts);
    }

    [Fact]
    public async Task GetAllAppsFailedRequests_SumsOperationNamesOfTheSameMetricPerBucketForEachApp()
    {
        var logsQueryClient = new StubLogsQueryClient(
            _columns,
            _ =>
                [
                    Row("app-a", "POST Instances/Post [app/org]", _laterBucket, 22),
                    Row("app-a", "POST {org}/{app}/instances", _laterBucket, 15),
                    Row("app-b", "POST {org}/{app}/instances/create", _laterBucket, 2),
                    Row("app-b", "POST Instances/PostSimplified [app/org]", _earlierBucket, 1),
                ]
        );
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = (
            await metricsClient.GetAllAppsFailedRequests(_weekStart, _weekEnd, TestContext.Current.CancellationToken)
        ).ToDictionary(request => (request.AppName, request.Name));

        Assert.Equal(2, result.Count);
        Assert.Equal([_laterBucket.ToUnixTimeMilliseconds()], result[("app-a", InstanceCreation)].Timestamps);
        Assert.Equal([37], result[("app-a", InstanceCreation)].Counts);
        Assert.Equal(
            [_laterBucket.ToUnixTimeMilliseconds(), _earlierBucket.ToUnixTimeMilliseconds()],
            result[("app-b", InstanceCreation)].Timestamps
        );
        Assert.Equal([2, 1], result[("app-b", InstanceCreation)].Counts);
    }

    private static LogsTableRow Row(string app, string operationName, DateTimeOffset bucket, long count) =>
        LogsQueryModelFactory.LogsTableRow(_columns, [app, operationName, bucket.ToString("O"), count]);

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
            NullLogger<AzureMonitorClient>.Instance
        );

    private sealed class StaticOptionsMonitor<T>(T currentValue) : IOptionsMonitor<T>
    {
        public T CurrentValue => currentValue;

        public T Get(string? name) => currentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }
}
