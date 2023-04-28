using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Hubs;

public class PreviewHubTests
{
    private readonly Mock<ILogger<PreviewHub>> _logger;

    public PreviewHubTests()
    {
        _logger = new Mock<ILogger<PreviewHub>>();
    }

    [Fact]
    public async Task SignalR_ServerToClientCommunication_ShouldReturn1MessageToClient()
    {
        // arrange
        Mock<IHubCallerClients> mockClients = new();
        Mock<IClientProxy> mockClientProxy = new();

        mockClients.Setup(clients => clients.Others).Returns(mockClientProxy.Object);

        PreviewHub previewHubMock = new(_logger.Object) { Clients = mockClients.Object };

        // act
        await previewHubMock.SendMessage("testMessage");

        // assert
        mockClients.Verify(clients => clients.Others, Times.Once);
    }
}
