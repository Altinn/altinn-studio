using System.Globalization;
using System.Text.Json;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;
using Altinn.Studio.Gateway.Api.Settings;
using Azure;
using Azure.Core;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;
using Azure.ResourceManager.OperationalInsights;

namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient;

internal sealed class AzureMonitorClient(GatewayContext gatewayContext, LogsQueryClient logsQueryClient)
    : IMetricsClient
{
    private ResourceIdentifier? _workspaceId;

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
            "failed_instance_creation_requests",
            [
                "POST Instances/Post [app/org]",
                "POST Instances/PostSimplified [app/org]",
                "POST {org}/{app}/instances",
                "POST {org}/{app}/instances/create",
            ]
        },
    };

    internal static IReadOnlyCollection<string> OperationNameKeys { get; } = _operationNames.Keys.ToArray();

    internal static int GetBucketSize(int range)
    {
        var maxPoints = 12;
        return Math.Max(1, range / maxPoints);
    }

    private static string GetInterval(int range)
    {
        var bucketSize = GetBucketSize(range);
        return bucketSize >= 60 ? $"{bucketSize / 60}h" : $"{bucketSize}m";
    }

    private async Task<ResourceIdentifier> GetApplicationLogAnalyticsWorkspaceIdAsync()
    {
        return _workspaceId ??= OperationalInsightsWorkspaceResource.CreateResourceIdentifier(
            gatewayContext.AzureSubscriptionId,
            $"monitor-{gatewayContext.ServiceOwner}-{gatewayContext.Environment}-rg",
            $"application-{gatewayContext.ServiceOwner}-{gatewayContext.Environment}-law"
        );
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
                | summarize Count = count() by AppRoleName, OperationName;";

        Response<LogsQueryResult> response = await logsQueryClient.QueryResourceAsync(
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
                | summarize Count = count() by OperationName, DateTimeOffset = bin(TimeGenerated, {interval});";

        Response<LogsQueryResult> response = await logsQueryClient.QueryResourceAsync(
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken: cancellationToken
        );

        var metrics = response
            .Value.Table.Rows.GroupBy(row =>
                _operationNames.First(n => n.Value.Contains(row.GetString("OperationName"))).Key
            )
            .Select(group => new AppFailedRequest
            {
                Name = group.Key,
                Timestamps = group.Select(row =>
                    row.GetDateTimeOffset("DateTimeOffset")?.ToUnixTimeMilliseconds() ?? 0
                ),
                Counts = group.Select(row => row.GetDouble("Count") ?? 0),
            });

        return _operationNames.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name.Key)
            ?? new AppFailedRequest
            {
                Name = name.Key,
                Timestamps = [],
                Counts = [],
            }
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

        List<string> names = ["altinn_app_lib_processes_started", "altinn_app_lib_processes_ended"];

        var logAnalyticsWorkspaceId = await GetApplicationLogAnalyticsWorkspaceIdAsync();

        var interval = GetInterval(range);

        var query =
            $@"
                AppMetrics
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where Name in ('{string.Join("','", names)}')
                | summarize Count = sum(Sum) by Name, DateTimeOffset = bin(TimeGenerated, {interval});";

        Response<LogsQueryResult> response = await logsQueryClient.QueryResourceAsync(
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken: cancellationToken
        );

        var metrics = response
            .Value.Table.Rows.GroupBy(row => row.GetString("Name"))
            .Select(group => new AppMetric
            {
                Name = group.Key,
                Timestamps = group.Select(row =>
                    row.GetDateTimeOffset("DateTimeOffset")?.ToUnixTimeMilliseconds() ?? 0
                ),
                Counts = group.Select(row => row.GetDouble("Count") ?? 0),
            });

        return names.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name)
            ?? new AppMetric
            {
                Name = name,
                Timestamps = [],
                Counts = [],
            }
        );
    }

    public Uri GetLogsUrl(
        string subscriptionId,
        string org,
        string env,
        IReadOnlyCollection<string> apps,
        string metricName,
        DateTimeOffset from,
        DateTimeOffset to
    )
    {
        if (!_operationNames.TryGetValue(metricName, out var operationNames))
            throw new ArgumentException(
                $"Unknown metricName '{metricName}'. Valid values: {string.Join(", ", OperationNameKeys)}",
                nameof(metricName)
            );

        string jsonPath = Path.Combine(AppContext.BaseDirectory, "Clients", "MetricsClient", "logsQueryTemplate.json");
        var fromUtc = from.ToUniversalTime();
        var toUtc = to.ToUniversalTime();
        var durationMs = (long)(toUtc - fromUtc).TotalMilliseconds;
        string jsonTemplate = File.ReadAllText(jsonPath);
        string json = jsonTemplate
            .Replace("{from}", fromUtc.ToString("O", CultureInfo.InvariantCulture))
            .Replace("{to}", toUtc.ToString("O", CultureInfo.InvariantCulture))
            .Replace("{durationMs}", durationMs.ToString(CultureInfo.InvariantCulture))
            .Replace("{app_Names}", string.Join(", ", apps.Select(n => $"'{n.Replace("'", "''")}'")))
            .Replace("{operation_Names}", string.Join(", ", operationNames.Select(n => $"'{n}'")))
            .Replace("\"{appNames}\"", string.Join(", ", apps.Select(name => $"\"{JsonEncodedText.Encode(name)}\"")))
            .Replace("\"{operationNames}\"", string.Join(",", operationNames.Select(n => $"\"{n}\"")));
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
