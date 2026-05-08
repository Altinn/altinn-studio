using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

public class DeleteDataElementsIfConfiguredTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = DeleteDataElementsIfConfigured.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Mock<IInstanceDataMutator> CreateMutatorMock(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);
        return mutatorMock;
    }

    private static ProcessEngineCommandContext CreateContextWithMutator(Mock<IInstanceDataMutator> mutatorMock)
    {
        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = DeleteDataElementsIfConfigured.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Instance CreateInstance(params DataElement[] dataElements)
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = dataElements.ToList(),
        };
    }

    [Fact]
    public async Task Execute_WithMatchingAutoDeleteDataTypes_RemovesMatchingDataElementsAndReturnsSuccess()
    {
        // Arrange
        var dataElement1 = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        var dataElement2 = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "attachment" };
        var instance = CreateInstance(dataElement1, dataElement2);
        var mutatorMock = CreateMutatorMock(instance);
        var context = CreateContextWithMutator(mutatorMock);

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes = new List<DataType>
            {
                new DataType
                {
                    Id = "model",
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = true },
                },
                new DataType
                {
                    Id = "attachment",
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = false },
                },
            },
        };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var command = new DeleteDataElementsIfConfigured(appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(
            x => x.RemoveDataElement(It.Is<DataElementIdentifier>(d => d.Id == dataElement1.Id)),
            Times.Once
        );
        mutatorMock.Verify(
            x => x.RemoveDataElement(It.Is<DataElementIdentifier>(d => d.Id == dataElement2.Id)),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WithNoMatchingDataTypes_ReturnsSuccessWithNoRemoveCalls()
    {
        // Arrange
        var dataElement1 = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        var instance = CreateInstance(dataElement1);
        var mutatorMock = CreateMutatorMock(instance);
        var context = CreateContextWithMutator(mutatorMock);

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes = new List<DataType>
            {
                new DataType
                {
                    Id = "model",
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = false },
                },
            },
        };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var command = new DeleteDataElementsIfConfigured(appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task Execute_WithEmptyInstanceData_ReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance();
        var mutatorMock = CreateMutatorMock(instance);
        var context = CreateContextWithMutator(mutatorMock);

        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes = new List<DataType>
            {
                new DataType
                {
                    Id = "model",
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = true },
                },
            },
        };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var command = new DeleteDataElementsIfConfigured(appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }
}
