using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Hubs.Assistant;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Hubs;

public class AssistantProxyHubTests
{
    private const string TestDeveloper = "testUser";
    private const string TestOrg = "ttd";
    private const string TestApp = "test-app";

    private readonly string _testConnectionId = Guid.NewGuid().ToString();

    private readonly Mock<IChatService> _chatServiceMock = new();
    private readonly Mock<IAssistantWebSocketService> _webSocketServiceMock = new();
    private readonly Mock<ICanUseAiAssistantEvaluator> _canUseAiAssistantEvaluatorMock = new();
    private readonly Mock<IApiKeyService> _apiKeyServiceMock = new();

    public AssistantProxyHubTests()
    {
        SetupAssistantAccess(TestOrg, hasAccess: true);
    }

    [Fact]
    public async Task RegisterSession_ThrowsHubException_WhenDeveloperHasNoAssistantAccess()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        SetupAssistantAccess(TestOrg, hasAccess: false);
        var hub = CreateHub();

        var exception = await Assert.ThrowsAsync<HubException>(() =>
            hub.RegisterSession(TestOrg, TestApp, threadId.ToString())
        );

        Assert.Contains("Access denied", exception.Message);
        _webSocketServiceMock.Verify(
            ws => ws.RegisterSessionAsync(It.IsAny<string>(), It.IsAny<AltinnRepoEditingContext>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RegisterSession_ThrowsHubException_WhenThreadIdIsNotAGuid()
    {
        var hub = CreateHub();

        var exception = await Assert.ThrowsAsync<HubException>(() =>
            hub.RegisterSession(TestOrg, TestApp, "not-a-guid")
        );

        Assert.Contains("Invalid threadId format", exception.Message);
        _webSocketServiceMock.Verify(
            ws => ws.RegisterSessionAsync(It.IsAny<string>(), It.IsAny<AltinnRepoEditingContext>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RegisterSession_ThrowsArgumentException_WhenOrgIsInvalidPathSegment()
    {
        var hub = CreateHub();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            hub.RegisterSession("../etc", TestApp, Guid.NewGuid().ToString())
        );

        _chatServiceMock.Verify(
            s =>
                s.ThreadBelongsToDeveloperAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task RegisterSession_ThrowsHubException_WhenDeveloperDoesNotOwnThread()
    {
        var threadId = Guid.NewGuid();
        _chatServiceMock
            .Setup(s =>
                s.ThreadBelongsToDeveloperAsync(
                    threadId,
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false);

        var hub = CreateHub();

        var exception = await Assert.ThrowsAsync<HubException>(() =>
            hub.RegisterSession(TestOrg, TestApp, threadId.ToString())
        );

        Assert.Contains("Access denied", exception.Message);
        _webSocketServiceMock.Verify(
            ws => ws.RegisterSessionAsync(It.IsAny<string>(), It.IsAny<AltinnRepoEditingContext>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RegisterSession_RegistersSessionOnAgentsService_WhenDeveloperOwnsThread()
    {
        var threadId = Guid.NewGuid();
        _chatServiceMock
            .Setup(s =>
                s.ThreadBelongsToDeveloperAsync(
                    threadId,
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);

        var hub = CreateHub();

        await hub.RegisterSession(TestOrg, TestApp, threadId.ToString());

        _webSocketServiceMock.Verify(
            ws =>
                ws.RegisterSessionAsync(
                    threadId.ToString(),
                    It.Is<AltinnRepoEditingContext>(c =>
                        c.Org == TestOrg && c.Repo == TestApp && c.Developer == TestDeveloper
                    )
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task StartWorkflow_ThrowsHubException_WhenDeveloperHasNoAssistantAccess()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        var hub = CreateHub();
        await hub.RegisterSession(TestOrg, TestApp, threadId.ToString());
        SetupAssistantAccess(TestOrg, hasAccess: false);

        var request = JsonSerializer.SerializeToElement(
            new
            {
                session_id = threadId.ToString(),
                org = TestOrg,
                app = TestApp,
            }
        );

        var exception = await Assert.ThrowsAsync<HubException>(() => hub.StartWorkflow(request));

        Assert.Contains("Access denied", exception.Message);
        Assert.Empty(_agentHttpHandler.Requests);
    }

    [Fact]
    public async Task StartWorkflow_ThrowsHubException_WhenRequestContextDoesNotOwnThread()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        SetupAssistantAccess("other-org", hasAccess: true);
        var hub = CreateHub();
        await hub.RegisterSession(TestOrg, TestApp, threadId.ToString());

        var request = JsonSerializer.SerializeToElement(
            new
            {
                session_id = threadId.ToString(),
                org = "other-org",
                app = "other-app",
            }
        );

        var exception = await Assert.ThrowsAsync<HubException>(() => hub.StartWorkflow(request));

        Assert.Contains("Access denied", exception.Message);
        _webSocketServiceMock.Verify(
            ws =>
                ws.RegisterSessionAsync(
                    threadId.ToString(),
                    It.Is<AltinnRepoEditingContext>(c => c.Org == "other-org")
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task StartWorkflow_ReRegistersSessionWithRequestContext_WhenDeveloperOwnsThread()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        SetupApiKey();
        var hub = CreateHub();
        await hub.RegisterSession(TestOrg, TestApp, threadId.ToString());

        var request = JsonSerializer.SerializeToElement(
            new
            {
                session_id = threadId.ToString(),
                org = TestOrg,
                app = TestApp,
            }
        );

        await hub.StartWorkflow(request);

        // Once from RegisterSession, once re-registered by StartWorkflow.
        _webSocketServiceMock.Verify(
            ws =>
                ws.RegisterSessionAsync(
                    threadId.ToString(),
                    It.Is<AltinnRepoEditingContext>(c =>
                        c.Org == TestOrg && c.Repo == TestApp && c.Developer == TestDeveloper
                    )
                ),
            Times.Exactly(2)
        );
    }

    private void SetupAssistantAccess(string org, bool hasAccess)
    {
        _canUseAiAssistantEvaluatorMock
            .Setup(e => e.CanUseFeatureAsync(org, It.IsAny<string>()))
            .ReturnsAsync(hasAccess);
        _canUseAiAssistantEvaluatorMock
            .Setup(e => e.ResolveCostOrgAsync(org, It.IsAny<string>(), null))
            .ReturnsAsync(hasAccess ? org : null);
    }

    private void SetupCostOrg(string org, string requestedCostOrg, string resolvedCostOrg)
    {
        _canUseAiAssistantEvaluatorMock
            .Setup(e => e.ResolveCostOrgAsync(org, It.IsAny<string>(), requestedCostOrg))
            .ReturnsAsync(resolvedCostOrg);
    }

    private void SetupApiKey()
    {
        _apiKeyServiceMock
            .Setup(a =>
                a.CreateAsync(
                    TestDeveloper,
                    It.IsAny<string>(),
                    It.IsAny<ApiKeyType>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(("test-api-key", new ApiKey()));
    }

    [Fact]
    public async Task StartWorkflow_ForwardsRepositoryOwnerAsCostOrg_ForOrgRepository()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        SetupApiKey();
        var hub = CreateHub();
        await hub.RegisterSession(TestOrg, TestApp, threadId.ToString());

        var request = JsonSerializer.SerializeToElement(
            new
            {
                session_id = threadId.ToString(),
                org = TestOrg,
                app = TestApp,
            }
        );

        await hub.StartWorkflow(request);

        JsonElement forwarded = Assert.Single(_agentHttpHandler.RequestBodies);
        Assert.Equal(TestOrg, forwarded.GetProperty("cost_org").GetString());
        Assert.Equal($"http://test-repos/{TestOrg}/{TestApp}.git", forwarded.GetProperty("repo_url").GetString());
    }

    [Fact]
    public async Task StartWorkflow_ForwardsSelectedCostOrg_ForDevelopersOwnRepository()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestDeveloper, TestApp);
        SetupAssistantAccess(TestDeveloper, hasAccess: true);
        SetupCostOrg(TestDeveloper, requestedCostOrg: "nfk", resolvedCostOrg: "nfk");
        SetupApiKey();
        var hub = CreateHub();
        await hub.RegisterSession(TestDeveloper, TestApp, threadId.ToString());

        var request = JsonSerializer.SerializeToElement(
            new
            {
                session_id = threadId.ToString(),
                org = TestDeveloper,
                app = TestApp,
                cost_org = "nfk",
            }
        );

        await hub.StartWorkflow(request);

        JsonElement forwarded = Assert.Single(_agentHttpHandler.RequestBodies);
        Assert.Equal("nfk", forwarded.GetProperty("cost_org").GetString());
        Assert.Equal(TestDeveloper, forwarded.GetProperty("org").GetString());
    }

    [Fact]
    public async Task StartWorkflow_ThrowsHubException_WhenCostOrgIsNotAllowed()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestDeveloper, TestApp);
        SetupAssistantAccess(TestDeveloper, hasAccess: true);
        SetupCostOrg(TestDeveloper, requestedCostOrg: "other-org", resolvedCostOrg: null);
        var hub = CreateHub();
        await hub.RegisterSession(TestDeveloper, TestApp, threadId.ToString());

        var request = JsonSerializer.SerializeToElement(
            new
            {
                session_id = threadId.ToString(),
                org = TestDeveloper,
                app = TestApp,
                cost_org = "other-org",
            }
        );

        var exception = await Assert.ThrowsAsync<HubException>(() => hub.StartWorkflow(request));

        Assert.Contains("Access denied", exception.Message);
        Assert.Empty(_agentHttpHandler.Requests);
    }

    private void SetupThreadOwnership(Guid threadId, string org, string app)
    {
        _chatServiceMock
            .Setup(s =>
                s.ThreadBelongsToDeveloperAsync(
                    threadId,
                    It.Is<AltinnRepoEditingContext>(c => c.Org == org && c.Repo == app),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
    }

    private readonly StubHttpMessageHandler _agentHttpHandler = new();

    [Fact]
    public async Task CancelWorkflow_SendsDeveloperIdentityToAgentsService()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        var hub = CreateHub();
        await hub.RegisterSession(TestOrg, TestApp, threadId.ToString());

        await hub.CancelWorkflow(threadId.ToString());

        HttpRequestMessage cancelRequest = Assert.Single(_agentHttpHandler.Requests);
        Assert.EndsWith($"/api/agent/cancel/{threadId}", cancelRequest.RequestUri!.ToString());
        // The assistant service rejects cancellation without the caller's identity.
        Assert.Equal(TestDeveloper, Assert.Single(cancelRequest.Headers.GetValues("X-Developer")));
    }

    private AssistantProxyHub CreateHub()
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(GetHttpContextForDeveloper(TestDeveloper));

        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient(_agentHttpHandler));

        var hub = new AssistantProxyHub(
            httpContextAccessor.Object,
            httpClientFactory.Object,
            new Mock<ILogger<AssistantProxyHub>>().Object,
            Options.Create(new AssistantSettings { AgentUrl = "http://test-path" }),
            Options.Create(new ServiceRepositorySettings { RepositoryBaseURL = "http://test-repos" }),
            _webSocketServiceMock.Object,
            _canUseAiAssistantEvaluatorMock.Object,
            new AssistantAttachmentBuffer(),
            _apiKeyServiceMock.Object,
            _chatServiceMock.Object
        );

        var hubCallerContext = new Mock<HubCallerContext>();
        hubCallerContext.Setup(c => c.ConnectionId).Returns(_testConnectionId);
        hub.Context = hubCallerContext.Object;

        return hub;
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = new();

        public List<JsonElement> RequestBodies { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Requests.Add(request);
            if (request.Content != null)
            {
                RequestBodies.Add(
                    JsonSerializer.Deserialize<JsonElement>(await request.Content.ReadAsStringAsync(cancellationToken))
                );
            }

            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"accepted": true}""") };
        }
    }

    private static HttpContext GetHttpContextForDeveloper(string developer)
    {
        var claims = new List<Claim> { new(ClaimTypes.Name, developer) };
        var identity = new ClaimsIdentity(claims, "TestUserLogin");
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        return httpContext;
    }
}
