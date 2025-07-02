using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.Tests.SSB.Mocks;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Codelists.Tests.SSB.Clients;

public class ClassificationsHttpClientCachedTests
{
    [Fact]
    public async Task GetCodes_EmptyCache_ShouldReturnValues()
    {
        var classificationsHttpClientMock = new ClassificationsHttpClientMock(
            Options.Create(new ClassificationSettings())
        );
        var classificationsHttpClientCached = new ClassificationsHttpClientCached(
            classificationsHttpClientMock,
            new MemoryCache(new MemoryCacheOptions())
        );

        var maritalStatus = await classificationsHttpClientCached.GetClassificationCodes(19);

        Assert.Equal(9, maritalStatus.Codes.Count);
    }

    [Fact]
    public async Task GetCounties_CacheFilled_ShouldReturnFromCache()
    {
        var classificationsHttpClientMock = new ClassificationsHttpClientMock(
            Options.Create(new ClassificationSettings())
        );
        var classificationsHttpClientCached = new ClassificationsHttpClientCached(
            classificationsHttpClientMock,
            new MemoryCache(new MemoryCacheOptions())
        );

        // First request will fill the cache
        _ = await classificationsHttpClientCached.GetClassificationCodes(19);

        // Second request should not trigger another http request from the client
        var maritalStatus = await classificationsHttpClientCached.GetClassificationCodes(19);

        Assert.Equal(9, maritalStatus.Codes.Count);
        Assert.Equal(
            1,
            classificationsHttpClientMock.HttpMessageHandlerMock.GetMatchCount(
                classificationsHttpClientMock.MockedMaritalStatusRequest
            )
        );
    }

    [Fact]
    public async Task GetCounties_CacheExpired_ShouldPopulateAgain()
    {
        var classificationsHttpClientMock = new ClassificationsHttpClientMock(
            Options.Create(new ClassificationSettings())
        );
        var classificationsHttpClientCached = new ClassificationsHttpClientCached(
            classificationsHttpClientMock,
            new MemoryCache(new MemoryCacheOptions()),
            () =>
            {
                // Let the cache entry live for 100 milliseconds
                return new MemoryCacheEntryOptions()
                {
                    AbsoluteExpiration = DateTimeOffset.Now.AddMilliseconds(100),
                    Priority = CacheItemPriority.Normal,
                };
            }
        );

        // First request will fill the cache
        await classificationsHttpClientCached.GetClassificationCodes(19);

        // Wait for the cached entry to be evicted
        await Task.Delay(200);

        // This should trigger another http request and fill the cache again
        var maritalStatusCodes = await classificationsHttpClientCached.GetClassificationCodes(19);

        Assert.Equal(9, maritalStatusCodes.Codes.Count);
        Assert.Equal(
            2,
            classificationsHttpClientMock.HttpMessageHandlerMock.GetMatchCount(
                classificationsHttpClientMock.MockedMaritalStatusRequest
            )
        );
    }
}
