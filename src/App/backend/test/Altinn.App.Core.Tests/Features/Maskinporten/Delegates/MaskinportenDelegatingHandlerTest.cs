using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Delegates;

public class MaskinportenDelegatingHandlerTest
{
    public static TheoryData<string, MaskinportenTokenRequest> Requests =>
        new()
        {
            {
                nameof(TokenAuthority.Maskinporten),
                new MaskinportenTokenRequest { Scopes = ["scope1", "scope2"] }
            },
            {
                nameof(TokenAuthority.AltinnTokenExchange),
                new MaskinportenTokenRequest { Scopes = ["scope1", "scope2"] }
            },
            {
                // The additional claims must survive the handler unmodified, not just the scopes
                nameof(TokenAuthority.Maskinporten),
                new MaskinportenTokenRequest
                {
                    Scopes = ["scope1", "scope2"],
                    ConsumerOrg = OrganizationNumber.Parse("991825827"),
                    Resource = "https://api.example.com",
                    SystemUser = new MaskinportenSystemUser
                    {
                        Organization = OrganizationNumber.Parse("311169963"),
                        ExternalRef = "ref",
                    },
                }
            },
            {
                nameof(TokenAuthority.AltinnTokenExchange),
                new MaskinportenTokenRequest
                {
                    Scopes = ["scope1", "scope2"],
                    SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("311169963") },
                }
            },
        };

    [Theory]
    [MemberData(nameof(Requests))]
    public async Task SendAsync_AddsAuthorizationHeader(string tokenAuthority, MaskinportenTokenRequest tokenRequest)
    {
        // Arrange
        Enum.TryParse(tokenAuthority, false, out TokenAuthority actualTokenAuthority);
        var maskinportenToken = tokenRequest.Scopes.GetMaskinportenToken();
        var altinnToken = tokenRequest.Scopes.GetAltinnExchangedToken();

        var (client, handler) = TestHelpers.MockMaskinportenDelegatingHandlerFactory(
            actualTokenAuthority,
            tokenRequest,
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
            client.Verify(c => c.GetAccessToken(tokenRequest, It.IsAny<CancellationToken>()), Times.Once);
            client.Verify(c => c.GetAltinnExchangedToken(tokenRequest, It.IsAny<CancellationToken>()), Times.Never);
            Assert.Equal(maskinportenToken.ToStringUnmasked(), request.Headers.Authorization.Parameter);
        }
        else
        {
            client.Verify(c => c.GetAccessToken(tokenRequest, It.IsAny<CancellationToken>()), Times.Never);
            client.Verify(c => c.GetAltinnExchangedToken(tokenRequest, It.IsAny<CancellationToken>()), Times.Once);
            Assert.Equal(altinnToken.ToStringUnmasked(), request.Headers.Authorization.Parameter);
        }
    }
}

public static class MaskinportenDelegatingHandlerTestExtensions
{
    public static JwtToken GetMaskinportenToken(this IEnumerable<string> scopes)
    {
        return TestAuthentication
            .GetMaskinportenToken(scope: MaskinportenClient.GetFormattedScopes(scopes))
            .AccessToken;
    }

    public static JwtToken GetAltinnExchangedToken(this IEnumerable<string> scopes)
    {
        var token = TestAuthentication.GetOrgAuthentication(scope: MaskinportenClient.GetFormattedScopes(scopes)).Token;

        return JwtToken.Parse(token);
    }
}
