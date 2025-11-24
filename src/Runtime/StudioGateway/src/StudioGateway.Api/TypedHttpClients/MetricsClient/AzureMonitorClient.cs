using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Metrics;
using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;

namespace StudioGateway.Api.TypedHttpClients.MetricsClient;

public class AzureMonitorClient(
    IOptions<MetricsClientSettings> metricsClientSettings,
    LogsQueryClient logsQueryClient
    ) : IMetricsClient
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetMetricsAsync(string app, int time, IEnumerable<string> names, CancellationToken cancellationToken)
    {
        if (!names.Any()) return [];

        string logAnalyticsWorkspaceId = _metricsClientSettings.ApplicationLogAnalyticsWorkspaceId;

        if (string.IsNullOrWhiteSpace(logAnalyticsWorkspaceId))
        {
            throw new InvalidOperationException("Configuration value 'ApplicationLogAnalyticsWorkspaceId' is missing or empty.");
        }

        string appNameFilter = string.IsNullOrWhiteSpace(app)
            ? string.Empty
            : $" | where AppRoleName has '{app.Replace("'", "''")}'";

        var query = $@"
                AppMetrics{appNameFilter}
                | where Name in ('{names.Select(name => name.Replace("'", "''")).Aggregate((a, b) => a + "','" + b)}')
                | summarize Count = sum(Sum) by AppRoleName, Name, DateTimeOffset = bin(TimeGenerated, 1h)
                | order by DateTimeOffset desc";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        var appMetrics = response.Value.Table.Rows
        .Select(row =>
        {
            return new
            {
                AppName = row.GetString("AppRoleName"),
                Name = row.GetString("Name"),
                DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset").Value,
                Count = row.GetDouble("Count") ?? 0,
            };
        })
        .GroupBy(row => row.AppName)
        .Select(row =>
        new AppMetric
        {
            AppName = row.Key,
            Metrics = row.GroupBy(e => e.Name).Select(g => new Metric
            {
                Name = g.Key,
                DataPoints = g.Select(e => new MetricDataPoint
                {
                    DateTimeOffset = e.DateTimeOffset,
                    Count = e.Count
                }),
                Count = g.Sum(e => e.Count),
                IsError = false,
            })
        }
        );

        var appMetric = new AppMetric
        {
            AppName = app,
            Metrics = names.Select(name =>
            {
                var data = appMetrics.FirstOrDefault()?.Metrics.FirstOrDefault(m => m.Name == name);
                return new Metric
                {
                    Name = name,
                    DataPoints = data?.DataPoints ?? [],
                    Count = data?.Count ?? 0,
                    IsError = false,
                };
            })
        };

        return [appMetric];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetFailedProcessNextRequestsAsync(string app, int time, CancellationToken cancellationToken)
    {
        string logAnalyticsWorkspaceId = _metricsClientSettings.ApplicationLogAnalyticsWorkspaceId;

        if (string.IsNullOrWhiteSpace(logAnalyticsWorkspaceId))
        {
            throw new InvalidOperationException("Configuration value 'ApplicationLogAnalyticsWorkspaceId' is missing or empty.");
        }

        string appNameFilter = string.IsNullOrWhiteSpace(app)
            ? string.Empty
            : $" | where AppRoleName has '{app.Replace("'", "''")}'";

        var query = $@"
                AppRequests
                | where Success == false
                | where ClientType != 'Browser'
                | where toint(ResultCode) >= 500{appNameFilter}
                | where Name has 'PUT Process/NextElement'
                | summarize Count = sum(ItemCount) by AppRoleName, DateTimeOffset = bin(TimeGenerated, 1h)
                | order by DateTimeOffset asc";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows
        .Select(row => new
        {
            AppName = row.GetString("AppRoleName"),
            Name = "failed_process_next_requests",
            DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset").Value,
            Count = row.GetDouble("Count") ?? int.MaxValue
        })
        .GroupBy(row => row.AppName)
        .Select(row =>
        new AppMetric
        {
            AppName = row.Key,
            Metrics = row.GroupBy(e => e.Name).Select(g =>
            {
                var total = g.Sum(e => e.Count);

                return new Metric
                {
                    Name = g.Key,
                    DataPoints = g.Select(e => new MetricDataPoint
                    {
                        DateTimeOffset = e.DateTimeOffset,
                        Count = e.Count,
                    }),
                    Count = total,
                    IsError = total > 0,
                };
            })
        }
        );
    }
}
