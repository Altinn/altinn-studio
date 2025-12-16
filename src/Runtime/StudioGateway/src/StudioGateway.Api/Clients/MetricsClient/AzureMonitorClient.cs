using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using Azure.ResourceManager;
using Azure.ResourceManager.OperationalInsights;
using Azure.ResourceManager.Resources;
using StudioGateway.Api.Clients.MetricsClient.Contracts;
using StudioGateway.Api.Settings;
using StudioGateway.Contracts.Metrics;

namespace StudioGateway.Api.Clients.MetricsClient;

internal sealed class AzureMonitorClient(
    GatewayContext gatewayContext,
    ArmClient armClient,
    LogsQueryClient logsQueryClient
) : IMetricsClient
{
    private string? _workspaceId;

    private const int MaxRange = 10080;

    private static readonly IDictionary<string, string[]> _operationNames = new Dictionary<string, string[]>
    {
        {
            "failed_process_next_requests",
            [
                "PUT Process/NextElement [app/instanceGuid/instanceOwnerPartyId/org]",
                "PUT {org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process/next",
            ]
        },
        {
            "failed_instances_requests",
            [
                "POST Instances/Post [app/org]",
                "POST Instances/PostSimplified [app/org]",
                "POST {org}/{app}/instances",
                "POST {org}/{app}/instances/create",
            ]
        },
    };

    private async Task<string> GetApplicationLogAnalyticsWorkspaceIdAsync()
    {
        if (_workspaceId != null)
            return _workspaceId;

        string resourceGroupName = $"monitor-{gatewayContext.ServiceOwner}-{gatewayContext.Environment}-rg";
        string workspaceName = $"application-{gatewayContext.ServiceOwner}-{gatewayContext.Environment}-law";

        var subscription = armClient.GetSubscriptionResource(
            SubscriptionResource.CreateResourceIdentifier(gatewayContext.AzureSubscriptionId)
        );
        var rg = await subscription.GetResourceGroups().GetAsync(resourceGroupName);
        var workspace = await rg.Value.GetOperationalInsightsWorkspaces().GetAsync(workspaceName);

        _workspaceId =
            workspace.Value.Data.CustomerId?.ToString() ?? throw new InvalidOperationException(
                "Log Analytics Workspace ID not found."
            );

        return _workspaceId;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AzureMonitorMetric>> GetMetricsAsync(int range, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = await GetApplicationLogAnalyticsWorkspaceIdAsync();

        var query =
            $@"
                AppRequests
                | where Success == false
                | where ClientType != 'Browser'
                | where toint(ResultCode) >= 500
                | where OperationName in ('{_operationNames.Values.SelectMany(value => value).Aggregate((a, b) => a + "','" + b)}')
                | summarize Count = count() by AppRoleName, OperationName";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new QueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken: cancellationToken
        );

        return response
            .Value.Table.Rows.Select(row =>
            {
                return new
                {
                    AppName = row.GetString("AppRoleName"),
                    Name = _operationNames.First(n => n.Value.Contains(row.GetString("OperationName"))).Key,
                    Count = row.GetDouble("Count") ?? 0,
                };
            })
            .GroupBy(m => m.Name)
            .Select(g => new AzureMonitorMetric
            {
                Name = g.Key,
                OperationNames = _operationNames[g.Key],
                Apps = g.Select(a => new AzureMonitorMetricApp { AppName = a.AppName, Count = a.Count }),
            });
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = await GetApplicationLogAnalyticsWorkspaceIdAsync();

        var interval = range < 360 ? "5m" : "1h";

        IEnumerable<AppMetric> appMetrics = await GetAppMetricsAsync(
            logAnalyticsWorkspaceId,
            app,
            interval,
            range,
            cancellationToken
        );
        IEnumerable<AppMetric> appFailedRequests = await GetAppFailedRequestsAsync(
            logAnalyticsWorkspaceId,
            app,
            interval,
            range,
            cancellationToken
        );

        return appMetrics.Concat(appFailedRequests);
    }

    private async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string logAnalyticsWorkspaceId,
        string app,
        string interval,
        int range,
        CancellationToken cancellationToken
    )
    {
        List<string> names = ["altinn_app_lib_processes_started", "altinn_app_lib_processes_completed"];

        var query =
            $@"
                AppMetrics
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where Name in ('{names.Aggregate((a, b) => a + "','" + b)}')
                | summarize Count = sum(Sum) by Name, DateTimeOffset = bin(TimeGenerated, {interval})
                | order by DateTimeOffset desc;";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new QueryTimeRange(TimeSpan.FromMinutes(range)),
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
                return new AppMetric
                {
                    Name = row.Key,
                    DataPoints = row.Select(e => new AppMetricDataPoint
                    {
                        DateTimeOffset = e.DateTimeOffset,
                        Count = e.Count,
                    }),
                };
            });

        return names.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name) ?? new AppMetric { Name = name, DataPoints = [] }
        );
    }

    private async Task<IEnumerable<AppMetric>> GetAppFailedRequestsAsync(
        string logAnalyticsWorkspaceId,
        string app,
        string interval,
        int range,
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
                | where OperationName in ('{_operationNames.Values.SelectMany(value => value).Aggregate((a, b) => a + "','" + b)}')
                | summarize Count = count() by OperationName, DateTimeOffset = bin(TimeGenerated, {interval})
                | order by DateTimeOffset desc;";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new QueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken: cancellationToken
        );

        var metrics = response
            .Value.Table.Rows.Select(row =>
            {
                return new
                {
                    Name = _operationNames.First(n => n.Value.Contains(row.GetString("OperationName"))).Key,
                    DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset").GetValueOrDefault(),
                    Count = row.GetDouble("Count") ?? 0,
                };
            })
            .GroupBy(row => row.Name)
            .Select(row =>
            {
                return new AppMetric
                {
                    Name = row.Key,
                    DataPoints = row.Select(e => new AppMetricDataPoint
                    {
                        DateTimeOffset = e.DateTimeOffset,
                        Count = e.Count,
                    }),
                };
            });

        return _operationNames.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name.Key)
            ?? new AppMetric { Name = name.Key, DataPoints = [] }
        );
    }
}
