using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Unit tests for <see cref="WorkflowHandler"/>, focusing on the retry state machine
/// and step status resolution in <c>UpdateStepStatusAndRetryDecision</c>.
/// </summary>
public class WorkflowHandlerTests
{
    private static readonly TimeProvider _fixedTime = TimeProvider.System;

    /// <summary>Fixed origin for tests that need a controllable clock.</summary>
    private static readonly DateTimeOffset _t0 = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly EngineSettings _defaultSettings = new()
    {
        DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
        MaxStepCommandTimeout = TimeSpan.FromHours(2),
        DefaultStepRetryStrategy = RetryStrategy.None(),
        DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
        DatabaseRetryStrategy = RetryStrategy.None(),
        MetricsCollectionInterval = TimeSpan.FromSeconds(5),
        MaxWorkflowsPerRequest = 100,
        MaxStepsPerWorkflow = 50,
        MaxLabels = 50,
        HeartbeatInterval = TimeSpan.FromSeconds(3),
        StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
        MaxReclaimCount = 3,
        Concurrency = new ConcurrencySettings
        {
            MaxWorkers = 5,
            MaxDbOperations = 5,
            MaxHttpCalls = 5,
        },
    };

    private static WorkflowHandler CreateHandler(
        IWorkflowExecutor executor,
        EngineSettings? settings = null,
        IWorkflowUpdateBuffer? buffer = null,
        TimeProvider? timeProvider = null
    ) =>
        new(
            executor,
            buffer ?? MockBuffer().Object,
            Options.Create(settings ?? _defaultSettings),
            timeProvider ?? _fixedTime,
            NullLogger<WorkflowHandler>.Instance
        );

    /// <summary>
    /// Builds a mock <see cref="IWorkflowUpdateBuffer"/>. Without <paramref name="onSubmit"/> all
    /// Submit calls return <see cref="Task.CompletedTask"/>; otherwise the lambda decides per call
    /// (it receives the workflow and cancellation token — the remaining matcher args are discarded).
    /// </summary>
    private static Mock<IWorkflowUpdateBuffer> MockBuffer(Func<Workflow, CancellationToken, Task>? onSubmit = null)
    {
        var buffer = new Mock<IWorkflowUpdateBuffer>();
        var setup = buffer.Setup(b =>
            b.Submit(
                It.IsAny<Workflow>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<IReadOnlyList<Step>?>(),
                It.IsAny<string?>(),
                It.IsAny<Activity?>()
            )
        );

        if (onSubmit is null)
        {
            setup.Returns(Task.CompletedTask);
        }
        else
        {
            setup.Returns<Workflow, CancellationToken, IReadOnlyList<Step>?, string?, Activity?>(
                (w, ct, _, _, _) => onSubmit(w, ct)
            );
        }

        return buffer;
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
    public async Task Handle_WhenBufferRaisesLeaseLost_ExitsCleanlyWithoutThrowing()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var workflow = CreateWorkflow(CreateStep("step-0", processingOrder: 0));

        // The final Submit (workflow.Completed) throws LeaseLostException, simulating a
        // worker whose lease was reclaimed mid-processing.
        var buffer = MockBuffer(
            (w, _) =>
                w.Status == PersistentItemStatus.Completed
                    ? Task.FromException(new LeaseLostException(w.DatabaseId))
                    : Task.CompletedTask
        );
        var handler = CreateHandler(executor.Object, buffer: buffer.Object);

        // Must not rethrow — caller should observe a clean return and rely on warn log + counter.
        var handleTask = handler.Handle(workflow, CancellationToken.None);
        await handleTask;
        Assert.True(handleTask.IsCompletedSuccessfully);
    }

    [Fact]
    public async Task Handle_WhenFinalSubmitThrowsOCE_Rethrows()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var workflow = CreateWorkflow(CreateStep("step-0", processingOrder: 0));

        using var cts = new CancellationTokenSource();

        var buffer = MockBuffer(
            (w, ct) =>
                w.Status == PersistentItemStatus.Completed
                    ? Task.FromException(new OperationCanceledException(ct))
                    : Task.CompletedTask
        );
        var handler = CreateHandler(executor.Object, buffer: buffer.Object);

