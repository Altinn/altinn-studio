using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class UnlockTaskDataTests
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
                CommandKey = UnlockTaskData.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
        };
    }

    [Fact]
    public async Task Execute_DelegatesToUnlockWithCorrectTaskIdAndInstance_ReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var lockerMock = new Mock<IProcessTaskDataLocker>();
        var command = new UnlockTaskData(lockerMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        lockerMock.Verify(x => x.Unlock("Task_1", instance), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenUnlockThrows_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var lockerMock = new Mock<IProcessTaskDataLocker>();
        lockerMock
            .Setup(x => x.Unlock(It.IsAny<string>(), It.IsAny<Instance>()))
            .ThrowsAsync(new Exception("Unlock failed"));
        var command = new UnlockTaskData(lockerMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Unlock failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }
}
