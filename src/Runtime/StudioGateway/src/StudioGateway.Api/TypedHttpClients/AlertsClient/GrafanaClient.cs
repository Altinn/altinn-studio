using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.AlertsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class GrafanaClient(HttpClient httpClient) : IAlertsClient
{
    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken)
    {
        string requestUrl = "/api/v1/provisioning/alert-rules";
        var alerts = await httpClient.GetFromJsonAsync<List<GrafanaAlertRule>>(requestUrl, cancellationToken) ?? [];
        return alerts?.Select(alert =>
            {
                return new AlertRule
                {
                    Id = alert.Id,
                    Uid = alert.Uid,
                    FolderUid = alert.FolderUid,
                    RuleGroup = alert.RuleGroup,
                    Title = alert.Title,
                    Updated = alert.Updated,
                    NoDataState = alert.NoDataState,
                    ExecErrState = alert.ExecErrState,
                    For = alert.For,
                    IsPaused = alert.IsPaused,
                };
            }) ?? [];
    }
}
