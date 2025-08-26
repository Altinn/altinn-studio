using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using KubernetesWrapper.Configuration;
using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace KubernetesWrapper.Services.Implementation;

/// <summary>
/// Service containing all actions related to logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="LogsService"/> class
/// </remarks>
/// <param name="generalSettings">The general settings</param>
/// <param name="logsQueryClient">The logs query client for querying logs from Azure Monitor</param>
public class LogsService(IOptions<GeneralSettings> generalSettings, LogsQueryClient logsQueryClient) : ILogsService
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Log>> GetAll(string app, int take, double time, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThan(take, LogQueryLimits.MaxTake);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(time, LogQueryLimits.MaxTime);

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
            DateTimeOffset = row.GetDateTimeOffset("DateTimeOffset").Value,
            Count = row.GetInt32("Count") ?? int.MaxValue
        })
        .GroupBy(row => row.AppName)
        .Select(row => new Log
        {
            AppName = row.Key,
            DataPoints = row.Select(e => new LogDataPoint
            {
                DateTimeOffset = e.DateTimeOffset,
                Count = e.Count
            })
        });
    }
}
