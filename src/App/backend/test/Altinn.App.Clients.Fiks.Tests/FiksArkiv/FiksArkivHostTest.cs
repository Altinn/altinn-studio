using System.Linq.Expressions;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Configuration;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;
using KS.Fiks.IO.Crypto.Models;
using KS.Fiks.IO.Send.Client.Models;
using Ks.Fiks.Maskinporten.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using MessageReceivedCallback = System.Func<
    Altinn.App.Clients.Fiks.FiksIO.Models.FiksIOReceivedMessage,
    System.Threading.Tasks.Task
>;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivHostTest
{
    [Fact]
    public async Task ExecuteAsync_StopsWhenCancellationRequested()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
        var (clientFactoryMock, createdClients) = GetFixIOClientFactoryMock();
        using var cts = new CancellationTokenSource();

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv();
                services.AddSingleton(loggerMock.Object);
                services.AddSingleton(clientFactoryMock.Object);
            },
            mockFiksIOClientFactory: false
        );

        // Act
        await fixture.FiksArkivHost.StartAsync(cts.Token);
        await cts.CancelAsync();

        // Assert
        Assert.Single(createdClients);
        createdClients[0].Verify(x => x.DisposeAsync(), Times.Once);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "Fiks Arkiv Service stopping.", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_PerformsHealthCheck_ReconnectsWhenRequired()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
        var fakeTime = new FakeTimeProvider();
        var (clientFactoryMock, createdClients) = GetFixIOClientFactoryMock(x =>
            x.Setup(m => m.IsOpenAsync()).ReturnsAsync(false)
        );

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv();
                services.AddSingleton(loggerMock.Object);
                services.AddSingleton(clientFactoryMock.Object);
                services.AddSingleton<TimeProvider>(fakeTime);
            },
            mockFiksIOClientFactory: false
        );

        // Act
        await fixture.FiksArkivHost.StartAsync(CancellationToken.None);
        fakeTime.Advance(TimeSpan.FromMinutes(10));

        // Assert
        Assert.Equal(2, createdClients.Count);
        clientFactoryMock.Verify(x => x.CreateClient(It.IsAny<FiksIOConfiguration>()), Times.Exactly(2));
        createdClients[0].Verify(x => x.IsOpenAsync(), Times.Once);
        createdClients[0].Verify(x => x.DisposeAsync(), Times.Once);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Error, "FiksIO Client is unhealthy, reconnecting.", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task GenerateAndSendMessage_PerformsRequiredActions()
    {
        // Arrange
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var fiksArkivConfigResolverMock = new Mock<IFiksArkivConfigResolver>(MockBehavior.Strict);
        var fiksArkivPayloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>(MockBehavior.Strict);
        FiksIOMessageRequest? capturedRequest = null;
        var customFiksArkivSettings = new FiksArkivSettings
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
        };
        var instance = new Instance
        {
            Id = "12345/8a19d133-f897-4c41-aac1-ec3859b0d67c",
            Data =
            [
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = customFiksArkivSettings.Receipt.ArchiveRecord.DataType,
                    Filename = customFiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
                },
            ],
        };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("FiksArkivCustomSettings");
                services.AddSingleton(fiksIOClientMock.Object);
                services.AddSingleton(fiksArkivInstanceClientMock.Object);
                services.AddSingleton(fiksArkivConfigResolverMock.Object);
                services.AddSingleton(fiksArkivPayloadGeneratorMock.Object);
            },
            [("FiksArkivCustomSettings", customFiksArkivSettings)],
            useDefaultFiksArkivSettings: false
        );

        fiksArkivConfigResolverMock
            .Setup(x => x.GetRecipient(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new FiksArkivRecipient(Guid.Parse("120ec76a-c73b-43f7-957b-1450422c32b3"), null!, null!, null!)
            )
            .Verifiable(Times.Once);
        fiksArkivConfigResolverMock
            .Setup(x => x.GetCorrelationId(It.IsAny<Instance>()))
            .Returns("correlation-id")
            .Verifiable(Times.Once);

        fiksArkivPayloadGeneratorMock
            .Setup(x =>
                x.GeneratePayload(
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<FiksArkivRecipient>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([new FiksIOMessagePayload(FiksArkivConstants.Filenames.ArchiveRecord, "dummy"u8.ToArray())])
            .Verifiable(Times.Once);

        fiksIOClientMock
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (FiksIOMessageRequest request, CancellationToken _) =>
                {
                    capturedRequest = request;
                    return new FiksIOMessageResponse(SendtMelding.FromSentMessageApiModel(new SendtMeldingApiModel()));
                }
            )
            .Verifiable(Times.Once);

        fiksArkivInstanceClientMock
            .Setup(x =>
                x.DeleteBinaryData(It.IsAny<InstanceIdentifier>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>())
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);
        fiksArkivInstanceClientMock
            .Setup(x =>
                x.InsertBinaryData(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement())
            .Verifiable(Times.Once);

        // Act
        await fixture.FiksArkivHost.GenerateAndSendMessage("task", instance, "message-type");

        // Assert
        Assert.NotNull(capturedRequest);
        Assert.Equal("message-type", capturedRequest.MessageType);
        Assert.Equal("correlation-id", capturedRequest.CorrelationId);
        Assert.Equal("120ec76a-c73b-43f7-957b-1450422c32b3", capturedRequest.Recipient.ToString());
        Assert.Equal("8a19d133-f897-4c41-aac1-ec3859b0d67c", capturedRequest.SendersReference.ToString());
        Assert.Equal(TimeSpan.FromDays(2), capturedRequest.MessageLifetime);
        Assert.Equal(FiksArkivConstants.Filenames.ArchiveRecord, capturedRequest.Payload.Single().Filename);

        fiksArkivInstanceClientMock.Verify();
        fiksArkivConfigResolverMock.Verify();
        fiksArkivPayloadGeneratorMock.Verify();
        fiksIOClientMock.Verify();
    }

    [Theory]
    [InlineData(FiksArkivMeldingtype.Ugyldigforespørsel, MessageResponseType.Error)]
    [InlineData(FiksArkivMeldingtype.Serverfeil, MessageResponseType.Error)]
    [InlineData(FiksArkivMeldingtype.Ikkefunnet, MessageResponseType.Error)]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettMottatt, MessageResponseType.Success)]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering, MessageResponseType.Success)]
    public async Task ExecuteAsync_RegistersMessageReceivedHandler_ExecutesMessageHandler(
        string messageType,
        MessageResponseType messageResponseType
    )
    {
        // Arrange
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var fiksArkivResponseHandlerMock = new Mock<IFiksArkivResponseHandler>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>();
        var mottattMeldingMock = new Mock<IMottattMelding>();
        var svarSenderMock = new Mock<ISvarSender>();
        var messageId = Guid.NewGuid();
        var payload = new FiksIOReceivedMessage(
            new MottattMeldingArgs(mottattMeldingMock.Object, svarSenderMock.Object)
        );
        string? invokedMessageHandler = null;
        MessageReceivedCallback? messageReceivedCallback = null;
        FiksIOReceivedMessage? forwardedMessage = null;
        IReadOnlyList<FiksArkivReceivedMessagePayload>? forwardedPayloads = null;
        Instance? forwardedInstance = null;
        Instance sourceInstance = new() { Id = $"12345/{Guid.NewGuid()}", AppId = "ttd/unit-testing" };
        InstanceIdentifier? receivedInstanceIdentifier = null;

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(fiksIOClientMock.Object);
            services.AddSingleton(fiksArkivResponseHandlerMock.Object);
            services.AddSingleton(fiksArkivInstanceClientMock.Object);
        });

        fiksIOClientMock
            .Setup(x => x.OnMessageReceived(It.IsAny<MessageReceivedCallback>()))
            .Returns(
                (MessageReceivedCallback callback) =>
                {
                    messageReceivedCallback = callback;
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);
        fiksArkivResponseHandlerMock
            .Setup(x =>
                x.HandleError(
                    It.IsAny<Instance>(),
                    It.IsAny<FiksIOReceivedMessage>(),
                    It.IsAny<IReadOnlyList<FiksArkivReceivedMessagePayload>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    Instance instance,
                    FiksIOReceivedMessage message,
                    IReadOnlyList<FiksArkivReceivedMessagePayload> payloads,
                    CancellationToken _
                ) =>
                {
                    forwardedInstance = instance;
                    forwardedMessage = message;
                    forwardedPayloads = payloads;
                    invokedMessageHandler = nameof(IFiksArkivResponseHandler.HandleError);
                }
            );
        fiksArkivResponseHandlerMock
            .Setup(x =>
                x.HandleSuccess(
                    It.IsAny<Instance>(),
                    It.IsAny<FiksIOReceivedMessage>(),
                    It.IsAny<IReadOnlyList<FiksArkivReceivedMessagePayload>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    Instance instance,
                    FiksIOReceivedMessage message,
                    IReadOnlyList<FiksArkivReceivedMessagePayload> payloads,
                    CancellationToken _
                ) =>
                {
                    forwardedInstance = instance;
                    forwardedMessage = message;
                    forwardedPayloads = payloads;
                    invokedMessageHandler = nameof(IFiksArkivResponseHandler.HandleSuccess);
                }
            );
        fiksArkivInstanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<InstanceIdentifier>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (InstanceIdentifier instanceIdentifier, CancellationToken _) =>
                {
                    receivedInstanceIdentifier = instanceIdentifier;
                    return sourceInstance;
                }
            )
            .Verifiable(Times.Once);

        mottattMeldingMock.Setup(x => x.MeldingType).Returns(messageType);
        mottattMeldingMock.Setup(x => x.HasPayload).Returns(true);
        mottattMeldingMock.Setup(x => x.DecryptedPayloads).ReturnsAsync([new StreamPayload(Stream.Null, "dummy.txt")]);
        mottattMeldingMock.Setup(x => x.MeldingId).Returns(messageId);
        mottattMeldingMock
            .Setup(x => x.KlientKorrelasjonsId)
            .Returns(fixture.FiksArkivConfigResolver.GetCorrelationId(sourceInstance).ToUrlSafeBase64());

        svarSenderMock.Setup(x => x.AckAsync()).Verifiable(Times.Once);

        // Act
        await fixture.FiksArkivHost.StartAsync(CancellationToken.None);
        await messageReceivedCallback!.Invoke(payload);

        // Assert
        Assert.NotNull(forwardedMessage);
        Assert.NotNull(forwardedInstance);
        Assert.NotNull(receivedInstanceIdentifier);
        Assert.Equal(sourceInstance, forwardedInstance);
        Assert.Equal(messageId, forwardedMessage.Message.MessageId);
        Assert.Equivalent(new InstanceIdentifier(sourceInstance).InstanceGuid, receivedInstanceIdentifier.InstanceGuid);
        Assert.Equal(messageType, forwardedMessage.Message.MessageType);
        Assert.NotNull(forwardedPayloads);
        Assert.Equal(
            messageResponseType == MessageResponseType.Error
                ? nameof(IFiksArkivResponseHandler.HandleError)
                : nameof(IFiksArkivResponseHandler.HandleSuccess),
            invokedMessageHandler
        );

        fiksIOClientMock.Verify();
        fiksArkivInstanceClientMock.Verify();
        svarSenderMock.Verify();
        svarSenderMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("Development", true)]
    [InlineData("Staging", true)]
    [InlineData("Production", false)]
    [InlineData("Unknown", true)]
    public async Task MessageReceivedHandler_HandlesErrorIfThrown(string environment, bool shouldAck)
    {
        // Arrange
        var fiksArkivResponseHandlerMock = new Mock<IFiksArkivResponseHandler>();
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
        var svarSenderMock = new Mock<ISvarSender>();
        var payload = new FiksIOReceivedMessage(
            new MottattMeldingArgs(
                Mock.Of<IMottattMelding>(x => x.KlientKorrelasjonsId == "invalid-base64"), // Triggers parse error
                svarSenderMock.Object
            )
        );

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv();
                services.AddSingleton(loggerMock.Object);
                services.AddSingleton(fiksArkivResponseHandlerMock.Object);
            },
            hostEnvironment: environment
        );

        // Act
        await fixture.FiksArkivHost.IncomingMessageListener(payload);

        // Assert
        svarSenderMock.Verify(x => x.AckAsync(), shouldAck ? Times.Once : Times.Never);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "received message", loggerMock.Object),
            Times.Once
        );
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Error, "failed with unrecoverable error", loggerMock.Object),
            Times.Once
        );
    }

    private static (
        Mock<IFiksIOClientFactory> clientFactoryMock,
        List<Mock<KS.Fiks.IO.Client.IFiksIOClient>> createdClients
    ) GetFixIOClientFactoryMock(Action<Mock<KS.Fiks.IO.Client.IFiksIOClient>>? creationCallback = null)
    {
        var clients = new List<Mock<KS.Fiks.IO.Client.IFiksIOClient>>();
        var clientFactoryMock = new Mock<IFiksIOClientFactory>();
        clientFactoryMock
            .Setup(x => x.CreateClient(It.IsAny<KS.Fiks.IO.Client.Configuration.FiksIOConfiguration>()))
            .ReturnsAsync(() =>
            {
                var clientMock = new Mock<KS.Fiks.IO.Client.IFiksIOClient>();
                creationCallback?.Invoke(clientMock);
                clients.Add(clientMock);

                return clientMock.Object;
            });

        return (clientFactoryMock, clients);
    }

    public enum MessageResponseType
    {
        Error,
        Success,
    }
}
