using Altinn.App.Core.Extensions;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Extensions;

public class HttpClientExtensionTest
{
    private const string RequestUri = "https://unit.test/api";
    private const string AuthorizationToken = "not-a-real-token";

    [Theory]
    [InlineData(null, null)]
    [InlineData("test", null)]
    [InlineData("test", "platform-access-token")]
    public async Task PostAsync_AddsRequiredHeaders(string? content, string? platformAccessToken)
    {
        // Arrange
        HttpRequestMessage? capturedHttpRequestMessage = null;
        var httpContent = content is not null ? new StringContent(content) : null;
        using var fixture = CreateMockedHttpClient(request =>
        {
            capturedHttpRequestMessage = request;
        });

        // Act
        var result = await fixture.HttpClient.PostAsync(
            AuthorizationToken,
            RequestUri,
            httpContent,
            platformAccessToken
        );

        // Assert
        Assert.NotNull(capturedHttpRequestMessage);
        Assert.Equal(System.Net.HttpStatusCode.NoContent, result.StatusCode);
        Assert.Equal(RequestUri, capturedHttpRequestMessage.RequestUri!.ToString());
        Assert.Equal(httpContent, capturedHttpRequestMessage.Content);
        Assert.Equal(HttpMethod.Post, capturedHttpRequestMessage.Method);

        AssertHeaders(capturedHttpRequestMessage, AuthorizationToken, platformAccessToken);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("test", null)]
    [InlineData("test", "platform-access-token")]
    public async Task PutAsync_AddsRequiredHeaders(string? content, string? platformAccessToken)
    {
        // Arrange
        HttpRequestMessage? capturedHttpRequestMessage = null;
        var httpContent = content is not null ? new StringContent(content) : null;
        using var fixture = CreateMockedHttpClient(request =>
        {
            capturedHttpRequestMessage = request;
        });

        // Act
        var result = await fixture.HttpClient.PutAsync(
            AuthorizationToken,
            RequestUri,
            httpContent,
            platformAccessToken
        );

        // Assert
        Assert.NotNull(capturedHttpRequestMessage);
        Assert.Equal(System.Net.HttpStatusCode.NoContent, result.StatusCode);
        Assert.Equal(RequestUri, capturedHttpRequestMessage!.RequestUri!.ToString());
        Assert.Equal(httpContent, capturedHttpRequestMessage.Content);
        Assert.Equal(HttpMethod.Put, capturedHttpRequestMessage.Method);

        AssertHeaders(capturedHttpRequestMessage, AuthorizationToken, platformAccessToken);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("platform-access-token")]
    public async Task GetAsync_AddsRequiredHeaders(string? platformAccessToken)
    {
        // Arrange
        HttpRequestMessage? capturedHttpRequestMessage = null;
        using var fixture = CreateMockedHttpClient(request =>
        {
            capturedHttpRequestMessage = request;
        });

        // Act
        var result = await fixture.HttpClient.GetAsync(AuthorizationToken, RequestUri, platformAccessToken);

        // Assert
        Assert.NotNull(capturedHttpRequestMessage);
        Assert.Equal(System.Net.HttpStatusCode.NoContent, result.StatusCode);
        Assert.Equal(RequestUri, capturedHttpRequestMessage!.RequestUri!.ToString());
        Assert.Equal(HttpMethod.Get, capturedHttpRequestMessage.Method);

        AssertHeaders(capturedHttpRequestMessage, AuthorizationToken, platformAccessToken);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("platform-access-token")]
    public async Task DeleteAsync_AddsRequiredHeaders(string? platformAccessToken)
    {
        // Arrange
        HttpRequestMessage? capturedHttpRequestMessage = null;
        using var fixture = CreateMockedHttpClient(request =>
        {
            capturedHttpRequestMessage = request;
        });

        // Act
        var result = await fixture.HttpClient.DeleteAsync(AuthorizationToken, RequestUri, platformAccessToken);

        // Assert
        Assert.NotNull(capturedHttpRequestMessage);
        Assert.Equal(System.Net.HttpStatusCode.NoContent, result.StatusCode);
        Assert.Equal(RequestUri, capturedHttpRequestMessage!.RequestUri!.ToString());
        Assert.Equal(HttpMethod.Delete, capturedHttpRequestMessage.Method);

        AssertHeaders(capturedHttpRequestMessage, AuthorizationToken, platformAccessToken);
    }

    private static void AssertHeaders(
        HttpRequestMessage request,
        string expectedAuthorizationToken,
        string? expectedPlatformAccessToken = null
    )
    {
        Assert.Equal($"Bearer {expectedAuthorizationToken}", request.Headers.GetValues("Authorization").Single());

        if (expectedPlatformAccessToken is not null)
        {
            Assert.Equal(expectedPlatformAccessToken, request.Headers.GetValues("PlatformAccessToken").Single());
        }
    }

    private static MockedHttpClient CreateMockedHttpClient(Action<HttpRequestMessage>? sendCallback = null)
    {
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(httpMessageHandlerMock.Object);

        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>(
                (request, ct) =>
                {
                    sendCallback?.Invoke(request);
                }
            )
            .ReturnsAsync(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.NoContent });

        return new MockedHttpClient(httpClient, httpMessageHandlerMock);
    }

    private sealed record MockedHttpClient(HttpClient HttpClient, Mock<HttpMessageHandler> MockHttpMessageHandler)
        : IDisposable
    {
        public void Dispose()
        {
            HttpClient.Dispose();
        }
    }
}
