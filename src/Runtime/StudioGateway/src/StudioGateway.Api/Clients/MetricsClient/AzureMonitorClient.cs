using Azure;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;
using Azure.ResourceManager;
using Azure.ResourceManager.OperationalInsights;
using Azure.ResourceManager.Resources;
using StudioGateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;
using StudioGateway.Api.Settings;

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

    private static string GetInterval(int range)
    {
        return range < 360 ? "5m" : "1h";
    }

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

    public async Task<IEnumerable<FailedRequest>> GetFailedRequestsAsync(int range, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = await GetApplicationLogAnalyticsWorkspaceIdAsync();

        var query =
            $@"
                AppRequests
                | where Success == false
                | where ClientType != 'Browser'
                | where toint(ResultCode) >= 500
                | where OperationName in ('{string.Join("','", _operationNames.Values.SelectMany(value => value))}')
                | summarize Count = count() by AppRoleName, OperationName";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
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
            .GroupBy(row => new { row.AppName, row.Name })
            .Select(row =>
            {
                return new FailedRequest
                {
                    Name = row.Key.Name,
                    AppName = row.Key.AppName,
                    Count = row.Sum(value => value.Count),
                };
            });
    }

    public async Task<IEnumerable<AppFailedRequest>> GetAppFailedRequestsAsync(
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = await GetApplicationLogAnalyticsWorkspaceIdAsync();

        var interval = GetInterval(range);

        var query =
            $@"
                AppRequests
                | where Success == false
                | where ClientType != 'Browser'
                | where toint(ResultCode) >= 500
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where OperationName in ('{string.Join("','", _operationNames.Values.SelectMany(value => value))}')
                | summarize Count = count() by OperationName, DateTimeOffset = bin(TimeGenerated, {interval})
                | order by DateTimeOffset desc;";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
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
                return new AppFailedRequest
                {
                    Name = row.Key,
                    DataPoints = row.Select(e => new DataPoint { DateTimeOffset = e.DateTimeOffset, Count = e.Count }),
                };
            });

        return _operationNames.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name.Key)
            ?? new AppFailedRequest { Name = name.Key, DataPoints = [] }
        );
    }

    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = await GetApplicationLogAnalyticsWorkspaceIdAsync();

        var interval = GetInterval(range);

        List<string> names = ["altinn_app_lib_processes_started", "altinn_app_lib_processes_completed"];

        var query =
            $@"
                AppMetrics
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where Name in ('{string.Join("','", names)}')
                | summarize Count = sum(Sum) by Name, DateTimeOffset = bin(TimeGenerated, {interval})
                | order by DateTimeOffset desc;";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
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
                    DataPoints = row.Select(e => new DataPoint { DateTimeOffset = e.DateTimeOffset, Count = e.Count }),
                };
            });

        return names.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name) ?? new AppMetric { Name = name, DataPoints = [] }
        );
    }

    public Uri GetLogsUrl(string subscriptionId, string org, string env, string appName, string metricName, int range)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        if (!_operationNames.TryGetValue(metricName, out var operationNames))
        {
            throw new ArgumentException($"Unknown metric name: {metricName}", nameof(metricName));
        }

        string jsonPath = Path.Combine(AppContext.BaseDirectory, "Clients", "MetricsClient", "logsQueryTemplate.json");
        string jsonTemplate = File.ReadAllText(jsonPath);
        string json = jsonTemplate
            .Replace("{range}", range.ToString())
            .Replace("{durationMs}", (range * 60 * 1000).ToString())
            .Replace("{appName}", appName.Replace("'", "''"))
            .Replace("{operation_Names}", string.Join(", ", operationNames.Select(n => $"'{n}'")))
            .Replace("{operationNames}", string.Join(",", operationNames.Select(n => $"\"{n}\"")));
        var minifiedJson = System.Text.Json.Nodes.JsonNode.Parse(json)?.ToJsonString() ?? string.Empty;

        string encodedLogsQuery = Uri.EscapeDataString(minifiedJson);

        string encodedApplicationInsightsId = Uri.EscapeDataString(
            $"/subscriptions/{subscriptionId}/resourceGroups/monitor-{org}-{env}-rg/providers/Microsoft.Insights/components/{org}-{env}-ai"
        );
        var url =
            $"https://portal.azure.com/#blade/AppInsightsExtension/BladeRedirect/BladeName/searchV1/ResourceId/{encodedApplicationInsightsId}/BladeInputs/{encodedLogsQuery}";

        return new Uri(url);
    }
}
