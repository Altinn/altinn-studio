using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.AltinnEvents;

public class MovedToAltinnEventTests
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
                CommandKey = MovedToAltinnEvent.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Instance CreateInstance(string? taskId = "Task_1")
    {
        var instance = new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState(),
        };

        if (taskId is not null)
        {
            instance.Process.CurrentTask = new ProcessElementInfo { ElementId = taskId };
        }

        return instance;
    }

    [Fact]
    public async Task Execute_WithValidCurrentTask_CallsAddEventWithCorrectEventTypeAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var eventsClientMock = new Mock<IEventsClient>();
        var command = new MovedToAltinnEvent(eventsClientMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        eventsClientMock.Verify(
            x =>
                x.AddEvent(
                    "app.instance.process.movedTo.Task_1",
                    instance,
                    It.Is<StorageAuthenticationMethod>(a => a != null)
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WithNullCurrentTask_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance(taskId: null);
        var eventsClientMock = new Mock<IEventsClient>();
        var command = new MovedToAltinnEvent(eventsClientMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Current task is not set on instance process. Cannot raise movedTo event.", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_WhenAddEventThrows_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var eventsClientMock = new Mock<IEventsClient>();
        eventsClientMock
            .Setup(x => x.AddEvent(It.IsAny<string>(), It.IsAny<Instance>(), It.IsAny<StorageAuthenticationMethod>()))
            .ThrowsAsync(new Exception("AddEvent failed"));
        var command = new MovedToAltinnEvent(eventsClientMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("AddEvent failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }
}
