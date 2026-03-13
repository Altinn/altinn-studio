using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Core.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Unit tests for <see cref="WorkflowHandler"/>, focusing on the retry state machine
/// and step status resolution in <c>UpdateStepStatusAndRetryDecision</c>.
/// </summary>
public class WorkflowHandlerTests
{
    private static readonly TimeProvider FixedTime = TimeProvider.System;

    private static WorkflowHandler CreateHandler(IWorkflowExecutor executor, EngineSettings? settings = null)
    {
        settings ??= new EngineSettings
        {
            QueueCapacity = 10,
            MaxDegreeOfParallelism = 5,
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxConcurrentDbOperations = 5,
            MaxConcurrentHttpCalls = 5,
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
        };

        var buffer = new Mock<IStatusWriteBuffer>();
        buffer
            .Setup(b => b.SubmitAsync(It.IsAny<Workflow>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new WorkflowHandler(
            executor,
            buffer.Object,
            Options.Create(settings),
            FixedTime,
            NullLogger<WorkflowHandler>.Instance
        );
    }

    private static Workflow CreateWorkflow(params Step[] steps) =>
        new()
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Status = PersistentItemStatus.Processing,
            Steps = [.. steps],
        };

    private static Step CreateStep(
        string operationId = "step",
        int processingOrder = 0,
        RetryStrategy? retryStrategy = null
    ) =>
        new()
        {
            OperationId = operationId,
            IdempotencyKey = $"test-step-key/{operationId}",
            ProcessingOrder = processingOrder,
            Command = CommandDefinition.Create("webhook"),
            RetryStrategy = retryStrategy,
        };

    /// <summary>
    /// Configures a mock executor that returns the given results sequentially for each step executed.
    /// </summary>
    private static Mock<IWorkflowExecutor> MockExecutor(params ExecutionResult[] results)
    {
        var mock = new Mock<IWorkflowExecutor>();
        var callIndex = 0;

        mock.Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                var idx = callIndex++;
                return idx < results.Length ? results[idx] : ExecutionResult.Success();
            });

        return mock;
    }

    [Fact]
    public async Task HandleAsync_AllStepsSucceed_WorkflowCompleted()
    {
        var executor = MockExecutor(ExecutionResult.Success(), ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(
            CreateStep("step-0", processingOrder: 0),
            CreateStep("step-1", processingOrder: 1)
        );

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        Assert.All(workflow.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }

    [Fact]
    public async Task HandleAsync_StepRetryableError_WithRetries_WorkflowRequeued()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("transient"));
        var settings = new EngineSettings
        {
            QueueCapacity = 10,
            MaxDegreeOfParallelism = 5,
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 3),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxConcurrentDbOperations = 5,
            MaxConcurrentHttpCalls = 5,
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
        };
        var handler = CreateHandler(executor.Object, settings);
        var workflow = CreateWorkflow(CreateStep());

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.Equal(PersistentItemStatus.Requeued, workflow.Steps[0].Status);
        Assert.Equal(1, workflow.Steps[0].RequeueCount);
        Assert.NotNull(workflow.BackoffUntil);
    }

    [Fact]
    public async Task HandleAsync_StepRetryableError_RetriesExhausted_WorkflowFailed()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("still failing"));
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        step.RequeueCount = 10; // Already exhausted (default RetryStrategy.None() = 0 max retries)
        var workflow = CreateWorkflow(step);

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[0].Status);
        Assert.Null(workflow.BackoffUntil);
    }

    [Fact]
    public async Task HandleAsync_StepCriticalError_WorkflowFailed()
    {
        var executor = MockExecutor(ExecutionResult.CriticalError("fatal"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[0].Status);
        Assert.Null(workflow.BackoffUntil);
    }

    [Fact]
    public async Task HandleAsync_StepCanceled_WorkflowFailed()
    {
        var executor = MockExecutor(ExecutionResult.Canceled());
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[0].Status);
    }

    [Fact]
    public async Task HandleAsync_DependencyFailed_WorkflowMarkedDependencyFailed()
    {
        var executor = MockExecutor();
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Status = PersistentItemStatus.Processing,
            Steps = [step],
            Dependencies =
            [
                new Workflow
                {
                    OperationId = "dep-op",
                    IdempotencyKey = "dep-key",
                    Namespace = "test-ns",
                    Context = JsonSerializer.SerializeToElement(new { }),
                    Status = PersistentItemStatus.Failed,
                    Steps = [],
                },
            ],
        };

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task HandleAsync_MultiStep_SecondFails_FirstStaysCompleted()
    {
        var executor = MockExecutor(ExecutionResult.Success(), ExecutionResult.CriticalError("boom"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(
            CreateStep("step-0", processingOrder: 0),
            CreateStep("step-1", processingOrder: 1)
        );

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[1].Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
    }

    [Fact]
    public async Task HandleAsync_RequeueResume_SkipsCompletedSteps()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var step0 = CreateStep("step-0", processingOrder: 0);
        step0.Status = PersistentItemStatus.Completed; // Already done from previous round
        var step1 = CreateStep("step-1", processingOrder: 1);
        var workflow = CreateWorkflow(step0, step1);

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        // Only step-1 should have been executed
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleAsync_RetryableError_BackoffCalculation_UsesStepRetryStrategy()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("oops"));
        var handler = CreateHandler(executor.Object);
        var step = CreateStep(retryStrategy: RetryStrategy.Constant(TimeSpan.FromSeconds(5), maxRetries: 3));
        var workflow = CreateWorkflow(step);

        var before = DateTimeOffset.UtcNow;
        await handler.HandleAsync(workflow, CancellationToken.None);
        var after = DateTimeOffset.UtcNow;

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.NotNull(workflow.BackoffUntil);
        // Backoff should be ~5 seconds from now (step's strategy, not engine default)
        Assert.True(workflow.BackoffUntil.Value >= before.AddSeconds(4));
        Assert.True(workflow.BackoffUntil.Value <= after.AddSeconds(6));
    }

    [Fact]
    public async Task HandleAsync_RetryableError_LastError_IsSet()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("oops"));
        var settings = new EngineSettings
        {
            QueueCapacity = 10,
            MaxDegreeOfParallelism = 5,
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 3),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxConcurrentDbOperations = 5,
            MaxConcurrentHttpCalls = 5,
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
        };
        var handler = CreateHandler(executor.Object, settings);
        var workflow = CreateWorkflow(CreateStep());

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Equal("oops", workflow.Steps[0].LastError);
    }

    [Fact]
    public async Task HandleAsync_Success_ClearsLastError()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        step.LastError = "previous error";
        var workflow = CreateWorkflow(step);

        await handler.HandleAsync(workflow, CancellationToken.None);

        Assert.Null(workflow.Steps[0].LastError);
    }
}
