using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

#pragma warning disable CS0618 // Type or member is obsolete

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

public class EndTaskLegacyHookTests
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
                CommandKey = EndTaskLegacyHook.Key,
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

    private static EndTaskLegacyHook CreateCommand(params IProcessTaskEnd[] handlers)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var handler in handlers)
        {
            services.AddSingleton(handler);
        }
        var sp = services.BuildServiceProvider();
        return new EndTaskLegacyHook(sp);
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
    public async Task Execute_CallsAllHandlersWithCorrectTaskIdAndInstance()
    {
        // Arrange
        var instance = CreateInstance("Task_2");
        var handler1 = new Mock<IProcessTaskEnd>();
        var handler2 = new Mock<IProcessTaskEnd>();
        var command = CreateCommand(handler1.Object, handler2.Object);
        var context = CreateContext(instance);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        handler1.Verify(x => x.End("Task_2", instance), Times.Once);
        handler2.Verify(x => x.End("Task_2", instance), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenHandlerThrows_ReturnsFailedResult()
    {
        // Arrange
        var handler = new Mock<IProcessTaskEnd>();
        handler.Setup(x => x.End(It.IsAny<string>(), It.IsAny<Instance>())).ThrowsAsync(new Exception("End failed"));
        var command = CreateCommand(handler.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("End failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }
}
