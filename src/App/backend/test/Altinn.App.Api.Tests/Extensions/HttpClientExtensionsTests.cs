namespace Altinn.App.Api.Tests.Extensions;

public class HttpClientExtensionsTests
{
    [Fact]
    public void GetDelegatingHandler_HandlerFound_ReturnsHandler()
    {
        // Arrange
        var primaryHandler = new HttpClientHandler();
        var targetHandler = new CustomDelegatingHandler(primaryHandler);
        using var httpClient = new HttpClient(targetHandler);

        // Act
        var result = httpClient.GetDelegatingHandler<CustomDelegatingHandler>();

        // Assert
        Assert.NotNull(result);
        Assert.IsType<CustomDelegatingHandler>(result);
    }

    [Fact]
    public void GetDelegatingHandler_HandlerNotFound_ReturnsNull()
    {
        // Arrange
        var primaryHandler = new HttpClientHandler();
        var someOtherHandler = new DelegatingHandlerStub(primaryHandler);
        using var httpClient = new HttpClient(someOtherHandler);

        // Act
        var result = httpClient.GetDelegatingHandler<CustomDelegatingHandler>();

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetDelegatingHandler_InitialHandlerIsNotDelegatingHandler_ReturnsNull()
    {
        // Arrange
        using var httpClient = new HttpClient(new HttpClientHandler());

        // Act
        var result = httpClient.GetDelegatingHandler<DelegatingHandler>();

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetDelegatingHandler_InnerHandlerIsNotDelegatingHandler_ReturnsNull()
    {
        // Arrange
        var primaryHandler = new HttpClientHandler();
        var outerHandler = new DelegatingHandlerStub(primaryHandler);
        using var httpClient = new HttpClient(outerHandler);

        // Act
        var result = httpClient.GetDelegatingHandler<CustomDelegatingHandler>();

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetDelegatingHandler_MultipleHandlersInChain_ReturnsCorrectHandler()
    {
        // Arrange
        var primaryHandler = new HttpClientHandler();
        var innerHandler = new DelegatingHandlerStub(primaryHandler);
        var targetHandler = new CustomDelegatingHandler(innerHandler);
        using var httpClient = new HttpClient(targetHandler);

        // Act
        var result = httpClient.GetDelegatingHandler<DelegatingHandlerStub>();

        // Assert
        Assert.NotNull(result);
        Assert.IsType<DelegatingHandlerStub>(result);
    }
}

public class CustomDelegatingHandler : DelegatingHandler
{
    public CustomDelegatingHandler(HttpMessageHandler innerHandler)
    {
        InnerHandler = innerHandler;
    }
}

public class DelegatingHandlerStub : DelegatingHandler
{
    public DelegatingHandlerStub(HttpMessageHandler innerHandler)
    {
        InnerHandler = innerHandler;
    }
}
