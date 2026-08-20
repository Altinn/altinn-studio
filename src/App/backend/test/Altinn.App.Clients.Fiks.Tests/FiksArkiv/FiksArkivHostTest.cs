using System.Text.Json;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;
using KS.Fiks.IO.Crypto.Models;
using KS.Fiks.IO.Send.Client.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
        var messageListenerRegistered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
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
        await fixture.FiksArkivHost.StartAsync(CancellationToken.None);
        await messageListenerRegistered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await fixture.FiksArkivHost.StopAsync(CancellationToken.None);

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
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
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
        await fixture.FiksArkivHost.StartAsync(CancellationToken.None);
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

    [Fact]
    public async Task GenerateAndSendMessage_WithDataMutator_NormalizesNonSeekableArchiveForStageAndSend()
    {
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var fiksArkivConfigResolverMock = new Mock<IFiksArkivConfigResolver>();
        var fiksArkivPayloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>();
        var dataMutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        ReadOnlyMemory<byte>? stagedArchiveRecord = null;
        byte[]? sentArchiveRecord = null;
        FiksIOMessageRequest? sentRequest = null;
        Guid workflowStepId = Guid.Parse("d483baea-587c-47cf-beca-1d1a4e3849b1");
        DateTimeOffset executionReferenceTime = DateTimeOffset.Parse("2026-05-17T10:15:30+02:00");
        var customFiksArkivSettings = new FiksArkivSettings
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
        };
        var existingArchiveRecord = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = customFiksArkivSettings.Receipt.ArchiveRecord.DataType,
            Filename = customFiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
        };
        var instance = new Instance
        {
            Id = "12345/8a19d133-f897-4c41-aac1-ec3859b0d67c",
            Data = [existingArchiveRecord],
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

        dataMutatorMock.Setup(x => x.Instance).Returns(instance);
        dataMutatorMock.Setup(x => x.RemoveDataElement(existingArchiveRecord)).Verifiable(Times.Once);
        dataMutatorMock
            .Setup(x =>
                x.AddBinaryDataElement(
                    customFiksArkivSettings.Receipt.ArchiveRecord.DataType,
                    "application/xml",
                    customFiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    "task",
                    It.IsAny<List<KeyValueEntry>?>()
                )
            )
            .Callback(
                (string _, string _, string? _, ReadOnlyMemory<byte> data, string? _, List<KeyValueEntry>? _) =>
                    stagedArchiveRecord = data
            )
            .Returns((BinaryDataChange)null!)
            .Verifiable(Times.Once);

        fiksArkivConfigResolverMock
            .Setup(x => x.GetRecipient(It.IsAny<IInstanceDataAccessor>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new FiksArkivRecipient(Guid.Parse("120ec76a-c73b-43f7-957b-1450422c32b3"), null!, null!, null!)
            );
        fiksArkivConfigResolverMock.Setup(x => x.GetCorrelationId(instance)).Returns("correlation-id");
        var generatedArchivePayload = new FiksIOMessagePayload(
            FiksArkivConstants.Filenames.ArchiveRecord,
            new NonSeekableReadStream("dummy"u8.ToArray())
        );
        var generatedPayloads = new[]
        {
            new FiksIOMessagePayload("before.txt", "before"u8.ToArray()),
            generatedArchivePayload,
            new FiksIOMessagePayload("after.pdf", "after"u8.ToArray()),
        };
        fiksArkivPayloadGeneratorMock
            .Setup(x =>
                x.GeneratePayload(
                    "task",
                    It.IsAny<FiksArkivRecipient>(),
                    "message-type",
                    executionReferenceTime,
                    dataMutatorMock.Object,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(generatedPayloads)
            .Verifiable(Times.Once);
        fiksIOClientMock
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .Returns(
                async (FiksIOMessageRequest request, CancellationToken cancellationToken) =>
                {
                    Assert.NotNull(stagedArchiveRecord);
                    sentRequest = request;
                    List<FiksIOMessagePayload> sentPayloads = [.. request.Payload];
                    Assert.Equal(
                        ["before.txt", FiksArkivConstants.Filenames.ArchiveRecord, "after.pdf"],
                        sentPayloads.Select(x => x.Filename)
                    );

                    FiksIOMessagePayload archiveRecord = sentPayloads[1];
                    Assert.True(archiveRecord.Data.CanSeek);
                    using var destination = new MemoryStream();
                    await archiveRecord.Data.CopyToAsync(destination, cancellationToken);
                    sentArchiveRecord = destination.ToArray();
                    return TestHelpers.GetFiksIOMessageResponse();
                }
            )
            .Verifiable(Times.Once);

        await fixture.FiksArkivHost.GenerateAndSendMessage(
            "task",
            "message-type",
            workflowStepId,
            executionReferenceTime,
            dataMutatorMock.Object
        );

        Assert.NotNull(sentRequest);
        Assert.Equal("message-type", sentRequest.MessageType);
        Assert.Equal("correlation-id", sentRequest.CorrelationId);
        Assert.Equal(Guid.Parse("120ec76a-c73b-43f7-957b-1450422c32b3"), sentRequest.Recipient);
        Assert.Equal(workflowStepId, sentRequest.SendersReference);
        Assert.Equal(TimeSpan.FromDays(2), sentRequest.MessageLifetime);
        Assert.NotSame(generatedArchivePayload, sentRequest.Payload.ElementAt(1));
        Assert.Equal("dummy"u8.ToArray(), stagedArchiveRecord?.ToArray());
        Assert.Equal("dummy"u8.ToArray(), sentArchiveRecord);
        dataMutatorMock.Verify();
        fiksArkivPayloadGeneratorMock.Verify();
        fiksIOClientMock.Verify();
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();
    }

    private sealed class NonSeekableReadStream(ReadOnlyMemory<byte> data) : Stream
    {
        private readonly MemoryStream _inner = new(data.ToArray());

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override void Flush() { }

        public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            _inner.ReadAsync(buffer, cancellationToken);

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    [Fact]
    public async Task GenerateAndSendMessage_WithUnitOfWork_DoesNotWriteStorageUntilNormalUnitOfWorkSave()
    {
        var fiksIOClientMock = new Mock<IFiksIOClient>(MockBehavior.Strict);
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var fiksArkivConfigResolverMock = new Mock<IFiksArkivConfigResolver>(MockBehavior.Strict);
        var fiksArkivPayloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>(MockBehavior.Strict);
        var customFiksArkivSettings = new FiksArkivSettings
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
        };
        var instance = new Instance { Id = "12345/8a19d133-f897-4c41-aac1-ec3859b0d67c", Data = [] };
        var applicationMetadata = new ApplicationMetadata("ttd/unit-testing")
        {
            DataTypes =
            [
                new DataType { Id = customFiksArkivSettings.Receipt.ArchiveRecord.DataType },
                new DataType { Id = customFiksArkivSettings.Receipt.ConfirmationRecord.DataType },
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

        fixture.AppMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        fiksArkivConfigResolverMock
            .Setup(x => x.GetRecipient(It.IsAny<IInstanceDataAccessor>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new FiksArkivRecipient(Guid.Parse("120ec76a-c73b-43f7-957b-1450422c32b3"), null!, null!, null!)
            );
        fiksArkivConfigResolverMock.Setup(x => x.GetCorrelationId(instance)).Returns("correlation-id");
        fiksArkivPayloadGeneratorMock
            .Setup(x =>
                x.GeneratePayload(
                    "task",
                    It.IsAny<FiksArkivRecipient>(),
                    "message-type",
                    DateTimeOffset.Parse("2026-05-17T10:15:30+02:00"),
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([new FiksIOMessagePayload(FiksArkivConstants.Filenames.ArchiveRecord, "dummy"u8.ToArray())]);
        fiksIOClientMock
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse())
            .Verifiable(Times.Once);

        int insertCalls = 0;
        fixture
            .DataClientMock.Setup(x =>
                x.InsertBinaryData(
                    instance.Id,
                    customFiksArkivSettings.Receipt.ArchiveRecord.DataType,
                    "application/xml",
                    It.IsAny<string?>(),
                    It.IsAny<Stream>(),
                    "task",
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    string _,
                    string dataType,
                    string contentType,
                    string? filename,
                    Stream _,
                    string? _,
                    StorageAuthenticationMethod? _,
                    CancellationToken _
                ) =>
                {
                    insertCalls++;
                    return new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = dataType,
                        ContentType = contentType,
                        Filename = filename,
                        InstanceGuid = "8a19d133-f897-4c41-aac1-ec3859b0d67c",
                    };
                }
            );

        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            fixture.DataClientMock.Object,
            fixture.InstanceClientMock.Object,
            applicationMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            "task",
            language: null
        );

        await fixture.FiksArkivHost.GenerateAndSendMessage(
            "task",
            "message-type",
            Guid.Parse("d483baea-587c-47cf-beca-1d1a4e3849b1"),
            DateTimeOffset.Parse("2026-05-17T10:15:30+02:00"),
            unitOfWork
        );

        Assert.Equal(0, insertCalls);
        fiksIOClientMock.Verify();
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();

        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        Assert.Single(changes.BinaryDataChanges);

        await unitOfWork.UpdateInstanceData(changes);
        await unitOfWork.SaveChanges(changes);

        Assert.Equal(1, insertCalls);
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

        await fixture.FiksArkivHost.StartAsync(CancellationToken.None);
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
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
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

        await fixture.FiksArkivHost.IncomingMessageListener(message);

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

        await fixture.FiksArkivHost.IncomingMessageListener(message);

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
        var loggerMock = new Mock<ILogger<FiksArkivHost>>();
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

        await fixture.FiksArkivHost.IncomingMessageListener(message);

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
