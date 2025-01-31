using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.Preview;
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
        Mock<IHubCallerClients<IPreviewClient>> mockClients = new();
        Mock<IPreviewClient> mockClientProxy = new();

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
        Mock<IHubCallerClients<IPreviewClient>> mockClients = new();
        Mock<IPreviewClient> mockClientProxy = new();

        mockClients.Setup(clients => clients.Group(TestUser)).Returns(mockClientProxy.Object);

        PreviewHub previewHubMock = new(_logger.Object, _httpContextAccessor.Object) { Clients = mockClients.Object };

        // act
        await previewHubMock.SendMessage("testMessage");

        // assert
        mockClients.Verify(clients => clients.Group("AnotherDeveloperName"), Times.Never);
    }

    private static HttpContext GetHttpContextForTestUser(string userName)
    {
        List<Claim> claims = new();
        claims.Add(new Claim(ClaimTypes.Name, userName));
        ClaimsIdentity identity = new("TestUserLogin");
        identity.AddClaims(claims);

        ClaimsPrincipal principal = new(identity);
        HttpContext c = new DefaultHttpContext();
        c.Request.HttpContext.User = principal;

        return c;
    }
}
