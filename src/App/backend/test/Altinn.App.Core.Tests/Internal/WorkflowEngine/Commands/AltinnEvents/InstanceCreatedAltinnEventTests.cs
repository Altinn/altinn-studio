using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.AltinnEvents;

public class InstanceCreatedAltinnEventTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = InstanceCreatedAltinnEvent.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };
    }

    private static Instance CreateInstance()
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
    }

    [Fact]
    public async Task Execute_CallsAddEventWithCorrectEventTypeAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance();
        var eventsClientMock = new Mock<IEventsClient>();
        var command = new InstanceCreatedAltinnEvent(eventsClientMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        // The engine's step id is the idempotency key: it is what Altinn Events dedupes a retried
        // registration on, so a command that stopped passing it would silently restore at-least-once
        // publication.
        eventsClientMock.Verify(
            x =>
                x.AddEvent(
                    "app.instance.created",
                    instance,
                    It.Is<StorageAuthenticationMethod>(a => a != null),
                    context.Payload.StepId,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenAddEventThrows_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance();
        var eventsClientMock = new Mock<IEventsClient>();
        eventsClientMock
            .Setup(x =>
                x.AddEvent(
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("AddEvent failed"));
        var command = new InstanceCreatedAltinnEvent(eventsClientMock.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("AddEvent failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }
}
