using Altinn.App.Api.Extensions;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Altinn.App.Api.Tests.Extensions;

public class HttpRequestExtensionsTests
{
    [Fact]
    public void GetDisplayUrl_WithNoForwardedHeaders_UsesDirectRequestValues()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.PathBase = "/base";
        context.Request.Path = "/path";
        context.Request.QueryString = new QueryString("?key=value");

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("http://localhost:5000/base/path?key=value", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithRfc7239ForwardedHeader_UsesForwardedValues()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "host=example.com; proto=https; for=203.0.113.5";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithRfc7239ForwardedHeader_QuotedValues_UsesForwardedValues()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "host=\"example.com\"; proto=\"https\"";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithRfc7239ForwardedHeader_MultipleProxies_UsesFirstProxy()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "host=example.com; proto=https, host=proxy.example.com; proto=http";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithXForwardedHeaders_UsesXForwardedValues()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["X-Forwarded-Host"] = "public.example.com";
        context.Request.Headers["X-Forwarded-Proto"] = "https";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://public.example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithXForwardedHeaders_MultipleValues_UsesFirstValue()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["X-Forwarded-Host"] = "public.example.com, proxy.example.com";
        context.Request.Headers["X-Forwarded-Proto"] = "https, http";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://public.example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithBothForwardedAndXForwarded_PrefersRfc7239()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "host=rfc7239.example.com; proto=https";
        context.Request.Headers["X-Forwarded-Host"] = "legacy.example.com";
        context.Request.Headers["X-Forwarded-Proto"] = "http";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://rfc7239.example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithOnlyHostInForwarded_UsesRequestScheme()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "host=example.com";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("http://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithOnlyProtoInForwarded_UsesRequestHost()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "proto=https";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://localhost:5000/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithHostInXForwardedButNotProto_UsesRequestScheme()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["X-Forwarded-Host"] = "example.com";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("http://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithProtoInXForwardedButNotHost_UsesRequestHost()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["X-Forwarded-Proto"] = "https";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://localhost:5000/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithComplexPath_PreservesAllComponents()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("example.com");
        context.Request.PathBase = "/api/v1";
        context.Request.Path = "/resource/123";
        context.Request.QueryString = new QueryString("?filter=active&sort=name");

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com/api/v1/resource/123?filter=active&sort=name", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithForwardedHeaderCaseInsensitive_ParsesCorrectly()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "HOST=example.com; PROTO=https";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithForwardedHeaderExtraSpaces_ParsesCorrectly()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "  host = example.com ;  proto = https  ";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com/path", displayUrl);
    }

    [Fact]
    public void GetDisplayUrl_WithForwardedHeaderWithPort_PreservesPort()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost", 5000);
        context.Request.Path = "/path";
        context.Request.Headers["Forwarded"] = "host=example.com:8080; proto=https";

        // Act
        var displayUrl = context.Request.GetDisplayUrl();

        // Assert
        Assert.Equal("https://example.com:8080/path", displayUrl);
    }
}
