using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

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

        public CachingDelegatingHandler(IMemoryCache memoryCache, int cacheExpiryInSeconds = 10 * 60)
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

            MemoryCacheEntryOptions cacheEntryOptions = GenerateMemoryCacheEntryOptions();

            _memoryCache.Set(cacheKey, newCacheEntry, cacheEntryOptions);
            response.Dispose();
            return GetCachedResponseMessage(newCacheEntry);
        }

        private MemoryCacheEntryOptions GenerateMemoryCacheEntryOptions()
        {
            var cancellationTokenSource = new CancellationTokenSource(
                TimeSpan.FromSeconds(_cacheExpiryInSeconds));

            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .AddExpirationToken(
                    new CancellationChangeToken(cancellationTokenSource.Token))
                .RegisterPostEvictionCallback((key, value, reason, state) =>
                {
                    ((CancellationTokenSource)state).Dispose();
                }, cancellationTokenSource);
            return cacheEntryOptions;
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
