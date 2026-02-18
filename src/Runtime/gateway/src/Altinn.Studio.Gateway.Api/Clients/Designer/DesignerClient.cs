using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.Designer;

internal sealed class DesignerClient(
    IHttpClientFactory httpClientFactory,
    IOptionsMonitor<GatewayContext> gatewayContextMonitor
)
{
    private GatewayContext _gatewayContext => gatewayContextMonitor.CurrentValue;

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(Alert alert, string environment, CancellationToken cancellationToken)
    {
        var httpClient = httpClientFactory.CreateClient(environment);
        string org = _gatewayContext.ServiceOwner;
        string env = _gatewayContext.Environment;
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
