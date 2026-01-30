using System.Net;
using System.Text.Json;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using FluentAssertions;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Internal.AltinnCdn;

public class AltinnCdnClientTest
{
    private static Mock<IHttpClientFactory> CreateHttpClientFactoryMock(HttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler);
        var factoryMock = new Mock<IHttpClientFactory>();
        factoryMock.Setup(f => f.CreateClient(nameof(AltinnCdnClient))).Returns(httpClient);
        return factoryMock;
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
        var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
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

        var factoryMock = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        var appMetadataMock = CreateAppMetadataMock("udi");
        var client = new AltinnCdnClient(factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert
        result.Should().BeEquivalentTo(expectedDetails);
    }

    [Fact]
    public async Task GetOrgDetails_ReturnsNull_WhenOrgNotFound()
    {
        // Arrange
        var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
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

        var factoryMock = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        var appMetadataMock = CreateAppMetadataMock("nonexistent");
        var client = new AltinnCdnClient(factoryMock.Object, appMetadataMock.Object);

        // Act
        var result = await client.GetOrgDetails();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetOrgDetails_ThrowsJsonException_WhenResponseIsLiteralNull()
    {
        // Arrange
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("null") });

        var factoryMock = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        var appMetadataMock = CreateAppMetadataMock("ttd");
        var client = new AltinnCdnClient(factoryMock.Object, appMetadataMock.Object);

        // Act
        var act = new Func<Task>(() => client.GetOrgDetails());

        // Assert
        await act.Should().ThrowAsync<JsonException>().WithMessage("Received literal \"null\" response*");
    }

    [Fact]
    public async Task GetOrgDetails_CancellationTokenIsRespected()
    {
        // Arrange
        var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel(); // Cancel the token immediately

        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var factoryMock = CreateHttpClientFactoryMock(httpMessageHandlerMock.Object);
        var appMetadataMock = CreateAppMetadataMock("ttd");
        var altinnCdnClient = new AltinnCdnClient(factoryMock.Object, appMetadataMock.Object);

        // Act
        var act = new Func<Task>(() => altinnCdnClient.GetOrgDetails(cancellationTokenSource.Token));

        // Assert
        await act.Should().ThrowAsync<TaskCanceledException>();
    }
}
