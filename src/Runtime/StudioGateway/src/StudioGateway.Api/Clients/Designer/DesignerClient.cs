using Microsoft.Extensions.Options;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.Designer;

internal sealed class DesignerClient(
    IHttpClientFactory httpClientFactory,
    IOptionsMonitor<GatewayContext> gatewayContextMonitor
)
{
    private GatewayContext _gatewayContext => gatewayContextMonitor.CurrentValue;

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(
        IEnumerable<Alert> alerts,
        string environment,
        CancellationToken cancellationToken
    )
    {
        var httpClient = httpClientFactory.CreateClient(environment);
        string org = _gatewayContext.ServiceOwner;
        string env = _gatewayContext.Environment;
        Uri requestUrl = new($"designer/api/v1/admin/alerts/{org}/{env}", UriKind.Relative);

        using HttpResponseMessage response = await httpClient.PostAsJsonAsync(
            requestUrl,
            alerts,
            AppJsonSerializerContext.Default.IEnumerableAlert,
            cancellationToken
        );
        response.EnsureSuccessStatusCode();
    }
}
