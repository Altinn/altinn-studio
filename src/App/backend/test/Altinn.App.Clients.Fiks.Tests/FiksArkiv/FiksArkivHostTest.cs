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
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
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
                    It.IsAny<IInstanceDataAccessor?>(),
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

    [Fact]
    public async Task StageArchiveRecordForMessage_WithDataMutator_StagesArchiveRecordOnMutator()
    {
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var fiksArkivConfigResolverMock = new Mock<IFiksArkivConfigResolver>();
        var fiksArkivPayloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>();
        var dataMutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
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
            .Returns((BinaryDataChange)null!)
            .Verifiable(Times.Once);

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
                    instance,
                    It.IsAny<FiksArkivRecipient>(),
                    "message-type",
                    It.IsAny<IInstanceDataAccessor?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([new FiksIOMessagePayload(FiksArkivConstants.Filenames.ArchiveRecord, "dummy"u8.ToArray())]);
        await fixture.FiksArkivHost.StageArchiveRecordForMessage(
            "task",
            instance,
            "message-type",
            dataMutatorMock.Object
        );

        dataMutatorMock.Verify();
        fiksIOClientMock.Verify(
            x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task StageArchiveRecordForMessage_WithUnitOfWork_IsCommittedByNormalUnitOfWorkSave()
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
                    instance,
                    It.IsAny<FiksArkivRecipient>(),
                    "message-type",
                    It.IsAny<IInstanceDataAccessor?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([new FiksIOMessagePayload(FiksArkivConstants.Filenames.ArchiveRecord, "dummy"u8.ToArray())]);

        int commitCalls = 0;
        fixture
            .DataClientMock.Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    12345,
                    Guid.Parse("8a19d133-f897-4c41-aac1-ec3859b0d67c"),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest request,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    commitCalls++;
                    var createdDataElement = request.CreateDataElements.Single();
                    Guid createdDataElementId = Guid.NewGuid();
                    var updatedInstance = new Instance
                    {
                        Id = instance.Id,
                        AppId = instance.AppId,
                        Org = instance.Org,
                        InstanceOwner = instance.InstanceOwner,
                        Process = instance.Process,
                        Data =
                        [
                            new DataElement
                            {
                                Id = createdDataElementId.ToString(),
                                DataType = createdDataElement.DataType,
                                ContentType = createdDataElement.ContentType,
                                Filename = createdDataElement.Filename,
                            },
                        ],
                    };

                    return new InstanceMutationWithStorageMetadata(
                        updatedInstance,
                        new StorageVersionMetadata(InstanceVersion: 1),
                        [createdDataElementId]
                    );
                }
            );

        var storageAccessGuard = new InstanceDataMutatorStorageAccessGuard();
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            fixture.DataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            applicationMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            storageAccessGuard,
            "task",
            language: null
        );
        unitOfWork.Open();

        await fixture.FiksArkivHost.StageArchiveRecordForMessage("task", instance, "message-type", unitOfWork);

        Assert.Equal(0, commitCalls);
        Assert.True(storageAccessGuard.IsActive);
        fiksIOClientMock.Verify(
            x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();

        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        Assert.Single(changes.BinaryDataChanges);

        await unitOfWork.SaveChanges(changes);

        Assert.Equal(1, commitCalls);
        Assert.True(storageAccessGuard.IsActive);
        unitOfWork.Dispose();
        Assert.False(storageAccessGuard.IsActive);
    }

    [Fact]
    public async Task SendStagedMessage_ReadsCommittedArchiveRecordAndDoesNotStageNewRecord()
    {
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var fiksArkivConfigResolverMock = new Mock<IFiksArkivConfigResolver>(MockBehavior.Strict);
        var fiksArkivPayloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>(MockBehavior.Strict);
        var dataMutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        FiksIOMessageRequest? capturedRequest = null;
        var customFiksArkivSettings = new FiksArkivSettings
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
        };
        var archiveRecord = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = customFiksArkivSettings.Receipt.ArchiveRecord.DataType,
            Filename = customFiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
        };
        var instance = new Instance { Id = "12345/8a19d133-f897-4c41-aac1-ec3859b0d67c", Data = [archiveRecord] };

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
        dataMutatorMock.Setup(x => x.GetBinaryData(archiveRecord)).ReturnsAsync("committed archive record"u8.ToArray());
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
                    instance,
                    It.IsAny<FiksArkivRecipient>(),
                    "message-type",
                    It.IsAny<IInstanceDataAccessor?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                new FiksIOMessagePayload(FiksArkivConstants.Filenames.ArchiveRecord, "generated"u8.ToArray()),
                new FiksIOMessagePayload("document.pdf", "document"u8.ToArray()),
            ]);
        fiksIOClientMock
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (FiksIOMessageRequest request, CancellationToken _) =>
                {
                    capturedRequest = request;
                    return new FiksIOMessageResponse(SendtMelding.FromSentMessageApiModel(new SendtMeldingApiModel()));
                }
            );

        await fixture.FiksArkivHost.SendStagedMessage("task", instance, "message-type", dataMutatorMock.Object);

        Assert.NotNull(capturedRequest);
        FiksIOMessagePayload archivePayload = capturedRequest!.Payload.Single(x =>
            x.Filename == FiksArkivConstants.Filenames.ArchiveRecord
        );
        Assert.Equal("committed archive record", await ReadPayloadData(archivePayload));
        dataMutatorMock.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
        dataMutatorMock.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SendStagedMessage_WhenSendFails_CanRetryWithoutCreatingDuplicateArchiveRecords()
    {
        var fiksIOClientMock = new Mock<IFiksIOClient>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>(MockBehavior.Strict);
        var fiksArkivConfigResolverMock = new Mock<IFiksArkivConfigResolver>(MockBehavior.Strict);
        var fiksArkivPayloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>(MockBehavior.Strict);
        var dataMutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var customFiksArkivSettings = new FiksArkivSettings
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
        };
        var archiveRecord = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = customFiksArkivSettings.Receipt.ArchiveRecord.DataType,
            Filename = customFiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
        };
        var instance = new Instance { Id = "12345/8a19d133-f897-4c41-aac1-ec3859b0d67c", Data = [archiveRecord] };

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
        dataMutatorMock.Setup(x => x.GetBinaryData(archiveRecord)).ReturnsAsync("committed"u8.ToArray());
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
                    instance,
                    It.IsAny<FiksArkivRecipient>(),
                    "message-type",
                    It.IsAny<IInstanceDataAccessor?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                new FiksIOMessagePayload(FiksArkivConstants.Filenames.ArchiveRecord, "generated"u8.ToArray()),
            ]);
        fiksIOClientMock
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("Fiks unavailable"));

        await Assert.ThrowsAsync<TimeoutException>(() =>
            fixture.FiksArkivHost.SendStagedMessage("task", instance, "message-type", dataMutatorMock.Object)
        );
        await Assert.ThrowsAsync<TimeoutException>(() =>
            fixture.FiksArkivHost.SendStagedMessage("task", instance, "message-type", dataMutatorMock.Object)
        );

        dataMutatorMock.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
        dataMutatorMock.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        fiksIOClientMock.Verify(
            x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();
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
        await WaitUntil(() => messageReceivedCallback is not null);
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

    public enum MessageResponseType
    {
        Error,
        Success,
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

    private static async Task<string> ReadPayloadData(FiksIOMessagePayload payload)
    {
        if (payload.Data.CanSeek)
        {
            payload.Data.Position = 0;
        }

        using var memoryStream = new MemoryStream();
        await payload.Data.CopyToAsync(memoryStream);
        return System.Text.Encoding.UTF8.GetString(memoryStream.ToArray());
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
