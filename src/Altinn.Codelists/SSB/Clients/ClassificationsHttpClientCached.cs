using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Codelists.SSB.Clients
{
    /// <summary>
    /// Http client to get classification codes from SSB.
    /// This is a decorator class for <see cref="IClassificationsClient"/> 
    /// that caches the information for performance reasons.
    /// </summary>
    public class ClassificationsHttpClientCached : IClassificationsClient
    {
        private readonly IClassificationsClient _classificationsClient;
        private readonly IMemoryCache _memoryCache;
        private readonly Func<MemoryCacheEntryOptions> _getCacheEntryOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="ClassificationsHttpClientCached"/> class.
        /// </summary>
        public ClassificationsHttpClientCached(IClassificationsClient classificationsClient, IMemoryCache memoryCache) : this(classificationsClient, memoryCache, DefaultCacheEntryOptions)
        {
            _classificationsClient = classificationsClient;
            _memoryCache = memoryCache;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="ClassificationsHttpClientCached"/> class.
        /// </summary>
        public ClassificationsHttpClientCached(IClassificationsClient classificationsClient, IMemoryCache memoryCache, Func<MemoryCacheEntryOptions> getCacheEntryOptionsFunc)
        {
            _classificationsClient = classificationsClient;
            _memoryCache = memoryCache;
            _getCacheEntryOptions = getCacheEntryOptionsFunc;
        }

        /// <inheritdoc/>
        public async Task<ClassificationCodes> GetClassificationCodes(int classificationId, string language = "nb", DateOnly? atDate = null, string level = "", string variant = "", string selectCodes = "")
        {
            var cacheKey = GetCacheKey(classificationId, language, atDate, level, variant, selectCodes);

            var codes = await _memoryCache.GetOrCreateAsync(cacheKey, async cacheEntry =>
            {
                var cacheEntryOptions = _getCacheEntryOptions.Invoke();
                cacheEntry.SetOptions(cacheEntryOptions);
                var data = await _classificationsClient.GetClassificationCodes(classificationId, language, atDate, level, variant, selectCodes);

                if (data is null)
                {
                    cacheEntry.Dispose();
                    return null;
                }

                return data;
            });

            return codes ?? new ClassificationCodes() { Codes = new List<ClassificationCode>() };
        }

        private static string GetCacheKey(int classificationId, string language, DateOnly? atDate, string level, string variant, string selectCodes)
        {
            return $"{classificationId}_{language}_{atDate?.ToString("yyyy-MM-dd")}_{level}_{variant}_{selectCodes}";
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
}
