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

/// <summary>
/// The simple dispatch of <see cref="ExecuteServiceTask"/>: an <see cref="IServiceTask"/> whose
/// pipeline is the forwarding default <c>Finally(Execute)</c> — every test here exercises that
/// default end to end (a real class, not a mock: mocks bypass interface defaults, see
/// <see cref="ExecuteServiceTaskStageTests"/> for that guard). The multi-stage dispatch is
/// covered by <see cref="ExecuteServiceTaskStageTests"/>.
/// </summary>
public class ExecuteServiceTaskTests
{
    /// <summary>An <see cref="IServiceTask"/> scripted per test, recording what it observed.</summary>
    private sealed class FakeServiceTask(Func<ServiceTaskContext, Task<ServiceTaskResult>> onExecute) : IServiceTask
    {
        public int ExecuteCount { get; private set; }

        public ServiceTaskContext? Observed { get; private set; }

        public string Type => "myServiceTask";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            ExecuteCount++;
            Observed = context;
            return onExecute(context);
        }
    }

    private static FakeServiceTask Succeeding() =>
        new(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

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
            StateCarry = new(),
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
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
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

    private static ExecuteServiceTask CreateCommand(params IServiceTask[] serviceTasks)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IServiceTask st in serviceTasks)
        {
            services.AddSingleton(st);
        }
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            // Never consulted: these pipelines declare no mailbox, so the delivery envelope is never
            // reached.
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    [Fact]
    public async Task Execute_ResolvesServiceTaskAndCallsExecute_ReturnsSuccessWithAutoAdvance()
    {
        // Arrange
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal(1, serviceTask.ExecuteCount);
    }

    [Fact]
    public async Task Execute_ForwardsWorkflowIdToServiceTaskContext()
    {
        // Arrange
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(context.Payload.WorkflowId, serviceTask.Observed.WorkflowId);
    }

    [Fact]
    public async Task Execute_WhenSuccessWithoutAutoAdvance_ReturnsFalseAutoAdvance()
    {
        // Arrange
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance())
        );
        var command = CreateCommand(serviceTask);
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
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("Something went wrong"))
        );
        var command = CreateCommand(serviceTask);
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
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(
                ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "delivery not confirmed")
            )
        );
        var command = CreateCommand(serviceTask);
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
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(
            CreateInstance(),
            "myServiceTask",
            retryCount: 2,
            executionDeadline: executionDeadline
        );

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(2, serviceTask.Observed.Attempt.RetryCount);
        Assert.Equal(executionDeadline, serviceTask.Observed.Attempt.Deadline);
    }

    [Fact]
    public async Task Execute_ForwardsDeferCountAndWaitDeadlineToServiceTaskContext()
    {
        // Arrange — a polling task needs to know which check it is on and how much budget is left,
        // otherwise it cannot pace itself or give up on its own terms.
        var waitDeadline = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask", deferCount: 4, waitDeadline: waitDeadline);

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(4, serviceTask.Observed.Wait.DeferCount);
        Assert.Equal(waitDeadline, serviceTask.Observed.Wait.Deadline);
    }

    [Fact]
    public async Task Execute_ForwardsStepIdAndWaitStartedAtToServiceTaskContext()
    {
        // Arrange — StepId is the outbound idempotency key for send-then-poll tasks; WaitStartedAt
        // lets them pace progressively without bookkeeping of their own.
        var stepId = Guid.NewGuid();
        var firstDeferredAt = new DateTimeOffset(2026, 1, 1, 11, 0, 0, TimeSpan.Zero);
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(
            CreateInstance(),
            "myServiceTask",
            stepId: stepId,
            firstDeferredAt: firstDeferredAt
        );

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(stepId, serviceTask.Observed.StepId);
        Assert.Equal(firstDeferredAt, serviceTask.Observed.Wait.StartedAt);
    }

    [Fact]
    public async Task Execute_FirstRun_ReportsNoDeferralsAndNoDeadline()
    {
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask"));

        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(0, serviceTask.Observed.Wait.DeferCount);
        Assert.Null(serviceTask.Observed.Wait.Deadline);
        Assert.Equal(0, serviceTask.Observed.Attempt.RetryCount);
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
        var serviceTask = new FakeServiceTask(_ => throw new InvalidOperationException("Service task exploded"));
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Service task exploded", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }
}
