using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowCallbackStateTests
{
    [Fact]
    public async Task CaptureState_PreservesStorageVersionsAndInstanceBlobVersionId()
    {
        string dataElementId = Guid.NewGuid().ToString();
        var dataElement = new DataElement
        {
            Id = dataElementId,
            DataType = "attachment",
            BlobVersionId = "blob-version-capture",
        };
        var instance = new Instance
        {
            Id = $"1337/{Guid.NewGuid()}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data = [dataElement],
        };
        var versions = new StorageVersionMetadata(InstanceVersion: 21, ProcessStateVersion: 14);
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance, versions);
        WorkflowStateSigner stateSigner = CreateStateSigner();
        var service = new WorkflowCallbackStateService(
            null!,
            new ModelSerializationService(null!),
            null!,
            null!,
            stateSigner
        );

        string state = await service.CaptureState(unitOfWork);
        WorkflowCallbackState? deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(
            stateSigner.Verify(state, SigningDomain.CallbackState)
        );

        Assert.NotNull(deserialized);
        Assert.Equal(21, deserialized.InstanceVersion);
        Assert.Equal(14, deserialized.ProcessStateVersion);
        Assert.Equal("blob-version-capture", Assert.Single(deserialized.Instance.Data).BlobVersionId);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    [InlineData(ProcessStatus.Idle)]
    public async Task CaptureRestoreRecapture_PreservesProcessStatus(ProcessStatus status)
    {
        Guid instanceGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                Status = status,
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "data" },
            },
            Data = [],
        };
        var versions = new StorageVersionMetadata(InstanceVersion: 21, ProcessStateVersion: 14);
        WorkflowStateSigner stateSigner = CreateStateSigner();
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        var service = new WorkflowCallbackStateService(
            CreateUnitOfWorkInitializer(appMetadata.Object),
            new ModelSerializationService(null!),
            appMetadata.Object,
            Mock.Of<IAppModel>(),
            stateSigner
        );
        string captured = await service.CaptureState(CreateUnitOfWork(instance, versions));
        (InstanceDataUnitOfWork restored, _) = await service.RestoreState(
            new InstanceIdentifier(1337, instanceGuid),
            captured,
            "nb"
        );
        string recaptured = await service.CaptureState(restored);
        WorkflowCallbackState? roundTrip = JsonSerializer.Deserialize<WorkflowCallbackState>(
            stateSigner.Verify(recaptured, SigningDomain.CallbackState)
        );

        Assert.Equal(status, restored.Instance.Process?.Status);
        Assert.NotNull(roundTrip);
        Assert.Equal(status, roundTrip.Instance.Process?.Status);
        Assert.Equal(21, roundTrip.InstanceVersion);
        Assert.Equal(14, roundTrip.ProcessStateVersion);
    }

    [Theory]
    [InlineData(null, 7, "instanceVersion: missing")]
    [InlineData(11, null, "processStateVersion: missing")]
    public async Task CaptureState_WhenStorageVersionIsMissing_RejectsBeforeSigning(
        int? instanceVersion,
        int? processStateVersion,
        string expectedMissingVersion
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{Guid.NewGuid()}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "data" },
            },
            Data = [],
        };
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(
            instance,
            new StorageVersionMetadata(instanceVersion, processStateVersion)
        );
        var secretProviderMock = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
        var service = new WorkflowCallbackStateService(
            null!,
            new ModelSerializationService(null!),
            null!,
            null!,
            new WorkflowStateSigner(secretProviderMock.Object)
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CaptureState(unitOfWork)
        );

        Assert.Contains($"instance '{instance.Id}'", exception.Message);
        Assert.Contains(expectedMissingVersion, exception.Message);
        secretProviderMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RestoreState_TargetsRouteInstanceAndCarriesStorageVersions()
    {
        Guid instanceGuid = Guid.NewGuid();
        string dataElementId = Guid.NewGuid().ToString();
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data =
            [
                new DataElement
                {
                    Id = dataElementId,
                    DataType = "attachment",
                    BlobVersionId = "blob-version-restore",
                },
            ],
        };
        WorkflowStateSigner stateSigner = CreateStateSigner();
        string state = stateSigner.Sign(
            JsonSerializer.Serialize(
                new WorkflowCallbackState
                {
                    Instance = instance,
                    InstanceVersion = 31,
                    ProcessStateVersion = 22,
                    FormData = [],
                }
            ),
            SigningDomain.CallbackState
        );
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        var initializer = CreateUnitOfWorkInitializer(appMetadataMock.Object);
        var service = new WorkflowCallbackStateService(
            initializer,
            new ModelSerializationService(null!),
            appMetadataMock.Object,
            Mock.Of<IAppModel>(),
            stateSigner
        );

        (InstanceDataUnitOfWork unitOfWork, _) = await service.RestoreState(
            new InstanceIdentifier(1337, instanceGuid),
            state,
            "nb"
        );

        Assert.Equal(31, unitOfWork.StorageVersions.InstanceVersion);
        Assert.Equal(22, unitOfWork.StorageVersions.ProcessStateVersion);
        Assert.Equal("blob-version-restore", Assert.Single(unitOfWork.Instance.Data).BlobVersionId);

        InstanceDataUnitOfWork followUpUnitOfWork = await initializer.Init(
            unitOfWork.Instance,
            unitOfWork.StorageVersions,
            null,
            "nb"
        );
        string followUpState = await service.CaptureState(followUpUnitOfWork);
        WorkflowCallbackState? followUp = JsonSerializer.Deserialize<WorkflowCallbackState>(
            stateSigner.Verify(followUpState, SigningDomain.CallbackState)
        );
        Assert.NotNull(followUp);
        Assert.Equal(31, followUp.InstanceVersion);
        Assert.Equal(22, followUp.ProcessStateVersion);
    }

    [Theory]
    [InlineData("instanceVersion", "missing")]
    [InlineData("processStateVersion", "missing")]
    [InlineData("instanceVersion", "null")]
    [InlineData("processStateVersion", "null")]
    [InlineData("instanceVersion", "wrongType")]
    [InlineData("processStateVersion", "wrongType")]
    public async Task RestoreState_WhenRequiredStorageVersionIsMalformed_RejectsAtServiceBoundary(
        string property,
        string malformedValue
    )
    {
        Guid instanceGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data = [],
        };
        WorkflowStateSigner stateSigner = CreateStateSigner();
        JsonObject payload = JsonSerializer
            .SerializeToNode(
                new WorkflowCallbackState
                {
                    Instance = instance,
                    InstanceVersion = 31,
                    ProcessStateVersion = 22,
                    FormData = [],
                }
            )!
            .AsObject();
        switch (malformedValue)
        {
            case "missing":
                Assert.True(payload.Remove(property));
                break;
            case "null":
                payload[property] = null;
                break;
            case "wrongType":
                payload[property] = "not-an-integer";
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(malformedValue), malformedValue, null);
        }
        string state = stateSigner.Sign(payload.ToJsonString(), SigningDomain.CallbackState);
        var service = new WorkflowCallbackStateService(null!, null!, null!, null!, stateSigner);

        WorkflowCallbackStateException exception = await Assert.ThrowsAsync<WorkflowCallbackStateException>(() =>
            service.RestoreState(new InstanceIdentifier(1337, instanceGuid), state, "nb")
        );

        Assert.IsType<JsonException>(exception.InnerException);
        Assert.Contains("complete workflow callback state", exception.Message);
    }

    [Fact]
    public async Task RestoreState_WithPreloadedFormData_RestoresContextAndUsesServiceOwnerForLazyBinaryRead()
    {
        const int instanceOwnerPartyId = 1337;
        const string taskId = "Task_Restore";
        const string language = "nn";
        Guid instanceGuid = Guid.NewGuid();
        Guid formDataGuid = Guid.NewGuid();
        Guid attachmentGuid = Guid.NewGuid();
        byte[] attachmentBytes = [1, 2, 3];
        var formDataType = new DataType
        {
            Id = "model",
            AllowedContentTypes = ["application/json"],
            AppLogic = new ApplicationLogic { ClassRef = typeof(CallbackForm).FullName },
        };
        var attachmentDataType = new DataType { Id = "attachment", AllowedContentTypes = ["application/octet-stream"] };
        var formDataElement = new DataElement
        {
            Id = formDataGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = formDataType.Id,
            ContentType = "application/json",
            BlobVersionId = "blob-version-form",
        };
        var attachmentDataElement = new DataElement
        {
            Id = attachmentGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = attachmentDataType.Id,
            ContentType = "application/octet-stream",
            BlobVersionId = "blob-version-attachment",
        };
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = taskId, AltinnTaskType = "data" },
            },
            Data = [formDataElement, attachmentDataElement],
        };
        WorkflowStateSigner stateSigner = CreateStateSigner();
        string state = stateSigner.Sign(
            JsonSerializer.Serialize(
                new WorkflowCallbackState
                {
                    Instance = instance,
                    InstanceVersion = 31,
                    ProcessStateVersion = 22,
                    FormData =
                    [
                        new FormDataEntry
                        {
                            Id = formDataElement.Id,
                            DataType = formDataType.Id,
                            Data = JsonSerializer.SerializeToElement(
                                new CallbackForm { Status = "restored", Amount = 42 }
                            ),
                        },
                    ],
                }
            ),
            SigningDomain.CallbackState
        );
        var applicationMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes = [formDataType, attachmentDataType],
        };
        var appMetadataMock = new Mock<IAppMetadata>(MockBehavior.Strict);
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var appModelMock = new Mock<IAppModel>(MockBehavior.Strict);
        appModelMock.Setup(x => x.GetModelType(typeof(CallbackForm).FullName!)).Returns(typeof(CallbackForm));
        var dataClientMock = new Mock<IDataClient>(MockBehavior.Strict);
        Mock<IDataClientWithStorageMetadata> metadataClientMock = dataClientMock.As<IDataClientWithStorageMetadata>();
        StorageAuthenticationMethod? capturedAuthenticationMethod = null;
        metadataClientMock
            .Setup(x =>
                x.GetDataBytesWithExpectedBlobVersionId(
                    instanceOwnerPartyId,
                    instanceGuid,
                    attachmentGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    attachmentDataElement.BlobVersionId,
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<int, Guid, Guid, StorageAuthenticationMethod?, string?, CancellationToken>(
                (_, _, _, authenticationMethod, _, _) => capturedAuthenticationMethod = authenticationMethod
            )
            .ReturnsAsync(attachmentBytes);
        InstanceDataUnitOfWorkInitializer initializer = CreateUnitOfWorkInitializer(
            appMetadataMock.Object,
            dataClientMock
        );
        var modelSerializationService = new ModelSerializationService(appModelMock.Object);
        var service = new WorkflowCallbackStateService(
            initializer,
            modelSerializationService,
            appMetadataMock.Object,
            appModelMock.Object,
            stateSigner
        );

        (InstanceDataUnitOfWork unitOfWork, _) = await service.RestoreState(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
            state,
            language
        );

        Assert.Equal(instance.Id, unitOfWork.Instance.Id);
        Assert.Equal(taskId, unitOfWork.TaskId);
        Assert.Equal(language, unitOfWork.Language);
        Assert.Equal(31, unitOfWork.StorageVersions.InstanceVersion);
        Assert.Equal(22, unitOfWork.StorageVersions.ProcessStateVersion);
        Assert.Equal("blob-version-form", unitOfWork.GetDataElement(formDataElement).BlobVersionId);
        Assert.Equal("blob-version-attachment", unitOfWork.GetDataElement(attachmentDataElement).BlobVersionId);

        var restoredFormData = Assert.IsType<CallbackForm>(await unitOfWork.GetFormData(formDataElement));
        Assert.Equal("restored", restoredFormData.Status);
        Assert.Equal(42, restoredFormData.Amount);
        metadataClientMock.Verify(
            x =>
                x.GetDataBytesWithExpectedBlobVersionId(
                    instanceOwnerPartyId,
                    instanceGuid,
                    formDataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );

        ReadOnlyMemory<byte> restoredAttachment = await unitOfWork.GetBinaryData(attachmentDataElement);

        Assert.True(restoredAttachment.Span.SequenceEqual(attachmentBytes));
        Assert.Equal(StorageAuthenticationMethod.ServiceOwner(), capturedAuthenticationMethod);
        metadataClientMock.Verify(
            x =>
                x.GetDataBytesWithExpectedBlobVersionId(
                    instanceOwnerPartyId,
                    instanceGuid,
                    attachmentGuid,
                    StorageAuthenticationMethod.ServiceOwner(),
                    attachmentDataElement.BlobVersionId,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesInstance()
    {
        // Arrange
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "data" },
                },
            },
            InstanceVersion = 1,
            ProcessStateVersion = 1,
            FormData = new List<FormDataEntry>(),
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal("ttd", deserialized.Instance.Org);
        Assert.Equal("ttd/test-app", deserialized.Instance.AppId);
        Assert.NotNull(deserialized.Instance.InstanceOwner);
        Assert.Equal("501337", deserialized.Instance.InstanceOwner.PartyId);
        Assert.NotNull(deserialized.Instance.Process);
        Assert.NotNull(deserialized.Instance.Process.CurrentTask);
        Assert.Equal("Task_1", deserialized.Instance.Process.CurrentTask.ElementId);
        Assert.Equal("data", deserialized.Instance.Process.CurrentTask.AltinnTaskType);
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesFormData()
    {
        // Arrange
        var formDataObject = new
        {
            Name = "John Doe",
            Age = 42,
            Active = true,
        };
        var dataElement = JsonSerializer.SerializeToElement(formDataObject);

        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance { Org = "ttd", AppId = "ttd/test-app" },
            InstanceVersion = 1,
            ProcessStateVersion = 1,
            FormData = new List<FormDataEntry>
            {
                new FormDataEntry
                {
                    Id = "data-guid-1",
                    DataType = "model",
                    Data = dataElement,
                },
            },
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Single(deserialized.FormData);

        var entry = deserialized.FormData[0];
        Assert.Equal("data-guid-1", entry.Id);
        Assert.Equal("model", entry.DataType);
        Assert.Equal("John Doe", entry.Data.GetProperty("Name").GetString());
        Assert.Equal(42, entry.Data.GetProperty("Age").GetInt32());
        Assert.True(entry.Data.GetProperty("Active").GetBoolean());
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesExplicitStorageVersionsAndInstanceBlobVersionId()
    {
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                Data = [new DataElement { Id = "data-guid-1", BlobVersionId = "blob-version-1" }],
            },
            InstanceVersion = 13,
            ProcessStateVersion = 8,
            FormData = new List<FormDataEntry>(),
        };

        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        Assert.NotNull(deserialized);
        Assert.Equal(13, deserialized.InstanceVersion);
        Assert.Equal(8, deserialized.ProcessStateVersion);
        Assert.Equal("blob-version-1", Assert.Single(deserialized.Instance.Data).BlobVersionId);
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_MultipleDataElements()
    {
        // Arrange
        var data1 = JsonSerializer.SerializeToElement(new { Field1 = "value1" });
        var data2 = JsonSerializer.SerializeToElement(new { Field2 = 100, Nested = new { Inner = "deep" } });
        var data3 = JsonSerializer.SerializeToElement(new int[] { 1, 2, 3 });

        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance { Org = "ttd", AppId = "ttd/test-app" },
            InstanceVersion = 1,
            ProcessStateVersion = 1,
            FormData = new List<FormDataEntry>
            {
                new FormDataEntry
                {
                    Id = "guid-1",
                    DataType = "mainModel",
                    Data = data1,
                },
                new FormDataEntry
                {
                    Id = "guid-2",
                    DataType = "subform",
                    Data = data2,
                },
                new FormDataEntry
                {
                    Id = "guid-3",
                    DataType = "arrayModel",
                    Data = data3,
                },
            },
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(3, deserialized.FormData.Count);

        Assert.Equal("guid-1", deserialized.FormData[0].Id);
        Assert.Equal("mainModel", deserialized.FormData[0].DataType);
        Assert.Equal("value1", deserialized.FormData[0].Data.GetProperty("Field1").GetString());

        Assert.Equal("guid-2", deserialized.FormData[1].Id);
        Assert.Equal("subform", deserialized.FormData[1].DataType);
        Assert.Equal(100, deserialized.FormData[1].Data.GetProperty("Field2").GetInt32());
        Assert.Equal("deep", deserialized.FormData[1].Data.GetProperty("Nested").GetProperty("Inner").GetString());

        Assert.Equal("guid-3", deserialized.FormData[2].Id);
        Assert.Equal("arrayModel", deserialized.FormData[2].DataType);
        Assert.Equal(JsonValueKind.Array, deserialized.FormData[2].Data.ValueKind);
        Assert.Equal(3, deserialized.FormData[2].Data.GetArrayLength());
        Assert.Equal(1, deserialized.FormData[2].Data[0].GetInt32());
        Assert.Equal(2, deserialized.FormData[2].Data[1].GetInt32());
        Assert.Equal(3, deserialized.FormData[2].Data[2].GetInt32());
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_EmptyFormData()
    {
        // Arrange
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            },
            InstanceVersion = 1,
            ProcessStateVersion = 1,
            FormData = new List<FormDataEntry>(),
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.NotNull(deserialized.FormData);
        Assert.Empty(deserialized.FormData);
        Assert.Equal("ttd", deserialized.Instance.Org);
        Assert.Equal("ttd/test-app", deserialized.Instance.AppId);
        Assert.NotNull(deserialized.Instance.Process);
        Assert.Equal("Task_2", deserialized.Instance.Process.CurrentTask?.ElementId);
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesDataElementsOnInstance()
    {
        // Arrange
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = "de-guid-1",
                        DataType = "model",
                        ContentType = "application/json",
                    },
                    new DataElement
                    {
                        Id = "de-guid-2",
                        DataType = "attachment",
                        ContentType = "application/pdf",
                    },
                },
            },
            InstanceVersion = 1,
            ProcessStateVersion = 1,
            FormData = new List<FormDataEntry>(),
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.NotNull(deserialized.Instance.Data);
        Assert.Equal(2, deserialized.Instance.Data.Count);

        Assert.Equal("de-guid-1", deserialized.Instance.Data[0].Id);
        Assert.Equal("model", deserialized.Instance.Data[0].DataType);
        Assert.Equal("application/json", deserialized.Instance.Data[0].ContentType);

        Assert.Equal("de-guid-2", deserialized.Instance.Data[1].Id);
        Assert.Equal("attachment", deserialized.Instance.Data[1].DataType);
        Assert.Equal("application/pdf", deserialized.Instance.Data[1].ContentType);
    }

    private static WorkflowStateSigner CreateStateSigner()
    {
        var code = new AppCode
        {
            Id = "test-secret",
            Code = "test-secret-code-long-enough-for-hmac",
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(186),
        };
        var secretProviderMock = new Mock<IWorkflowCallbackSecretProvider>();
        secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        return new WorkflowStateSigner(secretProviderMock.Object);
    }

    private sealed class CallbackForm
    {
        public string? Status { get; set; }

        public int Amount { get; set; }
    }

    private static InstanceDataUnitOfWork CreateUnitOfWork(Instance instance, StorageVersionMetadata? versions = null)
    {
        var dataClient = new Mock<IDataClient>();
        Mock<IDataClientWithStorageMetadata> metadataClient = dataClient.As<IDataClientWithStorageMetadata>();
        Mock<IInstanceMutationClient> mutationClient = dataClient.As<IInstanceMutationClient>();
        return new InstanceDataUnitOfWork(
            instance,
            versions ?? StorageVersionMetadata.Empty,
            metadataClient.Object,
            mutationClient.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );
    }

    private static InstanceDataUnitOfWorkInitializer CreateUnitOfWorkInitializer(
        IAppMetadata appMetadata,
        Mock<IDataClient>? dataClient = null
    )
    {
        dataClient ??= new Mock<IDataClient>();
        Mock<IDataClientWithStorageMetadata> metadataClient = dataClient.As<IDataClientWithStorageMetadata>();
        Mock<IInstanceMutationClient> mutationClient = dataClient.As<IInstanceMutationClient>();
        return new InstanceDataUnitOfWorkInitializer(
            metadataClient.Object,
            mutationClient.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings())
        );
    }
}
