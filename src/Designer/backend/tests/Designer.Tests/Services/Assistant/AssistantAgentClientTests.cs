using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace Designer.Tests.Services.Assistant;

public class AssistantAgentClientTests
{
    private const string AgentUrl = "http://altinn-altinity-agents";
    private const string ExpectedCleanupUrl = $"{AgentUrl}/api/traces/delete-expired";

    [Fact]
    public async Task TriggerTraceCleanupAsync_PostsToCleanupEndpoint()
    {
        HttpRequestMessage capturedRequest = null;
        AssistantAgentClient client = CreateClient(HttpStatusCode.OK, request => capturedRequest = request);

        await client.TriggerTraceCleanupAsync(CancellationToken.None);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest.Method);
        Assert.Equal(ExpectedCleanupUrl, capturedRequest.RequestUri!.ToString());
    }

    [Fact]
    public async Task TriggerTraceCleanupAsync_ThrowsOnNonSuccess()
    {
        AssistantAgentClient client = CreateClient(HttpStatusCode.InternalServerError);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.TriggerTraceCleanupAsync(CancellationToken.None));
    }

    private static AssistantAgentClient CreateClient(
        HttpStatusCode statusCode,
        Action<HttpRequestMessage> onRequest = null
    )
    {
        Mock<HttpMessageHandler> mockHandler = new(MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>((request, _) => onRequest?.Invoke(request))
            .ReturnsAsync(new HttpResponseMessage { StatusCode = statusCode, Content = new StringContent("") });

        HttpClient httpClient = new(mockHandler.Object);
        IOptions<AssistantSettings> settings = Options.Create(new AssistantSettings { AgentUrl = AgentUrl });
        return new AssistantAgentClient(httpClient, settings);
    }
}
