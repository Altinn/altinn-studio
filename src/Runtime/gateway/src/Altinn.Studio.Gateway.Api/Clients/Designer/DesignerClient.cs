using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.Designer;

internal sealed class DesignerClient(
    IHttpClientFactory _httpClientFactory,
    IOptionsMonitor<GatewayContext> _gatewayContextMonitor
)
{
    /// <inheritdoc />
    public async Task NotifyAlertsUpdated(Alert alert, string environment, CancellationToken cancellationToken)
    {
        var gatewayContext = _gatewayContextMonitor.CurrentValue;
        using var httpClient = _httpClientFactory.CreateClient(environment);
        string org = gatewayContext.ServiceOwner;
        string env = gatewayContext.Environment;
        Uri requestUrl = new($"designer/api/v1/admin/alerts/{org}/{env}", UriKind.Relative);

        using HttpResponseMessage response = await httpClient.PostAsJsonAsync(
            requestUrl,
            alert,
            AppJsonSerializerContext.Default.Alert,
            cancellationToken
        );
        response.EnsureSuccessStatusCode();
    }
}
