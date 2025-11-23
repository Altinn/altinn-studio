using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

public class StudioClient(
    HttpClient httpClient,
    IOptions<StudioClientSettings> studioSettings
    ) : IStudioClient
{
    private readonly StudioClientSettings _studioSettings = studioSettings.Value;

    /// <inheritdoc />
    public async Task UpsertFiringAlertsAsync(string org, string env, CancellationToken cancellationToken)
    {
        string apiToken = _studioSettings.Token;
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        string baseUri = _studioSettings.BaseUri;
        string url = $"{baseUri}/admin/alerts/{org}/{env}";

        HttpResponseMessage response = await httpClient.PostAsync(url, null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
