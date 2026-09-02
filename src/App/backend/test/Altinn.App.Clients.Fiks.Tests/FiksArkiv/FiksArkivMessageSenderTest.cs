using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivMessageSenderTest
{
    private static readonly Guid _replyAddress = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");

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

        await fixture.FiksArkivMessageSender.GenerateAndSendMessage(
            "task",
            "message-type",
            workflowStepId,
            _replyAddress,
            executionReferenceTime,
            dataMutatorMock.Object
        );

        Assert.NotNull(sentRequest);
        Assert.Equal("message-type", sentRequest.MessageType);
        Assert.Equal(_replyAddress.ToString(), sentRequest.CorrelationId);
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

        await fixture.FiksArkivMessageSender.GenerateAndSendMessage(
            "task",
            "message-type",
            Guid.Parse("d483baea-587c-47cf-beca-1d1a4e3849b1"),
            _replyAddress,
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
}
