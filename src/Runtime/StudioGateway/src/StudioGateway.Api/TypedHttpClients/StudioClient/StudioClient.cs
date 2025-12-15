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
        Uri requestUrl = new($"admin/alerts/{org}/{env}", UriKind.Relative);

        HttpResponseMessage response = await httpClient.PostAsync(requestUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
