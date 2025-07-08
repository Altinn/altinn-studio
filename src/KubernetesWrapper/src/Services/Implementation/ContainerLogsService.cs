using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using KubernetesWrapper.Configuration;
using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace KubernetesWrapper.Services.Implementation;

/// <summary>
/// Service containing all actions related to container logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ContainerLogsService"/> class
/// </remarks>
/// <param name="generalSettings">The general settings</param>
/// <param name="logsQueryClient">The logs query client for querying logs from Azure Monitor</param>
public class ContainerLogsService(IOptions<GeneralSettings> generalSettings, LogsQueryClient logsQueryClient) : IContainerLogsService
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<ContainerLog>> GetAll(string app = null, int take = 50, double time = 1, CancellationToken cancellationToken = default)
    {
        string logAnalyticsWorkspaceId = _generalSettings.OperationalLogAnalyticsWorkspaceId;

        if (string.IsNullOrWhiteSpace(logAnalyticsWorkspaceId))
        {
            throw new InvalidOperationException("Configuration value 'OperationalLogAnalyticsWorkspaceId' is missing or empty.");
        }

        string appNameFilter = string.IsNullOrWhiteSpace(app)
            ? string.Empty
            : $" | where PodName has '{app.Replace("'", "''")}'";

        var query = $@"
                ContainerLogV2{appNameFilter}
                | where LogSource == 'stderr'
                | where ContainerName == 'deployment'
                | project TimeGenerated, LogMessage
                | take {take}";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows.Select(row => new ContainerLog
        {
            TimeGenerated = row.GetDateTimeOffset("TimeGenerated")?.UtcDateTime ?? DateTime.MinValue,
            LogMessage = row.GetString("LogMessage") ?? string.Empty,
        });
    }
}
