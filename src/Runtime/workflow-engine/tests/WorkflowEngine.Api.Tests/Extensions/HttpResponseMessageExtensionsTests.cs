using System.Net;
using WorkflowEngine.Api.Extensions;

namespace WorkflowEngine.Api.Tests.Extensions;

public class HttpResponseMessageExtensionsTests
{
    [Fact]
    public async Task GetContentOrDefault_WithContent_ReturnsContent()
    {
        // Arrange
        using var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("actual content"),
        };

        // Act
        var result = await response.GetContentOrDefault("fallback", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal("actual content", result);
    }

    [Fact]
    public async Task GetContentOrDefault_EmptyContent_ReturnsDefault()
    {
        // Arrange
        using var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("") };

        // Act
        var result = await response.GetContentOrDefault("fallback", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal("fallback", result);
    }
}
