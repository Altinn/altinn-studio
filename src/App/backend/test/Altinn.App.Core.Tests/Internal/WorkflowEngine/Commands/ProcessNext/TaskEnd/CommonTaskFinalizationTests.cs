using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

public class CommonTaskFinalizationTests
{
    private static (
        ProcessEngineCommandContext Context,
        Mock<IInstanceDataMutator> MutatorMock
    ) CreateContextWithMutator(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        var context = new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommonTaskFinalization.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
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

    private static CommonTaskFinalization CreateCommand(
        ApplicationMetadata applicationMetadata,
        bool removeHiddenData = false,
        Mock<IDataElementAccessChecker>? accessCheckerMock = null
    )
    {
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        var appModelMock = new Mock<IAppModel>();
        var layoutInitMock = new Mock<ILayoutEvaluatorStateInitializer>();

        var appSettings = new AppSettings { RemoveHiddenData = removeHiddenData };
        var appSettingsOptions = Options.Create(appSettings);

        if (accessCheckerMock is null)
        {
            accessCheckerMock = new Mock<IDataElementAccessChecker>();
            accessCheckerMock.Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>())).ReturnsAsync(true);
        }

        return new CommonTaskFinalization(
            appMetadataMock.Object,
            appModelMock.Object,
            layoutInitMock.Object,
            appSettingsOptions,
            accessCheckerMock.Object
        );
    }

    [Fact]
    public async Task Execute_RemovesAltinnRowIdsFromFormData()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        instance.Data = [dataElement];

        var formDataWrapperMock = new Mock<IFormDataWrapper>();
        formDataWrapperMock.Setup(x => x.BackingData<object>()).Returns(new object());

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata);
        var (context, mutatorMock) = CreateContextWithMutator(instance);
        mutatorMock.Setup(x => x.GetFormDataWrapper(dataElement)).ReturnsAsync(formDataWrapperMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        formDataWrapperMock.Verify(x => x.RemoveAltinnRowIds(), Times.Once);
    }

    [Fact]
    public async Task Execute_SkipsInaccessibleDataElements()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "restricted" };
        instance.Data = [dataElement];

        var accessCheckerMock = new Mock<IDataElementAccessChecker>();
        accessCheckerMock.Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>())).ReturnsAsync(false);

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "restricted",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.Restricted" },
                },
            ],
        };

        var command = CreateCommand(appMetadata, accessCheckerMock: accessCheckerMock);
        var (context, mutatorMock) = CreateContextWithMutator(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.GetFormDataWrapper(It.IsAny<DataElementIdentifier>()), Times.Never);
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
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata);
        var (context, mutatorMock) = CreateContextWithMutator(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.GetFormDataWrapper(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task Execute_DataTypeWithoutClassRef_IsSkipped()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        instance.Data = [new DataElement { Id = Guid.NewGuid().ToString(), DataType = "attachment" }];

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "attachment",
                    TaskId = "Task_1",
                    AppLogic = null, // No AppLogic/ClassRef
                },
            ],
        };

        var command = CreateCommand(appMetadata);
        var (context, mutatorMock) = CreateContextWithMutator(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.GetFormDataWrapper(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task Execute_WhenExceptionThrown_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        instance.Data = [dataElement];

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.TestModel" },
                },
            ],
        };

        var command = CreateCommand(appMetadata);
        var (context, mutatorMock) = CreateContextWithMutator(instance);
        mutatorMock
            .Setup(x => x.GetFormDataWrapper(dataElement))
            .ThrowsAsync(new InvalidOperationException("Form data not found"));

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Contains("Form data not found", failed.ErrorMessage);
    }
}
