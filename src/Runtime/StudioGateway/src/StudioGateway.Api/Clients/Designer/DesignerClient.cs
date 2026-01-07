using Microsoft.Extensions.Options;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.Designer;

internal sealed class DesignerClient(IHttpClientFactory httpClientFactory, IOptionsMonitor<GatewayContext> gatewayContextMonitor)
{
    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(string environement, CancellationToken cancellationToken)
    {
        var httpClient = httpClientFactory.CreateClient(environement);
        var gatewayContext = gatewayContextMonitor.CurrentValue;
        string org = gatewayContext.ServiceOwner;
        string env = gatewayContext.Environment;
        Uri requestUrl = new($"admin/alerts/{org}/{env}", UriKind.Relative);

        using HttpResponseMessage response = await httpClient.PostAsync(requestUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
