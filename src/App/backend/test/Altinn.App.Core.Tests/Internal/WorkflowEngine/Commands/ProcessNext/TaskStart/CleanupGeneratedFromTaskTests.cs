using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class CleanupGeneratedFromTaskTests
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
                CommandKey = CleanupGeneratedFromTask.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = null,
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

    [Fact]
    public async Task Execute_RemovesDataElementsGeneratedFromCurrentTask()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var taskGeneratedElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "pdf",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = "Task_1",
                },
            ],
        };
        var otherTaskElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "attachment",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = "Task_0",
                },
            ],
        };
        var untaggedElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        instance.Data = [taskGeneratedElement, otherTaskElement, untaggedElement];

        var command = new CleanupGeneratedFromTask();
        var (context, mutatorMock) = CreateContextWithMutator(instance);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.RemoveDataElement(taskGeneratedElement), Times.Once);
        mutatorMock.Verify(x => x.RemoveDataElement(otherTaskElement), Times.Never);
        mutatorMock.Verify(x => x.RemoveDataElement(untaggedElement), Times.Never);
        Assert.DoesNotContain(taskGeneratedElement, instance.Data);
        Assert.Contains(otherTaskElement, instance.Data);
    }

    [Fact]
    public async Task Execute_NoTaggedElements_ReturnsSuccessWithNoSideEffects()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        instance.Data = [new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" }];

        var command = new CleanupGeneratedFromTask();
        var (context, mutatorMock) = CreateContextWithMutator(instance);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task Execute_NullDataList_ReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        instance.Data = null;

        var command = new CleanupGeneratedFromTask();
        var (context, mutatorMock) = CreateContextWithMutator(instance);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        mutatorMock.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }
}
