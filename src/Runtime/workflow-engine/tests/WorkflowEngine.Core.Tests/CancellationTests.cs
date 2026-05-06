using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for cancellation behavior in <see cref="WorkflowHandler"/> and <see cref="InFlightTracker"/>.
/// </summary>
public class CancellationTests
{
    #region Helpers

    private static WorkflowHandler CreateHandler(IWorkflowExecutor executor, EngineSettings? settings = null)
    {
        settings ??= DefaultSettings();

        var buffer = new Mock<IWorkflowUpdateBuffer>();
        buffer
            .Setup(b =>
                b.Submit(
                    It.IsAny<Workflow>(),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<IReadOnlyList<Step>?>(),
                    It.IsAny<string?>(),
                    It.IsAny<Activity?>()
                )
            )
            .Returns(Task.CompletedTask);

        return new WorkflowHandler(
            executor,
            buffer.Object,
            Options.Create(settings),
            TimeProvider.System,
            NullLogger<WorkflowHandler>.Instance
        );
    }

    private static EngineSettings DefaultSettings() =>
        new()
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
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

    private static Step CreateStep(string operationId = "step", int processingOrder = 0) =>
        new()
        {
            OperationId = operationId,
            ProcessingOrder = processingOrder,
            Command = CommandDefinition.Create("webhook"),
        };

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

    /// <summary>
    /// Creates a mock executor where the specified step index cancels the CTS and throws
    /// <see cref="OperationCanceledException"/>. If a <paramref name="workflow"/> is provided,
    /// its <see cref="Workflow.CancellationRequestedAt"/> is stamped before cancellation
    /// (simulating <see cref="InFlightTracker.TryCancel(System.Guid)"/>). If null, only the CTS is
    /// cancelled (simulating host shutdown).
    /// </summary>
    private static Mock<IWorkflowExecutor> MockExecutorWithCancellation(
        CancellationTokenSource cts,
        Workflow? workflow,
        int cancelAtStepIndex = 0
    )
    {
        var mock = new Mock<IWorkflowExecutor>();
        var callIndex = 0;

        mock.Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
            .Returns<Workflow, Step, CancellationToken>(
                async (_, _, ct) =>
                {
                    var idx = callIndex++;
                    if (idx == cancelAtStepIndex)
                    {
                        // Simulate InFlightTracker.TryCancel: stamp the flag, then cancel the CTS
                        if (workflow is not null)
                        {
                            workflow.CancellationRequestedAt ??= DateTimeOffset.UtcNow;
                        }

                        await cts.CancelAsync();
                        ct.ThrowIfCancellationRequested();
                    }
                    return ExecutionResult.Success();
                }
            );

        return mock;
    }

    #endregion

    // ─── WorkflowHandler cancellation tests ──────────────────────────────

