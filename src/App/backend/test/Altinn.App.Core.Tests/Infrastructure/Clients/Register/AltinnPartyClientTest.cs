using System.Net;
using System.Net.Http.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Register;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Register;

public class AltinnPartyClientTest
{
    private const string UserToken = "user-token";
    private const string PlatformAccessToken = "platform-access-token";
    private const string SubscriptionKey = "subscription-key";
    private const string ApiRegisterEndpoint = "https://localhost/api/v1/";

    [Fact]
    public async Task GetParty_OK_CallsCorrectUrl_SetsCorrectHeaders()
    {
        // Arrange
        HttpRequestMessage? capturedRequest = null;
        const int partyId = 123;
        var fixture = Fixture.Create(requestCallback: req => capturedRequest = req);

        // Act
        var result = await fixture.Client.GetParty(partyId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(partyId, result.PartyId);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Get, capturedRequest.Method);
        Assert.Equal(SubscriptionKey, capturedRequest.GetHeader(General.SubscriptionKeyHeaderName));
        Assert.Equal(PlatformAccessToken, capturedRequest.GetHeader(General.PlatformAccessTokenHeaderName));
        Assert.Equal($"Bearer {UserToken}", capturedRequest.GetHeader("Authorization"));
        Assert.Equal($"{ApiRegisterEndpoint}parties/123", capturedRequest.RequestUri!.ToString());
    }

    [Fact]
    public async Task GetParty_Unauthorized_ThrowsException()
    {
        // Arrange
        var fixture = Fixture.Create();
        fixture
            .HttpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Unauthorized));

        // Act
        var act = async () => await fixture.Client.GetParty(123);

        // Assert
        await Assert.ThrowsAsync<ServiceException>(act);
    }

    [Fact]
    public async Task GetParty_UnknownError_LogsEventAndReturnsNull()
    {
        // Arrange
        var fixture = Fixture.Create();
        fixture
            .HttpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.BadRequest));

        // Act
        var result = await fixture.Client.GetParty(123);

        // Assert
        Assert.Null(result);
        fixture.LoggerMock.VerifyCall(LogLevel.Error, "failed with statuscode", Times.Once());
    }

    [Fact]
    public async Task LookupParty_CallsCorrectUrl_SetsCorrectHeaders()
    {
        // Arrange
        HttpRequestMessage? capturedRequest = null;
        const string orgNumber = "123456789";
        var fixture = Fixture.Create(requestCallback: req => capturedRequest = req);

        // Act
        var result = await fixture.Client.LookupParty(new PartyLookup { OrgNo = orgNumber });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(orgNumber, result.OrgNumber);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest.Method);
        Assert.Equal(SubscriptionKey, capturedRequest.GetHeader(General.SubscriptionKeyHeaderName));
        Assert.Equal(PlatformAccessToken, capturedRequest.GetHeader(General.PlatformAccessTokenHeaderName));
        Assert.Equal($"Bearer {UserToken}", capturedRequest.GetHeader("Authorization"));
        Assert.Equal($"{ApiRegisterEndpoint}parties/lookup", capturedRequest.RequestUri!.ToString());
    }

    [Fact]
    public async Task LookupParty_AnyError_LogsEventAndThrowsException()
    {
        // Arrange
        var fixture = Fixture.Create();
        fixture
            .HttpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.BadRequest));

        // Act
        var act = async () => await fixture.Client.LookupParty(new PartyLookup());

        // Assert
        await Assert.ThrowsAsync<PlatformHttpException>(act);
        fixture.LoggerMock.VerifyCall(LogLevel.Error, "failed with statuscode", Times.Once());
    }

    private sealed record Fixture(
        AltinnPartyClient Client,
        Mock<HttpMessageHandler> HttpMessageHandlerMock,
        Mock<ILogger<AltinnPartyClient>> LoggerMock
    )
    {
        public static Fixture Create(
            string userToken = UserToken,
            string platformAccessToken = PlatformAccessToken,
            string subscriptionKey = SubscriptionKey,
            string apiRegisterEndpoint = ApiRegisterEndpoint,
            Action<HttpRequestMessage>? requestCallback = null
        )
        {
            var loggerMock = new Mock<ILogger<AltinnPartyClient>>();

            var appMetadataMock = new Mock<IAppMetadata>();
            appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("org/app"));

            var userTokenProviderMock = new Mock<IUserTokenProvider>();
            userTokenProviderMock.Setup(m => m.GetUserToken()).Returns(userToken);

            var accessTokenGeneratorMock = new Mock<IAccessTokenGenerator>();
            accessTokenGeneratorMock
                .Setup(m => m.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(platformAccessToken);

            var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
            httpMessageHandlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .Callback<HttpRequestMessage, CancellationToken>((req, ct) => requestCallback?.Invoke(req))
                .ReturnsAsync(
                    (HttpRequestMessage request, CancellationToken ct) =>
                    {
                        return request.Method.Method switch
                        {
                            "GET" => new HttpResponseMessage(HttpStatusCode.OK)
                            {
                                Content = new StringContent($"{{\"partyId\": {request.RequestUri!.Segments.Last()} }}"),
                            },
                            "POST" => new HttpResponseMessage(HttpStatusCode.OK)
                            {
                                Content = new StringContent(
                                    $"{{\"orgNumber\": \"{request.Content!.ReadFromJsonAsync<PartyLookup>(CancellationToken.None).Result!.OrgNo}\" }}"
                                ),
                            },
                            _ => throw new InvalidOperationException("Unexpected HTTP method"),
                        };
                    }
                );

            var altinnPartyClient = new AltinnPartyClient(
                Options.Create(
                    new PlatformSettings
                    {
                        ApiRegisterEndpoint = apiRegisterEndpoint,
                        SubscriptionKey = subscriptionKey,
                    }
                ),
                loggerMock.Object,
                new HttpClient(httpMessageHandlerMock.Object),
                appMetadataMock.Object,
                userTokenProviderMock.Object,
                accessTokenGeneratorMock.Object
            );

            return new Fixture(altinnPartyClient, httpMessageHandlerMock, loggerMock);
        }
    }
}

internal static class AltinnPartyClientTestExtensions
{
    public static string GetHeader(this HttpRequestMessage request, string headerName)
    {
        return request.Headers.Contains(headerName)
            ? request.Headers.GetValues(headerName).First()
            : throw new InvalidOperationException($"Header '{headerName}' not found in request.");
    }

    public static void VerifyCall<T>(
        this Mock<ILogger<T>> loggerMock,
        LogLevel logLevel,
        string? partialMessage = null,
        Times? times = null
    )
    {
        loggerMock.Verify(
            logger =>
                logger.Log(
                    logLevel,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>(
                        (value, _) => partialMessage == null || value.ToString()!.Contains(partialMessage)
                    ),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ),
            times ?? Times.Once()
        );
    }
}
