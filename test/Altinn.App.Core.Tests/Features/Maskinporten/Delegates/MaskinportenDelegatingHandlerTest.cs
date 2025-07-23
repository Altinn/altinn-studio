using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Delegates;

public class MaskinportenDelegatingHandlerTest
{
    [Theory]
    [InlineData(nameof(TokenAuthority.Maskinporten))]
    [InlineData(nameof(TokenAuthority.AltinnTokenExchange))]
    public async Task SendAsync_AddsAuthorizationHeader(string tokenAuthority)
    {
        // Arrange
        Enum.TryParse(tokenAuthority, false, out TokenAuthority actualTokenAuthority);
        string[] scopes = ["scope1", "scope2"];
        var maskinportenToken = scopes.GetMaskinportenToken();
        var altinnToken = scopes.GetAltinnExchangedToken();

        var (client, handler) = TestHelpers.MockMaskinportenDelegatingHandlerFactory(
            actualTokenAuthority,
            scopes,
            maskinportenToken,
            altinnToken
        );

        using var httpClient = new HttpClient(handler);
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://some-maskinporten-url/token");

        // Act
        await httpClient.SendAsync(request);

        // Assert
        Assert.NotNull(request.Headers.Authorization);
        Assert.Equal(AuthorizationSchemes.Bearer, request.Headers.Authorization.Scheme);

        if (actualTokenAuthority == TokenAuthority.Maskinporten)
        {
            client.Verify(c => c.GetAccessToken(scopes, It.IsAny<CancellationToken>()), Times.Once);
            client.Verify(c => c.GetAltinnExchangedToken(scopes, It.IsAny<CancellationToken>()), Times.Never);
            Assert.Equal(maskinportenToken.ToStringUnmasked(), request.Headers.Authorization.Parameter);
        }
        else
        {
            client.Verify(c => c.GetAccessToken(scopes, It.IsAny<CancellationToken>()), Times.Never);
            client.Verify(c => c.GetAltinnExchangedToken(scopes, It.IsAny<CancellationToken>()), Times.Once);
            Assert.Equal(altinnToken.ToStringUnmasked(), request.Headers.Authorization.Parameter);
        }
    }
}

public static class MaskinportenDelegatingHandlerTestExtensions
{
    public static JwtToken GetMaskinportenToken(this IEnumerable<string> scopes)
    {
        return TestAuthentication.GetMaskinportenToken(scope: MaskinportenClient.FormattedScopes(scopes)).AccessToken;
    }

    public static JwtToken GetAltinnExchangedToken(this IEnumerable<string> scopes)
    {
        var token = TestAuthentication.GetOrgAuthentication(scope: MaskinportenClient.FormattedScopes(scopes)).Token;

        return JwtToken.Parse(token);
    }
}
