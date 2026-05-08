using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

public class OnProcessEndingHookTests
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
                CommandKey = OnProcessEndingHook.Key,
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

    private static OnProcessEndingHook CreateCommand(params IOnProcessEndingHandler[] handlers)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var handler in handlers)
        {
            services.AddSingleton(handler);
        }
        var sp = services.BuildServiceProvider();
        return new OnProcessEndingHook(sp);
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
    public async Task Execute_WithOneHandler_ReturnsSuccess()
    {
        // Arrange
        var handler = new Mock<IOnProcessEndingHandler>();
        handler
            .Setup(x => x.ExecuteAsync(It.IsAny<OnProcessEndingHandlerContext>()))
            .ReturnsAsync(OnProcessEndingHandlerResult.Success());
        var command = CreateCommand(handler.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        handler.Verify(x => x.ExecuteAsync(It.IsAny<OnProcessEndingHandlerContext>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WithMultipleHandlers_ThrowsInvalidOperationException()
    {
        // Arrange
        var handler1 = new Mock<IOnProcessEndingHandler>();
        var handler2 = new Mock<IOnProcessEndingHandler>();
        var command = CreateCommand(handler1.Object, handler2.Object);
        var context = CreateContext(CreateInstance());

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => command.Execute(context));
        Assert.Contains("Multiple", ex.Message);
        Assert.Contains("Task_1", ex.Message);
    }

    [Fact]
    public async Task Execute_WhenHandlerReturnsPermanentFailure_ReturnsNonRetryableFailedResult()
    {
        // Arrange
        var handler = new Mock<IOnProcessEndingHandler>();
        handler
            .Setup(x => x.ExecuteAsync(It.IsAny<OnProcessEndingHandlerContext>()))
            .ReturnsAsync(OnProcessEndingHandlerResult.FailedPermanent("Hook failed"));
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
        var handler = new Mock<IOnProcessEndingHandler>();
        handler
            .Setup(x => x.ExecuteAsync(It.IsAny<OnProcessEndingHandlerContext>()))
            .ReturnsAsync(OnProcessEndingHandlerResult.FailedRetryable("Transient error"));
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
        var handler = new Mock<IOnProcessEndingHandler>();
        handler
            .Setup(x => x.ExecuteAsync(It.IsAny<OnProcessEndingHandlerContext>()))
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
