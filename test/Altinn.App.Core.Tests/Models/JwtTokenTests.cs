using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Features.Maskinporten;
using FluentAssertions;
using Microsoft.Extensions.Time.Testing;

namespace Altinn.App.Core.Tests.Models;

public class AccessTokenTests
{
    private static readonly string[] _validTokens =
    [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiBEb2UifQ.DjwRE2jZhren2Wt37t5hlVru6Myq4AhpGLiiefF69u8",
    ];
    private static readonly string _invalidToken = "is.not.base64token";

    [Fact]
    public void Parse_ValidToken_ShouldReturnAccessToken()
    {
        // Arrange
        var encodedToken = _validTokens[0];

        // Act
        var accessToken = JwtToken.Parse(encodedToken);

        // Assert
        accessToken.Value.Should().Be(encodedToken);
    }

    [Fact]
    public void Parse_InvalidToken_ShouldThrowFormatException()
    {
        Assert.Throws<FormatException>(() => JwtToken.Parse(_invalidToken));
    }

    [Fact]
    public void Equals_SameToken_ShouldReturnTrue()
    {
        // Arrange
        var stringValue = _validTokens[0];
        var token1 = JwtToken.Parse(stringValue);
        var token2 = JwtToken.Parse(stringValue);

        // Act
        bool result1 = token1.Equals(token2);
        bool result2 = token1 == token2;
        bool result3 = token1 != token2;
        bool result4 = token1.Equals(stringValue);
        bool result5 = token1 == stringValue;
        bool result6 = token1 != stringValue;
        bool result7 = stringValue == token1;
        bool result8 = stringValue != token1;

        // Assert
        result1.Should().BeTrue();
        result2.Should().BeTrue();
        result3.Should().BeFalse();
        result4.Should().BeTrue();
        result5.Should().BeTrue();
        result6.Should().BeFalse();
        result7.Should().BeTrue();
        result8.Should().BeFalse();
    }

    [Fact]
    public void Equals_DifferentToken_ShouldReturnFalse()
    {
        // Arrange
        var stringValue1 = _validTokens[0];
        var stringValue2 = _validTokens[1];
        var token1 = JwtToken.Parse(stringValue1);
        var token2 = JwtToken.Parse(stringValue2);

        // Act
        bool result1 = token1.Equals(token2);
        bool result2 = token1 == token2;
        bool result3 = token1 != token2;
        bool result4 = token1.Equals(stringValue2);
        bool result5 = token1 == stringValue2;
        bool result6 = token1 != stringValue2;

        // Assert
        result1.Should().BeFalse();
        result2.Should().BeFalse();
        result3.Should().BeTrue();
        result4.Should().BeFalse();
        result5.Should().BeFalse();
        result6.Should().BeTrue();
    }

    [Fact]
    public void ImplicitConversion_ShouldReturnFullTokenString()
    {
        // Arrange
        var token = JwtToken.Parse(_validTokens[0]);

        // Act
        string tokenString = token;

        // Assert
        tokenString.Should().Be(_validTokens[0]);
    }

    [Fact]
    public void Value_Property_ShouldReturnFullTokenString()
    {
        // Arrange
        var token = JwtToken.Parse(_validTokens[0]);

        // Act
        string tokenString = token.Value;

        // Assert
        tokenString.Should().Be(_validTokens[0]);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ShouldIndicateExpiry(bool expired)
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();
        var jwtToken = JwtToken.Parse(encodedToken.AccessToken);
        var expiry = jwtToken.ExpiresAt;
        var fakeTimeProvider = new FakeTimeProvider(expiry.AddDays(expired ? 1 : -1));

        // Act
        var isExpired = jwtToken.IsExpired(fakeTimeProvider);

        // Assert
        isExpired.Should().Be(expired);
    }

    [Fact]
    public void ShouldIndicateIssuer()
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();
        var jwtToken = JwtToken.Parse(encodedToken.AccessToken);

        // Act
        var issuer = jwtToken.Issuer;

        // Assert
        issuer.Should().Be("https://test.maskinporten.no/");
    }

    [Fact]
    public void ShouldIndicateScopes()
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();
        var jwtToken = JwtToken.Parse(encodedToken.AccessToken);

        // Act
        var scope = jwtToken.Scope;

        // Assert
        scope.Should().Be("altinn:serviceowner/instances.read");
    }

    [Fact]
    public void ToString_ShouldMask_AccessToken()
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();
        var accessToken = JwtToken.Parse(encodedToken.AccessToken);

        // Act, Assert
        accessToken
            .ToString()
            .Should()
            .Be($"{encodedToken.Components.Header}.{encodedToken.Components.Payload}.<masked>");
        accessToken.ToString().Should().NotContain(encodedToken.Components.Signature);
        $"{accessToken}".Should().NotContain(encodedToken.Components.Signature);
    }

    [Fact]
    public void ToStringUnmasked_ShouldNotMask_AccessToken()
    {
        // Arrange
        var encodedToken = TestHelpers.GetEncodedAccessToken();
        var accessToken = JwtToken.Parse(encodedToken.AccessToken);

        // Act, Assert
        accessToken.ToStringUnmasked().Should().Be(encodedToken.AccessToken);
    }
}
