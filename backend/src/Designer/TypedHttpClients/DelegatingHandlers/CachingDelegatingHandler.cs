using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers
{
    public class CachingDelegatingHandler : DelegatingHandler
    {
        /// If needed add headers to the cache key
        internal class CacheResponseDataEntry
        {
            public byte[] Data { get; set; }
            public HttpStatusCode StatusCode { get; set; }
        }

        private readonly IMemoryCache _memoryCache;
        private readonly int _cacheExpiryInSeconds;

        public CachingDelegatingHandler(IMemoryCache memoryCache, int cacheExpiryInSeconds = 60 * 60 * 2)
        {
            _memoryCache = memoryCache;
            _cacheExpiryInSeconds = cacheExpiryInSeconds;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string cacheKey = $"{request.Method}_{request.RequestUri}";

            if (IsEligibleForCaching(request) && _memoryCache.TryGetValue(cacheKey, out CacheResponseDataEntry cacheEntry))
            {
                return GetCachedResponseMessage(cacheEntry);
            }

            var response = await base.SendAsync(request, cancellationToken);

            if (!IsEligibleForCaching(request) || !response.IsSuccessStatusCode)
            {
                return response;
            }

            var newCacheEntry = new CacheResponseDataEntry()
            {
                Data = await response.Content.ReadAsByteArrayAsync(cancellationToken),
                StatusCode = response.StatusCode
            };
            _memoryCache.Set(cacheKey, newCacheEntry, new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromSeconds(_cacheExpiryInSeconds)));
            response.Dispose();
            return GetCachedResponseMessage(newCacheEntry);
        }

        /// <summary>
        /// Should cache only idempotent http methods. Currently only Get method is needed.
        /// </summary>
        private static bool IsEligibleForCaching(HttpRequestMessage requestMessage) => requestMessage.Method == HttpMethod.Get;

        private static HttpResponseMessage GetCachedResponseMessage(CacheResponseDataEntry cacheResponseDataEntry)
        {
            HttpResponseMessage responseMessage = new HttpResponseMessage(cacheResponseDataEntry.StatusCode);
            responseMessage.Content = new ByteArrayContent(cacheResponseDataEntry.Data);
            return responseMessage;
        }
    }
}
