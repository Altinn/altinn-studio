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
    public async Task<IEnumerable<AppMetric>> GetMetricsAsync(IEnumerable<string>? apps, int time, CancellationToken cancellationToken)
    {
        var escapedApps = apps?.Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => $"'{a.Replace("'", "''")}'");

        string logAnalyticsWorkspaceId = _metricsClientSettings.ApplicationLogAnalyticsWorkspaceId;

        if (string.IsNullOrWhiteSpace(logAnalyticsWorkspaceId))
        {
            throw new InvalidOperationException("Configuration value 'ApplicationLogAnalyticsWorkspaceId' is missing or empty.");
        }

        IEnumerable<AppMetric> appMetrics = await GetAppMetricsAsync(apps, time, logAnalyticsWorkspaceId, cancellationToken);
        IEnumerable<AppMetric> appFailedRequests = await GetAppFailedRequestsAsync(apps, time, logAnalyticsWorkspaceId, cancellationToken);

        return appMetrics.Concat(appFailedRequests);
    }

    private async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(IEnumerable<string>? apps, int time, string logAnalyticsWorkspaceId, CancellationToken cancellationToken)
    {
        string appNameFilter = apps?.Count() > 0
            ? $" | where AppRoleName in ({string.Join(",", apps)})"
            : string.Empty;

        List<string> names = [
            // "altinn_app_lib_instances_created",
            // "altinn_app_lib_instances_completed",
            // "altinn_app_lib_instances_deleted",
            // "altinn_app_lib_instances_duration",
            "altinn_app_lib_processes_started",
            // "altinn_app_lib_processes_ended",
            // "altinn_app_lib_processes_duration",
            // "altinn_app_lib_correspondence_orders",
            // "altinn_app_lib_data_patched",
            // "altinn_app_lib_maskinporten_token_requests",
            // "altinn_app_lib_maskinporten_altinn_exchange_requests",
            // "altinn_app_lib_notification_orders",
            // "altinn_app_lib_signing_delegations",
            // "altinn_app_lib_signing_delegation_revokes",
            // "altinn_app_lib_singing_get_service_owner_party",
            // "altinn_app_lib_signing_notify_signees"
        ];

        var query = $@"
                AppMetrics{appNameFilter}
                | where Name in ('{names.Select(name => name.Replace("'", "''")).Aggregate((a, b) => a + "','" + b)}')
                | summarize Count = sum(Sum) by AppRoleName, Name, DateTimeOffset = bin(TimeGenerated, 1h)
                | order by DateTimeOffset desc";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows
        .Select(row =>
        {
            return new
            {
                AppName = row.GetString("AppRoleName"),
                Name = row.GetString("Name"),
                DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset")!.Value,
                Count = row.GetDouble("Count") ?? 0,
            };
        })
        .GroupBy(row => row.AppName)
        .Select(row =>
        new AppMetric
        {
            AppName = row.Key,
            Metrics = row.GroupBy(metric => metric.Name).Select(metric => new Metric
            {
                Name = metric.Key,
                DataPoints = metric.Select(e => new MetricDataPoint
                {
                    DateTimeOffset = e.DateTimeOffset,
                    Count = e.Count
                }),
                Count = metric.Sum(e => e.Count),
                IsError = false,
            })
        }
        );
    }

    private async Task<IEnumerable<AppMetric>> GetAppFailedRequestsAsync(IEnumerable<string>? apps, int time, string logAnalyticsWorkspaceId, CancellationToken cancellationToken)
    {
        string appNameFilter = apps?.Count() > 0
            ? $" | where AppRoleName in ({string.Join(",", apps)})"
            : string.Empty;

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
            DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset")!.Value,
            Count = row.GetDouble("Count") ?? 0
        })
        .GroupBy(row => row.AppName)
        .Select(row =>
            new AppMetric
            {
                AppName = row.Key,
                Metrics = row.GroupBy(metric => metric.Name).Select(metric =>
                {
                    var total = metric.Sum(e => e.Count);

                    return new Metric
                    {
                        Name = metric.Key,
                        DataPoints = metric.Select(e => new MetricDataPoint
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
