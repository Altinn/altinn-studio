using System.Net;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.Tests.SSB.Mocks;
using Microsoft.Extensions.Caching.Memory;
using RichardSzalay.MockHttp;

namespace Altinn.Codelists.Tests.SSB.Clients;

public class ClassificationsHttpClientCachedTests
{
    [Theory]
    [InlineData("nb", HttpStatusCode.ServiceUnavailable)]
    [InlineData("nb", HttpStatusCode.NotFound)]
    [InlineData("en", HttpStatusCode.ServiceUnavailable)]
    [InlineData("en", HttpStatusCode.NotFound)]
    [InlineData("nn", HttpStatusCode.NotFound)]
    public async Task GetCodes_FailedRequest_ShouldRetryAndCacheSuccessfulResponse(
        string language,
        HttpStatusCode statusCode
    )
    {
        using var mockHttp = new MockHttpMessageHandler();
        var settings = Options.Create(new ClassificationSettings());
        var url = $"{settings.Value.BaseApiUrl}2/codesAt";
        var query = $"language={language}&date=2026-10-16";
        mockHttp.Expect(url).WithExactQueryString(query).Respond(statusCode);
        var expectedFailure = statusCode;
        if (statusCode == HttpStatusCode.NotFound && language != "nb")
        {
            expectedFailure = HttpStatusCode.ServiceUnavailable;
            mockHttp.Expect(url).WithExactQueryString("language=nb&date=2026-10-16").Respond(expectedFailure);
        }
        var successfulRequest = mockHttp
            .Expect(url)
            .WithExactQueryString(query)
            .Respond("application/json", """{"codes":[{"code":"1","name":"Mann","level":"1"}]}""");
        using var httpClient = mockHttp.ToHttpClient();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var client = new ClassificationsHttpClientCached(new ClassificationsHttpClient(settings, httpClient), cache);
        var date = new DateOnly(2026, 10, 16);

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GetClassificationCodes(2, language, date)
        );
        Assert.Equal(expectedFailure, exception.StatusCode);

        var codes = await client.GetClassificationCodes(2, language, date);
        Assert.Equal("Mann", Assert.Single(codes.Codes).Name);

        var cachedCodes = await client.GetClassificationCodes(2, language, date);
        Assert.Same(codes, cachedCodes);
        Assert.Equal(1, mockHttp.GetMatchCount(successfulRequest));
        mockHttp.VerifyNoOutstandingExpectation();
    }

    [Fact]
    public async Task GetCodes_SuccessfulEmptyResponse_ShouldCacheEmptyList()
    {
        using var mockHttp = new MockHttpMessageHandler();
        var settings = Options.Create(new ClassificationSettings());
        var request = mockHttp
            .Expect($"{settings.Value.BaseApiUrl}2/codesAt")
            .Respond("application/json", """{"codes":[]}""");
        using var httpClient = mockHttp.ToHttpClient();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var client = new ClassificationsHttpClientCached(new ClassificationsHttpClient(settings, httpClient), cache);

        var codes = await client.GetClassificationCodes(2);
        var cachedCodes = await client.GetClassificationCodes(2);

        Assert.Empty(codes.Codes);
        Assert.Same(codes, cachedCodes);
        Assert.Equal(1, mockHttp.GetMatchCount(request));
        mockHttp.VerifyNoOutstandingExpectation();
    }

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
