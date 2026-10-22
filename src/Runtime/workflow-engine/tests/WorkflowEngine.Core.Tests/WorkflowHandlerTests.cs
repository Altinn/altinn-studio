using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Telemetry;

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
        TimeProvider? timeProvider = null,
        IThrottleStateView? throttleStateView = null,
        ILogger<WorkflowHandler>? logger = null
    ) =>
        new(
            executor,
            buffer ?? MockBuffer().Object,
            Options.Create(settings ?? _defaultSettings),
            timeProvider ?? _fixedTime,
            throttleStateView ?? new FakeThrottleStateView(),
            logger ?? NullLogger<WorkflowHandler>.Instance
        );

    /// <summary>
    /// Fake tripped-breaker snapshot for the handler's cooperative throttle parking.
    /// Empty by default — the healthy-path shape every other test runs against.
    /// </summary>
    private sealed class FakeThrottleStateView(IReadOnlyDictionary<string, TimeSpan>? trippedBreakers = null)
        : IThrottleStateView
    {
        public IReadOnlyDictionary<string, TimeSpan> TrippedBreakers { get; } =
            trippedBreakers ?? new Dictionary<string, TimeSpan>(StringComparer.Ordinal);
    }

    private static FakeThrottleStateView OpenBreakerFor(string ns, TimeSpan window) =>
        new(new Dictionary<string, TimeSpan>(StringComparer.Ordinal) { [ns] = window });

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
    public async Task Handle_OwnTokenCancelsFinalSubmit_RethrowsWithoutReportingAnError()
    {
        using var listener = ListenToEngineSpans();
        using var cts = new CancellationTokenSource();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var buffer = MockBuffer(
            async (w, ct) =>
            {
                if (w.Status == PersistentItemStatus.Completed)
                {
                    await cts.CancelAsync();
                    ct.ThrowIfCancellationRequested();
                }
            }
        );
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.Success()).Object,
            buffer: buffer.Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var workflow = CreateWorkflow(CreateStep("step-0", processingOrder: 0));

        await Assert.ThrowsAsync<OperationCanceledException>(() => handler.Handle(workflow, cts.Token));

        Assert.DoesNotContain(logs.Entries, e => e.Level >= LogLevel.Error);
        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.True(workflowSpan.IsStopped);
        Assert.Equal(ActivityStatusCode.Ok, workflowSpan.Status);
        Assert.Null(workflowSpan.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Handle_AnotherTokenCancelsFinalSubmit_ReportedAsTheFailure()
    {
        // A cancellation the handler did not ask for, such as a timeout below it, is a failure like any other
        using var listener = ListenToEngineSpans();
        using var otherCts = new CancellationTokenSource();
        await otherCts.CancelAsync();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var foreignCancellation = new OperationCanceledException("write-back timed out", otherCts.Token);
        var handler = CreateHandler(
            MockExecutor(ExecutionResult.Success()).Object,
            buffer: MockBufferFailing(
                spans,
                w => w.Status == PersistentItemStatus.Completed,
                foreignCancellation
            ).Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        AssertReportedInTheWorkflowTrace(logs, spans.Workflow, foreignCancellation);
        Assert.Single(logs.Entries, e => e.Level >= LogLevel.Error);
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
    public async Task Handle_StepSucceedsWithState_StoresStateOut()
    {
        var executor = MockExecutor(ExecutionResult.Success("produced"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal("produced", workflow.Steps[0].StateOut);
    }

    [Fact]
    public async Task Handle_StepDefersWithState_StoresStateOut()
    {
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(1), state: "carried"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Steps[0].Status);
        Assert.Equal("carried", workflow.Steps[0].StateOut);
    }

    [Fact]
    public async Task Handle_ResultWithoutState_KeepsStateOut()
    {
        var executor = MockExecutor(
            ExecutionResult.Defer(TimeSpan.FromMinutes(1), state: "carried"),
            ExecutionResult.Success()
        );
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);
        workflow.Status = PersistentItemStatus.Processing;
        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Equal("carried", workflow.Steps[0].StateOut);
    }

    [Theory]
    [InlineData(ExecutionStatus.RetryableError)]
    [InlineData(ExecutionStatus.CriticalError)]
    public async Task Handle_ErrorResultWithState_DoesNotStoreStateOut(ExecutionStatus status)
    {
        var executor = MockExecutor(new ExecutionResult(status, "boom", StateOut: "ignored"));
        var handler = CreateHandler(executor.Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Null(workflow.Steps[0].StateOut);
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
        // The clamped final poll starts at the deadline, so it is the final check: a deferral from it
        // has no budget left to spend.
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
    public async Task Handle_AttemptThatOverranTheDeadline_IsDueAtOnce_AndItsReRunIsTheFinalCheck()
    {
        // An attempt that started before the deadline but returned after it is not the final check: it
        // is re-run at once, and that re-run is.
        var settings = _defaultSettings;
        var time = new FakeTimeProvider(_t0);
        var step = new Step
        {
            OperationId = "step",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("webhook", waitBudget: TimeSpan.FromMinutes(5)),
        };
        step.DeferCount = 3;
        step.FirstDeferredAt = _t0.AddSeconds(1).AddMinutes(-5);

        var verdictsSeenByExecutor = new List<bool>();
        var executor = new Mock<IWorkflowExecutor>();
        executor
            .Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (Workflow _, Step executing, CancellationToken _) =>
                {
                    verdictsSeenByExecutor.Add(executing.IsFinalWaitCheck(settings));
                    time.Advance(TimeSpan.FromSeconds(2));
                    return ExecutionResult.Defer(TimeSpan.FromMinutes(1));
                }
            );
        var handler = CreateHandler(executor.Object, settings, timeProvider: time);
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Waiting, step.Status);
        Assert.Empty(step.ErrorHistory);
        Assert.Equal(_t0.AddSeconds(2), workflow.BackoffUntil);

        workflow.Status = PersistentItemStatus.Processing;
        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal([false, true], verdictsSeenByExecutor);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.Equal("wait_expired", workflow.FailureReason);
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

    [Fact]
    public async Task Handle_CancellationBypassClaim_RecordsNoNegativeDurations()
    {
        // A cancel racing a deferral write-back is claimed by the fetch gate's cancellation bypass
        // while backoff_until still points at the next scheduled poll — potentially far in the
        // future. The duration anchor must clamp to now, or queue/total time record negative values.
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(MockExecutor(ExecutionResult.Success()).Object, timeProvider: time);
        var workflow = new Workflow
        {
            OperationId = "cancel-bypass-durations",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Status = PersistentItemStatus.Processing,
            Steps = [CreateStep()],
            CancellationRequestedAt = _t0,
            BackoffUntil = _t0.AddMinutes(10),
        };

        using var durations = new WorkflowDurationCollector();
        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        Assert.NotEmpty(durations.Measurements);
        Assert.All(
            durations.Measurements,
            m => Assert.True(m.Value >= 0, $"{m.Instrument} recorded a negative duration: {m.Value}")
        );
    }

    [Fact]
    public async Task Handle_RetryableFailure_OpenNamespaceBreaker_ParksWithJitteredWindow_BackoffUntouched()
    {
        // Cooperative throttle parking (see the failure-throttling ADR): a retryable failure in a
        // namespace with a tripped breaker parks the workflow immediately — alongside, never instead
        // of, the normal Requeued transition and backoff scheduling.
        var window = TimeSpan.FromMinutes(10);
        var executor = MockExecutor(ExecutionResult.RetryableError("callback down"));
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromSeconds(5), maxRetries: 3),
        };
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(
            executor.Object,
            settings,
            timeProvider: time,
            throttleStateView: OpenBreakerFor("test-ns", window)
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.Equal(PersistentItemStatus.Requeued, workflow.Steps[0].Status);
        Assert.Equal(1, workflow.Steps[0].RequeueCount);

        // The stamp is now + window, jittered ±JitterFraction.
        Assert.NotNull(workflow.ThrottledUntil);
        var park = workflow.ThrottledUntil.Value - _t0;
        Assert.InRange(
            park,
            window * (1 - ThrottlingSettings.JitterFraction),
            window * (1 + ThrottlingSettings.JitterFraction)
        );

        // The retry clock is untouched: backoff keeps today's semantics (5 s constant ± the retry
        // delay's own ±20% jitter) — throttle effects live only in ThrottledUntil.
        Assert.NotNull(workflow.BackoffUntil);
        var backoff = workflow.BackoffUntil.Value - _t0;
        Assert.InRange(backoff, TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(6));
    }

    [Fact]
    public async Task Handle_RetryableFailure_OpenBreaker_NearDeadline_ClampsToRetryDeadline()
    {
        // The window overshoots the step's retry deadline: the stamp is clamped to the deadline so
        // throttling never costs the workflow its final attempt within the MaxDuration budget.
        var window = TimeSpan.FromMinutes(10);
        var maxDuration = TimeSpan.FromMinutes(5);
        var executor = MockExecutor(ExecutionResult.RetryableError("callback down"));
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromSeconds(1), maxDuration: maxDuration),
        };
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(
            executor.Object,
            settings,
            timeProvider: time,
            throttleStateView: OpenBreakerFor("test-ns", window)
        );

        // Anchor the retry allowance at t0 via the last deferral (ResolveRetryAnchor's first pick),
        // making the deadline exactly t0 + maxDuration regardless of the step's CreatedAt.
        var step = CreateStep();
        step.DeferCount = 1;
        step.FirstDeferredAt = _t0;
        step.LastDeferredAt = _t0;
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.Equal(_t0 + maxDuration, workflow.ThrottledUntil);
    }

    [Fact]
    public void ParkIfNamespaceThrottled_DeadlineAtOrPassed_DoesNotStamp()
    {
        // Through Handle the retryable branch is only reachable while the deadline is ahead, so the
        // guard is exercised directly: when the wall clock crosses the deadline between the retry
        // decision and the stamp, the final attempt is due and must never be delayed.
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(1), maxDuration: TimeSpan.FromMinutes(5));
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(
            MockExecutor().Object,
            timeProvider: time,
            throttleStateView: OpenBreakerFor("test-ns", TimeSpan.FromMinutes(10))
        );
        var workflow = CreateWorkflow(CreateStep());

        // Deadline exactly at now (anchor + 5 min == t0), and in the past (anchor + 5 min < t0).
        handler.ParkIfNamespaceThrottled(workflow, strategy, retryAnchor: _t0.AddMinutes(-5));
        Assert.Null(workflow.ThrottledUntil);

        handler.ParkIfNamespaceThrottled(workflow, strategy, retryAnchor: _t0.AddMinutes(-6));
        Assert.Null(workflow.ThrottledUntil);
    }

    [Fact]
    public async Task Handle_RetryableFailure_NamespaceNotInView_DoesNotPark()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("transient"));
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromSeconds(5), maxRetries: 3),
        };
        var handler = CreateHandler(
            executor.Object,
            settings,
            throttleStateView: OpenBreakerFor("some-other-ns", TimeSpan.FromMinutes(10))
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.Null(workflow.ThrottledUntil);
        Assert.NotNull(workflow.BackoffUntil);
    }

    [Fact]
    public async Task Handle_CriticalError_OpenBreaker_DoesNotPark()
    {
        // Only the retryable-error path cooperates: a critical failure is terminal — parking it
        // would gate a workflow that is never fetched again anyway.
        var executor = MockExecutor(ExecutionResult.CriticalError("fatal"));
        var handler = CreateHandler(
            executor.Object,
            throttleStateView: OpenBreakerFor("test-ns", TimeSpan.FromMinutes(10))
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Null(workflow.ThrottledUntil);
    }

    [Fact]
    public async Task Handle_RetriesExhausted_OpenBreaker_DoesNotPark()
    {
        var executor = MockExecutor(ExecutionResult.RetryableError("still failing"));
        var handler = CreateHandler(
            executor.Object,
            throttleStateView: OpenBreakerFor("test-ns", TimeSpan.FromMinutes(10))
        );
        var step = CreateStep();
        step.RequeueCount = 10; // Already exhausted (default RetryStrategy.None() = 0 max retries)
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Failed, workflow.Status);
        Assert.Null(workflow.ThrottledUntil);
    }

    [Fact]
    public async Task Handle_Deferral_OpenBreaker_DoesNotPark()
    {
        // A deferral is a successful execution, not a failure — the breaker never touches it.
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(5), "not delivered yet"));
        var handler = CreateHandler(
            executor.Object,
            throttleStateView: OpenBreakerFor("test-ns", TimeSpan.FromMinutes(10))
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Null(workflow.ThrottledUntil);
    }

    [Fact]
    public async Task Handle_Success_OpenBreaker_DoesNotPark()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var handler = CreateHandler(
            executor.Object,
            throttleStateView: OpenBreakerFor("test-ns", TimeSpan.FromMinutes(10))
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        Assert.Null(workflow.ThrottledUntil);
    }

    /// <summary>
    /// Captures the workflow queue/total duration histograms recorded by the test that created it. The
    /// histograms carry no attribute that tells one workflow from another, so the collector keeps only what is
    /// recorded in the creating test's async flow — concurrently running tests never bleed into the assertions.
    /// </summary>
    private sealed class WorkflowDurationCollector : IDisposable
    {
        private static readonly AsyncLocal<WorkflowDurationCollector?> _current = new();

        private readonly MeterListener _listener;

        public ConcurrentBag<(string Instrument, double Value)> Measurements { get; } = [];

        public WorkflowDurationCollector()
        {
            _current.Value = this;

            _listener = new MeterListener();
            _listener.InstrumentPublished = (instrument, listener) =>
            {
                if (
                    instrument.Meter.Name == Metrics.Meter.Name
                    && instrument.Name
                        is "altinn.workflow_engine.workflow.queue.duration"
                            or "altinn.workflow_engine.workflow.duration"
                )
                {
                    listener.EnableMeasurementEvents(instrument);
                }
            };
            _listener.SetMeasurementEventCallback<double>(
                (instrument, measurement, _, _) =>
                {
                    if (ReferenceEquals(_current.Value, this))
                    {
                        Measurements.Add((instrument.Name, measurement));
                    }
                }
            );
            _listener.Start();
        }

        public void Dispose() => _listener.Dispose();
    }

    /// <summary>
    /// Captures the errors counter in the creating test's async flow, like <see cref="WorkflowDurationCollector"/>.
    /// </summary>
    private sealed class ErrorsCollector : IDisposable
    {
        private static readonly AsyncLocal<ErrorsCollector?> _current = new();

        private readonly MeterListener _listener;

        public ConcurrentBag<(long Value, KeyValuePair<string, object?>[] Tags)> Measurements { get; } = [];

        public ErrorsCollector()
        {
            _current.Value = this;

            _listener = new MeterListener();
            _listener.InstrumentPublished = (instrument, listener) =>
            {
                if (instrument.Meter.Name == Metrics.Meter.Name && instrument.Name == "altinn.workflow_engine.errors")
                {
                    listener.EnableMeasurementEvents(instrument);
                }
            };
            _listener.SetMeasurementEventCallback<long>(
                (_, measurement, tags, _) =>
                {
                    if (ReferenceEquals(_current.Value, this))
                    {
                        Measurements.Add((measurement, tags.ToArray()));
                    }
                }
            );
            _listener.Start();
        }

        public void Dispose() => _listener.Dispose();
    }

    // ── ExecutionStartedAt ─────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_StampsExecutionStartedAt_OnWorkflowAndStep_FromTheClock()
    {
        var executor = MockExecutor(ExecutionResult.Success());
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(executor.Object, timeProvider: time);
        var step = CreateStep();
        var workflow = CreateWorkflow(step);
        Assert.Null(workflow.ExecutionStartedAt);
        Assert.Null(step.ExecutionStartedAt);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(_t0, workflow.ExecutionStartedAt);
        Assert.Equal(_t0, step.ExecutionStartedAt);
    }

    [Fact]
    public async Task Handle_StepStartedWriteBack_AlreadyCarriesTheStamp()
    {
        // The stamp reaches a status read only through the write-back, and the first one for a step is
        // the "step_started" fire-and-forget. It must carry the stamp on both rows, so a dashboard reading
        // a Processing step sees when the attempt began rather than the previous attempt's value.
        var executor = MockExecutor(ExecutionResult.Success());
        var time = new FakeTimeProvider(_t0);
        var buffer = MockBuffer();
        DateTimeOffset? workflowStamp = null;
        DateTimeOffset? stepStamp = null;
        int dirtyStepCount = -1;
        buffer
            .Setup(b =>
                b.SubmitAndForget(
                    It.IsAny<Workflow>(),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<IReadOnlyList<Step>?>(),
                    "step_started",
                    It.IsAny<Activity?>()
                )
            )
            .Callback<Workflow, CancellationToken, IReadOnlyList<Step>?, string?, Activity?>(
                (w, _, steps, _, _) =>
                {
                    workflowStamp = w.ExecutionStartedAt;
                    dirtyStepCount = steps?.Count ?? 0;
                    stepStamp = steps is [{ } only] ? only.ExecutionStartedAt : null;
                }
            );
        var handler = CreateHandler(executor.Object, buffer: buffer.Object, timeProvider: time);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(1, dirtyStepCount);
        Assert.Equal(_t0, workflowStamp);
        Assert.Equal(_t0, stepStamp);
    }

    [Fact]
    public async Task Handle_ReExecutionAfterDeferral_MovesExecutionStartedAtToTheNewAttempt()
    {
        var executor = MockExecutor(ExecutionResult.Defer(TimeSpan.FromMinutes(5)), ExecutionResult.Success());
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(executor.Object, timeProvider: time);
        var step = CreateStep();
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);
        Assert.Equal(PersistentItemStatus.Waiting, workflow.Status);
        Assert.Equal(_t0, workflow.ExecutionStartedAt);
        Assert.Equal(_t0, step.ExecutionStartedAt);

        time.Advance(TimeSpan.FromMinutes(5));
        workflow.Status = PersistentItemStatus.Processing;
        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        // The stamp is the start of the most recent attempt, so it follows the re-execution — unlike
        // FirstDeferredAt, which stays anchored on the first deferral.
        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        Assert.Equal(_t0.AddMinutes(5), workflow.ExecutionStartedAt);
        Assert.Equal(_t0.AddMinutes(5), step.ExecutionStartedAt);
        Assert.Equal(_t0, step.FirstDeferredAt);
    }

    [Fact]
    public async Task Handle_AlreadyCompletedStep_IsNotRestamped()
    {
        // A completed step is skipped on a later attempt (e.g. after a retry of a later step), so its
        // stamp keeps describing the attempt that actually ran it.
        var executor = MockExecutor(ExecutionResult.Success());
        var time = new FakeTimeProvider(_t0);
        var handler = CreateHandler(executor.Object, timeProvider: time);
        var done = CreateStep("done", processingOrder: 0);
        done.Status = PersistentItemStatus.Completed;
        done.ExecutionStartedAt = _t0.AddHours(-1);
        var pending = CreateStep("pending", processingOrder: 1);
        var workflow = CreateWorkflow(done, pending);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(_t0.AddHours(-1), done.ExecutionStartedAt);
        Assert.Equal(_t0, pending.ExecutionStartedAt);
    }

    // ── Spans ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_StepSucceeds_StepSpanEndsOk()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var handler = CreateHandler(MockExecutorCapturingSpans(spans, ExecutionResult.Success()).Object);
        var workflow = CreateWorkflow(CreateStep("step-op"));

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.Equal("WorkflowHandler.ProcessStep", stepSpan.OperationName);
        Assert.Equal("step-op", stepSpan.GetTagItem("altinn.workflow_engine.step.operation_id"));
        Assert.True(stepSpan.IsStopped);
        Assert.Equal(ActivityStatusCode.Ok, stepSpan.Status);
        Assert.Null(stepSpan.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Handle_StepFails_StepAndWorkflowSpansEndInErrorWithTheFailureReason()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var handler = CreateHandler(MockExecutorCapturingSpans(spans, ExecutionResult.CriticalError("fatal")).Object);
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.True(stepSpan.IsStopped);
        Assert.Equal(ActivityStatusCode.Error, stepSpan.Status);
        Assert.Equal("fatal", stepSpan.StatusDescription);
        Assert.Equal("execution", stepSpan.GetTagItem("error.type"));
        Assert.Empty(stepSpan.Events);

        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.Equal(ActivityStatusCode.Error, workflowSpan.Status);
        Assert.Equal("execution", workflowSpan.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Handle_StepWaitBudgetExpires_StepSpanErrorTypeIsWaitExpired()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.Defer(TimeSpan.FromMinutes(5))).Object
        );
        var step = CreateStep();
        step.FirstDeferredAt = DateTimeOffset.UtcNow - TimeSpan.FromDays(2);
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.Equal(ActivityStatusCode.Error, stepSpan.Status);
        Assert.Equal("wait_expired", stepSpan.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Handle_StepRequeued_StepSpanStatusStaysUnset()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 3),
        };
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.RetryableError("transient")).Object,
            settings
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.True(stepSpan.IsStopped);
        Assert.Equal(ActivityStatusCode.Unset, stepSpan.Status);
    }

    [Fact]
    public async Task Handle_LeaseLost_SpansEndInErrorWithLeaseLost()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var buffer = MockBuffer(
            (w, _) =>
                w.Status == PersistentItemStatus.Completed
                    ? Task.FromException(new LeaseLostException(w.DatabaseId))
                    : Task.CompletedTask
        );
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.Success()).Object,
            buffer: buffer.Object
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.Equal(ActivityStatusCode.Error, workflowSpan.Status);
        Assert.Equal("lease_lost", workflowSpan.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Handle_ProcessingThrows_TheErrorLogIsWrittenInTheWorkflowTrace()
    {
        // The exception is no longer an event on the workflow span, so the ERROR log that carries it must be
        // findable from the span by trace ID — even though the handler runs under the processor's own span
        using var listener = ListenToEngineSpans();
        using var processorSpan = Metrics.Source.StartActivity("test.processor");
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var buffer = MockBuffer(
            (w, _) =>
                w.Status == PersistentItemStatus.Processing
                    ? Task.FromException(new InvalidOperationException("write-back failed"))
                    : Task.CompletedTask
        );
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.Success()).Object,
            buffer: buffer.Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Processing, workflow.Status);
        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.Equal("System.InvalidOperationException", workflowSpan.GetTagItem("error.type"));
        Assert.Empty(workflowSpan.Events);
        var errorLog = Assert.Single(logs.Entries, e => e.Level == LogLevel.Error);
        Assert.IsType<InvalidOperationException>(errorLog.Exception);
        Assert.Equal(workflowSpan.TraceId, errorLog.TraceId);
    }

    [Fact]
    public async Task Handle_StepWriteBackThrows_StepSpanEndsInError_ReportedOnceInWorkflowTrace()
    {
        // A span that is never stopped is never exported, and the trace would show the workflow without the step
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var writeBackFailure = new InvalidOperationException("write-back failed");
        var buffer = MockBuffer(
            (w, _) =>
                w.Status == PersistentItemStatus.Processing ? Task.FromException(writeBackFailure) : Task.CompletedTask
        );
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.Success()).Object,
            buffer: buffer.Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var step = CreateStep();
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Processing, workflow.Status);
        buffer.Verify(
            b =>
                b.Submit(
                    It.IsAny<Workflow>(),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<IReadOnlyList<Step>?>(),
                    It.IsAny<string?>(),
                    It.IsAny<Activity?>()
                ),
            Times.Once()
        );
        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.True(stepSpan.IsStopped);
        Assert.Null(step.EngineActivity);
        Assert.Equal(ActivityStatusCode.Error, stepSpan.Status);
        Assert.Equal("write-back failed", stepSpan.StatusDescription);
        Assert.Equal("System.InvalidOperationException", stepSpan.GetTagItem("error.type"));
        Assert.Empty(stepSpan.Events);
        AssertReportedInTheWorkflowTrace(logs, spans.Workflow, writeBackFailure);
        Assert.Equal(spans.Workflow?.TraceId, stepSpan.TraceId);
        Assert.Single(logs.Entries, e => e.Level >= LogLevel.Error);
    }

    [Fact]
    public async Task Handle_ExecutorThrows_StepSpanEndsInErrorWithTheException()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var handler = CreateHandler(
            MockExecutorCapturingSpans(
                spans,
                _ => Task.FromException<ExecutionResult>(new InvalidOperationException("executor broke its contract"))
            ).Object
        );
        var step = CreateStep();
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Processing, workflow.Status);
        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.True(stepSpan.IsStopped);
        Assert.Null(step.EngineActivity);
        Assert.Equal(ActivityStatusCode.Error, stepSpan.Status);
        Assert.Equal("System.Diagnostics.UnreachableException", stepSpan.GetTagItem("error.type"));
        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.Equal(ActivityStatusCode.Error, workflowSpan.Status);
        Assert.Equal("System.Diagnostics.UnreachableException", workflowSpan.GetTagItem("error.type"));
    }

    [Theory]
    [InlineData(PersistentItemStatus.Completed)]
    [InlineData(PersistentItemStatus.Failed)]
    [InlineData(PersistentItemStatus.Requeued)]
    [InlineData(PersistentItemStatus.Waiting)]
    public async Task Handle_FinalWriteBackThrows_ReportedInWorkflowTrace(PersistentItemStatus outcome)
    {
        // Whatever the outcome set on the workflow span, the exception that ended the handling is what it ends with
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        using var errors = new ErrorsCollector();
        var writeBackFailure = new TimeoutException("final write-back failed");
        var settings = _defaultSettings with
        {
            DefaultStepRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 3),
        };
        var result = outcome switch
        {
            PersistentItemStatus.Completed => ExecutionResult.Success(),
            PersistentItemStatus.Failed => ExecutionResult.CriticalError("fatal"),
            PersistentItemStatus.Requeued => ExecutionResult.RetryableError("transient"),
            PersistentItemStatus.Waiting => ExecutionResult.Defer(TimeSpan.FromMinutes(5)),
            _ => throw new ArgumentOutOfRangeException(nameof(outcome)),
        };
        var handler = CreateHandler(
            MockExecutor(result).Object,
            settings,
            buffer: MockBufferFailing(spans, w => w.Status == outcome, writeBackFailure).Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(outcome, workflow.Status);
        AssertReportedInTheWorkflowTrace(logs, spans.Workflow, writeBackFailure);
        var error = Assert.Single(errors.Measurements);
        Assert.Equal(1, error.Value);
        Assert.Equal("workflow_handling", error.Tags.Single(t => t.Key == TelemetryAttributes.Operation).Value);
    }

    [Fact]
    public async Task Handle_CancelBeforeStartWriteBackThrows_ReportedInWorkflowTrace()
    {
        // The processor cancels the token up front for a pending cancellation; a failure under it is still a failure
        using var listener = ListenToEngineSpans();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var writeBackFailure = new TimeoutException("cancel write-back failed");
        var executor = MockExecutor();
        var handler = CreateHandler(
            executor.Object,
            buffer: MockBufferFailing(spans, w => w.Status == PersistentItemStatus.Canceled, writeBackFailure).Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var workflow = CreateWorkflow(CreateStep());
        workflow.CancellationRequestedAt = DateTimeOffset.UtcNow;

        await handler.Handle(workflow, cts.Token);

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        AssertReportedInTheWorkflowTrace(logs, spans.Workflow, writeBackFailure);
        Assert.Single(logs.Entries, e => e.Level >= LogLevel.Error);
    }

    [Fact]
    public async Task Handle_DependencyFailedWriteBackThrows_ReportedInWorkflowTrace()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var writeBackFailure = new TimeoutException("dependency-failed write-back failed");
        var handler = CreateHandler(
            MockExecutor().Object,
            buffer: MockBufferFailing(
                spans,
                w => w.Status == PersistentItemStatus.DependencyFailed,
                writeBackFailure
            ).Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var failedDependency = CreateWorkflow();
        failedDependency.Status = PersistentItemStatus.Failed;
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Status = PersistentItemStatus.Processing,
            Steps = [CreateStep()],
            Dependencies = [failedDependency],
        };

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.DependencyFailed, workflow.Status);
        AssertReportedInTheWorkflowTrace(logs, spans.Workflow, writeBackFailure);
        Assert.Single(logs.Entries, e => e.Level >= LogLevel.Error);
    }

    [Fact]
    public async Task Handle_ShutdownWriteBackThrows_ReportedInsteadOfTheShutdown()
    {
        // Shutdown mid-step requeues the workflow, and it is that write-back's failure that ends the handling
        using var listener = ListenToEngineSpans();
        using var cts = new CancellationTokenSource();
        var spans = new CapturedSpans();
        using var logs = new TraceCapturingLoggerProvider();
        var writeBackFailure = new TimeoutException("requeue write-back failed");
        var executor = MockExecutorCapturingSpans(
            spans,
            async ct =>
            {
                await cts.CancelAsync();
                ct.ThrowIfCancellationRequested();
                return ExecutionResult.Success();
            }
        );
        var handler = CreateHandler(
            executor.Object,
            buffer: MockBufferFailing(spans, w => w.Status == PersistentItemStatus.Requeued, writeBackFailure).Object,
            logger: logs.CreateLogger<WorkflowHandler>()
        );
        var workflow = CreateWorkflow(CreateStep());

        await handler.Handle(workflow, cts.Token);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        AssertReportedInTheWorkflowTrace(logs, spans.Workflow, writeBackFailure);
        Assert.Single(logs.Entries, e => e.Level >= LogLevel.Error);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_ShutdownMidStep_StepSpanEndsWithItsStatusUnset(bool duringWriteBack)
    {
        // The handler's own cancellation is not an error on the step span, wherever in the attempt it lands: the span
        // ends without a status, as it always has when the executor is canceled. The workflow span names the shutdown
        using var listener = ListenToEngineSpans();
        using var cts = new CancellationTokenSource();
        var spans = new CapturedSpans();
        var executor = MockExecutorCapturingSpans(
            spans,
            async ct =>
            {
                if (!duringWriteBack)
                {
                    await cts.CancelAsync();
                    ct.ThrowIfCancellationRequested();
                }

                return ExecutionResult.Success();
            }
        );
        var buffer = MockBuffer(
            async (w, ct) =>
            {
                if (duringWriteBack && w.Status == PersistentItemStatus.Processing)
                {
                    await cts.CancelAsync();
                    ct.ThrowIfCancellationRequested();
                }
            }
        );
        var handler = CreateHandler(executor.Object, buffer: buffer.Object);
        var step = CreateStep();
        var workflow = CreateWorkflow(step);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => handler.Handle(workflow, cts.Token));

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.True(stepSpan.IsStopped);
        Assert.Null(step.EngineActivity);
        Assert.Equal(ActivityStatusCode.Unset, stepSpan.Status);
        Assert.Null(stepSpan.GetTagItem("error.type"));
        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.Equal(ActivityStatusCode.Error, workflowSpan.Status);
        Assert.Equal("shutdown", workflowSpan.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Handle_LeaseLostAtStepWriteBack_StepSpanEndsInErrorWithLeaseLost()
    {
        using var listener = ListenToEngineSpans();
        var spans = new CapturedSpans();
        var buffer = MockBuffer(
            (w, _) =>
                w.Status == PersistentItemStatus.Processing
                    ? Task.FromException(new LeaseLostException(w.DatabaseId))
                    : Task.CompletedTask
        );
        var handler = CreateHandler(
            MockExecutorCapturingSpans(spans, ExecutionResult.Success()).Object,
            buffer: buffer.Object
        );
        var step = CreateStep();
        var workflow = CreateWorkflow(step);

        await handler.Handle(workflow, TestContext.Current.CancellationToken);

        var stepSpan = Assert.IsType<Activity>(spans.Step);
        Assert.True(stepSpan.IsStopped);
        Assert.Null(step.EngineActivity);
        Assert.Equal(ActivityStatusCode.Error, stepSpan.Status);
        Assert.Equal("lease_lost", stepSpan.GetTagItem("error.type"));
        var workflowSpan = Assert.IsType<Activity>(spans.Workflow);
        Assert.Equal("lease_lost", workflowSpan.GetTagItem("error.type"));
    }

    /// <summary>
    /// Every submission records the entry span: on a path that runs no step, a write-back is the only place to see it.
    /// </summary>
    private static Mock<IWorkflowUpdateBuffer> MockBufferFailing(
        CapturedSpans spans,
        Func<Workflow, bool> fails,
        Exception failure
    ) =>
        MockBuffer(
            (w, _) =>
            {
                spans.Workflow = w.EngineActivity;
                return fails(w) ? Task.FromException(failure) : Task.CompletedTask;
            }
        );

    private static void AssertReportedInTheWorkflowTrace(
        TraceCapturingLoggerProvider logs,
        Activity? capturedWorkflowSpan,
        Exception escaped
    )
    {
        var workflowSpan = Assert.IsType<Activity>(capturedWorkflowSpan);
        Assert.True(workflowSpan.IsStopped);
        Assert.Equal(ActivityStatusCode.Error, workflowSpan.Status);
        Assert.Equal(escaped.Message, workflowSpan.StatusDescription);
        Assert.Equal(escaped.GetType().FullName, workflowSpan.GetTagItem("error.type"));
        Assert.Empty(workflowSpan.Events);

        var errorLog = Assert.Single(logs.Entries, e => ReferenceEquals(e.Exception, escaped));
        Assert.Equal(LogLevel.Error, errorLog.Level);
        Assert.Equal(workflowSpan.TraceId, errorLog.TraceId);
    }

    /// <summary>
    /// Makes <see cref="Metrics.Source"/> create its activities, which it does only while something listens. The
    /// listener is process-wide, so tests read the spans they own off the workflow and step rather than off it.
    /// </summary>
    /// <remarks>
    /// Matches by name: reading <see cref="Metrics.Source"/> here could run its type initializer from inside
    /// the listener registration, which creates the source before the field holding it is set, so the listener
    /// would never attach.
    /// </remarks>
    private static ActivityListener ListenToEngineSpans()
    {
        var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == Metrics.ServiceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
        };
        ActivitySource.AddActivityListener(listener);
        return listener;
    }

    /// <summary>
    /// The spans a workflow and its step had open while the step executed. The handler releases both once it is
    /// done, so they are only reachable through what the executor saw.
    /// </summary>
    private sealed class CapturedSpans
    {
        public Activity? Workflow { get; set; }

        public Activity? Step { get; set; }
    }

    private static Mock<IWorkflowExecutor> MockExecutorCapturingSpans(CapturedSpans spans, ExecutionResult result) =>
        MockExecutorCapturingSpans(spans, _ => Task.FromResult(result));

    private static Mock<IWorkflowExecutor> MockExecutorCapturingSpans(
        CapturedSpans spans,
        Func<CancellationToken, Task<ExecutionResult>> execute
    )
    {
        var mock = new Mock<IWorkflowExecutor>();
        mock.Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
            .Returns(
                (Workflow workflow, Step step, CancellationToken ct) =>
                {
                    spans.Workflow = workflow.EngineActivity;
                    spans.Step = step.EngineActivity;
                    return execute(ct);
                }
            );

        return mock;
    }
}
