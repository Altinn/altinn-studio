using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace Designer.Tests.Services.Altinity;

public class AltinityAgentClientTests
{
    private const string AgentUrl = "http://altinn-altinity-agents";
    private const string ExpectedCleanupUrl = $"{AgentUrl}/api/observability/trace-cleanup";

    [Fact]
    public async Task TriggerTraceCleanupAsync_PostsToCleanupEndpoint()
    {
        HttpRequestMessage capturedRequest = null;
        AltinityAgentClient client = CreateClient(HttpStatusCode.OK, request => capturedRequest = request);

        await client.TriggerTraceCleanupAsync(CancellationToken.None);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest.Method);
        Assert.Equal(ExpectedCleanupUrl, capturedRequest.RequestUri!.ToString());
    }

    [Fact]
    public async Task TriggerTraceCleanupAsync_ThrowsOnNonSuccess()
    {
        AltinityAgentClient client = CreateClient(HttpStatusCode.InternalServerError);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.TriggerTraceCleanupAsync(CancellationToken.None));
    }

    private static AltinityAgentClient CreateClient(
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
        IOptions<AltinitySettings> settings = Options.Create(new AltinitySettings { AgentUrl = AgentUrl });
        return new AltinityAgentClient(httpClient, settings);
    }
}
