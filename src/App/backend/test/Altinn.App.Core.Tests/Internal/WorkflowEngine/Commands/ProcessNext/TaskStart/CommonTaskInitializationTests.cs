using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class CommonTaskInitializationTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance, CommonTaskInitializationPayload payload)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        string serializedPayload = CommandPayloadSerializer.Serialize(payload)!;

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommonTaskInitialization.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static (
        ProcessEngineCommandContext Context,
        Mock<IInstanceDataMutator> MutatorMock
    ) CreateContextWithMutator(Instance instance, CommonTaskInitializationPayload payload)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        string serializedPayload = CommandPayloadSerializer.Serialize(payload)!;

        var context = new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommonTaskInitialization.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
        return (context, mutatorMock);
    }

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [],
        };
    }

    private sealed class TestModel
    {
        public string? Name { get; set; }
    }

    private static CommonTaskInitialization CreateCommand(
        ApplicationMetadata applicationMetadata,
        Mock<IPrefill>? prefillMock = null,
        Mock<IAppModel>? appModelMock = null,
        Mock<IInstantiationProcessor>? instantiationProcessorMock = null,
        InstanceDataMutatorStorageAccessGuard? storageGuard = null
    )
    {
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        prefillMock ??= new Mock<IPrefill>();
        appModelMock ??= new Mock<IAppModel>();

        instantiationProcessorMock ??= new Mock<IInstantiationProcessor>();

        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton<IInstanceDataMutatorStorageAccessGuard>(
            storageGuard ?? new InstanceDataMutatorStorageAccessGuard()
        );
        services.AddSingleton(instantiationProcessorMock.Object);
        var sp = services.BuildServiceProvider();

        return new CommonTaskInitialization(appMetadataMock.Object, prefillMock.Object, appModelMock.Object, sp);
    }

    [Fact]
    public async Task Execute_AutoCreatesDataElementsForMatchingTask()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var testData = new TestModel { Name = "test" };

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create("App.Models.TestModel")).Returns(testData);

        var prefillMock = new Mock<IPrefill>();
        var instantiationProcessorMock = new Mock<IInstantiationProcessor>();

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, prefillMock, appModelMock, instantiationProcessorMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        appModelMock.Verify(x => x.Create("App.Models.TestModel"), Times.Once);
        prefillMock.Verify(x => x.PrefillDataModel("1337", "model", testData, null), Times.Once);
        instantiationProcessorMock.Verify(x => x.DataCreation(instance, testData, null), Times.Once);
        mutatorMock.Verify(x => x.AddFormDataElement("model", testData), Times.Once);
    }

    [Fact]
    public async Task Execute_DirectDataClientCallInsideDataCreationDelegatesWithoutActiveUnitOfWork()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var instanceGuid = Guid.NewGuid();
        var dataGuid = Guid.NewGuid();
        var testData = new TestModel { Name = "test" };
        var storageGuard = new InstanceDataMutatorStorageAccessGuard();
        var innerDataClient = new Mock<IStorageDataClient>(MockBehavior.Strict);
        IDataClient dataClient = new DataClient(innerDataClient.Object, storageGuard);

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create("App.Models.TestModel")).Returns(testData);

        var instantiationProcessorMock = new Mock<IInstantiationProcessor>();
        instantiationProcessorMock
            .Setup(x => x.DataCreation(instance, testData, null))
            .Returns(async () =>
            {
                await Task.Yield();
                await dataClient.GetDataBytes(1337, instanceGuid, dataGuid);
            });

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(
            appMetadata,
            appModelMock: appModelMock,
            instantiationProcessorMock: instantiationProcessorMock,
            storageGuard: storageGuard
        );
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        byte[] expectedBytes = [1, 2, 3];
        innerDataClient
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

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(storageGuard.IsActive);
        mutatorMock.Verify(x => x.AddFormDataElement("model", testData), Times.Once);
        innerDataClient.VerifyAll();
    }

    [Fact]
    public async Task Execute_SkipsCreationIfDataElementAlreadyExists()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        instance.Data = [new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" }];

        var appModelMock = new Mock<IAppModel>();

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, appModelMock: appModelMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        appModelMock.Verify(x => x.Create(It.IsAny<string>()), Times.Never);
        mutatorMock.Verify(x => x.AddFormDataElement(It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task Execute_RunsPrefillWithExternalPrefillData()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var testData = new TestModel();
        var prefill = new Dictionary<string, string> { ["key1"] = "value1" };

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create("App.Models.TestModel")).Returns(testData);

        var prefillMock = new Mock<IPrefill>();
        var instantiationProcessorMock = new Mock<IInstantiationProcessor>();

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, prefillMock, appModelMock, instantiationProcessorMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(prefill));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        prefillMock.Verify(
            x =>
                x.PrefillDataModel(
                    "1337",
                    "model",
                    testData,
                    It.Is<Dictionary<string, string>>(p => p["key1"] == "value1")
                ),
            Times.Once
        );
        instantiationProcessorMock.Verify(
            x => x.DataCreation(instance, testData, It.Is<Dictionary<string, string>>(p => p["key1"] == "value1")),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_NoMatchingDataTypes_ReturnsSuccessWithNoSideEffects()
    {
        // Arrange
        var instance = CreateInstance("Task_1");

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_2", // Different task
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var appModelMock = new Mock<IAppModel>();
        var command = CreateCommand(appMetadata, appModelMock: appModelMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        appModelMock.Verify(x => x.Create(It.IsAny<string>()), Times.Never);
        mutatorMock.Verify(x => x.AddFormDataElement(It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }
}
