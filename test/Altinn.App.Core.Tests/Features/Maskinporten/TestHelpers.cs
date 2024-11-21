using System.Linq.Expressions;
using System.Net;
using System.Text.Json;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

internal static class TestHelpers
{
    private static readonly Expression<Func<HttpRequestMessage, bool>> _isTokenRequest = req =>
        req.RequestUri!.PathAndQuery.Contains("token", StringComparison.OrdinalIgnoreCase);
    private static readonly Expression<Func<HttpRequestMessage, bool>> _isExchangeRequest = req =>
        req.RequestUri!.PathAndQuery.Contains("exchange/maskinporten", StringComparison.OrdinalIgnoreCase);

    public static Mock<HttpMessageHandler> MockHttpMessageHandlerFactory(
        MaskinportenTokenResponse maskinportenTokenResponse,
        string? altinnAccessToken = null
    )
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        var protectedMock = handlerMock.Protected();
        protectedMock
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is(_isTokenRequest),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                () =>
                    new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(JsonSerializer.Serialize(maskinportenTokenResponse)),
                    }
            );

        altinnAccessToken ??= PrincipalUtil.GetOrgToken("ttd", "160694123", 3);
        protectedMock
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is(_isExchangeRequest),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                () =>
                    new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(altinnAccessToken),
                    }
            );

        return handlerMock;
    }

    public static (
        Mock<IMaskinportenClient> client,
        MaskinportenDelegatingHandler handler
    ) MockMaskinportenDelegatingHandlerFactory(
        TokenAuthorities authorities,
        IEnumerable<string> scopes,
        JwtToken accessToken
    )
    {
        var mockProvider = new Mock<IServiceProvider>();
        var innerHandlerMock = new Mock<DelegatingHandler>();
        var mockLogger = new Mock<ILogger<MaskinportenDelegatingHandler>>();
        var mockMaskinportenClient = new Mock<IMaskinportenClient>();

        mockProvider
            .Setup(p => p.GetService(typeof(ILogger<MaskinportenDelegatingHandler>)))
            .Returns(mockLogger.Object);
        mockProvider.Setup(p => p.GetService(typeof(IMaskinportenClient))).Returns(mockMaskinportenClient.Object);

        innerHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is(_isTokenRequest),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        mockMaskinportenClient
            .Setup(c => c.GetAccessToken(scopes, It.IsAny<CancellationToken>()))
            .ReturnsAsync(accessToken);

        var handler = new MaskinportenDelegatingHandler(
            authorities,
            scopes,
            mockMaskinportenClient.Object,
            mockLogger.Object
        )
        {
            InnerHandler = innerHandlerMock.Object,
        };

        return (mockMaskinportenClient, handler);
    }

    public static async Task<Dictionary<string, string>> ParseFormUrlEncodedContent(FormUrlEncodedContent formData)
    {
        var content = await formData.ReadAsStringAsync();
        return content
            .Split('&')
            .Select(pair => pair.Split('='))
            .ToDictionary(split => Uri.UnescapeDataString(split[0]), split => Uri.UnescapeDataString(split[1]));
    }

    public static (
        string AccessToken,
        (string Header, string Payload, string Signature) Components
    ) GetEncodedAccessToken()
    {
        const string testTokenHeader = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        const string testTokenPayload = "eyJzdWIiOiJpdHMtYS1tZSJ9";
        const string testTokenSignature = "wLLw4Timcl9gnQvA93RgREz-6S5y1UfzI_GYVI_XVDA";
        const string testToken = testTokenHeader + "." + testTokenPayload + "." + testTokenSignature;

        return (testToken, (testTokenHeader, testTokenPayload, testTokenSignature));
    }
}
