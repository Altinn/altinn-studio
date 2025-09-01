using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using Moq;
using Moq.Protected;
using Xunit;

public class AzureDevOpsTokenDelegatingHandlerTests
{
    [Fact]
    public async Task SendAsync_WhenUnauthorized_ThrowsHttpRequestException()
    {
        // Arrange
        var mockInnerHandler = new Mock<HttpMessageHandler>();

        mockInnerHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Unauthorized
            });

        var handler = new AzureDevOpsTokenDelegatingHandler
        {
            InnerHandler = mockInnerHandler.Object
        };

        HttpClient httpClient = new HttpClient(handler);
        HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, "https://dev.azure.com");

        HttpResponseMessage response = await httpClient.SendAsync(request);
        string content = await response.Content.ReadAsStringAsync();

        Assert.Equal("Failed to interact with Azure DevOps. Contact system support.", content);
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
    }

    [Fact]
    public async Task SendAsync_WhenSuccessful_ReturnsResponse()
    {
        var mockInnerHandler = new Mock<HttpMessageHandler>();

        mockInnerHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("Success")
            });

        var handler = new AzureDevOpsTokenDelegatingHandler
        {
            InnerHandler = mockInnerHandler.Object
        };

        HttpClient httpClient = new HttpClient(handler);
        HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, "https://dev.azure.com");

        HttpResponseMessage response = await httpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Success", await response.Content.ReadAsStringAsync());
    }
}
