using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class StudioClient(
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

        string org =
            configuration["GATEWAY_SERVICEOWNER"]
            ?? throw new InvalidOperationException("Configuration value 'GATEWAY_SERVICEOWNER' is missing.");
        string env =
            configuration["GATEWAY_ENVIRONMENT"]
            ?? throw new InvalidOperationException("Configuration value 'GATEWAY_ENVIRONMENT' is missing.");

        string baseUri = _studioSettings.BaseUri;
        string url = $"{baseUri}/admin/alerts/{org}/{env}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
