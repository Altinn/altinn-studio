using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

internal static class TestHelpers
{
    public static Mock<HttpMessageHandler> MockHttpMessageHandlerFactory(MaskinportenTokenResponse tokenResponse)
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                () =>
                    new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(JsonSerializer.Serialize(tokenResponse)),
                    }
            );

        return handlerMock;
    }

    public static (
        Mock<IMaskinportenClient> client,
        MaskinportenDelegatingHandler handler
    ) MockMaskinportenDelegatingHandlerFactory(IEnumerable<string> scopes, MaskinportenTokenResponse tokenResponse)
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
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        mockMaskinportenClient
            .Setup(c => c.GetAccessToken(scopes, It.IsAny<CancellationToken>()))
            .ReturnsAsync(tokenResponse);

        var handler = new MaskinportenDelegatingHandler(scopes, mockMaskinportenClient.Object, mockLogger.Object)
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
}
