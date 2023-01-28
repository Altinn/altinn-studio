using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;

/// <summary>
/// Http client to get information on norways offical administrative units for counties and communes.
/// This class caches the information for performance reasons to avoid costly http calls.
/// </summary>
public class AdministrativeUnitsHttpClientCached : IAdministrativeUnitsClient
{
    private const string COUNTIES_CACHE_KEY = "counties";
    private const string COMMUNES_CACHE_KEY_BASE = "communes";

    private readonly IAdministrativeUnitsClient _administrativeUnitsClient;
    private readonly IMemoryCache _memoryCache;
    private readonly Func<MemoryCacheEntryOptions> _getCacheEntryOptions;

    /// <summary>
    /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClientCached"/> class.
    /// </summary>
    public AdministrativeUnitsHttpClientCached(IAdministrativeUnitsClient countiesClient, IMemoryCache memoryCache) : this(countiesClient, memoryCache, DefaultCacheEntryOptions)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClientCached"/> class.
    /// </summary>
    public AdministrativeUnitsHttpClientCached(IAdministrativeUnitsClient countiesClient, IMemoryCache memoryCache, Func<MemoryCacheEntryOptions> getCacheEntryOptionsFunc)
    {
        _administrativeUnitsClient = countiesClient;
        _memoryCache = memoryCache;
        _getCacheEntryOptions = getCacheEntryOptionsFunc;
    }

    /// <inheritdoc/>
    public async Task<List<County>> GetCounties()
    {
        var counties = await _memoryCache.GetOrCreateAsync(COUNTIES_CACHE_KEY, async cacheEntry =>
        {
            var cacheEntryOptions = _getCacheEntryOptions.Invoke();
            cacheEntry.SetOptions(cacheEntryOptions);

            return await _administrativeUnitsClient.GetCounties();
        });

        return counties;
    }

    /// <inheritdoc/>
    public async Task<List<Commune>> GetCommunes()
    {
        var communes = await _memoryCache.GetOrCreateAsync(COMMUNES_CACHE_KEY_BASE, async cacheEntry =>
        {
            var cacheEntryOptions = _getCacheEntryOptions.Invoke();
            cacheEntry.SetOptions(cacheEntryOptions);
            return await _administrativeUnitsClient.GetCommunes();
        });

        return communes;
    }

    /// <inheritdoc/>
    public async Task<List<Commune>> GetCommunes(string countyNumber)
    {
        var counties = await GetCounties();
        if (counties.FirstOrDefault(c => c.Number == countyNumber) == null)
        {
            return new List<Commune>();
        }

        var communes = await _memoryCache.GetOrCreateAsync($"county-{countyNumber}-{COMMUNES_CACHE_KEY_BASE}", async cacheEntry =>
        {
            var cacheEntryOptions = _getCacheEntryOptions.Invoke();
            cacheEntry.SetOptions(cacheEntryOptions);

            return await _administrativeUnitsClient.GetCommunes(countyNumber);
        });

        return communes;
    }

    // Expires the cache entry at midnight, to get potential new or removed entries.
    private static MemoryCacheEntryOptions DefaultCacheEntryOptions()
    {
        DateTime expirationTime = DateTime.Today.AddDays(1);

        return new MemoryCacheEntryOptions()
        {
            AbsoluteExpiration = expirationTime,
            Priority = CacheItemPriority.Normal
        };
    }
}
