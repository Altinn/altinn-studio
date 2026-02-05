using System.Net;
using System.Text.Json;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Internal.AltinnCdn;

public class AltinnCdnClientTest
{
    private static HybridCache CreateHybridCache()
    {
        var services = new ServiceCollection();
        services.AddHybridCache();
        var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<HybridCache>();
    }

    private static (Mock<IHttpClientFactory> Mock, HttpClient Client) CreateHttpClientFactoryMock(
        HttpMessageHandler handler
    )
    {
        var httpClient = new HttpClient(handler);
        var factoryMock = new Mock<IHttpClientFactory>();
        factoryMock.Setup(f => f.CreateClient(nameof(AltinnCdnClient))).Returns(httpClient);
        return (factoryMock, httpClient);
    }

    private static Mock<IAppMetadata> CreateAppMetadataMock(string org)
    {
        var mock = new Mock<IAppMetadata>();
        mock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata($"{org}/app") { Org = org });
        return mock;
    }

    [Fact]
    public async Task GetOrgDetails_ReturnsOrgDetails_WhenResponseIsValid()
    {
        // Arrange
        var expectedDetails = new AltinnCdnOrgDetails
        {
            Name = new AltinnCdnOrgName
            {
                En = "The Norwegian Directorate of Immigration",
                Nb = "Utlendingsdirektoratet",
                Nn = "Utlendingsdirektoratet",
            },
            Logo = "https://altinncdn.no/orgs/udi/udi.png",
            Orgnr = "974760746",
            Homepage = "https://www.udi.no",
            Environments = ["tt02", "production"],
        };
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "orgs": {
                        "ttd": {
                            "name": {
                                "en": "Test Ministry",
                                "nb": "Testdepartementet",
                                "nn": "Testdepartementet"
                            },
                            "logo": "",
                            "orgnr": "",
                            "homepage": "",
                            "environments": [
                                "at22",
                                "at23",
                                "at24",
                                "tt02",
                                "yt01",
                                "production"
                            ]
                        },
                        "udi": {
                            "name": {
                                "en": "The Norwegian Directorate of Immigration",
                                "nb": "Utlendingsdirektoratet",
                                "nn": "Utlendingsdirektoratet"
                            },
                            "logo": "https://altinncdn.no/orgs/udi/udi.png",
                            "orgnr": "974760746",
                            "homepage": "https://www.udi.no",
                            "environments": [
                                "tt02",
                                "production"
                            ]
                        }
                    }
                }
                """
            ),
        };

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("udi");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert
        result.Should().BeEquivalentTo(expectedDetails);
    }

    [Fact]
    public async Task GetOrgDetails_ReturnsNull_WhenOrgNotFound()
    {
        // Arrange
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"orgs": {"ttd": {"name": {}, "orgnr": ""}}}"""),
        };

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("nonexistent");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetOrgDetails_ThrowsJsonException_WhenOrgsPropertyIsMissing()
    {
        // Arrange
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("null") };
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("ttd");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var act = new Func<Task>(() => client.GetOrgDetails());

        // Assert
        await act.Should().ThrowAsync<JsonException>().WithMessage("Missing 'orgs' property*");
    }

    [Fact]
    public async Task GetOrgDetails_CancellationTokenIsRespected()
    {
        // Arrange
        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel(); // Cancel the token immediately

        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK);
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("ttd");
        var cache = CreateHybridCache();
        var altinnCdnClient = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var act = new Func<Task>(() => altinnCdnClient.GetOrgDetails(cancellationTokenSource.Token));

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task GetOrgDetails_ReturnsOrgDetails_WhenAnotherOrgHasMalformedData()
    {
        // Arrange - "broken" org has invalid data (missing required fields), but "udi" is valid
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "orgs": {
                        "broken": {
                            "name": "not an object",
                            "invalid_field": 123
                        },
                        "udi": {
                            "name": {
                                "en": "Immigration",
                                "nb": "Utlendingsdirektoratet",
                                "nn": "Utlendingsdirektoratet"
                            },
                            "orgnr": "974760746",
                            "environments": ["tt02"]
                        }
                    }
                }
                """
            ),
        };

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("udi");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert - we successfully get "udi" despite "broken" having invalid data
        Assert.NotNull(result);
        Assert.Equal("974760746", result.Orgnr);
        Assert.Equal("Utlendingsdirektoratet", result.Name.Nb);
    }

    [Fact]
    public async Task GetOrgDetails_ThrowsJsonException_WhenOurOrgIsMissingRequiredFields()
    {
        // Arrange - our org "udi" is missing required "name" field
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "orgs": {
                        "udi": {
                            "orgnr": "974760746",
                            "environments": ["tt02"]
                        }
                    }
                }
                """
            ),
        };

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("udi");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var act = new Func<Task>(() => client.GetOrgDetails());

        // Assert
        await act.Should().ThrowAsync<JsonException>();
    }

    [Fact]
    public async Task GetOrgDetails_ReturnsStaleData_WhenFetchFailsAfterPreviousSuccess()
    {
        // Arrange
        var validResponse = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "orgs": {
                        "udi": {
                            "name": { "en": "Immigration", "nb": "UDI", "nn": "UDI" },
                            "orgnr": "974760746",
                            "environments": ["tt02"]
                        }
                    }
                }
                """
            ),
        };

        var callCount = 0;
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount == 1)
                {
                    return validResponse;
                }
                throw new HttpRequestException("CDN is down");
            });

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("udi");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act - first call succeeds and populates _lastKnownGood
        var firstResult = await client.GetOrgDetails();
        Assert.NotNull(firstResult);
        Assert.Equal("974760746", firstResult.Orgnr);

        // Force cache eviction to trigger a re-fetch
        await cache.RemoveAsync("altinn-cdn-org-details");

        // Second call: cache miss → fetch fails → returns stale _lastKnownGood
        var secondResult = await client.GetOrgDetails();

        // Assert - we get the stale data back
        Assert.NotNull(secondResult);
        Assert.Equal("974760746", secondResult.Orgnr);
        Assert.Equal(2, callCount); // Verify we actually made two HTTP calls
    }

    [Fact]
    public async Task GetOrgDetails_TtdGetsDigdirOrgnr_WhenTtdHasNoOrgnr()
    {
        // Arrange - TTD has no orgnr, should get Digdir's
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "orgs": {
                        "ttd": {
                            "name": { "en": "Test Ministry", "nb": "Testdepartementet", "nn": "Testdepartementet" },
                            "orgnr": "",
                            "environments": ["tt02"]
                        },
                        "digdir": {
                            "name": { "en": "Digdir", "nb": "Digitaliseringsdirektoratet", "nn": "Digitaliseringsdirektoratet" },
                            "orgnr": "991825827",
                            "environments": ["tt02", "production"]
                        }
                    }
                }
                """
            ),
        };

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("ttd");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert - TTD should have Digdir's orgnr
        Assert.NotNull(result);
        Assert.Equal("991825827", result.Orgnr);
        Assert.Equal("Testdepartementet", result.Name.Nb);
    }

    [Fact]
    public async Task GetOrgDetails_TtdKeepsOwnOrgnr_WhenTtdHasOrgnr()
    {
        // Arrange - TTD has its own orgnr, should keep it
        using var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "orgs": {
                        "ttd": {
                            "name": { "en": "Test Ministry", "nb": "Testdepartementet", "nn": "Testdepartementet" },
                            "orgnr": "123456789",
                            "environments": ["tt02"]
                        },
                        "digdir": {
                            "name": { "en": "Digdir", "nb": "Digitaliseringsdirektoratet", "nn": "Digitaliseringsdirektoratet" },
                            "orgnr": "991825827",
                            "environments": ["tt02", "production"]
                        }
                    }
                }
                """
            ),
        };

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(responseMessage);

        var (factoryMock, httpClient) = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        using var _ = httpClient;
        var appMetadataMock = CreateAppMetadataMock("ttd");
        var cache = CreateHybridCache();
        var client = new AltinnCdnClient(cache, factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert - TTD keeps its own orgnr
        Assert.NotNull(result);
        Assert.Equal("123456789", result.Orgnr);
    }
}
