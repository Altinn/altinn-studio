using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Maskinporten.Constants;
using FluentAssertions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Tests.Delegates;

public class MaskinportenDelegatingHandlerTest
{
    [Fact]
    public async Task SendAsync_AddsAuthorizationHeader()
    {
        // Arrange
        var scopes = new[] { "scope1", "scope2" };
        var accessToken = TestAuthentication.GetMaskinportenToken(scope: "-").AccessToken;
        var (client, handler) = TestHelpers.MockMaskinportenDelegatingHandlerFactory(
            TokenAuthorities.Maskinporten,
            scopes,
            accessToken
        );
        var httpClient = new HttpClient(handler);
        var request = new HttpRequestMessage(HttpMethod.Get, "https://some-maskinporten-url/token");

        // Act
        await httpClient.SendAsync(request);

        // Assert
        client.Verify(c => c.GetAccessToken(scopes, It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(request.Headers.Authorization);
        request.Headers.Authorization.Scheme.Should().Be(AuthorizationSchemes.Bearer);
        request.Headers.Authorization.Parameter.Should().Be(accessToken.ToStringUnmasked());
    }
}
