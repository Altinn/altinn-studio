using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
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
    private static ProcessEngineCommandContext CreateContext(
        Instance instance,
        string serviceTaskType,
        int deferCount = 0,
        DateTimeOffset? waitDeadline = null,
        int retryCount = 0,
        DateTimeOffset? executionDeadline = null,
        Guid stepId = default,
        DateTimeOffset? firstDeferredAt = null
    )
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
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = stepId,
                DeferCount = deferCount,
                WaitDeadline = waitDeadline,
                FirstDeferredAt = firstDeferredAt,
                RetryCount = retryCount,
                ExecutionDeadline = executionDeadline,
            },
        };
    }

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        return new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
        };
    }

    private static ExecuteServiceTask CreateCommand(params IServiceTask[] serviceTasks) =>
        CreateCommand(Mock.Of<IInstanceClient>(), serviceTasks);

    private static ExecuteServiceTask CreateCommand(IInstanceClient instanceClient, params IServiceTask[] serviceTasks)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var st in serviceTasks)
        {
            services.AddSingleton(st);
        }
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(sp.GetRequiredService<AppImplementationFactory>(), instanceClient);
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
    public async Task Execute_WhenServiceTaskDefers_ReturnsDeferredResultCarryingDelayAndReason()
    {
        // Arrange
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .ReturnsAsync(ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "delivery not confirmed"));
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert — a deferral is neither a success nor a failure: mapping it onto either would make the
        // engine advance the process or record an error, and it must do neither.
        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("delivery not confirmed", deferred.Reason);
    }

    [Fact]
    public async Task Execute_ForwardsRetryCountAndExecutionDeadlineToServiceTaskContext()
    {
        // Arrange — the per-attempt pair, mirroring the per-wait pair below. A task that cannot see the
        // execution deadline has no way to tell whether it has room to start a slow call, and would be
        // recorded as a failure for work it could have deferred instead.
        var executionDeadline = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        ServiceTaskContext? observed = null;
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .Callback<ServiceTaskContext>(ctx => observed = ctx)
            .ReturnsAsync(ServiceTaskResult.Success());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(
            CreateInstance(),
            "myServiceTask",
            retryCount: 2,
            executionDeadline: executionDeadline
        );

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert
        Assert.NotNull(observed);
        Assert.Equal(2, observed.Attempt.RetryCount);
        Assert.Equal(executionDeadline, observed.Attempt.Deadline);
    }

    [Fact]
    public async Task Execute_ForwardsDeferCountAndWaitDeadlineToServiceTaskContext()
    {
        // Arrange — a polling task needs to know which check it is on and how much budget is left,
        // otherwise it cannot pace itself or give up on its own terms.
        var waitDeadline = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        ServiceTaskContext? observed = null;
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .Callback<ServiceTaskContext>(ctx => observed = ctx)
            .ReturnsAsync(ServiceTaskResult.Success());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask", deferCount: 4, waitDeadline: waitDeadline);

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert
        Assert.NotNull(observed);
        Assert.Equal(4, observed.Wait.DeferCount);
        Assert.Equal(waitDeadline, observed.Wait.Deadline);
    }

    [Fact]
    public async Task Execute_ForwardsStepIdAndWaitStartedAtToServiceTaskContext()
    {
        // Arrange — StepId is the outbound idempotency key for send-then-poll tasks; WaitStartedAt
        // lets them pace progressively without bookkeeping of their own.
        var stepId = Guid.NewGuid();
        var firstDeferredAt = new DateTimeOffset(2026, 1, 1, 11, 0, 0, TimeSpan.Zero);
        ServiceTaskContext? observed = null;
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .Callback<ServiceTaskContext>(ctx => observed = ctx)
            .ReturnsAsync(ServiceTaskResult.Success());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(
            CreateInstance(),
            "myServiceTask",
            stepId: stepId,
            firstDeferredAt: firstDeferredAt
        );

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert
        Assert.NotNull(observed);
        Assert.Equal(stepId, observed.StepId);
        Assert.Equal(firstDeferredAt, observed.Wait.StartedAt);
    }

    [Fact]
    public async Task Execute_WiresStorageBackedCheckpoints_PrefixedByCanonicalTaskType()
    {
        // Arrange — the BPMN attribute may differ in casing from the task's declared Type (resolution
        // ignores case); the checkpoint prefix must use the canonical Type so keys stay stable.
        var instanceClient = new Mock<IInstanceClient>();
        instanceClient
            .Setup(x =>
                x.UpdateDataValues(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DataValues>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateInstance());
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .Returns<ServiceTaskContext>(async ctx =>
            {
                await ctx.Checkpoints.Set("receipt", "r-1");
                return ServiceTaskResult.Success();
            });
        var command = CreateCommand(instanceClient.Object, serviceTask.Object);
        var context = CreateContext(CreateInstance(), "MYSERVICETASK");

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("MYSERVICETASK"));

        // Assert
        instanceClient.Verify(
            x =>
                x.UpdateDataValues(
                    1337,
                    Guid.Parse("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde"),
                    It.Is<DataValues>(dv => dv.Values!["serviceTask:myServiceTask:receipt"] == "r-1"),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_FirstRun_ReportsNoDeferralsAndNoDeadline()
    {
        ServiceTaskContext? observed = null;
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("myServiceTask");
        serviceTask
            .Setup(x => x.Execute(It.IsAny<ServiceTaskContext>()))
            .Callback<ServiceTaskContext>(ctx => observed = ctx)
            .ReturnsAsync(ServiceTaskResult.Success());
        var command = CreateCommand(serviceTask.Object);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        Assert.NotNull(observed);
        Assert.Equal(0, observed.Wait.DeferCount);
        Assert.Null(observed.Wait.Deadline);
        Assert.Equal(0, observed.Attempt.RetryCount);
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
