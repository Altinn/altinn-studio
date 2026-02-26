using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;
using Altinn.Studio.Gateway.Api.Settings;

namespace Altinn.Studio.Gateway.Api.Clients.AlertsClient;

internal sealed class GrafanaClient(IHttpClientFactory _httpClientFactory) : IAlertsClient
{
    /// <inheritdoc />
    public async Task<IEnumerable<GrafanaAlertRule>> GetAlertRules(CancellationToken cancellationToken)
    {
        using var httpClient = _httpClientFactory.CreateClient(
            AlertsClientSettings.AlertsClientProvider.Grafana.ToString()
        );
        string requestUrl = "/api/v1/provisioning/alert-rules";
        return await httpClient.GetFromJsonAsync(
                requestUrl,
                AppJsonSerializerContext.Default.IEnumerableGrafanaAlertRule,
                cancellationToken
            ) ?? [];
    }
}
