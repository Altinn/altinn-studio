using System.Text.Json;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features.Process;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;
using KS.Fiks.IO.Crypto.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Moq;
using MessageReceivedCallback = System.Func<
    Altinn.App.Clients.Fiks.FiksIO.Models.FiksIOReceivedMessage,
    System.Threading.Tasks.Task
>;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivSubscriberTest
{
    [Fact]
    public async Task ExecuteAsync_StopsWhenCancellationRequested()
    {
        // Arrange
        var messageListenerRegistered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var loggerMock = new Mock<ILogger<FiksArkivSubscriber>>();
        fiksIOClientMock
            .Setup(x => x.OnMessageReceived(It.IsAny<MessageReceivedCallback>()))
            .Returns(() =>
            {
                messageListenerRegistered.TrySetResult();
                return Task.CompletedTask;
            });
        fiksIOClientMock.Setup(x => x.DisposeAsync()).Returns(ValueTask.CompletedTask);

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(fiksIOClientMock.Object);
            services.AddSingleton(loggerMock.Object);
        });

        // Act
        await fixture.FiksArkivSubscriber.StartAsync(CancellationToken.None);
        await messageListenerRegistered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await fixture.FiksArkivSubscriber.StopAsync(CancellationToken.None);

        // Assert
        fiksIOClientMock.Verify(x => x.OnMessageReceived(It.IsAny<MessageReceivedCallback>()), Times.Once);
        fiksIOClientMock.Verify(x => x.DisposeAsync(), Times.Once);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "Fiks Arkiv Service stopping.", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_PerformsHealthCheck_ReconnectsWhenRequired()
    {
        // Arrange
        var messageListenerRegistered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var reconnectCalled = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var loggerMock = new Mock<ILogger<FiksArkivSubscriber>>();
        var fakeTime = new FakeTimeProvider();
        fiksIOClientMock
            .Setup(x => x.OnMessageReceived(It.IsAny<MessageReceivedCallback>()))
            .Returns(() =>
            {
                messageListenerRegistered.TrySetResult();
                return Task.CompletedTask;
            });
        fiksIOClientMock.Setup(x => x.IsHealthy()).ReturnsAsync(false);
        fiksIOClientMock
            .Setup(x => x.Reconnect())
            .Returns(() =>
            {
                reconnectCalled.TrySetResult();
                return Task.CompletedTask;
            });
        fiksIOClientMock.Setup(x => x.DisposeAsync()).Returns(ValueTask.CompletedTask);

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(fiksIOClientMock.Object);
            services.AddSingleton(loggerMock.Object);
            services.AddSingleton<TimeProvider>(fakeTime);
        });

        // Act
        await fixture.FiksArkivSubscriber.StartAsync(CancellationToken.None);
        await messageListenerRegistered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await AdvanceTimeUntil(fakeTime, reconnectCalled.Task, TimeSpan.FromMinutes(11));

        // Assert
        fiksIOClientMock.Verify(x => x.IsHealthy(), Times.Once);
        fiksIOClientMock.Verify(x => x.Reconnect(), Times.Once);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Error, "FiksIO Client is unhealthy, reconnecting.", loggerMock.Object),
            Times.Once
        );
    }

    [Theory]
    [InlineData(FiksArkivMeldingtype.Ugyldigforespørsel)]
    [InlineData(FiksArkivMeldingtype.Serverfeil)]
    [InlineData(FiksArkivMeldingtype.Ikkefunnet)]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettMottatt)]
    [InlineData(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering)]
    public async Task ExecuteAsync_RegistersMessageReceivedHandler_ForwardsEveryMessageIntoTheMailbox(
        string messageType
    )
    {
        // The subscriber classifies nothing: what a message means is the waiting task's business.
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var forwarder = RecordingForwarder(out var forwarded);
        var messageId = Guid.NewGuid();
        var mailboxId = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");
        var svarSenderMock = new Mock<ISvarSender>();
        FiksIOReceivedMessage message = ReceivedMessage(
            messageType,
            messageId,
            mailboxId.ToString().ToUrlSafeBase64(),
            svarSenderMock
        );
        MessageReceivedCallback? messageReceivedCallback = null;

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(fiksIOClientMock.Object);
            services.AddSingleton(forwarder.Object);
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

        await fixture.FiksArkivSubscriber.StartAsync(CancellationToken.None);
        await WaitUntil(() => messageReceivedCallback is not null);
        await messageReceivedCallback!.Invoke(message);

        var delivery = Assert.Single(forwarded);
        Assert.Equal(mailboxId, delivery.MailboxId);
        Assert.Equal(fixture.FiksArkivServiceTask.Type, delivery.ServiceTaskType);
        Assert.Equal(messageId.ToString(), delivery.IdempotencyKey);
        var stored = JsonSerializer.Deserialize<StoredFiksArkivMessage>(delivery.Payload);
        Assert.NotNull(stored);
        Assert.Equal(messageType, stored.MessageType);
        Assert.Equal(messageId, stored.MessageId);
        Assert.Equal("dummy.txt", Assert.Single(stored.Payloads!).Filename);

        fiksIOClientMock.Verify();
        svarSenderMock.Verify(x => x.AckAsync(), Times.Once);
        svarSenderMock.VerifyNoOtherCalls();
    }

    [Theory]
    // Not decodable at all — what another integration sharing this Fiks IO account routinely produces.
    [InlineData("@@@")]
    // Decodable, but not an address.
    [InlineData("bm90LWEtZ3VpZA")]
    // An address that addresses nothing.
    [InlineData("MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAw")]
    public async Task IncomingMessageListener_WithoutAUsableReplyAddress_AcknowledgesWithoutForwarding(
        string rawCorrelationId
    )
    {
        var forwarder = RecordingForwarder(out var forwarded);
        var loggerMock = new Mock<ILogger<FiksArkivSubscriber>>();
        var svarSenderMock = new Mock<ISvarSender>();
        FiksIOReceivedMessage message = ReceivedMessage(
            FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            Guid.NewGuid(),
            rawCorrelationId,
            svarSenderMock
        );

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(loggerMock.Object);
            services.AddSingleton(forwarder.Object);
        });

        await fixture.FiksArkivSubscriber.IncomingMessageListener(message);

        Assert.Empty(forwarded);
        svarSenderMock.Verify(x => x.AckAsync(), Times.Once);
        svarSenderMock.Verify(x => x.NackWithRequeueAsync(), Times.Never);
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Error, "no usable correlation id", loggerMock.Object),
            Times.Once
        );
    }

    [Theory]
    // Nothing left the app and the next attempt can succeed.
    [InlineData(ServiceTaskReplyForwardOutcome.EngineUnavailable, true)]
    [InlineData(ServiceTaskReplyForwardOutcome.SigningUnavailable, true)]
    // Settled: no amount of redelivery places this message anywhere, so requeuing only loops the queue.
    [InlineData(ServiceTaskReplyForwardOutcome.Unroutable, false)]
    [InlineData(ServiceTaskReplyForwardOutcome.Late, false)]
    [InlineData(ServiceTaskReplyForwardOutcome.PayloadTooLarge, false)]
    [InlineData(ServiceTaskReplyForwardOutcome.MailboxFull, false)]
    [InlineData(ServiceTaskReplyForwardOutcome.Rejected, false)]
    public async Task IncomingMessageListener_RedeliveryFollowsTheForwardingOutcome(
        ServiceTaskReplyForwardOutcome outcome,
        bool expectRedelivery
    )
    {
        var mailboxId = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");
        var forwarder = new Mock<IServiceTaskReplyForwarder>(MockBehavior.Strict);
        forwarder
            .Setup(x =>
                x.ForwardReply(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(
                new ServiceTaskReplyForwardException(outcome, mailboxId, "key", $"forwarding failed: {outcome}")
            );
        var svarSenderMock = new Mock<ISvarSender>();
        FiksIOReceivedMessage message = ReceivedMessage(
            FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            Guid.NewGuid(),
            mailboxId.ToString().ToUrlSafeBase64(),
            svarSenderMock
        );

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(forwarder.Object);
        });

        await fixture.FiksArkivSubscriber.IncomingMessageListener(message);

        svarSenderMock.Verify(x => x.NackWithRequeueAsync(), expectRedelivery ? Times.Once : Times.Never);
        svarSenderMock.Verify(x => x.AckAsync(), expectRedelivery ? Times.Never : Times.Once);
    }

    [Theory]
    [InlineData("Development", true)]
    [InlineData("Staging", true)]
    [InlineData("Production", false)]
    [InlineData("Unknown", true)]
    public async Task MessageReceivedHandler_HandlesErrorIfThrown(string environment, bool shouldAck)
    {
        // Resolving the unregistered forwarder throws something that is not a forwarding verdict — the
        // unrecoverable class — after the message has been read and logged.
        var loggerMock = new Mock<ILogger<FiksArkivSubscriber>>();
        var svarSenderMock = new Mock<ISvarSender>();
        FiksIOReceivedMessage message = ReceivedMessage(
            FiksArkivMeldingtype.ArkivmeldingOpprettKvittering,
            Guid.NewGuid(),
            Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192").ToString().ToUrlSafeBase64(),
            svarSenderMock
        );

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv();
                services.AddSingleton(loggerMock.Object);
            },
            hostEnvironment: environment
        );

        await fixture.FiksArkivSubscriber.IncomingMessageListener(message);

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

    private static Mock<IServiceTaskReplyForwarder> RecordingForwarder(
        out List<(Guid MailboxId, string ServiceTaskType, string Payload, string IdempotencyKey)> forwarded
    )
    {
        var recorded = new List<(Guid, string, string, string)>();
        forwarded = recorded!;
        var forwarder = new Mock<IServiceTaskReplyForwarder>(MockBehavior.Strict);
        forwarder
            .Setup(x =>
                x.ForwardReply(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (Guid mailboxId, string serviceTaskType, string payload, string idempotencyKey, CancellationToken _) =>
                    recorded.Add((mailboxId, serviceTaskType, payload, idempotencyKey))
            )
            .Returns(Task.CompletedTask);
        return forwarder;
    }

    private static FiksIOReceivedMessage ReceivedMessage(
        string messageType,
        Guid messageId,
        string rawCorrelationId,
        Mock<ISvarSender> svarSenderMock
    )
    {
        var mottattMeldingMock = new Mock<IMottattMelding>();
        mottattMeldingMock.Setup(x => x.MeldingType).Returns(messageType);
        mottattMeldingMock.Setup(x => x.MeldingId).Returns(messageId);
        mottattMeldingMock.Setup(x => x.KlientKorrelasjonsId).Returns(rawCorrelationId);
        mottattMeldingMock.Setup(x => x.HasPayload).Returns(true);
        mottattMeldingMock.Setup(x => x.DecryptedPayloads).ReturnsAsync([new StreamPayload(Stream.Null, "dummy.txt")]);
        return new FiksIOReceivedMessage(new MottattMeldingArgs(mottattMeldingMock.Object, svarSenderMock.Object));
    }

    private static async Task WaitUntil(Func<bool> condition, TimeSpan? timeout = null)
    {
        var deadline = DateTime.UtcNow + (timeout ?? TimeSpan.FromSeconds(5));

        while (!condition())
        {
            if (DateTime.UtcNow >= deadline)
                throw new TimeoutException("Timed out waiting for the background service to reach the expected state.");

            await Task.Delay(10);
        }
    }

    private static async Task AdvanceTimeUntil(FakeTimeProvider timeProvider, Task signal, TimeSpan maximumAdvance)
    {
        var step = TimeSpan.FromSeconds(1);
        var remaining = maximumAdvance;

        while (!signal.IsCompleted && remaining > TimeSpan.Zero)
        {
            var currentStep = remaining > step ? step : remaining;
            timeProvider.Advance(currentStep);
            remaining -= currentStep;
            await Task.WhenAny(signal, Task.Delay(10));
        }

        await signal.WaitAsync(TimeSpan.FromSeconds(5));
    }
}