        await Assert.ThrowsAsync<OperationCanceledException>(() => handler.Handle(workflow, cts.Token));
    }

    [Fact]
    public async Task Handle_AllStepsSucceed_WorkflowCompleted()
    {
        var executor = MockExecutor(ExecutionResult.Success(), ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(
            CreateStep("step-0", processingOrder: 0),
            CreateStep("step-1", processingOrder: 1)
        );

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        Assert.All(workflow.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }

    [Fact]
    public async Task Handle_StepRetryableError_WithRetries_WorkflowRequeued()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("transient"));
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 3),
        };
        var handler = CreateHandler(executor.Object, settings);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.Equal(PersistentItemStatus.Requeued, workflow.Steps[0].Status);
        Assert.Equal(1, workflow.Steps[0].RequeueCount);
        Assert.NotNull(workflow.BackoffUntil);
    }

    [Fact]
    public async Task Handle_StepRetryableError_RetriesExhausted_WorkflowFailed()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("still failing"));
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        step.RequeueCount = 10; // Already exhausted (default RetryStrategy.None() = 0 max retries)
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[0].Status);
        Assert.Null(workflow.BackoffUntil);
    }

    [Fact]
    public async Task Handle_StepCriticalError_WorkflowFailed()
    {
        var executor = MockExecutor(ExecutionResult.CriticalError("fatal"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[0].Status);
        Assert.Null(workflow.BackoffUntil);
    }

    [Fact]
    public async Task Handle_StepCanceled_WorkflowFailed()
    {
        var executor = MockExecutor(ExecutionResult.Canceled());
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[0].Status);
    }

    [Fact]
    public async Task Handle_DependencyFailed_WorkflowMarkedDependencyFailed()
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

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Handle_DependencyCanceled_WorkflowMarkedDependencyFailed()
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
                    Status = PersistentItemStatus.Canceled,
                    Steps = [],
                },
            ],
        };

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Handle_DependencyDependencyFailed_WorkflowMarkedDependencyFailed()
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
                    Status = PersistentItemStatus.DependencyFailed,
                    Steps = [],
                },
            ],
        };

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Handle_DependencyFailed_MultipleStepsAllRemainEnqueued()
    {
        var executor = MockExecutor();
        var handler = CreateHandler(executor.Object);
        var step0 = CreateStep("step-0", processingOrder: 0);
        var step1 = CreateStep("step-1", processingOrder: 1);
        var step2 = CreateStep("step-2", processingOrder: 2);
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Status = PersistentItemStatus.Processing,
            Steps = [step0, step1, step2],
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

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        Assert.All(workflow.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Handle_MixedDependencies_OneFailedOnePassed_WorkflowMarkedDependencyFailed()
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
                    OperationId = "dep-ok",
                    IdempotencyKey = "dep-ok-key",
                    Namespace = "test-ns",
                    Context = JsonSerializer.SerializeToElement(new { }),
                    Status = PersistentItemStatus.Completed,
                    Steps = [],
                },
                new Workflow
                {
                    OperationId = "dep-bad",
                    IdempotencyKey = "dep-bad-key",
                    Namespace = "test-ns",
                    Context = JsonSerializer.SerializeToElement(new { }),
                    Status = PersistentItemStatus.Failed,
                    Steps = [],
                },
            ],
        };

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Handle_MultiStep_SecondFails_FirstStaysCompleted()
    {
        var executor = MockExecutor(ExecutionResult.Success(), ExecutionResult.CriticalError("boom"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(
            CreateStep("step-0", processingOrder: 0),
            CreateStep("step-1", processingOrder: 1)
        );

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[1].Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
    }

    [Fact]
    public async Task Handle_MultiStep_MiddleFails_RemainingStepsStayEnqueued()
    {
        var executor = MockExecutor(ExecutionResult.Success(), ExecutionResult.CriticalError("boom"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(
            CreateStep("step-0", processingOrder: 0),
            CreateStep("step-1", processingOrder: 1),
            CreateStep("step-2", processingOrder: 2)
        );

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Equal(PersistentItemStatus.Failed, workflow.Steps[1].Status);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Steps[2].Status);
    }

    [Fact]
    public async Task Handle_RequeueResume_SkipsCompletedSteps()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var step0 = CreateStep("step-0", processingOrder: 0);
        step0.Status = PersistentItemStatus.Completed; // Already done from previous round
        var step1 = CreateStep("step-1", processingOrder: 1);
        var workflow = CreateWorkflow(step0, step1);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        // Only step-1 should have been executed
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Handle_RetryableError_BackoffCalculation_UsesStepRetryStrategy()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("oops"));
        var handler = CreateHandler(executor.Object);
        var step = CreateStep(retryStrategy: RetryStrategy.Constant(TimeSpan.FromSeconds(5), maxRetries: 3));
        var workflow = CreateWorkflow(step);

        var before = DateTimeOffset.UtcNow;
        await handler.Handle(workflow, CancellationToken.None);
        var after = DateTimeOffset.UtcNow;

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.NotNull(workflow.BackoffUntil);
        // Backoff should be ~5 seconds from now (step's strategy, not engine default)
        Assert.True(workflow.BackoffUntil.Value >= before.AddSeconds(4));
        Assert.True(workflow.BackoffUntil.Value <= after.AddSeconds(6));
    }

    [Fact]
    public async Task Handle_RetryableError_ErrorHistory_IsPopulated()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("oops"));
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 3),
        };
        var handler = CreateHandler(executor.Object, settings);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        var entry = Assert.Single(workflow.Steps[0].ErrorHistory);
        Assert.Equal("oops", entry.Message);
        Assert.True(entry.WasRetryable);
    }

    [Fact]
    public async Task Handle_Success_DoesNotAddErrorHistory()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        step.ErrorHistory.Add(new ErrorEntry(DateTimeOffset.UtcNow, "previous error", null, true));
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Single(workflow.Steps[0].ErrorHistory);
    }

    [Fact]
    public async Task Handle_MultipleRetryableFailures_ErrorHistory_AccumulatesPopulatedEntries()
    {
        // Each Handle invocation represents one pickup by the processor. Simulate N retry cycles
        // against the same in-memory workflow and verify every appended entry carries real data —
        // this is the in-memory guard complementing the integration-level DB round-trip test.
        const int cycles = 5;

        var executor = MockExecutor(
            Enumerable
                .Range(0, cycles)
                .Select(i => ExecutionResult.RetryableError($"fail-{i}", httpStatusCode: 500))
                .ToArray()
        );
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(1), maxRetries: cycles),
        };
        var handler = CreateHandler(executor.Object, settings);
        var workflow = CreateWorkflow(CreateStep());

        for (int i = 0; i < cycles; i++)
        {
            workflow.Status = PersistentItemStatus.Processing;
            workflow.Steps[0].Status = PersistentItemStatus.Enqueued;
            await handler.Handle(workflow, CancellationToken.None);
        }

        var entries = workflow.Steps[0].ErrorHistory;
        Assert.Equal(cycles, entries.Count);
        for (int i = 0; i < entries.Count; i++)
        {
            Assert.Equal($"fail-{i}", entries[i].Message);
            Assert.Equal(500, entries[i].HttpStatusCode);
            Assert.True(entries[i].WasRetryable);
            Assert.True(entries[i].Timestamp > DateTimeOffset.MinValue);
        }
    }

    [Fact]
    public async Task Handle_StepDefers_WorkflowWaiting_NoErrorHistory()
    {
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(5), "not delivered yet"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        var before = DateTimeOffset.UtcNow;
        await handler.Handle(workflow, CancellationToken.None);
        var after = DateTimeOffset.UtcNow;

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Equal(PersistentItemStatus.Waiting, workflow.Steps[0].Status);
        Assert.Equal(1, workflow.Steps[0].DeferCount);
        Assert.NotNull(workflow.Steps[0].FirstDeferredAt);
        Assert.Empty(workflow.Steps[0].ErrorHistory);
        Assert.Equal(0, workflow.Steps[0].RequeueCount);
        Assert.NotNull(workflow.BackoffUntil);
        Assert.True(workflow.BackoffUntil.Value >= before.AddMinutes(4));
        Assert.True(workflow.BackoffUntil.Value <= after.AddMinutes(6));
    }

    [Fact]
    public async Task Handle_StepDefers_ResetsRequeueCount()
    {
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(1)));
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        step.RequeueCount = 3; // Transient errors before this successful "not yet" check
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Waiting, step.Status);
        Assert.Equal(0, step.RequeueCount);
    }

    [Fact]
    public async Task Handle_StepDefers_PreservesFirstDeferredAtAcrossCycles()
    {
        var executor = MockExecutor(
            ExecutionResult.Defer(TimeSpan.FromMinutes(1)),
            ExecutionResult.Defer(TimeSpan.FromMinutes(1))
        );
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);
        var firstDeferredAt = workflow.Steps[0].FirstDeferredAt;

        workflow.Status = PersistentItemStatus.Processing;
        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(firstDeferredAt, workflow.Steps[0].FirstDeferredAt);
        Assert.Equal(2, workflow.Steps[0].DeferCount);
    }

    [Fact]
    public async Task Handle_DeferThenSuccess_WorkflowCompleted()
    {
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(1)), ExecutionResult.Success());
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);
        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);

        // Simulate re-fetch after backoff elapses
        workflow.Status = PersistentItemStatus.Processing;
        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Empty(workflow.Steps[0].ErrorHistory);
    }

    [Fact]
    public async Task Handle_DeferWaitBudgetExhausted_WorkflowFailed_WaitExpired()
    {
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(5), "still nothing"));
        var handler = CreateHandler(executor.Object);
        var step = new Step
        {
            OperationId = "step",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("webhook", waitBudget: TimeSpan.FromMinutes(1)),
        };
        step.DeferCount = 12;
        step.FirstDeferredAt = DateTimeOffset.UtcNow.AddMinutes(-2); // Budget of 1 min already blown
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.Null(workflow.BackoffUntil);
        var entry = Assert.Single(step.ErrorHistory);
        Assert.Contains("Wait budget", entry.Message, StringComparison.Ordinal);
        Assert.Contains("still nothing", entry.Message, StringComparison.Ordinal);
        Assert.False(entry.WasRetryable);
    }

    [Fact]
    public async Task Handle_DeferBeyondRemainingBudget_ClampsDelayToDeadline()
    {
        // Budget not yet spent, but the requested delay would overshoot the deadline: the step still
        // parks, just only until the deadline, so it gets one final check instead of failing early.
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(10)));
        var handler = CreateHandler(executor.Object);
        var firstDeferredAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        var step = new Step
        {
            OperationId = "step",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("webhook", waitBudget: TimeSpan.FromMinutes(5)),
        };
        step.FirstDeferredAt = firstDeferredAt;
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Equal(PersistentItemStatus.Waiting, step.Status);
        Assert.Empty(step.ErrorHistory);

        // Clamped to FirstDeferredAt + budget rather than now + 10 minutes.
        var expectedDeadline = firstDeferredAt.AddMinutes(5);
        Assert.NotNull(workflow.BackoffUntil);
        Assert.True((workflow.BackoffUntil.Value - expectedDeadline).Duration() < TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Handle_FirstDeferralOfExactlyTheBudget_Parks()
    {
        // Regression: a delay equal to the whole budget must spend the budget, not fail on arrival.
        // This is the "durable timer" shape (defer for exactly the default wait duration).
        var budget = TimeSpan.FromHours(24);
        var executor = MockExecutor(ExecutionResult.Defer(budget));
        var handler = CreateHandler(executor.Object);
        var step = new Step
        {
            OperationId = "step",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("webhook", waitBudget: budget),
        };
        var workflow = CreateWorkflow(step);

        var before = DateTimeOffset.UtcNow;
        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Equal(1, step.DeferCount);
        Assert.Empty(step.ErrorHistory);
        Assert.NotNull(workflow.BackoffUntil);
        Assert.True(workflow.BackoffUntil.Value >= before.Add(budget).AddMinutes(-1));
    }

    [Fact]
    public async Task Handle_DeferAtTheDeadline_FailsWithWaitExpired()
    {
        // The clamped final poll runs at the deadline; a deferral there has no budget left to spend.
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(1)));
        var handler = CreateHandler(executor.Object);
        var step = new Step
        {
            OperationId = "step",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("webhook", waitBudget: TimeSpan.FromMinutes(5)),
        };
        step.DeferCount = 3;
        step.FirstDeferredAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.Null(workflow.BackoffUntil);
        Assert.Contains("Wait budget", Assert.Single(step.ErrorHistory).Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Handle_DeferNonPositiveDelay_WorkflowFailed()
    {
        var executor = MockExecutor(new ExecutionResult(ExecutionStatus.Deferred, DeferDelay: TimeSpan.Zero));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        var entry = Assert.Single(workflow.Steps[0].ErrorHistory);
        Assert.Contains("non-positive delay", entry.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Handle_DeferBelowMinimumDelay_ClampsUpToTheFloor()
    {
        // A positive but negligible delay must not turn the park into a tight re-execution loop.
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMilliseconds(1)));
        var settings = _defaultSettings with { MinStepDeferDelay = TimeSpan.FromSeconds(30) };
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(executor.Object, settings, timeProvider: time);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Equal(_t0.AddSeconds(30), workflow.BackoffUntil);
    }

    [Fact]
    public async Task Handle_StepDefersRepeatedly_AdvancesLastDeferredAt_KeepsFirstDeferredAtFixed()
    {
        var executor = MockExecutor(
            ExecutionResult.Defer(TimeSpan.FromMinutes(5)),
            ExecutionResult.Defer(TimeSpan.FromMinutes(5))
        );
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(executor.Object, timeProvider: time);
        var step = CreateStep();
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);
        Assert.Equal(_t0, step.FirstDeferredAt);
        Assert.Equal(_t0, step.LastDeferredAt);

        time.Advance(TimeSpan.FromMinutes(5));
        workflow.Status = PersistentItemStatus.Processing;
        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        // The two anchors measure different spans and must not collapse onto each other: the budget is
        // still counted from the first deferral, while the retry deadline moves with the latest one.
        Assert.Equal(_t0, step.FirstDeferredAt);
        Assert.Equal(_t0.AddMinutes(5), step.LastDeferredAt);
    }

    [Fact]
    public async Task Handle_ErrorsAfterDeferral_RetryMaxDurationStillBinds()
    {
        // Regression: the retry deadline must anchor on the last deferral, not on the step's last
        // write-back. UpdatedAt advances on every attempt, so anchoring there slid the deadline forward
        // one backoff at a time and MaxDuration never bound — a deferred step whose command started
        // failing retried forever, never reaching a terminal status and never raising a failure metric.
        var maxDuration = TimeSpan.FromHours(1);
        var executor = MockExecutor();
        executor
            .Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExecutionResult.RetryableError("callback is down"));

        var settings = _defaultSettings with
        {
            // No MaxRetries — MaxDuration is the only bound, exactly as in the shipped defaults.
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMinutes(10), maxDuration: maxDuration),
        };
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(executor.Object, settings, timeProvider: time);

        var step = CreateStep();
        step.DeferCount = 1;
        step.FirstDeferredAt = _t0;
        step.LastDeferredAt = _t0;
        var workflow = CreateWorkflow(step);

        var attempts = 0;
        while (step.Status != PersistentItemStatus.Failed && attempts < 100)
        {
            workflow.Status = PersistentItemStatus.Processing;
            await handler.Handle(workflow, TestContext.Current.CancellationToken);
            attempts++;

            // Stand in for the fetch gate waiting out the backoff the handler just scheduled.
            if (workflow.BackoffUntil is { } backoff && backoff > time.GetUtcNow())
                time.SetUtcNow(backoff);
        }

        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.True(
            time.GetUtcNow() - _t0 <= maxDuration,
            $"Retries ran for {time.GetUtcNow() - _t0}, beyond the {maxDuration} MaxDuration."
        );
    }

    [Fact]
    public async Task Handle_MultiStep_SecondDefers_FirstStaysCompleted_ThirdStaysEnqueued()
    {
        var executor = MockExecutor(ExecutionResult.Success(), ExecutionResult.Defer(TimeSpan.FromMinutes(1)));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(
            CreateStep("step-0", processingOrder: 0),
            CreateStep("step-1", processingOrder: 1),
            CreateStep("step-2", processingOrder: 2)
        );

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Equal(PersistentItemStatus.Waiting, workflow.Steps[1].Status);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Steps[2].Status);
    }
}
