using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.Altinity;
using Altinn.Studio.Designer.Models;
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
    private const string TestConnectionId = "connection-1";

    private readonly Mock<IChatService> _chatServiceMock = new();
    private readonly Mock<IAltinityWebSocketService> _webSocketServiceMock = new();

    [Fact]
    public async Task RegisterSession_ThrowsHubException_WhenThreadIdIsNotAGuid()
    {
        var hub = CreateHub();

        var exception = await Assert.ThrowsAsync<HubException>(() =>
            hub.RegisterSession(TestOrg, TestApp, "not-a-guid")
        );

        Assert.Contains("Invalid threadId format", exception.Message);
        _webSocketServiceMock.Verify(
            ws => ws.RegisterSessionAsync(It.IsAny<string>(), It.IsAny<string>()),
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
            ws => ws.RegisterSessionAsync(It.IsAny<string>(), It.IsAny<string>()),
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

        _webSocketServiceMock.Verify(ws => ws.RegisterSessionAsync(TestDeveloper, threadId.ToString()), Times.Once);
    }

    private AltinityProxyHub CreateHub()
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(GetHttpContextForDeveloper(TestDeveloper));

        var hub = new AltinityProxyHub(
            httpContextAccessor.Object,
            httpClientFactory: null!,
            new Mock<ILogger<AltinityProxyHub>>().Object,
            Options.Create(new AltinitySettings { AgentUrl = "http://test-path" }),
            Options.Create(new ServiceRepositorySettings()),
            _webSocketServiceMock.Object,
            new Mock<IUserOrganizationService>().Object,
            attachmentStore: null!,
            new Mock<IApiKeyService>().Object,
            _chatServiceMock.Object
        );

        var hubCallerContext = new Mock<HubCallerContext>();
        hubCallerContext.Setup(c => c.ConnectionId).Returns(TestConnectionId);
        hub.Context = hubCallerContext.Object;

        return hub;
    }

    private static HttpContext GetHttpContextForDeveloper(string developer)
    {
        var claims = new List<Claim> { new(ClaimTypes.Name, developer) };
        var identity = new ClaimsIdentity(claims, "TestUserLogin");
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        return httpContext;
    }
}
