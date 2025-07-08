using Azure;
using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using KubernetesWrapper.Configuration;
using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace KubernetesWrapper.Services.Implementation;

/// <summary>
/// Service containing all actions related to operational logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="OperationalLogsService"/> class
/// </remarks>
/// <param name="generalSettings">The general settings</param>
public class OperationalLogsService(IOptions<GeneralSettings> generalSettings) : IOperationalLogsService
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Log>> GetLogs(string app = null, int take = 50, double time = 1, CancellationToken cancellationToken = default)
    {
        string operationalLawWorkspaceId = _generalSettings.OperationalLawWorkspaceId;

        if (string.IsNullOrWhiteSpace(operationalLawWorkspaceId))
        {
            throw new InvalidOperationException("Configuration value 'OperationalLawWorkspaceId' is missing or empty.");
        }

        var client = new LogsQueryClient(new DefaultAzureCredential());

        string appNameFilter = string.IsNullOrWhiteSpace(app)
            ? string.Empty
            : $" | where PodName has '{app}'";

        var query = $@"
                ContainerLogV2{appNameFilter}
                | where LogSource == 'stderr'
                | where ContainerName == 'deployment'
                | serialize | extend RowNumber = row_number() | order by RowNumber asc
                | project TimeGenerated, LogMessage
                | take {take}";

        Response<LogsQueryResult> response = await client.QueryWorkspaceAsync(operationalLawWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows.Select(row => new Log
        {
            TimeGenerated = row.GetDateTimeOffset("TimeGenerated")?.UtcDateTime ?? DateTime.MinValue,
            Message = row.GetString("LogMessage") ?? string.Empty,
        });
    }
}
