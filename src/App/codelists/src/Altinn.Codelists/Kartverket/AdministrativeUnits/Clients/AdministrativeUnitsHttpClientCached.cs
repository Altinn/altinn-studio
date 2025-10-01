using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;

/// <summary>
/// Http client to get information on norways offical administrative units for counties and municipalities.
/// This class caches the information for performance reasons to avoid costly http calls.
/// </summary>
internal sealed class AdministrativeUnitsHttpClientCached : IAdministrativeUnitsClient
{
    private const string COUNTIES_CACHE_KEY = "counties";
    private const string MUNICIPALITIES_CACHE_KEY_BASE = "municipalities";

    private readonly IAdministrativeUnitsClient _administrativeUnitsClient;
    private readonly IMemoryCache _memoryCache;
    private readonly Func<MemoryCacheEntryOptions> _getCacheEntryOptions;

    /// <summary>
    /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClientCached"/> class.
    /// </summary>
    public AdministrativeUnitsHttpClientCached(IAdministrativeUnitsClient countiesClient, IMemoryCache memoryCache)
        : this(countiesClient, memoryCache, DefaultCacheEntryOptions) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClientCached"/> class.
    /// </summary>
    public AdministrativeUnitsHttpClientCached(
        IAdministrativeUnitsClient countiesClient,
        IMemoryCache memoryCache,
        Func<MemoryCacheEntryOptions> getCacheEntryOptionsFunc
    )
    {
        _administrativeUnitsClient = countiesClient;
        _memoryCache = memoryCache;
        _getCacheEntryOptions = getCacheEntryOptionsFunc;
    }

    /// <inheritdoc/>
    public async Task<List<County>> GetCounties()
    {
        var counties = await _memoryCache.GetOrCreateAsync(
            COUNTIES_CACHE_KEY,
            async cacheEntry =>
            {
                var cacheEntryOptions = _getCacheEntryOptions.Invoke();
                cacheEntry.SetOptions(cacheEntryOptions);

                return await _administrativeUnitsClient.GetCounties();
            }
        );

        return counties ?? new List<County>();
    }

    /// <inheritdoc/>
    public async Task<List<Municipality>> GetMunicipalities()
    {
        var municipalities = await _memoryCache.GetOrCreateAsync(
            MUNICIPALITIES_CACHE_KEY_BASE,
            async cacheEntry =>
            {
                var cacheEntryOptions = _getCacheEntryOptions.Invoke();
                cacheEntry.SetOptions(cacheEntryOptions);
                var data = await _administrativeUnitsClient.GetMunicipalities();

                if (data is null)
                {
                    cacheEntry.Dispose();
                    return null;
                }

                return data;
            }
        );

        return municipalities ?? new List<Municipality>();
    }

    /// <inheritdoc/>
    public async Task<List<Municipality>> GetMunicipalities(string countyNumber)
    {
        var counties = await GetCounties();
        if (counties.FirstOrDefault(c => c.Number == countyNumber) == null)
        {
            return new List<Municipality>();
        }

        var municipalities = await _memoryCache.GetOrCreateAsync(
            $"county-{countyNumber}-{MUNICIPALITIES_CACHE_KEY_BASE}",
            async cacheEntry =>
            {
                var cacheEntryOptions = _getCacheEntryOptions.Invoke();
                cacheEntry.SetOptions(cacheEntryOptions);

                var data = await _administrativeUnitsClient.GetMunicipalities(countyNumber);

                if (data is null)
                {
                    cacheEntry.Dispose();
                    return null;
                }

                return data;
            }
        );

        return municipalities ?? new List<Municipality>();
    }

    // Expires the cache entry at midnight, to get potential new or removed entries.
    private static MemoryCacheEntryOptions DefaultCacheEntryOptions()
    {
        DateTime expirationTime = DateTime.Today.AddDays(1);

        return new MemoryCacheEntryOptions()
        {
            AbsoluteExpiration = expirationTime,
            Priority = CacheItemPriority.Normal,
        };
    }
}
