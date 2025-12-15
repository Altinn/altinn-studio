using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class StudioClient(HttpClient httpClient, IOptions<GatewayContext> gatewayContext) : IStudioClient
{
    private readonly GatewayContext _gatewayContext = gatewayContext.Value;

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(CancellationToken cancellationToken)
    {
        string org = _gatewayContext.ServiceOwner;
        string env = _gatewayContext.Environment;
        Uri requestUrl = new($"admin/alerts/{org}/{env}", UriKind.Relative);

        HttpResponseMessage response = await httpClient.PostAsync(requestUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
