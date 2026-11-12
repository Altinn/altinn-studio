using System.Globalization;
using System.Text.Json;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Api.Telemetry;
using Azure.Monitor.Query.Logs.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class AzureMonitorFailedRequestsTests
{
    private const string InstanceCreation = "failed_instance_creation_requests";
    private const string ProcessNext = "failed_process_next_requests";
    private const string WorkflowCallback = "failed_workflow_callback_requests";

    private const string ClassicCallbackOperation =
        "POST WorkflowEngineCallback/ExecuteCommand [app/commandKey/instanceGuid/instanceOwnerPartyId/org]";
    private const string OpenTelemetryCallbackOperation =
        "POST {org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/workflow-engine-callbacks/{commandKey}";

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

    [Fact]
    public async Task GetAppFailedRequests_CountsWorkflowCallbacksFrom400AndOtherRequestsFrom500()
    {
        var logsQueryClient = new StubLogsQueryClient(
            _columns,
            _ =>
                [
                    Row("app-a", ClassicCallbackOperation, _laterBucket, 5),
                    Row("app-a", OpenTelemetryCallbackOperation, _laterBucket, 2),
                ]
        );
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        var result = (
            await metricsClient.GetAppFailedRequests("app-a", 10080, TestContext.Current.CancellationToken)
        ).ToDictionary(request => request.Name);

        string query = Assert.Single(logsQueryClient.Queries);
        Assert.Contains(
            $"(toint(ResultCode) >= 400 and OperationName in ('{ClassicCallbackOperation}', '{OpenTelemetryCallbackOperation}'))",
            query,
            StringComparison.Ordinal
        );
        Assert.Contains(
            "(toint(ResultCode) >= 500 and OperationName in ('PUT Process/NextElement [app/instanceGuid/instanceOwnerPartyId/org]',",
            query,
            StringComparison.Ordinal
        );
        Assert.Equal([ProcessNext, InstanceCreation, WorkflowCallback], result.Keys);
        Assert.Equal([7], result[WorkflowCallback].Counts);
    }

    [Theory]
    [InlineData(ProcessNext, 500)]
    [InlineData(InstanceCreation, 500)]
    [InlineData(WorkflowCallback, 400)]
    public void GetLogsUrl_ShowsFailuresFromTheLowestFailedStatusOfTheRule(string ruleId, int lowestFailedStatus)
    {
        var metricsClient = CreateAzureMonitorClient(new StubLogsQueryClient(_columns, _ => []));

        var logsQuery = LogsQueryOf(
            metricsClient.GetLogsUrl(
                Guid.Empty.ToString(),
                "ttd",
                "tt02",
                ["app-a"],
                ruleId,
                _earlierBucket,
                _laterBucket
            )
        );

        Assert.Contains(
            $"| where toint(resultCode) >= {lowestFailedStatus} |",
            FilterWhereClauseOf(logsQuery),
            StringComparison.Ordinal
        );
        string[] resultCodes = ResultCodeFilterOf(logsQuery);
        Assert.Equal(lowestFailedStatus.ToString(CultureInfo.InvariantCulture), resultCodes[0]);
        Assert.Equal("511", resultCodes[^1]);
    }

    [Fact]
    public void GetLogsUrl_KeepsTheResponseCodeFilterForServerErrors()
    {
        var metricsClient = CreateAzureMonitorClient(new StubLogsQueryClient(_columns, _ => []));

        var logsQuery = LogsQueryOf(
            metricsClient.GetLogsUrl(
                Guid.Empty.ToString(),
                "ttd",
                "tt02",
                ["app-a"],
                ProcessNext,
                _earlierBucket,
                _laterBucket
            )
        );

        Assert.Equal(
            ["500", "501", "502", "503", "504", "505", "506", "507", "508", "510", "511"],
            ResultCodeFilterOf(logsQuery)
        );
    }

    [Fact]
    public void GetLogsUrl_ForWorkflowCallbacks_ShowsTheCallbackRoute()
    {
        var metricsClient = CreateAzureMonitorClient(new StubLogsQueryClient(_columns, _ => []));

        var logsQuery = LogsQueryOf(
            metricsClient.GetLogsUrl(
                Guid.Empty.ToString(),
                "ttd",
                "tt02",
                ["app-a"],
                WorkflowCallback,
                _earlierBucket,
                _laterBucket
            )
        );

        Assert.Contains(
            $"| where operation_Name in ('{ClassicCallbackOperation}', '{OpenTelemetryCallbackOperation}') |",
            FilterWhereClauseOf(logsQuery),
            StringComparison.Ordinal
        );
        Assert.Contains("422", ResultCodeFilterOf(logsQuery));
    }

    private static JsonElement LogsQueryOf(Uri logsUrl)
    {
        const string marker = "/BladeInputs/";
        string url = logsUrl.OriginalString;
        string encoded = url[(url.IndexOf(marker, StringComparison.Ordinal) + marker.Length)..];
        using var document = JsonDocument.Parse(Uri.UnescapeDataString(encoded));
        return document.RootElement.Clone();
    }

    private static string FilterWhereClauseOf(JsonElement logsQuery) =>
        logsQuery.GetProperty("filterWhereClause").GetString() ?? string.Empty;

    private static string[] ResultCodeFilterOf(JsonElement logsQuery) =>
        logsQuery
            .GetProperty("originalParams")
            .GetProperty("filter")
            .EnumerateArray()
            .Single(filter => filter.GetProperty("dimension").GetProperty("name").ValueEquals("request/resultCode"))
            .GetProperty("values")
            .EnumerateArray()
            .Select(value => value.GetString() ?? string.Empty)
            .ToArray();

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
