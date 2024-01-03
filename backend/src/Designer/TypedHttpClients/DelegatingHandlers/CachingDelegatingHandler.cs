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
        internal class CacheEntry
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

            if(_memoryCache.TryGetValue(cacheKey, out CacheEntry cacheEntry))
            {
                return PrepareResponseMessage(cacheEntry);
            }

            var response = await base.SendAsync(request, cancellationToken);

            if (!IsEligibleForCaching(request))
            {
                return response;
            }

            if (response.IsSuccessStatusCode)
            {
                var newCacheEntry = new CacheEntry()
                {
                    Data = await response.Content.ReadAsByteArrayAsync(cancellationToken),
                    StatusCode = response.StatusCode
                };
                _memoryCache.Set(cacheKey, newCacheEntry, new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromSeconds(_cacheExpiryInSeconds)));
                response.Dispose();
                return PrepareResponseMessage(newCacheEntry);
            }

            return response;
        }

        /// <summary>
        /// Should cache only idempotent http methods. Currently only Get method is needed.
        /// </summary>
        private static bool IsEligibleForCaching(HttpRequestMessage requestMessage) => requestMessage.Method == HttpMethod.Get;

        private static HttpResponseMessage PrepareResponseMessage(CacheEntry cacheEntry)
        {
            HttpResponseMessage responseMessage = new HttpResponseMessage(cacheEntry.StatusCode);
            responseMessage.Content = new ByteArrayContent(cacheEntry.Data);
            return responseMessage;
        }
    }
}
