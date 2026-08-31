using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.Altinity;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Hubs;

public class AltinityProxyHubTests
{
    private const string TestDeveloper = "testUser";
    private const string TestOrg = "ttd";
    private const string TestApp = "test-app";

    private readonly string _testConnectionId = Guid.NewGuid().ToString();

    private readonly Mock<IChatService> _chatServiceMock = new();
    private readonly Mock<IAltinityWebSocketService> _webSocketServiceMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();
    private readonly Mock<IApiKeyService> _apiKeyServiceMock = new();

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
    public async Task StartWorkflow_ThrowsHubException_WhenRequestContextDoesNotOwnThread()
    {
        var threadId = Guid.NewGuid();
        SetupThreadOwnership(threadId, TestOrg, TestApp);
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization("other-org")).ReturnsAsync(true);
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
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(TestOrg)).ReturnsAsync(true);
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
        // The agents service rejects cancellation without the caller's identity.
        Assert.Equal(TestDeveloper, Assert.Single(cancelRequest.Headers.GetValues("X-Developer")));
    }

    private AltinityProxyHub CreateHub()
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(GetHttpContextForDeveloper(TestDeveloper));

        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient(_agentHttpHandler));

        var hub = new AltinityProxyHub(
            httpContextAccessor.Object,
            httpClientFactory.Object,
            new Mock<ILogger<AltinityProxyHub>>().Object,
            Options.Create(new AltinitySettings { AgentUrl = "http://test-path" }),
            Options.Create(new ServiceRepositorySettings { RepositoryBaseURL = "http://test-repos" }),
            _webSocketServiceMock.Object,
            _userOrganizationServiceMock.Object,
            new AltinityAttachmentBuffer(),
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

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Requests.Add(request);
            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"accepted": true}""") }
            );
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
