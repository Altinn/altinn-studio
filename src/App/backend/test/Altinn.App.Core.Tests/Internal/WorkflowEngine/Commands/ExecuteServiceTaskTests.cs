using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class ExecuteServiceTaskTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance, string serviceTaskType)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        var payload = new ExecuteServiceTaskPayload(serviceTaskType);
        string serializedPayload = CommandPayloadSerializer.Serialize(payload)!;

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
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
            Id = "1337/abc-123",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
        };
    }

    private static ExecuteServiceTask CreateCommand(params IServiceTask[] serviceTasks)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var st in serviceTasks)
        {
            services.AddSingleton(st);
        }
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(sp.GetRequiredService<AppImplementationFactory>());
    }

    [Fact]
    public async Task Execute_ResolvesServiceTaskAndCallsExecute_ReturnsSuccessWithAutoAdvance()
    {
        // Arrange
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask.Setup(x => x.Execute(It.IsAny<ServiceTaskContext>())).ReturnsAsync(ServiceTaskResult.Success());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        serviceTask.Verify(x => x.Execute(It.IsAny<ServiceTaskContext>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenSuccessWithoutAutoAdvance_ReturnsFalseAutoAdvance()
    {
        // Arrange
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .ReturnsAsync(ServiceTaskResult.SuccessWithoutAutoAdvance());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task Execute_WhenServiceTaskReturnsFailedResult_ReturnsFailedResult()
    {
        // Arrange
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .ReturnsAsync(ServiceTaskResult.FailedPermanent("Something went wrong"));
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Contains("Service task 'myServiceTask' failed: Something went wrong", failed.ErrorMessage);
        Assert.Equal("ServiceTaskFailedException", failed.ExceptionType);
        Assert.True(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WhenNoMatchingServiceTask_ReturnsFailedResult()
    {
        // Arrange
        var command = CreateCommand();
        var context = CreateContext(CreateInstance(), "nonExistentType");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Contains("No service task found for type nonExistentType", failed.ErrorMessage);
        Assert.Equal("ProcessException", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_WhenServiceTaskThrows_ReturnsFailedResult()
    {
        // Arrange
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .ThrowsAsync(new InvalidOperationException("Service task exploded"));
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Service task exploded", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }
}
