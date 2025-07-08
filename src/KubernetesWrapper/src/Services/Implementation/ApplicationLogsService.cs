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
/// Service containing all actions related to application logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ApplicationLogsService"/> class
/// </remarks>
/// <param name="generalSettings">The general settings</param>
public class ApplicationLogsService(IOptions<GeneralSettings> generalSettings) : IApplicationLogsService
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Log>> GetLogs(string app = null, int take = 50, double time = 1, CancellationToken cancellationToken = default)
    {
        string logAnalyticsWorkspaceId = _generalSettings.ApplicationLogAnalyticsWorkspaceId;

        if (string.IsNullOrWhiteSpace(logAnalyticsWorkspaceId))
        {
            throw new InvalidOperationException("Configuration value 'ApplicationLogAnalyticsWorkspaceId' is missing or empty.");
        }

        var client = new LogsQueryClient(new DefaultAzureCredential());

        string appNameFilter = string.IsNullOrWhiteSpace(app)
            ? string.Empty
            : $" | where AppRoleName has '{app}'";

        var query = $@"
                AppExceptions{appNameFilter}
                | project TimeGenerated, Details
                | take {take}";

        Response<LogsQueryResult> response = await client.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows.Select(row => new Log
        {
            TimeGenerated = row.GetDateTimeOffset("TimeGenerated")?.UtcDateTime ?? DateTime.MinValue,
            Message = row.GetString("Details") ?? string.Empty,
        });
    }
}
