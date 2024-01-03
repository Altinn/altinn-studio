using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Designer.Tests.TypedHttpClients.DelegatingHandlers
{
    public class CachingDelegatingHandlerTests
    {
        [Theory]
        [InlineData(new byte[] { 1, 2, 3 })]
        public async Task Get_ShouldUseCache(byte[] expectedResponse)
        {
            IMemoryCache memoryCache = new MemoryCache(new MemoryCacheOptions());
            using CachingDelegatingHandler handler = new CachingDelegatingHandler(memoryCache, 10)
            {
                InnerHandler = new HttpClientHandler()
                {
                    AllowAutoRedirect = true
                }
            };

            using HttpClient client = new HttpClient(handler);

            CachingDelegatingHandler.CacheResponseDataEntry cacheResponseDataEntry = new CachingDelegatingHandler.CacheResponseDataEntry()
            {
                Data = expectedResponse,
                StatusCode = System.Net.HttpStatusCode.OK
            };

            memoryCache.Set($"{HttpMethod.Get}_http://nonexistingurl1234.no/", cacheResponseDataEntry);

            var response = await client.GetAsync("http://nonexistingurl1234.no/");

            byte[] responseArray = await response.Content.ReadAsByteArrayAsync();
            responseArray.Should().BeEquivalentTo(expectedResponse);
        }

        [Fact]
        public async Task Get_ShouldBeCached()
        {
            IMemoryCache memoryCache = new MemoryCache(new MemoryCacheOptions());
            using CachingDelegatingHandler handler = new CachingDelegatingHandler(memoryCache, 120)
            {
                InnerHandler = new HttpClientHandler()
                {
                    AllowAutoRedirect = true
                }
            };

            using HttpClient client = new HttpClient(handler);

            var response = await client.GetAsync("https://info.altinn.no/");

            response.IsSuccessStatusCode.Should().BeTrue();
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

            memoryCache.TryGetValue($"{HttpMethod.Get}_https://info.altinn.no/", out CachingDelegatingHandler.CacheResponseDataEntry _).Should().BeTrue();
        }
    }
}
