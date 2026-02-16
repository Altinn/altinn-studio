using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;

namespace Altinn.Studio.Gateway.Api.Clients.AlertsClient;

internal sealed class GrafanaClient(HttpClient httpClient) : IAlertsClient
{
    /// <inheritdoc />
    public async Task<IEnumerable<GrafanaAlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken)
    {
        string requestUrl = "/api/v1/provisioning/alert-rules";
        return await httpClient.GetFromJsonAsync(
                requestUrl,
                AppJsonSerializerContext.Default.IEnumerableGrafanaAlertRule,
                cancellationToken
            ) ?? [];
    }
}
