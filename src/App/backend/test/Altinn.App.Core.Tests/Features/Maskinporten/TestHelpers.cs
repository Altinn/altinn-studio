using System.Linq.Expressions;
using System.Net;
using System.Text.Json;
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
            .ReturnsAsync(() =>
                new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(JsonSerializer.Serialize(maskinportenTokenResponse)),
                }
            );

        altinnAccessToken ??= TestAuthentication.GetServiceOwnerToken("405003309", org: "ttd");
        protectedMock
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is(_isExchangeRequest),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
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
        TokenAuthority authority,
        IEnumerable<string> scopes,
        JwtToken maskinportenToken,
        JwtToken altinnToken
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
            .ReturnsAsync(maskinportenToken);
        mockMaskinportenClient
            .Setup(c => c.GetAltinnExchangedToken(scopes, It.IsAny<CancellationToken>()))
            .ReturnsAsync(altinnToken);

        var handler = new MaskinportenDelegatingHandler(
            authority,
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
        const string testTokenHeader =
            "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ";
        const string testTokenPayload =
            "eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQiLCJpc3MiOiJodHRwczovL3Rlc3QubWFza2lucG9ydGVuLm5vLyIsImNsaWVudF9hbXIiOiJwcml2YXRlX2tleV9qd3QiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzMyMjg3NDUxLCJpYXQiOjE3MzIyODczMzEsImNsaWVudF9pZCI6ImQyMjEzMGNmLTMzZjEtNGI2Yy1hMjM4LTVmMjZmZTk1NTRiMyIsImp0aSI6Ik5rMWc1MXFZVlVBWWRmbWVSeWlrdXBCaXdJaVVzSzdOZGxHNFlCSjZFV3MiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifX0";
        const string testTokenSignature =
            "Y-dNpwVXsaYBgCL_bT8EoEnY650KhpwZJW3QN-uvAFq2qxHMTuOEpg0PtZGL4GQtLT57_urHTAtspTG9-y30oOkAEYqggeQ0_TmnXCN17pd4wtPyZLFpYoHJe7ki3-9ITGv2JUuRiRN4gpN92zdsaAvafnEksxG0CjxbpWRCS8XA0Cr3wsKj1Fpd4zLit64iI3OSk_yW0Gfe15QkALnUCQgzJCQhTXlnuSGZgPLuQZcvWfONzdZojkAgxTJJg-hOC-TNNGq2IN8NJhg3GjrGypiB4-niVXyugPyP2MdnxWeZQiuuAsMRbe3mGNTlx9VPDXJIsrtDDYVHrndvL8CHqjHdkOLZxtdTdMOMz1IXi_ZTcTJreqP4ti8J_Fx5u-3AOSVZG0hOOxtONBZgoMul12QoztaOuX65rP4zzZq9Afz07m2XHGg72jbowhtRiJKlf_mn31EK75bmDxZHVlL5s0Crb3VvRu39Xnz4Z8n5-Yn5LqnCYhhvZz_vf8f0U5jv";
        const string testToken = testTokenHeader + "." + testTokenPayload + "." + testTokenSignature;

        return (testToken, (testTokenHeader, testTokenPayload, testTokenSignature));
    }
}
