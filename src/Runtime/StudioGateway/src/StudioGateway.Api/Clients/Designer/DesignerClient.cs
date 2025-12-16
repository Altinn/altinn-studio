using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.Designer;

internal sealed class DesignerClient(IHttpClientFactory httpClientFactory, GatewayContext gatewayContext)
{
    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(string environnement, CancellationToken cancellationToken)
    {
        var httpClient = httpClientFactory.CreateClient(environnement);
        string org = gatewayContext.ServiceOwner;
        string env = gatewayContext.Environment;
        Uri requestUrl = new($"admin/alerts/{org}/{env}", UriKind.Relative);

        HttpResponseMessage response = await httpClient.PostAsync(requestUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
