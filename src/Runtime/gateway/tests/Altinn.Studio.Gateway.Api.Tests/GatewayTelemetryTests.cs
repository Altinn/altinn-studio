using System.Diagnostics;
using System.Net;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Api.Telemetry;
using Azure;
using Azure.Monitor.Query.Logs.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class GatewayTelemetryTests : IDisposable
{
    private static readonly IReadOnlyList<LogsTableColumn> _columns =
    [
        LogsQueryModelFactory.LogsTableColumn("AppRoleName", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("OperationName", LogsColumnType.String),
        LogsQueryModelFactory.LogsTableColumn("Count", LogsColumnType.Long),
    ];

    private readonly MetricRecorder _metrics = new();
    private readonly ActivitySource _testSource = new("gateway-telemetry-tests");
    private readonly ActivityListener _activityListener;
    private readonly List<Activity> _spans = [];

    public GatewayTelemetryTests()
    {
        _activityListener = new ActivityListener
        {
            // By name: comparing with ServiceTelemetry.Source would create it inside this callback, which the
            // source's constructor calls before the field is set, so the first test to touch it would miss it.
            ShouldListenTo = source => source.Name == ServiceTelemetry.Name || source == _testSource,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                lock (_spans)
                {
                    _spans.Add(activity);
                }
            },
        };
        ActivitySource.AddActivityListener(_activityListener);
    }

    public void Dispose()
    {
        _activityListener.Dispose();
        _testSource.Dispose();
        _metrics.Dispose();
    }

    [Fact]
    public async Task AzureMonitorQuery_WhenItSucceeds_RecordsItsDurationByQueryKindInItsOwnSpan()
    {
        var client = CreateAzureMonitorClient(new StubLogsQueryClient(_columns, _ => []));

        using (var request = _testSource.StartActivity("request"))
        {
            await client.GetFailedRequests(range: 5, TestContext.Current.CancellationToken);
        }

        var measurement = Assert.Single(_metrics.Measurements);
        Assert.Equal(GatewayMetrics.AzureMonitorQueryDurationMetricName, measurement.Name);
        Assert.True(measurement.Value >= 0);
        Assert.Equal(
            new Dictionary<string, object?> { [ServiceTelemetry.Attributes.AzureMonitorQuery] = "failed_requests" },
            measurement.Tags
        );
        var span = Assert.Single(QuerySpans());
        Assert.Equal("failed_requests", span.GetTagItem(ServiceTelemetry.Attributes.AzureMonitorQuery));
        Assert.Equal(ActivityStatusCode.Unset, span.Status);
    }

    [Fact]
    public async Task AzureMonitorQuery_WhenItFails_RecordsTheErrorTypeOnTheMetricAndTheSpan()
    {
        var client = CreateAzureMonitorClient(
            new StubLogsQueryClient(_columns, _ => throw new RequestFailedException("boom"))
        );

        using (var request = _testSource.StartActivity("request"))
        {
            await client.GetActiveApps(windowDays: 7, TestContext.Current.CancellationToken);
        }

        var measurement = Assert.Single(_metrics.Measurements);
        Assert.Equal("active_apps", measurement.Tags[ServiceTelemetry.Attributes.AzureMonitorQuery]);
        Assert.Equal("Azure.RequestFailedException", measurement.Tags[ServiceTelemetry.Attributes.ErrorType]);
        var span = Assert.Single(QuerySpans());
        Assert.Equal(ActivityStatusCode.Error, span.Status);
        Assert.Equal("Azure.RequestFailedException", span.GetTagItem(ServiceTelemetry.Attributes.ErrorType));
        Assert.Empty(span.Events);
    }

    [Fact]
    public void DeployEvent_IsCountedByReasonOriginEnvironmentAndErrorType()
    {
        var metrics = new GatewayMetrics(_metrics.MeterFactory);

        metrics.RecordDeployEvent("UpgradeSucceeded", "staging", errorType: null);
        metrics.RecordDeployEvent("InstallFailed", originEnvironment: null, "helm_release_unresolved");

        Assert.Collection(
            _metrics.Measurements,
            succeeded =>
            {
                Assert.Equal(GatewayMetrics.DeployEventsMetricName, succeeded.Name);
                Assert.Equal(1, succeeded.Value);
                Assert.Equal(
                    new Dictionary<string, object?>
                    {
                        [ServiceTelemetry.Attributes.FluxReason] = "UpgradeSucceeded",
                        [ServiceTelemetry.Attributes.OriginEnvironment] = "staging",
                    },
                    succeeded.Tags
                );
            },
            failed =>
                Assert.Equal(
                    new Dictionary<string, object?>
                    {
                        [ServiceTelemetry.Attributes.FluxReason] = "InstallFailed",
                        [ServiceTelemetry.Attributes.ErrorType] = "helm_release_unresolved",
                    },
                    failed.Tags
                )
        );
    }

    [Fact]
    public void ErrorTypeOf_UnsuccessfulHttpResponse_IsItsStatusCode() =>
        Assert.Equal(
            "503",
            ServiceTelemetry.ErrorTypeOf(
                new HttpRequestException("unavailable", null, HttpStatusCode.ServiceUnavailable)
            )
        );

    [Fact]
    public void ErrorTypeOf_OtherException_IsItsFullTypeName() =>
        Assert.Equal("System.TimeoutException", ServiceTelemetry.ErrorTypeOf(new TimeoutException()));

    private List<Activity> QuerySpans()
    {
        lock (_spans)
        {
            var request = Assert.Single(_spans, span => span.Source == _testSource);
            return _spans
                .Where(span => span.TraceId == request.TraceId && span.OperationName == "AzureMonitorClient.Query")
                .ToList();
        }
    }

    private AzureMonitorClient CreateAzureMonitorClient(StubLogsQueryClient logsQueryClient) =>
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
            new GatewayMetrics(_metrics.MeterFactory),
            NullLogger<AzureMonitorClient>.Instance
        );

    private sealed class StaticOptionsMonitor<T>(T currentValue) : IOptionsMonitor<T>
    {
        public T CurrentValue => currentValue;

        public T Get(string? name) => currentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }
}
