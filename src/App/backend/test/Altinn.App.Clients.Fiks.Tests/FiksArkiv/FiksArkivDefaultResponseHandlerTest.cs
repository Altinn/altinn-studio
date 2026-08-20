using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivDefaultResponseHandlerTest
{
    [Theory]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettMottatt)]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering)]
    public async Task HandleSuccess_RecordsTheMessage(string messageType)
    {
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(messageType);
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        await using var fixture = CreateFixture(loggerMock);

        await fixture.FiksArkivResponseHandler.HandleSuccess(instance, message, null);

        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "is a successful response", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleSuccess_WarnsWhenAMessageCarriesMoreThanOneResponse()
    {
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering);
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        await using var fixture = CreateFixture(loggerMock);

        await fixture.FiksArkivResponseHandler.HandleSuccess(
            instance,
            message,
            [
                new FiksArkivReceivedMessagePayload.Unknown("first.xml", "<first />"),
                new FiksArkivReceivedMessagePayload.Unknown("second.xml", "<second />"),
            ]
        );

        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Warning, "contains multiple responses", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleError_RecordsTheError()
    {
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.Ugyldigforespørsel);
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        await using var fixture = CreateFixture(loggerMock);

        await fixture.FiksArkivResponseHandler.HandleError(instance, message, null);

        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Error, "is an error response", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task TheBuiltInHandler_NeverTouchesTheInstanceOrTheProcess()
    {
        // The task applies successHandling/errorHandling itself now, as the verdict of the transition the message
        // belongs to. The strict client mock is the guard: any call from here fails this test rather than shipping
        // a double advance.
        var instance = InstanceFactory();
        var instanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(instanceClientMock.Object);
        });

        await fixture.FiksArkivResponseHandler.HandleSuccess(
            instance,
            ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering),
            null
        );
        await fixture.FiksArkivResponseHandler.HandleError(
            instance,
            ReceivedMessageFactory(FiksArkivMeldingtype.Serverfeil),
            null
        );

        instanceClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TheBuiltInHandler_ReadsAReplayedMessageWithoutTouchingTheConnection()
    {
        // The handler runs on the reply handler's execution, where the message is replayed and the Fiks IO
        // connection is gone — so a member that needed the connection would throw here.
        var instance = InstanceFactory();
        Guid messageId = Guid.Parse("6a6d1f1e-9f0f-4d2d-9a6a-2b4ea1ff1b6f");
        FiksIOReceivedMessage replayed = FiksIOReceivedMessage.Replay(
            new FiksIOReplayedMessage
            {
                MessageId = messageId,
                MessageType = FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
                Payloads = [("arkivmelding-kvittering.xml", "<kvittering />")],
            }
        );
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        await using var fixture = CreateFixture(loggerMock);

        await fixture.FiksArkivResponseHandler.HandleSuccess(instance, replayed, null);

        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, messageId.ToString(), loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task AReceivedMessage_SaysWhetherItIsLiveOrReplayed()
    {
        // The two shapes of the same public type differ in what they can do, so a handler that runs in both places
        // must be able to ask rather than provoke the exception. Pinned in both directions.
        FiksIOReceivedMessage live = ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering);
        FiksIOReceivedMessage replayed = FiksIOReceivedMessage.Replay(
            new FiksIOReplayedMessage
            {
                MessageId = Guid.Parse("6a6d1f1e-9f0f-4d2d-9a6a-2b4ea1ff1b6f"),
                MessageType = FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            }
        );

        Assert.False(live.IsReplayed);
        Assert.False(live.Message.IsReplayed);
        Assert.True(replayed.IsReplayed);
        Assert.True(replayed.Message.IsReplayed);

        // And the flag agrees with what the members actually do, so it cannot drift into a label.
        Assert.Throws<InvalidOperationException>(() =>
        {
            _ = replayed.Message.GetEncryptedStream();
        });
        await Assert.ThrowsAsync<InvalidOperationException>(() => replayed.Responder.Ack());
    }

    private static TestFixture CreateFixture(Mock<ILogger<FiksArkivDefaultResponseHandler>> loggerMock) =>
        TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(loggerMock.Object);
        });

    private static Instance InstanceFactory() => new() { Id = $"12345/{Guid.NewGuid()}" };

    private static FiksIOReceivedMessage ReceivedMessageFactory(string messageType)
    {
        var mottattMeldingMock = new Mock<IMottattMelding>();
        mottattMeldingMock.SetupGet(m => m.MeldingType).Returns(messageType);
        mottattMeldingMock.SetupGet(m => m.MeldingId).Returns(Guid.NewGuid());
        return new FiksIOReceivedMessage(new MottattMeldingArgs(mottattMeldingMock.Object, Mock.Of<ISvarSender>()));
    }
}
