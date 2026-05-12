using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

[Collection("BackgroundServiceTests")]
public class WorkflowUpdateBufferTests
{
    private static EngineSettings CreateSettings(int maxBatchSize = 3, int maxQueueSize = 50) =>
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
            WriteBuffer = new WriteBufferSettings
            {
                MaxBatchSize = 10,
                MaxQueueSize = 50,
                FlushConcurrency = 2,
            },
            UpdateBuffer = new UpdateBufferSettings { MaxBatchSize = maxBatchSize, MaxQueueSize = maxQueueSize },
        };

    private static (WorkflowUpdateBuffer Buffer, Mock<IEngineRepository> Repo) CreateBuffer(
        EngineSettings? settings = null
    )
    {
        settings ??= CreateSettings();
        var repo = new Mock<IEngineRepository>();

        var services = new ServiceCollection();
        services.AddSingleton(repo.Object);
        var provider = services.BuildServiceProvider();

        var scopeFactory = new Mock<IServiceScopeFactory>();
        var scope = new Mock<IServiceScope>();
        scope.Setup(s => s.ServiceProvider).Returns(provider);
        scope.Setup(s => s.Dispose());
        scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);

        var buffer = new WorkflowUpdateBuffer(
            scopeFactory.Object,
            NullLogger<WorkflowUpdateBuffer>.Instance,
            Options.Create(settings)
        );

        return (buffer, repo);
    }

    private static Workflow CreateTestWorkflow(string operationId = "test-op", int stepCount = 1)
    {
        var steps = Enumerable
            .Range(0, stepCount)
            .Select(i => new Step
            {
                OperationId = $"{operationId}-step-{i}",
                ProcessingOrder = i,
                Command = CommandDefinition.Create("webhook"),
                Status = PersistentItemStatus.Completed,
            })
            .ToList();

        return new Workflow
        {
            DatabaseId = Guid.NewGuid(),
            OperationId = operationId,
            IdempotencyKey = $"idem-{operationId}",
            Namespace = "test-ns",
            Status = PersistentItemStatus.Completed,
            Steps = steps,
        };
    }

    /// <summary>
    /// Sets up the mock to complete successfully, optionally blocking on a gate before returning.
    /// </summary>
    private static void SetupMockSuccess(Mock<IEngineRepository> repo, TaskCompletionSource? gate = null)
    {
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BatchWorkflowStatusUpdate> _, CancellationToken _) =>
                {
                    if (gate is not null)
                        await gate.Task;
                    return new BatchUpdateResult([], []);
                }
            );
    }

    [Fact]
    public async Task Submit_SingleWorkflow_FlushesToRepository()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockSuccess(repo);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var workflow = CreateTestWorkflow();
            await buffer.Submit(workflow, TestContext.Current.CancellationToken, dirtySteps: workflow.Steps);

            repo.Verify(
                r =>
                    r.BatchUpdateWorkflowsAndSteps(
                        It.Is<IReadOnlyList<BatchWorkflowStatusUpdate>>(b => b.Count == 1 && b[0].Workflow == workflow),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_OnlyExplicitDirtyStepsForwardedToRepository()
    {
        var (buffer, repo) = CreateBuffer();

        IReadOnlyList<BatchWorkflowStatusUpdate>? capturedUpdates = null;
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<IReadOnlyList<BatchWorkflowStatusUpdate>, CancellationToken>(
                (updates, _) => capturedUpdates = updates
            )
            .Returns(Task.FromResult(new BatchUpdateResult([], [])));

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            // Workflow has 2 steps but only 1 is passed as dirty
            var workflow = CreateTestWorkflow(stepCount: 2);
            Assert.Equal(2, workflow.Steps.Count);

            var dirtyStep = workflow.Steps[0];
            await buffer.Submit(workflow, TestContext.Current.CancellationToken, dirtySteps: [dirtyStep]);

            Assert.NotNull(capturedUpdates);
            var update = Assert.Single(capturedUpdates);
            Assert.Single(update.DirtySteps);
            Assert.Same(dirtyStep, update.DirtySteps[0]);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_MultipleConcurrent_BatchedTogether()
    {
        // Use a gate to block the first flush so items accumulate in the channel
        var settings = CreateSettings(maxBatchSize: 10);
        var (buffer, repo) = CreateBuffer(settings);

        var batchSizes = new List<int>();
        var gate = new TaskCompletionSource();
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BatchWorkflowStatusUpdate> updates, CancellationToken _) =>
                {
                    lock (batchSizes)
                    {
                        batchSizes.Add(updates.Count);
                    }
                    await gate.Task;
                    return new BatchUpdateResult([], []);
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var tasks = Enumerable
                .Range(1, 5)
                .Select(i => buffer.Submit(CreateTestWorkflow($"op-{i}"), TestContext.Current.CancellationToken))
                .ToList();

            // Release the gate — all items process
            gate.SetResult();

            await Task.WhenAll(tasks);

            var totalFlushed = batchSizes.Sum();
            Assert.Equal(5, totalFlushed);
            Assert.True(
                batchSizes.Count < 5,
                $"Expected batching to reduce call count below 5, but got {batchSizes.Count} calls: [{string.Join(", ", batchSizes)}]"
            );
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_RepositoryThrows_PropagatesExceptionToCallers()
    {
        var (buffer, repo) = CreateBuffer();

        var expectedException = new InvalidOperationException("DB write failed");
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(expectedException);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var workflow = CreateTestWorkflow();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                buffer.Submit(workflow, TestContext.Current.CancellationToken)
            );
            Assert.Same(expectedException, ex);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_AlreadyCanceledToken_ThrowsImmediately()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockSuccess(repo);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            // Use an already-canceled token — Submit should throw immediately
            using var cts = new CancellationTokenSource();
            await cts.CancelAsync();

            var workflow = CreateTestWorkflow("canceled-op");
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => buffer.Submit(workflow, cts.Token));

            // Non-canceled request should still work
            var workflow2 = CreateTestWorkflow("kept-op");
            await buffer.Submit(workflow2, TestContext.Current.CancellationToken);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_CanceledWhileWaitingForFlush_ThrowsOperationCanceledException()
    {
        var settings = CreateSettings();
        var (buffer, repo) = CreateBuffer(settings);

        // Use a gate to hold the flush loop so we can cancel before it completes
        var gate = new TaskCompletionSource();
        SetupMockSuccess(repo, gate);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            using var cts = new CancellationTokenSource();
            var workflow = CreateTestWorkflow("canceled-op");
            var canceledTask = buffer.Submit(workflow, cts.Token);

            // Cancel while the flush is blocked on the gate
            await cts.CancelAsync();

            // Release the gate
            gate.SetResult();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => canceledTask);

            // Non-canceled request should still work
            var workflow2 = CreateTestWorkflow("kept-op");
            await buffer.Submit(workflow2, TestContext.Current.CancellationToken);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Shutdown_DrainsRemainingItems()
    {
        var settings = CreateSettings(maxBatchSize: 100);
        var (buffer, repo) = CreateBuffer(settings);

        var flushCount = 0;
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<IReadOnlyList<BatchWorkflowStatusUpdate>, CancellationToken>(
                (updates, _) => Interlocked.Add(ref flushCount, updates.Count)
            )
            .Returns(Task.FromResult(new BatchUpdateResult([], [])));

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var tasks = Enumerable
                .Range(1, 5)
                .Select(i => buffer.Submit(CreateTestWorkflow($"drain-{i}"), TestContext.Current.CancellationToken))
                .ToList();

            // Wait for all items to be flushed
            await Task.WhenAll(tasks);

            Assert.Equal(5, flushCount);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_DeduplicatesSameWorkflowInBatch()
    {
        var settings = CreateSettings(maxBatchSize: 10);
        var (buffer, repo) = CreateBuffer(settings);

        IReadOnlyList<BatchWorkflowStatusUpdate>? capturedUpdates = null;
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<IReadOnlyList<BatchWorkflowStatusUpdate>, CancellationToken>(
                (updates, _) => capturedUpdates ??= updates
            )
            .Returns(Task.FromResult(new BatchUpdateResult([], [])));

        using var serviceCts = new CancellationTokenSource();

        try
        {
            // Submit 3 updates for the same workflow *before* starting the buffer. With a bounded
            // channel that has capacity, WriteAsync completes synchronously, so all 3 items land
            // in the channel before the drain loop runs. Starting the buffer then picks them up
            // together, which is the only way to reliably exercise the in-batch dedup path
            // without racing the reader's Task.Yield() against the test thread's submits.
            var sharedId = Guid.NewGuid();
            var tasks = Enumerable
                .Range(1, 3)
                .Select(i =>
                {
                    var wf = CreateTestWorkflow($"dedup-{i}");
                    wf.DatabaseId = sharedId;
                    wf.Status = i == 3 ? PersistentItemStatus.Completed : PersistentItemStatus.Processing;
                    return buffer.Submit(wf, TestContext.Current.CancellationToken);
                })
                .ToList();

            await buffer.StartAsync(serviceCts.Token);

            await Task.WhenAll(tasks);

            // Only 1 item should have been flushed (the last update for the shared workflow)
            Assert.NotNull(capturedUpdates);
            var update = Assert.Single(capturedUpdates);
            Assert.Equal(sharedId, update.Workflow.DatabaseId);
            Assert.Equal(PersistentItemStatus.Completed, update.Workflow.Status);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_RejectedByRepo_FaultsCallerWithLeaseLostException()
    {
        var (buffer, repo) = CreateBuffer();

        var workflow = CreateTestWorkflow();

        // Repo reports the workflow as rejected — its lease was reclaimed by another host.
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.FromResult(new BatchUpdateResult([], [workflow.DatabaseId])));

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var ex = await Assert.ThrowsAsync<LeaseLostException>(() =>
                buffer.Submit(workflow, TestContext.Current.CancellationToken)
            );
            Assert.Equal(workflow.DatabaseId, ex.WorkflowId);
        }
        finally
        {
            await serviceCts.CancelAsync();
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_CtCancelsAfterFlushBegins_ObservesOCE_NotLeaseLost()
    {
        // Regression guard for the cancel-then-reject race. Once a batch has been handed to
        // the repo, the Submit's ct.Register(() => tcs.TrySetCanceled(ct)) can still fire. If
        // the repo then reports this id as rejected, the buffer's tcs.TrySetException(LLE)
        // must not replace the already-terminal canceled TCS. Submit order documents this as
        // "register cancellation before writing" — this test pins the observable contract.
        var (buffer, repo) = CreateBuffer();
        var workflow = CreateTestWorkflow();

        var mockInvoked = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BatchWorkflowStatusUpdate> _, CancellationToken _) =>
                {
                    mockInvoked.TrySetResult();
                    await releaseGate.Task;
                    // Reject the id after we're released — this is when the buffer would try to
                    // set the LeaseLostException on a tcs that the ct.Register has already canceled.
                    return new BatchUpdateResult([], [workflow.DatabaseId]);
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);
        using var cancelSource = new CancellationTokenSource();

        try
        {
            var submitTask = buffer.Submit(workflow, cancelSource.Token);

            // Wait until the batch is inside the repo mock — the pre-flush cancellation filter
            // has already run at this point, so the only remaining way for the tcs to complete
            // is via ct.Register (cancel) or via the post-flush rejection loop (LeaseLost).
            await mockInvoked.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

            // Fire the cancellation while the mock is still blocked.
            await cancelSource.CancelAsync();

            // Now let the mock return with the id in the rejected set. The buffer will try
            // TrySetException(LeaseLostException), but the tcs is already terminal-canceled.
            releaseGate.TrySetResult();

            // ThrowsAnyAsync — the actual exception is TaskCanceledException (an OCE subclass)
            // raised by `await tcs.Task` after the register callback canceled the TCS.
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => submitTask);
        }
        finally
        {
            // Unblock the mock if the test bailed before releasing.
            releaseGate.TrySetResult();
            await serviceCts.CancelAsync();
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Submit_MixedBatch_FaultsOnlyRejectedCallers()
    {
        var (buffer, repo) = CreateBuffer();

        var accepted = CreateTestWorkflow("accepted");
        var rejected = CreateTestWorkflow("rejected");

        repo.Setup(r =>
                r.BatchUpdateWorkflowsAndSteps(
                    It.IsAny<IReadOnlyList<BatchWorkflowStatusUpdate>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns<IReadOnlyList<BatchWorkflowStatusUpdate>, CancellationToken>(
                (updates, _) =>
                {
                    var acceptedIds = updates
                        .Where(u => u.Workflow.OperationId == "accepted")
                        .Select(u => u.Workflow.DatabaseId)
                        .ToList();
                    var rejectedIds = updates
                        .Where(u => u.Workflow.OperationId == "rejected")
                        .Select(u => u.Workflow.DatabaseId)
                        .ToList();
                    return Task.FromResult(new BatchUpdateResult(acceptedIds, rejectedIds));
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var acceptTask = buffer.Submit(accepted, TestContext.Current.CancellationToken);
            var rejectTask = buffer.Submit(rejected, TestContext.Current.CancellationToken);

            await acceptTask;
            var ex = await Assert.ThrowsAsync<LeaseLostException>(() => rejectTask);
            Assert.Equal(rejected.DatabaseId, ex.WorkflowId);
        }
        finally
        {
            await serviceCts.CancelAsync();
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }
}
