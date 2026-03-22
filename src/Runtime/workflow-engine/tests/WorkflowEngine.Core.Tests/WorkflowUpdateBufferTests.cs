using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

[Collection("BackgroundServiceTests")]
public class WorkflowUpdateBufferTests
{
    private static EngineSettings CreateSettings(
        int maxBatchSize = 3,
        int maxQueueSize = 50,
        int flushConcurrency = 2
    ) =>
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
            WriteBuffer = new BufferSettings
            {
                MaxBatchSize = 10,
                MaxQueueSize = 50,
                FlushConcurrency = 2,
            },
            UpdateBuffer = new BufferSettings
            {
                MaxBatchSize = maxBatchSize,
                MaxQueueSize = maxQueueSize,
                FlushConcurrency = flushConcurrency,
            },
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

    private static Workflow CreateTestWorkflow(
        string operationId = "test-op",
        bool withDirtyStep = true,
        bool withCleanStep = false
    )
    {
        var steps = new List<Step>();

        if (withDirtyStep)
        {
            steps.Add(
                new Step
                {
                    OperationId = $"{operationId}-step-dirty",
                    IdempotencyKey = $"key-{operationId}-dirty",
                    ProcessingOrder = 0,
                    Command = CommandDefinition.Create("webhook"),
                    Status = PersistentItemStatus.Completed,
                    HasPendingChanges = true,
                }
            );
        }

        if (withCleanStep)
        {
            steps.Add(
                new Step
                {
                    OperationId = $"{operationId}-step-clean",
                    IdempotencyKey = $"key-{operationId}-clean",
                    ProcessingOrder = 1,
                    Command = CommandDefinition.Create("webhook"),
                    Status = PersistentItemStatus.Enqueued,
                    HasPendingChanges = false,
                }
            );
        }

        return new Workflow
        {
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
                }
            );
    }

    [Fact]
    public async Task Submit_SingleWorkflow_FlushesToRepository()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockSuccess(repo);

        await buffer.StartAsync(TestContext.Current.CancellationToken);

        try
        {
            var workflow = CreateTestWorkflow();
            await buffer.Submit(workflow, TestContext.Current.CancellationToken);

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
            await buffer.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task Submit_OnlyDirtyStepsIncluded()
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
            .Returns(Task.CompletedTask);

        await buffer.StartAsync(TestContext.Current.CancellationToken);

        try
        {
            // Workflow has 1 dirty step and 1 clean step
            var workflow = CreateTestWorkflow(withDirtyStep: true, withCleanStep: true);
            Assert.Equal(2, workflow.Steps.Count);

            await buffer.Submit(workflow, TestContext.Current.CancellationToken);

            Assert.NotNull(capturedUpdates);
            var update = Assert.Single(capturedUpdates);
            var dirtyStep = Assert.Single(update.DirtySteps);
            Assert.True(dirtyStep.HasPendingChanges);
        }
        finally
        {
            await buffer.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task Submit_MultipleConcurrent_BatchedTogether()
    {
        // Use a gate to block the first flush so items accumulate in the channel
        var settings = CreateSettings(maxBatchSize: 10, flushConcurrency: 1);
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
                }
            );

        await buffer.StartAsync(TestContext.Current.CancellationToken);

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
            await buffer.StopAsync(CancellationToken.None);
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

        await buffer.StartAsync(TestContext.Current.CancellationToken);

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
            await buffer.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task Submit_AlreadyCanceledToken_ThrowsImmediately()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockSuccess(repo);

        await buffer.StartAsync(TestContext.Current.CancellationToken);

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
            await buffer.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task Submit_CanceledWhileWaitingForFlush_ThrowsOperationCanceledException()
    {
        var settings = CreateSettings(flushConcurrency: 1);
        var (buffer, repo) = CreateBuffer(settings);

        // Use a gate to hold the flush loop so we can cancel before it completes
        var gate = new TaskCompletionSource();
        SetupMockSuccess(repo, gate);

        await buffer.StartAsync(TestContext.Current.CancellationToken);

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
            await buffer.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task Shutdown_DrainsRemainingItems()
    {
        var settings = CreateSettings(maxBatchSize: 100, flushConcurrency: 1);
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
            .Returns(Task.CompletedTask);

        await buffer.StartAsync(TestContext.Current.CancellationToken);

        var tasks = Enumerable
            .Range(1, 5)
            .Select(i => buffer.Submit(CreateTestWorkflow($"drain-{i}"), TestContext.Current.CancellationToken))
            .ToList();

        // Stop should drain all pending items
        await buffer.StopAsync(CancellationToken.None);

        await Task.WhenAll(tasks);

        Assert.Equal(5, flushCount);
    }
}
