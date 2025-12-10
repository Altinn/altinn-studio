using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class StudioClient(HttpClient httpClient, IOptions<GeneralSettings> generalSettings) : IStudioClient
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(CancellationToken cancellationToken)
    {
        string org = _generalSettings.ServiceOwner;
        string env = _generalSettings.Environment;

        string url = $"/admin/alerts/{org}/{env}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
