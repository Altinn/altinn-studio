using System.Collections.Generic;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Hubs;

public class PreviewHubTests
{
    private readonly Mock<ILogger<PreviewHub>> _logger;
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
    private const string TestUser = "testUser";

    public PreviewHubTests()
    {
        _logger = new Mock<ILogger<PreviewHub>>();
        _httpContextAccessor = new Mock<IHttpContextAccessor>();
        _httpContextAccessor.Setup(req => req.HttpContext).Returns(GetHttpContextForTestUser(TestUser));
    }

    [Fact]
    public async Task SignalR_ServerToClientCommunication_ShouldReturn1MessageToClient()
    {
        // arrange
        Mock<IHubCallerClients> mockClients = new();
        Mock<IClientProxy> mockClientProxy = new();

        mockClients.Setup(clients => clients.Group(TestUser)).Returns(mockClientProxy.Object);

        PreviewHub previewHubMock = new(_logger.Object, _httpContextAccessor.Object) { Clients = mockClients.Object };

        // act
        await previewHubMock.SendMessage("testMessage");

        // assert
        mockClients.Verify(clients => clients.Group(TestUser), Times.Once);
    }

    [Fact]
    public async Task SignalR_ClientWithDifferentDeveloperName_ShouldNotReceiveMessage()
    {
        // arrange
        Mock<IHubCallerClients> mockClients = new();
        Mock<IClientProxy> mockClientProxy = new();

        mockClients.Setup(clients => clients.Group(TestUser)).Returns(mockClientProxy.Object);

        PreviewHub previewHubMock = new(_logger.Object, _httpContextAccessor.Object) { Clients = mockClients.Object };

        // act
        await previewHubMock.SendMessage("testMessage");

        // assert
        mockClients.Verify(clients => clients.Group("AnotherDeveloperName"), Times.Never);
    }

    private static HttpContext GetHttpContextForTestUser(string userName)
    {
        var identity = new GenericIdentity(userName);
        var principal = new GenericPrincipal(identity, null);

        HttpContext context = new DefaultHttpContext();
        context.Request.HttpContext.User = principal;

        return context;
    }
}
