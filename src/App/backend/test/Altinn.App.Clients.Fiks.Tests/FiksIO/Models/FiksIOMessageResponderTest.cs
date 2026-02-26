using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.IO.Client.Send;
using KS.Fiks.IO.Crypto.Models;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksIO.Models;

public class FiksIOMessageResponderTest
{
    [Fact]
    public async Task PropertiesAndMethods_AreMappedCorrectly()
    {
        // Arrange
        var svarSenderMock = new Mock<ISvarSender>();
        var responder = new FiksIOMessageResponder(svarSenderMock.Object);

        // Act
        await responder.Ack();
        await responder.Nack();
        await responder.NackWithRequeue();
        await responder.Respond(string.Empty, [], Guid.Empty, CancellationToken.None);
        await responder.Respond(string.Empty, Guid.Empty, CancellationToken.None);

        // Assert
        svarSenderMock.Verify(s => s.AckAsync(), Times.Once);
        svarSenderMock.Verify(s => s.NackAsync(), Times.Once);
        svarSenderMock.Verify(s => s.NackWithRequeueAsync(), Times.Once);
        svarSenderMock.Verify(
            s =>
                s.Svar(
                    It.IsAny<string>(),
                    It.IsAny<IList<IPayload>>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        svarSenderMock.Verify(
            s => s.Svar(It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }
}
