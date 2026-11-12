using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace Designer.Tests.Services.Assistant;

public class AssistantServiceClientTests
{
    private const string AgentUrl = "http://altinn-altinity-agents";
    private const string ExpectedCleanupUrl = $"{AgentUrl}/api/traces/delete-expired";

    [Fact]
    public async Task TriggerTraceCleanupAsync_PostsToCleanupEndpoint()
    {
        HttpRequestMessage capturedRequest = null;
        AssistantServiceClient client = CreateClient(HttpStatusCode.OK, request => capturedRequest = request);

        await client.TriggerTraceCleanupAsync(CancellationToken.None);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest.Method);
        Assert.Equal(ExpectedCleanupUrl, capturedRequest.RequestUri!.ToString());
    }

    [Fact]
    public async Task TriggerTraceCleanupAsync_ThrowsOnNonSuccess()
    {
        AssistantServiceClient client = CreateClient(HttpStatusCode.InternalServerError);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.TriggerTraceCleanupAsync(CancellationToken.None));
    }

    [Fact]
    public async Task StartWorkflow_PostsTheRequestInTheAssistantsFormat()
    {
        HttpRequestMessage capturedRequest = null;
        JsonElement capturedBody = default;
        AssistantServiceClient client = CreateClient(
            HttpStatusCode.OK,
            request =>
            {
                capturedRequest = request;
                capturedBody = JsonSerializer.Deserialize<JsonElement>(request.Content!.ReadAsStringAsync().Result);
            }
        );
        var request = new AssistantWorkflowStartRequest(
            SessionId: "session-1",
            Goal: "Lag et skjema",
            RepoUrl: "http://repos/ttd/app.git",
            Branch: "master",
            AllowAppChanges: true,
            CostOrg: "ttd",
            Attachments: [new AssistantWorkflowAttachment("krav.pdf", "application/pdf", 4, "test"u8.ToArray())]
        );

        await client.StartWorkflow(request, "testUser", "api-key", CancellationToken.None);

        Assert.Equal(HttpMethod.Post, capturedRequest.Method);
        Assert.Equal($"{AgentUrl}/api/agent/start", capturedRequest.RequestUri!.ToString());
        Assert.Equal("api-key", capturedRequest.Headers.GetValues("X-Api-Key").Single());
        Assert.Equal("testUser", capturedRequest.Headers.GetValues("X-Developer").Single());
        Assert.Equal("session-1", capturedRequest.Headers.GetValues("X-Session-Id").Single());
        Assert.Equal("session-1", capturedBody.GetProperty("session_id").GetString());
        Assert.Equal("http://repos/ttd/app.git", capturedBody.GetProperty("repo_url").GetString());
        Assert.True(capturedBody.GetProperty("allow_app_changes").GetBoolean());
        Assert.Equal("ttd", capturedBody.GetProperty("cost_org").GetString());
        JsonElement attachment = Assert.Single(capturedBody.GetProperty("attachments").EnumerateArray());
        Assert.Equal("application/pdf", attachment.GetProperty("mimeType").GetString());
        Assert.Equal("dGVzdA==", attachment.GetProperty("dataBase64").GetString());
    }

    [Fact]
    public async Task CancelWorkflow_PostsToTheSessionsCancelEndpointWithTheDeveloper()
    {
        HttpRequestMessage capturedRequest = null;
        AssistantServiceClient client = CreateClient(HttpStatusCode.OK, request => capturedRequest = request);

        await client.CancelWorkflow("testUser", "session-1", CancellationToken.None);

        Assert.Equal(HttpMethod.Post, capturedRequest.Method);
        Assert.Equal($"{AgentUrl}/api/agent/cancel/session-1", capturedRequest.RequestUri!.ToString());
        // The assistant service rejects a cancel request that does not identify the developer.
        Assert.Equal("testUser", capturedRequest.Headers.GetValues("X-Developer").Single());
    }

    [Fact]
    public async Task RespondToPermission_PostsTheAnswerToTheSessionsPermissionEndpoint()
    {
        HttpRequestMessage capturedRequest = null;
        JsonElement capturedBody = default;
        AssistantServiceClient client = CreateClient(
            HttpStatusCode.OK,
            request =>
            {
                capturedRequest = request;
                capturedBody = JsonSerializer.Deserialize<JsonElement>(request.Content!.ReadAsStringAsync().Result);
            }
        );

        await client.RespondToPermission("testUser", "session-1", "request-1", true, CancellationToken.None);

        Assert.Equal($"{AgentUrl}/api/agent/permission/session-1", capturedRequest.RequestUri!.ToString());
        Assert.Equal("testUser", capturedRequest.Headers.GetValues("X-Developer").Single());
        Assert.Equal("request-1", capturedBody.GetProperty("request_id").GetString());
        Assert.True(capturedBody.GetProperty("granted").GetBoolean());
    }

    [Fact]
    public async Task CancelWorkflow_ThrowsOnNonSuccess()
    {
        AssistantServiceClient client = CreateClient(HttpStatusCode.Forbidden);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.CancelWorkflow("testUser", "session-1", CancellationToken.None)
        );
    }

    private static AssistantServiceClient CreateClient(
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
        return new AssistantServiceClient(httpClient, settings);
    }
}
