using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Infrastructure.Clients.Storage;
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
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowCallbackStateTests
{
    [Fact]
    public async Task CaptureState_PreservesStorageVersionsAndInstanceContentEtag()
    {
        string dataElementId = Guid.NewGuid().ToString();
        var dataElement = new DataElement
        {
            Id = dataElementId,
            DataType = "attachment",
            ContentEtag = "\"etag-capture\"",
        };
        var instance = new Instance
        {
            Id = $"1337/{Guid.NewGuid()}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data = [dataElement],
        };
        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 21, ProcessStateVersion: 14)
        );
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance);
        var logger = new FakeLogger<WorkflowCallbackStateService>();
        WorkflowStateSigner stateSigner = CreateStateSigner();
        var service = new WorkflowCallbackStateService(
            null!,
            new ModelSerializationService(null!),
            null!,
            null!,
            stateSigner,
            logger
        );

        string state = await service.CaptureState(unitOfWork);
        WorkflowCallbackState? deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(
            stateSigner.Verify(state)
        );

        Assert.NotNull(deserialized);
        Assert.Equal(21, deserialized.InstanceVersion);
        Assert.Equal(14, deserialized.ProcessStateVersion);
        Assert.Equal("\"etag-capture\"", Assert.Single(deserialized.Instance.Data).ContentEtag);
        Assert.DoesNotContain(
            logger.Collector.GetSnapshot(),
            record =>
                record.Level == LogLevel.Warning
                && record.Message.Contains("Workflow callback state captured without an instance version.")
        );
    }

    [Fact]
    public async Task CaptureState_WhenInstanceVersionIsMissing_LogsWarning()
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
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance);
        var logger = new FakeLogger<WorkflowCallbackStateService>();
        var service = new WorkflowCallbackStateService(
            null!,
            new ModelSerializationService(null!),
            null!,
            null!,
            CreateStateSigner(),
            logger
        );

        await service.CaptureState(unitOfWork);

        var latestRecord = logger.LatestRecord;
        Assert.NotNull(latestRecord);
        Assert.Equal(LogLevel.Warning, latestRecord.Level);
        Assert.Contains("Workflow callback state captured without an instance version.", latestRecord.Message);
        Assert.Contains($"Instance: {instance.Id}.", latestRecord.Message);
        Assert.Contains("AppId: ttd/test-app. Org: ttd. Task: Task_1.", latestRecord.Message);
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
                    ContentEtag = "\"etag-restore\"",
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
            )
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
            stateSigner,
            NullLogger<WorkflowCallbackStateService>.Instance
        );

        InstanceDataUnitOfWork unitOfWork = await service.RestoreState(
            new InstanceIdentifier(1337, instanceGuid),
            state,
            "nb"
        );

        Assert.Equal(31, unitOfWork.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(22, unitOfWork.StorageMetadata.Versions.ProcessStateVersion);
        Assert.Equal("\"etag-restore\"", Assert.Single(unitOfWork.Instance.Data).ContentEtag);
        Assert.Equal(new StorageVersionMetadata(31, 22), InstanceStorageMetadataRegistry.Get(unitOfWork.Instance));

        InstanceDataUnitOfWork followUpUnitOfWork = await initializer.Init(unitOfWork.Instance, null, "nb");
        string followUpState = await service.CaptureState(followUpUnitOfWork);
        WorkflowCallbackState? followUp = JsonSerializer.Deserialize<WorkflowCallbackState>(
            stateSigner.Verify(followUpState)
        );
        Assert.NotNull(followUp);
        Assert.Equal(31, followUp.InstanceVersion);
        Assert.Equal(22, followUp.ProcessStateVersion);
    }

    [Fact]
    public async Task RestoreState_WhenActivatedInCallbackFlow_GuardsPublicStorageClientsUntilDispose()
    {
        Guid instanceGuid = Guid.NewGuid();
        Guid dataGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data = [],
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
            )
        );
        var storageAccessGuard = new InstanceDataMutatorStorageAccessGuard();
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        var instanceClientMock = new Mock<IStorageInstanceClient>(MockBehavior.Strict);
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        var initializer = CreateUnitOfWorkInitializer(
            appMetadataMock.Object,
            dataClientMock.Object,
            instanceClientMock.Object,
            storageAccessGuard
        );
        var service = new WorkflowCallbackStateService(
            initializer,
            new ModelSerializationService(null!),
            appMetadataMock.Object,
            Mock.Of<IAppModel>(),
            stateSigner,
            NullLogger<WorkflowCallbackStateService>.Instance
        );
        IDataClient dataClient = new DataClient(dataClientMock.Object, storageAccessGuard);
        IInstanceClient instanceClient = new GuardedInstanceClient(instanceClientMock.Object, storageAccessGuard);

        InstanceDataUnitOfWork unitOfWork = await service.RestoreState(
            new InstanceIdentifier(1337, instanceGuid),
            state,
            "nb"
        );

        Assert.False(storageAccessGuard.IsActive);
        unitOfWork.Open();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataClient.GetDataBytes(1337, instanceGuid, dataGuid)
        );
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            instanceClient.GetInstance("test-app", "ttd", 1337, instanceGuid)
        );
        await Task.Yield();
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataClient.GetDataBytes(1337, instanceGuid, dataGuid)
        );

        await unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataClient.GetDataBytes(1337, instanceGuid, dataGuid)
        );
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            instanceClient.GetInstance("test-app", "ttd", 1337, instanceGuid)
        );

        byte[] expectedBytes = [1, 2, 3];
        dataClientMock
            .Setup(x =>
                x.GetDataBytes(
                    1337,
                    instanceGuid,
                    dataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(expectedBytes);
        instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    "test-app",
                    "ttd",
                    1337,
                    instanceGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        unitOfWork.Dispose();

        Assert.Equal(expectedBytes, await dataClient.GetDataBytes(1337, instanceGuid, dataGuid));
        Assert.Same(instance, await instanceClient.GetInstance("test-app", "ttd", 1337, instanceGuid));

        Assert.False(storageAccessGuard.IsActive);
        Assert.Throws<ObjectDisposedException>(() => unitOfWork.Instance);
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
    public void WorkflowCallbackState_SerializeDeserialize_PreservesExplicitStorageVersionsAndInstanceContentEtag()
    {
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                Data = [new DataElement { Id = "data-guid-1", ContentEtag = "\"etag-1\"" }],
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
        Assert.Equal("\"etag-1\"", Assert.Single(deserialized.Instance.Data).ContentEtag);
    }

    [Fact]
    public void WorkflowCallbackState_DeserializeOldStateWithRemovedDataElementEtags_RemainsCompatible()
    {
        const string json = """
            {
                "instance": {
                    "org": "ttd",
                    "appId": "ttd/test-app",
                    "Data": [
                        {
                            "Id": "data-guid-1",
                            "ContentEtag": "\"etag-instance\""
                        }
                    ]
                },
                "dataElementEtags": {
                    "data-guid-1": "\"etag-legacy-field\""
                },
                "formData": []
            }
            """;

        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        Assert.NotNull(deserialized);
        Assert.Null(deserialized.InstanceVersion);
        Assert.Null(deserialized.ProcessStateVersion);
        Assert.Equal("\"etag-instance\"", Assert.Single(deserialized.Instance.Data).ContentEtag);
        Assert.Empty(deserialized.FormData);
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

    private static InstanceDataUnitOfWork CreateUnitOfWork(Instance instance) =>
        new(
            instance,
            Mock.Of<IStorageDataClient>(),
            Mock.Of<IStorageInstanceClient>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: null,
            language: null
        );

    private static InstanceDataUnitOfWorkInitializer CreateUnitOfWorkInitializer(
        IAppMetadata appMetadata,
        IStorageDataClient? dataClient = null,
        IStorageInstanceClient? instanceClient = null,
        IInstanceDataMutatorStorageAccessGuard? storageAccessGuard = null
    ) =>
        new(
            dataClient ?? Mock.Of<IStorageDataClient>(),
            instanceClient ?? Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            storageAccessGuard ?? new InstanceDataMutatorStorageAccessGuard()
        );
}
