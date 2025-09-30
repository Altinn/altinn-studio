using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.AltinnCdn;

internal static class AltinnCdnClientDI
{
    internal static void AddAltinnCdnClient(this IServiceCollection services) =>
        services.AddHttpClient<IAltinnCdnClient, AltinnCdnClient>();
}

internal sealed class AltinnCdnClient : IAltinnCdnClient
{
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;

    public AltinnCdnClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<AltinnCdnOrgs> GetOrgs(CancellationToken cancellationToken = default)
    {
        AltinnCdnOrgs orgs =
            await _httpClient.GetFromJsonAsync<AltinnCdnOrgs>(
                requestUri: "https://altinncdn.no/orgs/altinn-orgs.json",
                options: _jsonOptions,
                cancellationToken: cancellationToken
            ) ?? throw new JsonException("Received literal \"null\" response from Altinn CDN");

        // Inject Digdir's organisation number for TTD, because TTD does not have an organisation number
        if (
            !orgs.Orgs.IsNullOrEmpty()
            && orgs.Orgs.TryGetValue("ttd", out var ttdOrgDetails)
            && orgs.Orgs.TryGetValue("digdir", out var digdirOrgDetails)
            && string.IsNullOrEmpty(ttdOrgDetails.Orgnr)
        )
        {
            ttdOrgDetails.Orgnr = digdirOrgDetails.Orgnr;
        }

        return orgs;
    }

    public void Dispose()
    {
        // We don't dispose the HttpClient here as it's managed by the HttpClientFactory
    }
}
