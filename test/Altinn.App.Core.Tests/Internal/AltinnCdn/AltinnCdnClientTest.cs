using System.Net;
using System.Text.Json;
using Altinn.App.Core.Internal.AltinnCdn;
using FluentAssertions;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Internal.AltinnCdn;

public class AltinnCdnClientTest
{
    [Fact]
    public async Task GetOrgs_ReturnsAltinnCdnOrgs_WhenResponseIsValid()
    {
        // Arrange
        var expectedOrgs = new AltinnCdnOrgs
        {
            Orgs = new Dictionary<string, AltinnCdnOrgDetails>
            {
                ["ttd"] = new()
                {
                    Name = new AltinnCdnOrgName
                    {
                        En = "Test Ministry",
                        Nb = "Testdepartementet",
                        Nn = "Testdepartementet",
                    },
                    Logo = "",
                    Orgnr = "",
                    Homepage = "",
                    Environments = ["at22", "at23", "at24", "tt02", "yt01", "production"],
                },
                ["udi"] = new()
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
                },
            },
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

        var httpClient = new HttpClient(httpMessageHandlerMock.Object);
        var client = new AltinnCdnClient(httpClient);

        // Act
        var result = await client.GetOrgs();

        // Assert
        result.Orgs.Should().HaveCount(2);
        result.Should().BeEquivalentTo(expectedOrgs);
    }

    [Fact]
    public async Task GetOrgs_ThrowsJsonException_WhenResponseIsLiteralNull()
    {
        // Arrange
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("null") });

        var httpClient = new HttpClient(httpMessageHandlerMock.Object);
        var client = new AltinnCdnClient(httpClient);

        // Act
        var act = new Func<Task>(() => client.GetOrgs());

        // Assert
        await act.Should().ThrowAsync<JsonException>().WithMessage("Received literal \"null\" response*");
    }

    [Fact]
    public async Task GetOrgs_CancellationTokenIsRespected()
    {
        // Arrange
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
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

        var httpClient = new HttpClient(httpMessageHandlerMock.Object);
        var altinnCdnClient = new AltinnCdnClient(httpClient);

        // Act
        var act = new Func<Task>(() => altinnCdnClient.GetOrgs(cancellationTokenSource.Token));

        // Assert
        await act.Should().ThrowAsync<TaskCanceledException>();
    }
}