    [Fact]
    public async Task Handle_CancellationRequestedBeforeProcessing_WorkflowCanceled()
    {
        var executor = MockExecutor();
        var handler = CreateHandler(executor.Object);
        var step = CreateStep();
        var workflow = CreateWorkflow(step);
        workflow.CancellationRequestedAt = DateTimeOffset.UtcNow;

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        // Steps should not have been executed
        executor.Verify(
            e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Handle_CancellationRequestedBeforeProcessing_StepsRemainEnqueued()
    {
        var executor = MockExecutor();
        var handler = CreateHandler(executor.Object);
        var step0 = CreateStep("step-0", processingOrder: 0);
        var step1 = CreateStep("step-1", processingOrder: 1);
        var workflow = CreateWorkflow(step0, step1);
        workflow.CancellationRequestedAt = DateTimeOffset.UtcNow;

        await handler.Handle(workflow, CancellationToken.None);

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        Assert.All(workflow.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
    }

    [Fact]
    public async Task Handle_CancellationDuringStep_WorkflowCanceled()
    {
        using var cts = new CancellationTokenSource();
        var step = CreateStep();
        var workflow = CreateWorkflow(step);
        var executor = MockExecutorWithCancellation(cts, workflow, cancelAtStepIndex: 0);
        var handler = CreateHandler(executor.Object);

        await Assert.ThrowsAsync<OperationCanceledException>(() => handler.Handle(workflow, cts.Token));

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        Assert.Equal(PersistentItemStatus.Canceled, step.Status);
    }

    [Fact]
    public async Task Handle_HostShutdownDuringStep_WorkflowRequeued()
    {
        using var cts = new CancellationTokenSource();
        var step = CreateStep();
        var workflow = CreateWorkflow(step);
        // Pass null workflow — CancellationRequestedAt stays null (simulates host shutdown, not explicit cancel)
        var executor = MockExecutorWithCancellation(cts, workflow: null, cancelAtStepIndex: 0);
        var handler = CreateHandler(executor.Object);

        await Assert.ThrowsAsync<OperationCanceledException>(() => handler.Handle(workflow, cts.Token));

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);
        Assert.Equal(PersistentItemStatus.Requeued, step.Status);
    }

    [Fact]
    public async Task Handle_CancellationDuringSecondStep_FirstCompleted_SecondCanceled()
    {
        using var cts = new CancellationTokenSource();
        var step0 = CreateStep("step-0", processingOrder: 0);
        var step1 = CreateStep("step-1", processingOrder: 1);
        var workflow = CreateWorkflow(step0, step1);
        var executor = MockExecutorWithCancellation(cts, workflow, cancelAtStepIndex: 1);
        var handler = CreateHandler(executor.Object);

        await Assert.ThrowsAsync<OperationCanceledException>(() => handler.Handle(workflow, cts.Token));

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        Assert.Equal(PersistentItemStatus.Completed, step0.Status);
        Assert.Equal(PersistentItemStatus.Canceled, step1.Status);
    }

    // ─── InFlightTracker cancellation tests ──────────────────────────────

    [Fact]
    public void TryCancel_SetsWorkflowCancellationRequestedAt()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var workflow = CreateWorkflow(CreateStep());
        var id = Guid.NewGuid();
        using var cts = new CancellationTokenSource();

        tracker.TryAdd(id, cts, workflow);

        Assert.Null(workflow.CancellationRequestedAt);

        var result = tracker.TryCancel(id);

        Assert.True(result);
        Assert.NotNull(workflow.CancellationRequestedAt);
        Assert.True(cts.IsCancellationRequested);
    }

    [Fact]
    public void TryCancel_DoesNotOverwriteExistingTimestamp()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var workflow = CreateWorkflow(CreateStep());
        var originalTimestamp = DateTimeOffset.UtcNow.AddMinutes(-5);
        workflow.CancellationRequestedAt = originalTimestamp;
        var id = Guid.NewGuid();
        using var cts = new CancellationTokenSource();

        tracker.TryAdd(id, cts, workflow);
        tracker.TryCancel(id);

        Assert.Equal(originalTimestamp, workflow.CancellationRequestedAt);
    }

    [Fact]
    public void TryCancel_WorkflowNotInTracker_ReturnsFalse()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var result = tracker.TryCancel(Guid.NewGuid());
        Assert.False(result);
    }

    [Fact]
    public void TryCancel_AfterRemoval_ReturnsFalse()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var workflow = CreateWorkflow(CreateStep());
        var id = Guid.NewGuid();
        using var cts = new CancellationTokenSource();

        tracker.TryAdd(id, cts, workflow);
        tracker.Remove(id);

        var result = tracker.TryCancel(id);
        Assert.False(result);
    }

    [Fact]
    public void CancelMany_CancelsAllPresentWorkflows()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var workflow1 = CreateWorkflow(CreateStep());
        var workflow2 = CreateWorkflow(CreateStep());
        var workflow3 = CreateWorkflow(CreateStep());
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        using var cts1 = new CancellationTokenSource();
        using var cts2 = new CancellationTokenSource();
        using var cts3 = new CancellationTokenSource();

        tracker.TryAdd(id1, cts1, workflow1);
        tracker.TryAdd(id2, cts2, workflow2);
        tracker.TryAdd(id3, cts3, workflow3);

        // Cancel only 1 and 3
        tracker.TryCancel([id1, id3]);

        Assert.True(cts1.IsCancellationRequested);
        Assert.False(cts2.IsCancellationRequested);
        Assert.True(cts3.IsCancellationRequested);

        Assert.NotNull(workflow1.CancellationRequestedAt);
        Assert.Null(workflow2.CancellationRequestedAt);
        Assert.NotNull(workflow3.CancellationRequestedAt);
    }

    [Fact]
    public void TryCancel_DisposedCts_DoesNotThrow()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var workflow = CreateWorkflow(CreateStep());
        var id = Guid.NewGuid();
        var cts = new CancellationTokenSource();

        tracker.TryAdd(id, cts, workflow);

        // Simulate worker finishing and disposing CTS without removing from tracker (race condition)
        cts.Dispose();

        // Should not throw — ObjectDisposedException is caught
        var result = tracker.TryCancel(id);
        Assert.True(result);
        Assert.NotNull(workflow.CancellationRequestedAt);
    }
}
