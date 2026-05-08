using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

public class LockTaskDataTests
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
                CommandKey = LockTaskData.Key,
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
    public async Task Execute_DelegatesToLockWithCorrectTaskIdAndInstance_ReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var lockerMock = new Mock<IProcessTaskDataLocker>();
        var command = new LockTaskData(lockerMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        lockerMock.Verify(x => x.Lock("Task_1", instance), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenLockThrows_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var lockerMock = new Mock<IProcessTaskDataLocker>();
        lockerMock
            .Setup(x => x.Lock(It.IsAny<string>(), It.IsAny<Instance>()))
            .ThrowsAsync(new Exception("Lock failed"));
        var command = new LockTaskData(lockerMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Lock failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }
}
