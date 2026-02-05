using System.Net.Http.Json;
using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.AltinnCdn;

internal static class AltinnCdnClientDI
{
    internal static void AddAltinnCdnClient(this IServiceCollection services)
    {
        services.AddHybridCache();
        services.AddHttpClient(nameof(AltinnCdnClient));
        services.AddSingleton<IAltinnCdnClient, AltinnCdnClient>();
    }
}

internal sealed class AltinnCdnClient : IAltinnCdnClient
{
    private const string CacheKey = "altinn-cdn-org-details";
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly HybridCacheEntryOptions _cacheOptions = new()
    {
        Expiration = TimeSpan.FromHours(24),
        LocalCacheExpiration = TimeSpan.FromHours(24),
    };

    private readonly HybridCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppMetadata _appMetadata;

    private AltinnCdnOrgDetails? _lastKnownGood;

    public AltinnCdnClient(HybridCache cache, IHttpClientFactory httpClientFactory, IAppMetadata appMetadata)
    {
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _appMetadata = appMetadata;
    }

    public async Task<AltinnCdnOrgDetails?> GetOrgDetails(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _cache.GetOrCreateAsync(
                CacheKey,
                FetchOrgDetails,
                _cacheOptions,
                cancellationToken: cancellationToken
            );
        }
        catch (Exception ex) when (_lastKnownGood is not null && IsTransientError(ex))
        {
            // Return stale data on transient errors
            // Cache miss means next call will retry (with stampede protection from HybridCache)
            return _lastKnownGood;
        }
    }

    private async ValueTask<AltinnCdnOrgDetails?> FetchOrgDetails(CancellationToken cancellationToken)
    {
        var httpClient = _httpClientFactory.CreateClient(nameof(AltinnCdnClient));
        AltinnCdnOrgs orgs =
            await httpClient.GetFromJsonAsync<AltinnCdnOrgs>(
                requestUri: "https://altinncdn.no/orgs/altinn-orgs.json",
                options: _jsonOptions,
                cancellationToken: cancellationToken
            ) ?? throw new JsonException("Received literal \"null\" response from Altinn CDN");

        var appMetadata = await _appMetadata.GetApplicationMetadata();
        AltinnCdnOrgDetails? orgDetails = orgs.Orgs?.GetValueOrDefault(appMetadata.Org);

        // Inject Digdir's organisation number for TTD, because TTD does not have an organisation number
        if (
            orgDetails is not null
            && string.Equals(appMetadata.Org, "ttd", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrEmpty(orgDetails.Orgnr)
            && !orgs.Orgs.IsNullOrEmpty()
            && orgs.Orgs.TryGetValue("digdir", out var digdirOrgDetails)
        )
        {
            orgDetails.Orgnr = digdirOrgDetails.Orgnr;
        }

        _lastKnownGood = orgDetails;
        return orgDetails;
    }

    private static bool IsTransientError(Exception ex) =>
        ex is HttpRequestException or TaskCanceledException or OperationCanceledException or JsonException;

    public void Dispose()
    {
        // No resources to dispose - HybridCache is managed by DI
    }
}
