using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

public class StudioClient(
    HttpClient httpClient,
    IConfiguration configuration,
    IOptions<StudioClientSettings> studioSettings
) : IStudioClient
{
    private readonly StudioClientSettings _studioSettings = studioSettings.Value;

    /// <inheritdoc />
    public async Task UpsertFiringAlertsAsync(CancellationToken cancellationToken)
    {
        string apiToken = _studioSettings.Token;

        string org = configuration["GATEWAY_SERVICEOWNER"];
        string env = configuration["GATEWAY_ENVIRONMENT"];

        string baseUri = _studioSettings.BaseUri;
        string url = $"{baseUri}/admin/alerts/{org}/{env}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
