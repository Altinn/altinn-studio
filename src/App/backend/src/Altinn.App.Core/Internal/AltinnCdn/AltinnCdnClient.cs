using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.AltinnCdn;

internal static class AltinnCdnClientDI
{
    internal static void AddAltinnCdnClient(this IServiceCollection services)
    {
        services.AddHttpClient(nameof(AltinnCdnClient));
        services.AddSingleton<IAltinnCdnClient, AltinnCdnClient>();
    }
}

internal sealed class AltinnCdnClient : IAltinnCdnClient
{
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan _cacheDuration = TimeSpan.FromHours(24);
    private static readonly TimeSpan _retryDelay = TimeSpan.FromMinutes(5);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    private AltinnCdnOrgs? _cached;
    private DateTimeOffset _cacheExpiry = DateTimeOffset.MinValue;

    public AltinnCdnClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AltinnCdnOrgs> GetOrgs(CancellationToken cancellationToken = default)
    {
        if (_cached is not null && DateTimeOffset.UtcNow < _cacheExpiry)
        {
            return _cached;
        }

        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring semaphore
            if (_cached is not null && DateTimeOffset.UtcNow < _cacheExpiry)
            {
                return _cached;
            }

            var httpClient = _httpClientFactory.CreateClient(nameof(AltinnCdnClient));
            AltinnCdnOrgs orgs =
                await httpClient.GetFromJsonAsync<AltinnCdnOrgs>(
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

            _cached = orgs;
            _cacheExpiry = DateTimeOffset.UtcNow + _cacheDuration;
            return orgs;
        }
        catch when (_cached is not null)
        {
            // Return stale cached data on failure, but retry sooner
            _cacheExpiry = DateTimeOffset.UtcNow + _retryDelay;
            return _cached;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public void Dispose()
    {
        _semaphore.Dispose();
    }
}
