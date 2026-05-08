using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

#pragma warning disable CS0618 // Type or member is obsolete

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class StartTaskLegacyHookTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance, StartTaskLegacyHookPayload payload)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        string serializedPayload = CommandPayloadSerializer.Serialize(payload)!;

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = StartTaskLegacyHook.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                Payload = serializedPayload,
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

    private static StartTaskLegacyHook CreateCommand(params IProcessTaskStart[] handlers)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var handler in handlers)
        {
            services.AddSingleton(handler);
        }
        var sp = services.BuildServiceProvider();
        return new StartTaskLegacyHook(sp);
    }

    [Fact]
    public async Task Execute_WithNoHandlers_ReturnsSuccess()
    {
        // Arrange
        var command = CreateCommand();
        var payload = new StartTaskLegacyHookPayload(Prefill: null);
        var context = CreateContext(CreateInstance(), payload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
    }

    [Fact]
    public async Task Execute_CallsAllHandlersWithCorrectParameters()
    {
        // Arrange
        var instance = CreateInstance("Task_2");
        var prefill = new Dictionary<string, string> { ["key1"] = "value1" };
        var handler1 = new Mock<IProcessTaskStart>();
        var handler2 = new Mock<IProcessTaskStart>();
        var command = CreateCommand(handler1.Object, handler2.Object);
        var payload = new StartTaskLegacyHookPayload(Prefill: prefill);
        var context = CreateContext(instance, payload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        handler1.Verify(
            x => x.Start("Task_2", instance, It.Is<Dictionary<string, string>>(p => p["key1"] == "value1")),
            Times.Once
        );
        handler2.Verify(
            x => x.Start("Task_2", instance, It.Is<Dictionary<string, string>>(p => p["key1"] == "value1")),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WithNullPrefill_PassesNullToHandlers()
    {
        // Arrange
        var instance = CreateInstance();
        var handler = new Mock<IProcessTaskStart>();
        var command = CreateCommand(handler.Object);
        var payload = new StartTaskLegacyHookPayload(Prefill: null);
        var context = CreateContext(instance, payload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        handler.Verify(x => x.Start("Task_1", instance, null), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenHandlerThrows_ReturnsFailedResult()
    {
        // Arrange
        var handler = new Mock<IProcessTaskStart>();
        handler
            .Setup(x => x.Start(It.IsAny<string>(), It.IsAny<Instance>(), It.IsAny<Dictionary<string, string>?>()))
            .ThrowsAsync(new InvalidOperationException("Start failed"));
        var command = CreateCommand(handler.Object);
        var payload = new StartTaskLegacyHookPayload(Prefill: null);
        var context = CreateContext(CreateInstance(), payload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Start failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }
}
