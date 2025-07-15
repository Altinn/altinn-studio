using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Models;

public class MaskinportenTokenResponseTest
{
    [Fact]
    public void ShouldDeserializeFromJsonCorrectly()
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();
        var json = $$"""
            {
                "access_token": "{{encodedToken.AccessToken}}",
                "token_type": "{{AuthorizationSchemes.Bearer}}",
                "expires_in": 120,
                "scope": "anything"
            }
            """;

        // Act
        var tokenResponse = JsonSerializer.Deserialize<MaskinportenTokenResponse>(json);

        // Assert
        Assert.NotNull(tokenResponse);
        tokenResponse.AccessToken.Should().Be(JwtToken.Parse(encodedToken.AccessToken));
        tokenResponse.TokenType.Should().Be(AuthorizationSchemes.Bearer);
        tokenResponse.Scope.Should().Be("anything");
        tokenResponse.ExpiresIn.Should().Be(120);
    }

    [Fact]
    public void ToString_ShouldMaskAccessToken()
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();

        // Act
        var tokenResponse = new MaskinportenTokenResponse
        {
            AccessToken = JwtToken.Parse(encodedToken.AccessToken),
            Scope = "yep",
            TokenType = AuthorizationSchemes.Bearer,
            ExpiresIn = 120,
        };

        // Assert
        tokenResponse.AccessToken.ToStringUnmasked().Should().Be(encodedToken.AccessToken);
        tokenResponse.ToString().Should().NotContain(encodedToken.Components.Signature);
        $"{tokenResponse}".Should().NotContain(encodedToken.Components.Signature);
    }
}
