using Azure;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using KubernetesWrapper.Configuration;
using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace KubernetesWrapper.Services.Implementation;

/// <summary>
/// Service containing all actions related to application exceptions
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="AppExceptionsService"/> class
/// </remarks>
/// <param name="generalSettings">The general settings</param>
/// <param name="logsQueryClient">The logs query client for querying logs from Azure Monitor</param>
public class AppExceptionsService(IOptions<GeneralSettings> generalSettings, LogsQueryClient logsQueryClient) : IAppExceptionsService
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<AppException>> GetAll(string app = null, int take = 50, double time = 1, CancellationToken cancellationToken = default)
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
                AppExceptions{appNameFilter}
                | project TimeGenerated, Details
                | take {take}";

        Response<LogsQueryResult> response = await logsQueryClient.QueryWorkspaceAsync(logAnalyticsWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)), cancellationToken: cancellationToken);

        return response.Value.Table.Rows.Select(row => new AppException
        {
            TimeGenerated = row.GetDateTimeOffset("TimeGenerated")?.UtcDateTime ?? DateTime.MinValue,
            Details = row.GetString("Details") ?? string.Empty,
        });
    }
}
