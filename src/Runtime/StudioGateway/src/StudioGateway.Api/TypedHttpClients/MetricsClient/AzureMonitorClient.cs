using System.Diagnostics.CodeAnalysis;
using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.MetricsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class AzureMonitorClient(
    IOptions<MetricsClientSettings> metricsClientSettings,
    LogsQueryClient logsQueryClient
) : IMetricsClient
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken)
    {
        string logAnalyticsWorkspaceId = _metricsClientSettings.ApplicationLogAnalyticsWorkspaceId;

        if (string.IsNullOrWhiteSpace(logAnalyticsWorkspaceId))
        {
            throw new InvalidOperationException(
                "Configuration value 'ApplicationLogAnalyticsWorkspaceId' is missing or empty."
            );
        }

        IEnumerable<Metric> appMetrics = await GetAppMetricsAsync(
            logAnalyticsWorkspaceId,
            app,
            time,
            cancellationToken
        );
        IEnumerable<Metric> appFailedRequests = await GetAppFailedRequestsAsync(
            logAnalyticsWorkspaceId,
            app,
            time,
            cancellationToken
        );

        return appMetrics.Concat(appFailedRequests);
    }

    private async Task<IEnumerable<Metric>> GetAppMetricsAsync(
        string logAnalyticsWorkspaceId,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        List<string> names = ["up", "altinn_app_lib_processes_started"];

        var query =
            $@"
                AppMetrics
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where Name in ('{names.Aggregate((a, b) => a + "','" + b)}')
                | summarize Count = sum(Sum) by AppRoleName, Name, DateTimeOffset = bin(TimeGenerated, 1h)
                | order by DateTimeOffset desc";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new QueryTimeRange(TimeSpan.FromHours(time)),
            cancellationToken: cancellationToken
        );

        var metrics = response
            .Value.Table.Rows.Select(row =>
            {
                return new
                {
                    Name = row.GetString("Name"),
                    DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset").GetValueOrDefault(),
                    Count = row.GetDouble("Count") ?? 0,
                };
            })
            .GroupBy(row => row.Name)
            .Select(row =>
            {
                return new Metric
                {
                    Name = row.Key,
                    DataPoints = row.Select(e => new MetricDataPoint
                    {
                        DateTimeOffset = e.DateTimeOffset,
                        Count = e.Count,
                    }),
                };
            });

        return names.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name) ?? new Metric { Name = name, DataPoints = [] }
        );
    }

    private async Task<IEnumerable<Metric>> GetAppFailedRequestsAsync(
        string logAnalyticsWorkspaceId,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        var query =
            $@"
                AppRequests
                | where Success == false
                | where ClientType != 'Browser'
                | where toint(ResultCode) >= 500
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where Name has 'PUT Process/NextElement'
                | summarize Count = sum(ItemCount) by AppRoleName, DateTimeOffset = bin(TimeGenerated, 1h)
                | order by DateTimeOffset asc";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new QueryTimeRange(TimeSpan.FromHours(time)),
            cancellationToken: cancellationToken
        );

        var metricDataPoints = response.Value.Table.Rows.Select(row => new MetricDataPoint
        {
            DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset").GetValueOrDefault(),
            Count = row.GetDouble("Count") ?? 0,
        });

        return [new Metric { Name = "failed_process_next_requests", DataPoints = metricDataPoints }];
    }
}
