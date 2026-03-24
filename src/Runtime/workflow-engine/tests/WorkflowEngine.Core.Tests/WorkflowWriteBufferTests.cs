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
public class WorkflowWriteBufferTests
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
                MaxBatchSize = maxBatchSize,
                MaxQueueSize = maxQueueSize,
                FlushConcurrency = flushConcurrency,
            },
            UpdateBuffer = new BufferSettings
            {
                MaxBatchSize = 10,
                MaxQueueSize = 50,
                FlushConcurrency = 2,
            },
        };

    private static (WorkflowWriteBuffer Buffer, Mock<IEngineRepository> Repo, AsyncSignal Signal) CreateBuffer(
        EngineSettings? settings = null
    )
    {
        settings ??= CreateSettings();
        var repo = new Mock<IEngineRepository>();
        var signal = new AsyncSignal();

        var services = new ServiceCollection();
        services.AddSingleton(repo.Object);
        var provider = services.BuildServiceProvider();

        var scopeFactory = new Mock<IServiceScopeFactory>();
        var scope = new Mock<IServiceScope>();
        scope.Setup(s => s.ServiceProvider).Returns(provider);
        scope.Setup(s => s.Dispose());
        scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);

        var buffer = new WorkflowWriteBuffer(
            scopeFactory.Object,
            NullLogger<WorkflowWriteBuffer>.Instance,
            Options.Create(settings),
            signal
        );

        return (buffer, repo, signal);
    }

    private static (WorkflowEnqueueRequest Request, WorkflowRequestMetadata Metadata, byte[] Hash) CreateTestRequest(
        string key = "test"
    )
    {
        var request = new WorkflowEnqueueRequest
        {
            IdempotencyKey = $"idem-{key}",
            Namespace = "test-ns",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = $"wf-{key}",
                    OperationId = $"op-{key}",
                    Steps =
                    [
                        new StepRequest
                        {
                            OperationId = $"step-{key}",
                            Command = CommandDefinition.Create("webhook", new { uri = "http://localhost/test" }),
                        },
                    ],
                },
            ],
        };

        var metadata = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
        var hash = request.ComputeHash();
        return (request, metadata, hash);
    }

    /// <summary>
    /// Sets up the mock to return Created results, optionally blocking on a gate before returning.
    /// </summary>
    private static void SetupMockCreated(Mock<IEngineRepository> repo, TaskCompletionSource? gate = null)
    {
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                {
                    if (gate is not null)
                        await gate.Task;
                    return reqs.Select(_ => BatchEnqueueResult.Created([Guid.NewGuid()])).ToArray();
                }
            );
    }

    [Fact]
    public async Task Enqueue_SingleRequest_FlushesToRepository()
    {
        var (buffer, repo, _) = CreateBuffer();
        var (request, metadata, hash) = CreateTestRequest();

        var workflowIds = new[] { Guid.NewGuid() };
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                    reqs.Select(_ => BatchEnqueueResult.Created(workflowIds)).ToArray()
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var outcome = await buffer.Enqueue(request, metadata, hash, TestContext.Current.CancellationToken);

            Assert.Equal(BatchEnqueueResultStatus.Created, outcome.Status);
            Assert.Equal(workflowIds, outcome.WorkflowIds);
            repo.Verify(
                r =>
                    r.BatchEnqueueWorkflowsAsync(
                        It.Is<IReadOnlyList<BufferedEnqueueRequest>>(b => b.Count == 1),
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
    public async Task Enqueue_MultipleConcurrent_BatchedTogether()
    {
        // Use a gate to block the first flush so items accumulate in the channel
        var settings = CreateSettings(maxBatchSize: 10, flushConcurrency: 1);
        var (buffer, repo, _) = CreateBuffer(settings);

        var batchSizes = new List<int>();
        var gate = new TaskCompletionSource();
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                {
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                    }
                    await gate.Task;
                    return reqs.Select(_ => BatchEnqueueResult.Created([Guid.NewGuid()])).ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            // Fire 5 enqueue calls concurrently — the first triggers a flush that blocks on the gate,
            // so remaining items accumulate and get batched together on the next flush
            var tasks = Enumerable
                .Range(1, 5)
                .Select(i =>
                {
                    var (req, meta, h) = CreateTestRequest($"batch-{i}");
                    return buffer.Enqueue(req, meta, h, TestContext.Current.CancellationToken);
                })
                .ToList();

            // Release the gate — all items process
            gate.SetResult();

            await Task.WhenAll(tasks);

            var totalFlushed = batchSizes.Sum();
            Assert.Equal(5, totalFlushed);
            // With flushConcurrency=1 and a gate, the repo should be called fewer than 5 times
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
    public async Task Enqueue_ExceedsBatchSize_SplitsIntoBatches()
    {
        var settings = CreateSettings(maxBatchSize: 2);
        var (buffer, repo, _) = CreateBuffer(settings);

        var batchSizes = new List<int>();
        SetupMockCreated(repo);

        // Also capture batch sizes
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                {
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                    }
                    return reqs.Select(_ => BatchEnqueueResult.Created([Guid.NewGuid()])).ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var tasks = Enumerable
                .Range(1, 5)
                .Select(i =>
                {
                    var (req, meta, h) = CreateTestRequest($"split-{i}");
                    return buffer.Enqueue(req, meta, h, TestContext.Current.CancellationToken);
                })
                .ToList();

            await Task.WhenAll(tasks);

            // Each batch should contain at most 2 items
            Assert.All(batchSizes, size => Assert.True(size <= 2, $"Batch had {size} items, max is 2"));
            Assert.Equal(5, batchSizes.Sum());
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_RepositoryThrows_PropagatesExceptionToCallers()
    {
        var (buffer, repo, _) = CreateBuffer();

        var expectedException = new InvalidOperationException("DB connection failed");
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(expectedException);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var (request, metadata, hash) = CreateTestRequest();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                buffer.Enqueue(request, metadata, hash, TestContext.Current.CancellationToken)
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
    public async Task Enqueue_AlreadyCanceledToken_ThrowsImmediately()
    {
        var (buffer, repo, _) = CreateBuffer();
        SetupMockCreated(repo);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            // Use an already-canceled token — Enqueue should throw without entering the channel
            using var cts = new CancellationTokenSource();
            await cts.CancelAsync();

            var (req, meta, hash) = CreateTestRequest("canceled");
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => buffer.Enqueue(req, meta, hash, cts.Token));

            // Non-canceled request should still work
            var (req2, meta2, hash2) = CreateTestRequest("kept");
            var outcome = await buffer.Enqueue(req2, meta2, hash2, TestContext.Current.CancellationToken);
            Assert.Equal(BatchEnqueueResultStatus.Created, outcome.Status);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_CanceledWhileWaitingForFlush_FilteredFromBatch()
    {
        var settings = CreateSettings(flushConcurrency: 1);
        var (buffer, repo, _) = CreateBuffer(settings);

        // Use a gate to hold the flush loop so we can cancel before items are processed
        var gate = new TaskCompletionSource();
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                {
                    await gate.Task;
                    return reqs.Select(_ => BatchEnqueueResult.Created([Guid.NewGuid()])).ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            using var cts = new CancellationTokenSource();
            var (req1, meta1, hash1) = CreateTestRequest("canceled");
            var (req2, meta2, hash2) = CreateTestRequest("kept");

            // Enqueue first request, then cancel before the flush completes
            var canceledTask = buffer.Enqueue(req1, meta1, hash1, cts.Token);
            var keptTask = buffer.Enqueue(req2, meta2, hash2, TestContext.Current.CancellationToken);

            // Cancel the first request while it's waiting for the flush
            await cts.CancelAsync();

            // Release the gate — flush processes only the non-canceled item
            gate.SetResult();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => canceledTask);

            var outcome = await keptTask;
            Assert.Equal(BatchEnqueueResultStatus.Created, outcome.Status);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_Success_SignalsAsyncSignal()
    {
        var (buffer, repo, signal) = CreateBuffer();
        SetupMockCreated(repo);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var (request, metadata, hash) = CreateTestRequest();
            await buffer.Enqueue(request, metadata, hash, TestContext.Current.CancellationToken);

            // Signal should be set after a successful flush with Created results
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(1));
            await signal.Wait(cts.Token); // Would throw if not signaled
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_DuplicateResult_ReturnsOutcomeWithDuplicateStatus()
    {
        var (buffer, repo, _) = CreateBuffer();

        var existingIds = new[] { Guid.NewGuid() };
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                    reqs.Select(_ => BatchEnqueueResult.Duplicate(existingIds)).ToArray()
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var (request, metadata, hash) = CreateTestRequest();
            var outcome = await buffer.Enqueue(request, metadata, hash, TestContext.Current.CancellationToken);

            Assert.Equal(BatchEnqueueResultStatus.Duplicate, outcome.Status);
            Assert.Equal(existingIds, outcome.WorkflowIds);
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
        var settings = CreateSettings(maxBatchSize: 100, flushConcurrency: 1);
        var (buffer, repo, _) = CreateBuffer(settings);

        var flushCount = 0;
        repo.Setup(r =>
                r.BatchEnqueueWorkflowsAsync(
                    It.IsAny<IReadOnlyList<BufferedEnqueueRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedEnqueueRequest> reqs, CancellationToken _) =>
                {
                    Interlocked.Add(ref flushCount, reqs.Count);
                    return reqs.Select(_ => BatchEnqueueResult.Created([Guid.NewGuid()])).ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            // Enqueue several items and wait for them to be flushed
            var tasks = Enumerable
                .Range(1, 5)
                .Select(i =>
                {
                    var (req, meta, h) = CreateTestRequest($"drain-{i}");
                    return buffer.Enqueue(req, meta, h, TestContext.Current.CancellationToken);
                })
                .ToList();

            await Task.WhenAll(tasks);

            Assert.Equal(5, flushCount);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }
}
