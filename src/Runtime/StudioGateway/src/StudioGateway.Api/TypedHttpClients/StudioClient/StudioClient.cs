using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

public class StudioClient(
    HttpClient httpClient,
    IOptions<GeneralSettings> generalSettings,
    IOptions<StudioClientSettings> studioSettings
    ) : IStudioClient
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;
    private readonly StudioClientSettings _studioSettings = studioSettings.Value;

    /// <inheritdoc />
    public async Task UpsertFiringAlertsAsync(CancellationToken cancellationToken)
    {
        string apiToken = _studioSettings.Token;
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        string org = _generalSettings.Org;
        string env = _generalSettings.Env;

        string baseUri = _studioSettings.BaseUri;
        string url = $"{baseUri}/admin/alerts/{org}/{env}";

        HttpResponseMessage response = await httpClient.PostAsync(url, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
