using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Gateway.Api.Application;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Azure;
using Azure.Core;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;
using k8s;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class ReportMetricsTests
{
    private const int MonthlyReportRange = 30 * 24 * 60;

    [Theory]
    [InlineData(0)]
    [InlineData(MonthlyReportRange + 1)]
    public async Task GetReportMetrics_WhenRangeIsOutsideReportWindow_ReturnsBadRequest(int range)
    {
        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var kubernetes = new Kubernetes(new KubernetesClientConfiguration { Host = "http://localhost" });

        var result = await HandleMetrics.GetReportMetrics(
            new StaticOptionsMonitor<GatewayContext>(new GatewayContext()),
            serviceProvider,
            new StaticOptionsMonitor<MetricsClientSettings>(
                new MetricsClientSettings { Provider = MetricsClientSettings.MetricsClientProvider.AzureMonitor }
            ),
            new HelmReleaseClient(kubernetes),
            NullLogger<Program>.Instance,
            originEnvironment: "prod",
            range,
            TestContext.Current.CancellationToken
        );

        var badRequestResult = Assert.IsType<BadRequest<string>>(result);
        Assert.Equal($"range must be between 1 and {MonthlyReportRange}.", badRequestResult.Value);
    }

    [Fact]
    public async Task GetMetrics_WhenRangeIsMonthly_QueriesTheWholeWindow()
    {
        var logsQueryClient = new RecordingLogsQueryClient();
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        await metricsClient.GetMetrics(MonthlyReportRange, TestContext.Current.CancellationToken);

        var timeRange = Assert.Single(logsQueryClient.TimeRanges);
        Assert.Equal(TimeSpan.FromDays(30), timeRange.Duration);
    }

    [Fact]
    public async Task GetAllAppsFailedRequests_WhenRangeIsMonthly_QueriesTheWholeWindow()
    {
        var logsQueryClient = new RecordingLogsQueryClient();
        var metricsClient = CreateAzureMonitorClient(logsQueryClient);

        await metricsClient.GetAllAppsFailedRequests(MonthlyReportRange, TestContext.Current.CancellationToken);

        var timeRange = Assert.Single(logsQueryClient.TimeRanges);
        Assert.Equal(TimeSpan.FromDays(30), timeRange.Duration);
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

    private sealed class RecordingLogsQueryClient : LogsQueryClient
    {
        public List<LogsQueryTimeRange> TimeRanges { get; } = [];

        public override Task<Response<LogsQueryResult>> QueryResourceAsync(
            ResourceIdentifier resourceId,
            string query,
            LogsQueryTimeRange timeRange,
            LogsQueryOptions? options = null,
            CancellationToken cancellationToken = default
        )
        {
            TimeRanges.Add(timeRange);
            using var response = new EmptyResponse();
            var emptyResult = LogsQueryModelFactory.LogsQueryResult(
                [LogsQueryModelFactory.LogsTable("PrimaryResult", [], [])],
                error: BinaryData.FromString("null"),
                statistics: BinaryData.FromString("{}"),
                visualization: BinaryData.FromString("{}")
            );
            return Task.FromResult(Response.FromValue(emptyResult, response));
        }
    }

    private sealed class EmptyResponse : Response
    {
        public override int Status => 200;
        public override string ReasonPhrase => "OK";
        public override Stream? ContentStream { get; set; }
        public override string ClientRequestId { get; set; } = "";

        public override void Dispose() { }

        protected override bool ContainsHeader(string name) => false;

        protected override IEnumerable<HttpHeader> EnumerateHeaders() => [];

        protected override bool TryGetHeader(string name, [NotNullWhen(true)] out string? value)
        {
            value = null;
            return false;
        }

        protected override bool TryGetHeaderValues(string name, [NotNullWhen(true)] out IEnumerable<string>? values)
        {
            values = null;
            return false;
        }
    }

    private sealed class StaticOptionsMonitor<T>(T currentValue) : IOptionsMonitor<T>
    {
        public T CurrentValue => currentValue;

        public T Get(string? name) => currentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }
}
