using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.StudioClient;

internal sealed class StudioClient(HttpClient httpClient, GatewayContext gatewayContext) : IStudioClient
{
    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(CancellationToken cancellationToken)
    {
        string org = gatewayContext.ServiceOwner;
        string env = gatewayContext.Environment;
        Uri requestUrl = new($"admin/alerts/{org}/{env}", UriKind.Relative);

        HttpResponseMessage response = await httpClient.PostAsync(requestUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
