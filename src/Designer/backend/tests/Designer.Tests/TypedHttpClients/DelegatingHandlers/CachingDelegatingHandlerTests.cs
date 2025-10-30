#nullable disable
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Designer.Tests.TypedHttpClients.DelegatingHandlers
{
    public class CachingDelegatingHandlerTests
    {
        readonly IMemoryCache _memoryCache = new MemoryCache(new MemoryCacheOptions());

        private CachingDelegatingHandler GenerateCachingDelegatingHandler() => new(_memoryCache, 10)
        {
            InnerHandler = new HttpClientHandler()
            {
                AllowAutoRedirect = true
            }
        };

        [Theory]
        [InlineData(new byte[] { 1, 2, 3 })]
        public async Task Get_ShouldUseCache(byte[] expectedResponse)
        {
            using CachingDelegatingHandler handler = GenerateCachingDelegatingHandler();

            using HttpClient client = new(handler);

            CachingDelegatingHandler.CacheResponseDataEntry cacheResponseDataEntry = new()
            {
                Data = expectedResponse,
                StatusCode = System.Net.HttpStatusCode.OK
            };

            _memoryCache.Set($"{HttpMethod.Get}_http://nonexistingurl1234.no/", cacheResponseDataEntry);

            var response = await client.GetAsync("http://nonexistingurl1234.no/");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            byte[] responseArray = await response.Content.ReadAsByteArrayAsync();
            Assert.Equal(expectedResponse, responseArray);
        }

        [Fact]
        public async Task NonGetRequest_Keep_StatusCode()
        {
            using CachingDelegatingHandler handler = GenerateCachingDelegatingHandler();

            using HttpClient client = new(handler);

            var response = await client.PostAsync("https://docs.altinn.studio/", null);

            Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        }

        [Fact]
        public async Task NonSuccessGetRequest_Keep_StatusCode()
        {
            using CachingDelegatingHandler handler = GenerateCachingDelegatingHandler();

            using HttpClient client = new(handler);

            var response = await client.GetAsync("https://docs.altinn.studio/nonexisting");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Get_ShouldBeCached()
        {
            using CachingDelegatingHandler handler = GenerateCachingDelegatingHandler();

            using HttpClient client = new HttpClient(handler);

            var response = await client.GetAsync("https://docs.altinn.studio/");

            Assert.True(response.IsSuccessStatusCode);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Assert.True(_memoryCache.TryGetValue($"{HttpMethod.Get}_https://docs.altinn.studio/", out CachingDelegatingHandler.CacheResponseDataEntry _));
        }
    }
}
