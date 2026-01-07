using Microsoft.Extensions.Options;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.Designer;

internal sealed class DesignerClient(IHttpClientFactory httpClientFactory, IOptionsMonitor<GatewayContext> gatewayContextMonitor)
{
    private GatewayContext _gatewayContext => gatewayContextMonitor.CurrentValue;

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(string environement, CancellationToken cancellationToken)
    {
        var httpClient = httpClientFactory.CreateClient(environement);
        string org = _gatewayContext.ServiceOwner;
        string env = _gatewayContext.Environment;
        Uri requestUrl = new($"admin/alerts/{org}/{env}", UriKind.Relative);

        using HttpResponseMessage response = await httpClient.PostAsync(requestUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
