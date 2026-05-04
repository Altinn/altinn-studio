using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services;
using FluentAssertions;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Tests.Unit;

public class CallbackUrlValidatorTests
{
    [Fact]
    public void Validate_WithMatchingPattern_ReturnsNull()
    {
        var validator = CreateValidator("https://*.altinn.no/instances/*");

        var result = validator.Validate("https://app.altinn.no/instances/123");

        result.Should().BeNull();
    }

    [Fact]
    public void Validate_WithNonMatchingPattern_ReturnsError()
    {
        var validator = CreateValidator("https://*.altinn.no/instances/*");

        var result = validator.Validate("https://evil.com/steal");

        result.Should().NotBeNull();
        result.Should().Contain("does not match");
    }

    [Fact]
    public void Validate_WithEmptyPatterns_RejectsAll()
    {
        var validator = CreateValidator();

        var result = validator.Validate("https://anything.com/path");

        result.Should().NotBeNull();
        result.Should().Contain("No callback URL patterns");
    }

    [Fact]
    public void Validate_WithInvalidUrl_ReturnsError()
    {
        var validator = CreateValidator("https://*.altinn.no/*");

        var result = validator.Validate("not-a-url");

        result.Should().NotBeNull();
        result.Should().Contain("valid absolute URL");
    }

    [Fact]
    public void Validate_WithNonHttpScheme_ReturnsError()
    {
        var validator = CreateValidator("https://*.altinn.no/*");

        var result = validator.Validate("ftp://altinn.no/file");

        result.Should().NotBeNull();
        result.Should().Contain("http or https");
    }

    [Fact]
    public void Validate_WithLocalhostPattern_MatchesLocalhost()
    {
        var validator = CreateValidator("http://localhost:*/*");

        var result = validator.Validate("http://localhost:5000/callback");

        result.Should().BeNull();
    }

    [Fact]
    public void Validate_WithLocalhostPattern_RejectsDifferentHost()
    {
        var validator = CreateValidator("http://localhost:*/*");

        var result = validator.Validate("http://evil.com:5000/callback");

        result.Should().NotBeNull();
    }

    [Fact]
    public void Validate_WildcardHostDoesNotMatchDeepSubdomain()
    {
        var validator = CreateValidator("https://*.altinn.no/*");

        var result = validator.Validate("https://deep.sub.altinn.no/path");

        result.Should().NotBeNull();
    }

    [Fact]
    public void Validate_TrailingWildcardMatchesDeepPath()
    {
        var validator = CreateValidator("https://*.altinn.no/api/*");

        var result = validator.Validate("https://app.altinn.no/api/v1/instances/123");

        result.Should().BeNull();
    }

    [Fact]
    public void Validate_MultiplePatterns_MatchesAny()
    {
        var validator = CreateValidator(
            "https://*.altinn.no/api/*",
            "http://localhost:*/*");

        validator.Validate("https://app.altinn.no/api/callback").Should().BeNull();
        validator.Validate("http://localhost:8080/callback").Should().BeNull();
    }

    [Fact]
    public void Validate_ExactHostMatch()
    {
        var validator = CreateValidator("https://specific.altinn.no/callback");

        validator.Validate("https://specific.altinn.no/callback").Should().BeNull();
        validator.Validate("https://other.altinn.no/callback").Should().NotBeNull();
    }

    [Fact]
    public void Validate_UrlWithQueryAndFragment_IgnoresQueryAndFragment()
    {
        var validator = CreateValidator("https://*.altinn.no/api/*");

        var result = validator.Validate("https://app.altinn.no/api/callback?token=abc#section");

        result.Should().BeNull();
    }

    [Fact]
    public void Validate_WithDefaultPort_MatchesPatternWithExplicitPort()
    {
        var validator = CreateValidator("https://*.altinn.no:443/api/*");

        var result = validator.Validate("https://app.altinn.no/api/callback");

        result.Should().BeNull();
    }

    [Fact]
    public void Validate_IPv6Pattern_MatchesIPv6Url()
    {
        var validator = CreateValidator("http://[::1]:*/*");

        var result = validator.Validate("http://[::1]:8080/callback");

        result.Should().BeNull();
    }

    private static CallbackUrlValidator CreateValidator(params string[] patterns)
    {
        var options = Options.Create(new CallbackOptions
        {
            AllowedPatterns = [.. patterns],
        });
        return new CallbackUrlValidator(options);
    }
}
