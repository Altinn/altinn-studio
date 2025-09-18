using Altinn.Studio.Admin.Configuration;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Admin.Services;

public class AzureMonitorClientService(IOptions<GeneralSettings> generalSettings, LogsQueryClient logsQueryClient) : IAzureMonitorClientService
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetMetrics(string org, string env, IEnumerable<string> names, int time, int take, string? app, CancellationToken cancellationToken = default)
    {
        if (!names.Any()) return [];

        string logAnalyticsWorkspaceId = _generalSettings.ApplicationLogAnalyticsWorkspaceId;

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
    public async Task<IEnumerable<AppMetric>> GetFailedRequests(string org, string env, int time, int take, string? app, CancellationToken cancellationToken = default)
    {
        string logAnalyticsWorkspaceId = _generalSettings.ApplicationLogAnalyticsWorkspaceId;

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
                | join kind=leftanti (
                    AppExceptions
                    | where ClientType != 'Browser'
                    | where ExceptionType !in (
                        'System.Threading.Tasks.TaskCanceledException',
                        'System.Net.Sockets.SocketException',
                        'System.ComponentModel.DataAnnotations.ValidationException',
                        'Altinn.App.Core.Features.Correspondence.Exceptions.CorrespondenceArgumentException',
                        'System.Security.Cryptography.CryptographicException'
                    )
                ) on OperationId
                | summarize Count = sum(ItemCount) by AppRoleName, DateTimeOffset = bin(TimeGenerated, 1h)
                | order by DateTimeOffset asc";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows
        .Select(row => new
        {
            AppName = row.GetString("AppRoleName"),
            Name = "failed_requests",
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
                var test = g.Sum(e => e.Count);

                return new Metric
                {
                    Name = g.Key,
                    DataPoints = g.Select(e => new MetricDataPoint
                    {
                        DateTimeOffset = e.DateTimeOffset,
                        Count = e.Count,
                    }),
                    Count = test,
                    IsError = test > 0,
                };
            })
        }
        );
    }
}
