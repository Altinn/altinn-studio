using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Calculation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class CommonTaskInitializationTests
{
    private static WorkflowEngineCommandContext CreateContext(
        IInstanceDataMutator instanceDataMutator,
        CommonTaskInitializationPayload payload,
        CancellationToken cancellationToken = default
    )
    {
        string serializedPayload = CommandPayloadSerializer.Serialize(payload)!;

        return new WorkflowEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = instanceDataMutator,
            CancellationToken = cancellationToken,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommonTaskInitialization.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };
    }

    private static (
        WorkflowEngineCommandContext Context,
        Mock<IInstanceDataMutator> MutatorMock
    ) CreateContextWithMutator(Instance instance, CommonTaskInitializationPayload payload)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);
        return (CreateContext(mutatorMock.Object, payload), mutatorMock);
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

    private sealed class SharedModel
    {
        public string? Name { get; set; }
    }

    private sealed class SharedModelInstantiationProcessor : IInstantiationProcessor
    {
        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
            throw new InvalidOperationException("Task initialization must call the mutator overload");

        public Task DataCreation(
            IInstanceDataMutator instanceDataMutator,
            object data,
            Dictionary<string, string>? prefill
        )
        {
            if (data is TestModel)
            {
                instanceDataMutator.AddFormDataElement("shared", new SharedModel());
            }

            return Task.CompletedTask;
        }
    }

    private static CommonTaskInitialization CreateCommand(
        ApplicationMetadata applicationMetadata,
        Mock<IPrefill>? prefillMock = null,
        Mock<IAppModel>? appModelMock = null,
        Mock<IInstantiationProcessor>? instantiationProcessorMock = null,
        IInstantiationProcessor? instantiationProcessor = null,
        IAppResources? appResources = null
    )
    {
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(applicationMetadata);

        prefillMock ??= new Mock<IPrefill>();
        appModelMock ??= new Mock<IAppModel>();

        instantiationProcessor ??= (instantiationProcessorMock ?? new Mock<IInstantiationProcessor>()).Object;

        var accessChecker = new Mock<IDataElementAccessChecker>();
        accessChecker.Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>())).ReturnsAsync(true);

        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(instantiationProcessor);
        services.AddSingleton(appResources ?? Mock.Of<IAppResources>());
        services.AddSingleton(accessChecker.Object);
        services.AddSingleton(NullLogger<DataModelFieldCalculator>.Instance as ILogger<DataModelFieldCalculator>);
        services.AddTransient<DataModelFieldCalculator>();
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
                    TaskIds = ["Task_1"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, prefillMock, appModelMock, instantiationProcessorMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        appModelMock.Verify(x => x.Create("App.Models.TestModel"), Times.Once);
        prefillMock.Verify(x => x.PrefillDataModel("1337", "model", testData, null), Times.Once);
        instantiationProcessorMock.Verify(x => x.DataCreation(mutatorMock.Object, testData, null), Times.Once);
        mutatorMock.Verify(x => x.AddFormDataElement("model", testData), Times.Once);
    }

    [Fact]
    public async Task Execute_ElementsAddedThroughTheMutatorInDataCreationJoinTheAggregateChanges()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        instance.Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde";
        string mainClassRef = typeof(TestModel).FullName!;
        string sharedClassRef = typeof(SharedModel).FullName!;

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create(mainClassRef)).Returns(() => new TestModel());
        appModelMock.Setup(x => x.GetModelType(mainClassRef)).Returns(typeof(TestModel));
        appModelMock.Setup(x => x.Create(sharedClassRef)).Returns(() => new SharedModel());
        appModelMock.Setup(x => x.GetModelType(sharedClassRef)).Returns(typeof(SharedModel));

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskIds = ["Task_1"],
                    AllowedContentTypes = ["application/json"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = mainClassRef },
                },
                new DataType
                {
                    Id = "shared",
                    AllowedContentTypes = ["application/json"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = sharedClassRef },
                },
            ],
        };
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            StorageVersionMetadata.Empty,
            Mock.Of<IDataClientWithStorageMetadata>(),
            Mock.Of<IInstanceMutationClient>(),
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(appModelMock.Object),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: "Task_1",
            language: null
        );

        var command = CreateCommand(
            appMetadata,
            appModelMock: appModelMock,
            instantiationProcessor: new SharedModelInstantiationProcessor()
        );
        var context = CreateContext(unitOfWork, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        Assert.Equal(2, changes.AllChanges.Count);
        FormDataChange mainChange = Assert.Single(changes.FormDataChanges, c => c.DataType.Id == "model");
        FormDataChange sharedChange = Assert.Single(changes.FormDataChanges, c => c.DataType.Id == "shared");
        Assert.Equal(ChangeType.Created, mainChange.Type);
        Assert.Equal(ChangeType.Created, sharedChange.Type);
        Assert.IsType<TestModel>(mainChange.CurrentFormData);
        Assert.IsType<SharedModel>(sharedChange.CurrentFormData);
    }

    [Fact]
    public async Task Execute_CalculatesTheDataElementsItCreates()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        instance.Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde";
        string mainClassRef = typeof(TestModel).FullName!;

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create(mainClassRef)).Returns(() => new TestModel());
        appModelMock.Setup(x => x.GetModelType(mainClassRef)).Returns(typeof(TestModel));

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskIds = ["Task_1"],
                    AllowedContentTypes = ["application/json"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = mainClassRef },
                },
            ],
        };
        var appResources = new Mock<IAppResources>();
        appResources
            .Setup(x => x.GetCalculationConfig("model"))
            .Returns(
                JsonSerializer.Deserialize<CalculationConfig>(
                    """{ "calculations": [{ "field": "Name", "expression": ["concat", "Hello ", "world"] }] }"""
                )
            );
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            StorageVersionMetadata.Empty,
            Mock.Of<IDataClientWithStorageMetadata>(),
            Mock.Of<IInstanceMutationClient>(),
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(appModelMock.Object),
            appResources.Object,
            Options.Create(new FrontEndSettings()),
            taskId: "Task_1",
            language: null
        );

        var command = CreateCommand(appMetadata, appModelMock: appModelMock, appResources: appResources.Object);
        var context = CreateContext(unitOfWork, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert: the created element is calculated before it is saved, so the form loads with the value
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        FormDataChange change = Assert.Single(changes.FormDataChanges);
        Assert.Equal(ChangeType.Created, change.Type);
        Assert.Equal("Hello world", Assert.IsType<TestModel>(change.CurrentFormData).Name);
    }

    [Fact]
    public async Task Execute_DirectDataClientCallInsideDataCreationSucceeds()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var instanceGuid = Guid.NewGuid();
        var dataGuid = Guid.NewGuid();
        var testData = new TestModel { Name = "test" };
        var dataClient = new Mock<IDataClient>(MockBehavior.Strict);

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create("App.Models.TestModel")).Returns(testData);

        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));
        var instantiationProcessorMock = new Mock<IInstantiationProcessor>();
        instantiationProcessorMock
            .Setup(x => x.DataCreation(mutatorMock.Object, testData, null))
            .Returns(async () =>
            {
                await Task.Yield();
                await dataClient.Object.GetDataBytes(1337, instanceGuid, dataGuid);
            });

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskIds = ["Task_1"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(
            appMetadata,
            appModelMock: appModelMock,
            instantiationProcessorMock: instantiationProcessorMock
        );

        byte[] expectedBytes = [1, 2, 3];
        dataClient.Setup(x => x.GetDataBytes(1337, instanceGuid, dataGuid)).ReturnsAsync(expectedBytes);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        mutatorMock.Verify(x => x.AddFormDataElement("model", testData), Times.Once);
        dataClient.VerifyAll();
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
                    TaskIds = ["Task_1"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, appModelMock: appModelMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        appModelMock.Verify(x => x.Create(It.IsAny<string>()), Times.Never);
        mutatorMock.Verify(x => x.AddFormDataElement(It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Theory]
    [InlineData("Task_2", true)]
    [InlineData("Task_3", true)]
    [InlineData("Task_1", false)]
    public async Task Execute_AutoCreatesDataElementsAtEveryTaskInTaskIds(string currentTaskId, bool created)
    {
        // Arrange
        var instance = CreateInstance(currentTaskId);
        var testData = new TestModel();

        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create("App.Models.TestModel")).Returns(testData);

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskIds = ["Task_2", "Task_3"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, appModelMock: appModelMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        mutatorMock.Verify(x => x.AddFormDataElement("model", testData), created ? Times.Once() : Times.Never());
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
                    TaskIds = ["Task_1"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, prefillMock, appModelMock, instantiationProcessorMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(prefill));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
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
            x =>
                x.DataCreation(
                    mutatorMock.Object,
                    testData,
                    It.Is<Dictionary<string, string>>(p => p["key1"] == "value1")
                ),
            Times.Once
        );
    }

    private static (CommonTaskInitialization Command, Instance Instance) CreateCommandWithThrowingDataCreation()
    {
        var appModelMock = new Mock<IAppModel>();
        appModelMock.Setup(x => x.Create("App.Models.TestModel")).Returns(new TestModel());

        var instantiationProcessorMock = new Mock<IInstantiationProcessor>();
        instantiationProcessorMock
            .Setup(x =>
                x.DataCreation(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<object>(),
                    It.IsAny<Dictionary<string, string>?>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("The register has no such unit"));

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskIds = ["Task_1"],
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        return (
            CreateCommand(
                appMetadata,
                appModelMock: appModelMock,
                instantiationProcessorMock: instantiationProcessorMock
            ),
            CreateInstance("Task_1")
        );
    }

    [Fact]
    public async Task Execute_DataCreationThrowsDuringInstantiation_FailsPermanently()
    {
        var (command, instance) = CreateCommandWithThrowingDataCreation();
        var (context, mutatorMock) = CreateContextWithMutator(
            instance,
            new CommonTaskInitializationPayload(null, IsInstantiation: true)
        );

        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(nameof(InvalidOperationException), failed.ExceptionType);
        Assert.IsType<InvalidOperationException>(failed.Exception);
        Assert.Equal(
            "IInstantiationProcessor.DataCreation failed for data type 'model': The register has no such unit",
            failed.ErrorMessage
        );
        mutatorMock.Verify(x => x.AddFormDataElement(It.IsAny<string>(), It.IsAny<object>()), Times.Never());
    }

    [Fact]
    public async Task Execute_DataCreationThrowsInACancelledCallbackDuringInstantiation_IsNotAPermanentFailure()
    {
        var (command, instance) = CreateCommandWithThrowingDataCreation();
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();
        var context = CreateContext(
            mutatorMock.Object,
            new CommonTaskInitializationPayload(null, IsInstantiation: true),
            cancellation.Token
        );

        await Assert.ThrowsAsync<InvalidOperationException>(() => ((IWorkflowEngineCommand)command).Execute(context));
    }

    [Fact]
    public async Task Execute_DataCreationThrowsAtALaterTaskStart_LeavesTheExceptionToTheEnginesRetries()
    {
        var (command, instance) = CreateCommandWithThrowingDataCreation();
        var (context, _) = CreateContextWithMutator(instance, new CommonTaskInitializationPayload(null));

        await Assert.ThrowsAsync<InvalidOperationException>(() => ((IWorkflowEngineCommand)command).Execute(context));
    }

    [Fact]
    public void Payload_OutsideInstantiation_SerializesAsBeforeTheInstantiationMarker()
    {
        string? withoutMarker = CommandPayloadSerializer.Serialize(new CommonTaskInitializationPayload(null));
        string? withMarker = CommandPayloadSerializer.Serialize(
            new CommonTaskInitializationPayload(null, IsInstantiation: true)
        );

        Assert.Equal("""{"$type":"commonTaskInitialization","prefill":null}""", withoutMarker);
        Assert.True(CommandPayloadSerializer.Deserialize<CommonTaskInitializationPayload>(withMarker)?.IsInstantiation);
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
                    TaskIds = ["Task_2"], // Different task
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
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        appModelMock.Verify(x => x.Create(It.IsAny<string>()), Times.Never);
        mutatorMock.Verify(x => x.AddFormDataElement(It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }
}
