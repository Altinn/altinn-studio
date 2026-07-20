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
    private static readonly DateTimeOffset FixtureExecutionReferenceTime = new(2025, 3, 14, 9, 26, 53, TimeSpan.Zero);

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
            IdempotencyKey = "test-step-id",
            ExecutionReferenceTime = FixtureExecutionReferenceTime,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
                ExecutionReferenceTime = FixtureExecutionReferenceTime,
            },
        };
    }

    private static ProcessEngineCommandContext WithExecutionMetadata(
        ProcessEngineCommandContext context,
        string idempotencyKey,
        DateTimeOffset executionReferenceTime
    ) =>
        new()
        {
            AppId = context.AppId,
            InstanceId = context.InstanceId,
            InstanceDataMutator = context.InstanceDataMutator,
            CancellationToken = context.CancellationToken,
            Payload = context.Payload with { ExecutionReferenceTime = executionReferenceTime },
            IdempotencyKey = idempotencyKey,
            ExecutionReferenceTime = executionReferenceTime,
        };

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
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .ReturnsAsync(ServiceTaskResult.Success("reject"));
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);
        serviceTask.Verify(x => x.Execute(It.IsAny<ServiceTaskContext>()), Times.Once);
    }

    [Fact]
    public async Task Execute_ForwardsWorkflowIdToServiceTaskContext()
    {
        // Arrange
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask.Setup(x => x.Execute(It.IsAny<ServiceTaskContext>())).ReturnsAsync(ServiceTaskResult.Success());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        serviceTask.Verify(
            x => x.Execute(It.Is<ServiceTaskContext>(c => c.WorkflowId == context.Payload.WorkflowId)),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_PassesWorkflowStepMetadataToServiceTaskContext()
    {
        const string idempotencyKey = "11111111-2222-3333-4444-555555555555";
        var executionReferenceTime = new DateTimeOffset(2026, 7, 21, 10, 30, 0, TimeSpan.FromHours(2));
        ServiceTaskContext? receivedContext = null;
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .Callback<ServiceTaskContext>(context => receivedContext = context)
            .ReturnsAsync(ServiceTaskResult.SuccessWithoutAutoAdvance());
        var command = CreateCommand(serviceTask.Object);
        var context = WithExecutionMetadata(
            CreateContext(CreateInstance(), "myServiceTask"),
            idempotencyKey,
            executionReferenceTime
        );

        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(receivedContext);
        Assert.Equal(idempotencyKey, receivedContext.IdempotencyKey);
        Assert.Equal(executionReferenceTime, receivedContext.ExecutionReferenceTime);
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
    public async Task Execute_WhenServiceTaskReturnsRetryableFailure_ReturnsRetryableFailure()
    {
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .ReturnsAsync(ServiceTaskResult.FailedRetryable("Try again"));
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Service task 'myServiceTask' failed: Try again", failed.ErrorMessage);
        Assert.Equal("ServiceTaskFailedException", failed.ExceptionType);
        Assert.False(failed.NonRetryable);
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

    [Fact]
    public async Task Execute_MutatorApiUseInsideServiceTaskStillWorks()
    {
        // Arrange
        var context = CreateContext(CreateInstance(), "myServiceTask");
        var dataElementIdentifier = new DataElementIdentifier(Guid.NewGuid());
        Mock.Get(context.InstanceDataMutator).Setup(x => x.RemoveDataElement(dataElementIdentifier));

        var serviceTask = new DelegateServiceTask(
            "myServiceTask",
            context =>
            {
                context.InstanceDataMutator.RemoveDataElement(dataElementIdentifier);
                return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance());
            }
        );
        var command = CreateCommand(serviceTask);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    private sealed class DelegateServiceTask(string type, Func<ServiceTaskContext, Task<ServiceTaskResult>> execute)
        : IServiceTask
    {
        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => execute(context);
    }
}
