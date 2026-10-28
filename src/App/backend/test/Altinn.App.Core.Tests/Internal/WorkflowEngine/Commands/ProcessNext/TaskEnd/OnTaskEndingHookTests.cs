using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

public class OnTaskEndingHookTests
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
            CancellationToken = new CancellationToken(canceled: true),
            Payload = new AppCallbackPayload
            {
                CommandKey = OnTaskEndingHook.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
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

    private static OnTaskEndingHook CreateCommand(params IOnTaskEndingHandler[] handlers)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var handler in handlers)
        {
            services.AddSingleton(handler);
        }
        var sp = services.BuildServiceProvider();
        return new OnTaskEndingHook(sp);
    }

    [Fact]
    public async Task Execute_WithNoHandlers_ReturnsSuccess()
    {
        // Arrange
        var command = CreateCommand();
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
    }

    [Fact]
    public async Task Execute_WithMatchingHandler_ReturnsSuccess()
    {
        // Arrange
        var handler = new Mock<IOnTaskEndingHandler>();
        handler.Setup(x => x.ShouldRunForTask("Task_1")).Returns(true);
        handler.Setup(x => x.Execute(It.IsAny<OnTaskEndingContext>())).ReturnsAsync(HandlerResult.Success());
        var command = CreateCommand(handler.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        handler.Verify(
            x =>
                x.Execute(
                    It.Is<OnTaskEndingContext>(c =>
                        c.InstanceDataMutator == context.InstanceDataMutator
                        && c.CancellationToken.Equals(context.CancellationToken)
                    )
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenHandlerReturnsPermanentFailure_ReturnsNonRetryableFailedResult()
    {
        // Arrange
        var handler = new Mock<IOnTaskEndingHandler>();
        handler.Setup(x => x.ShouldRunForTask("Task_1")).Returns(true);
        handler
            .Setup(x => x.Execute(It.IsAny<OnTaskEndingContext>()))
            .ReturnsAsync(HandlerResult.FailedPermanent("Hook failed"));
        var command = CreateCommand(handler.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Hook failed", failed.ErrorMessage);
        Assert.True(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WhenHandlerReturnsRetryableFailure_ReturnsRetryableFailedResult()
    {
        // Arrange
        var handler = new Mock<IOnTaskEndingHandler>();
        handler.Setup(x => x.ShouldRunForTask("Task_1")).Returns(true);
        handler
            .Setup(x => x.Execute(It.IsAny<OnTaskEndingContext>()))
            .ReturnsAsync(HandlerResult.FailedRetryable("Transient error"));
        var command = CreateCommand(handler.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Transient error", failed.ErrorMessage);
        Assert.False(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WhenHandlerThrows_ReturnsFailedResult()
    {
        // Arrange
        var handler = new Mock<IOnTaskEndingHandler>();
        handler.Setup(x => x.ShouldRunForTask("Task_1")).Returns(true);
        handler
            .Setup(x => x.Execute(It.IsAny<OnTaskEndingContext>()))
            .ThrowsAsync(new InvalidOperationException("Handler exploded"));
        var command = CreateCommand(handler.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Handler exploded", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }
}
