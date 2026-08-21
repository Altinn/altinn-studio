using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Tests;

[Collection("BackgroundServiceTests")]
public class MailboxDeliveryBufferTests
{
    private const int MaxLogLength = 42;

    /// <summary>
    /// A payload length that makes three requests exceed the buffer's 4 MiB payload budget while two stay under
    /// it, with margin on both sides so a split is the budget's doing and not a boundary's.
    /// </summary>
    private const int BudgetSplittingPayloadUnits = 1_500_000;

    private static EngineSettings CreateSettings(
        int maxBatchSize = 10,
        int maxQueueSize = 50,
        int flushConcurrency = 2
    ) =>
        new()
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
            MaxMailboxLogLength = MaxLogLength,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            Concurrency = new ConcurrencySettings
            {
                MaxWorkers = 5,
                MaxDbOperations = 5,
                MaxHttpCalls = 5,
            },
            MailboxBuffers = new MailboxBufferSettings
            {
                Delivery = new BatchBufferSettings
                {
                    MaxBatchSize = maxBatchSize,
                    MaxQueueSize = maxQueueSize,
                    FlushConcurrency = flushConcurrency,
                },
            },
        };

    private static (MailboxDeliveryBuffer Buffer, Mock<IEngineRepository> Repo) CreateBuffer(
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

        var buffer = new MailboxDeliveryBuffer(
            scopeFactory.Object,
            NullLogger<MailboxDeliveryBuffer>.Instance,
            Options.Create(settings)
        );

        return (buffer, repo);
    }

    private static Task<MailboxDeliveryResult> Deliver(
        MailboxDeliveryBuffer buffer,
        string key,
        CancellationToken ct,
        string payload = "{}"
    ) => buffer.Enqueue(Guid.NewGuid(), "test-ns", key, payload, DateTimeOffset.UtcNow, ct);

    private static MailboxDeliveryResult.Accepted Accepted(BufferedMailboxDeliveryRequest request, long idx) =>
        new(
            new MailboxDeliveryResponse
            {
                MailboxId = request.MailboxId,
                Idx = idx,
                IdempotencyKey = request.IdempotencyKey,
                AcceptedAt = request.Now,
            },
            ReleasedReceiver: false
        );

    /// <summary>
    /// Sets the mock up to accept everything it is handed, at consecutive positions within each batch, recording
    /// the size of every batch it sees into <paramref name="batchSizes"/>.
    /// </summary>
    private static void SetupMockAccepted(Mock<IEngineRepository> repo, List<int>? batchSizes = null)
    {
        repo.Setup(r =>
                r.BatchDeliverToMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxDeliveryRequest>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedMailboxDeliveryRequest> reqs, int _, CancellationToken _) =>
                {
                    if (batchSizes is not null)
                    {
                        lock (batchSizes)
                        {
                            batchSizes.Add(reqs.Count);
                        }
                    }

                    MailboxDeliveryResult[] results = [.. reqs.Select((request, i) => Accepted(request, i))];
                    return results;
                }
            );
    }

    /// <summary>
    /// Waits for the buffer's queue to reach <paramref name="depth"/>. A condition rather than a delay: a test
    /// whose arrangement never materializes fails on its own deadline instead of racing.
    /// </summary>
    private static async Task WaitForQueueDepth(MailboxDeliveryBuffer buffer, int depth, CancellationToken ct)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(30));

        while (buffer.QueueDepth != depth)
        {
            deadline.Token.ThrowIfCancellationRequested();
            await Task.Yield();
        }
    }

    /// <summary>
    /// Submits without the service running, which leaves every request sitting in the channel: <c>Enqueue</c>
    /// runs synchronously up to its wait on the verdict, so a batch's exact contents can be arranged before the
    /// drain loop ever sees them.
    /// </summary>
    private static List<Task<MailboxDeliveryResult>> Preload(
        MailboxDeliveryBuffer buffer,
        int count,
        CancellationToken ct,
        string keyPrefix = "key",
        string payload = "{}"
    )
    {
        var tasks = Enumerable.Range(1, count).Select(i => Deliver(buffer, $"{keyPrefix}-{i}", ct, payload)).ToList();

        Assert.Equal(count, buffer.QueueDepth);

        return tasks;
    }

    /// <summary>
    /// Queues a request whose caller then abandons it alongside one that waits, both before the service runs.
    /// </summary>
    private static (Task<MailboxDeliveryResult> Abandoned, Task<MailboxDeliveryResult> Kept) PreloadAbandonedAndKept(
        MailboxDeliveryBuffer buffer,
        CancellationToken abandonedToken,
        CancellationToken ct
    )
    {
        var abandoned = Deliver(buffer, "canceled", abandonedToken);
        var kept = Deliver(buffer, "kept", ct);

        Assert.Equal(2, buffer.QueueDepth);

        return (abandoned, kept);
    }

    /// <summary>
    /// Submits from the thread pool rather than from one caller: the channel is configured for many writers.
    /// </summary>
    private static List<Task<MailboxDeliveryResult>> DeliverConcurrently(
        MailboxDeliveryBuffer buffer,
        int count,
        CancellationToken ct
    ) => [.. Enumerable.Range(1, count).Select(i => Task.Run(() => Deliver(buffer, $"concurrent-{i}", ct), ct))];

    [Fact]
    public async Task Enqueue_SingleRequest_FlushesToRepository()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockAccepted(repo);

        var mailboxId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow.AddMinutes(-3);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var result = await buffer.Enqueue(
                mailboxId,
                "test-ns",
                "idem-1",
                "hello",
                now,
                TestContext.Current.CancellationToken
            );

            var accepted = Assert.IsType<MailboxDeliveryResult.Accepted>(result);
            Assert.Equal(mailboxId, accepted.Delivery.MailboxId);
            Assert.Equal("idem-1", accepted.Delivery.IdempotencyKey);

            // The caller's own instant reaches the repository untouched, and the log cap comes from settings.
            repo.Verify(
                r =>
                    r.BatchDeliverToMailboxes(
                        It.Is<IReadOnlyList<BufferedMailboxDeliveryRequest>>(b =>
                            b.Count == 1
                            && b[0].MailboxId == mailboxId
                            && b[0].Namespace == "test-ns"
                            && b[0].IdempotencyKey == "idem-1"
                            && b[0].Payload == "hello"
                            && b[0].Now == now
                        ),
                        MaxLogLength,
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
    public async Task Enqueue_MultipleWaitingRequests_BatchedTogether()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10));

        var batchSizes = new List<int>();
        SetupMockAccepted(repo, batchSizes);

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 5, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            await Task.WhenAll(tasks);

            List<int> expected = [5];
            Assert.Equal(expected, batchSizes);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_ManyConcurrentCallers_AllAnsweredInBoundedBatches()
    {
        const int callers = 20;
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 4));

        var batchSizes = new List<int>();
        SetupMockAccepted(repo, batchSizes);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var tasks = DeliverConcurrently(buffer, callers, TestContext.Current.CancellationToken);

            var results = await Task.WhenAll(tasks);

            Assert.All(results, result => Assert.IsType<MailboxDeliveryResult.Accepted>(result));
            Assert.All(batchSizes, size => Assert.True(size <= 4, $"Batch had {size} items, max is 4"));
            Assert.Equal(callers, batchSizes.Sum());
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
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 2));

        var batchSizes = new List<int>();
        SetupMockAccepted(repo, batchSizes);

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 5, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            await Task.WhenAll(tasks);

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
    public async Task Enqueue_PayloadBudgetExceeded_SplitsIntoBatches()
    {
        // The batch-size limit is deliberately larger than the arrangement, so only the payload budget can split
        // it, and serial flushing keeps the two batches in a fixed order.
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10, flushConcurrency: 1));

        var batchSizes = new List<int>();
        SetupMockAccepted(repo, batchSizes);

        var payload = new string('x', BudgetSplittingPayloadUnits);
        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 3, TestContext.Current.CancellationToken, "big", payload);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            await Task.WhenAll(tasks);

            // Two payloads fit the budget and the third does not, so it leads the next batch instead of joining
            // this one or being dropped.
            List<int> expected = [2, 1];
            Assert.Equal(expected, batchSizes);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_MixedVerdicts_EachCallerGetsTheResultAtItsOwnPosition()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10));

        var closedMailbox = new MailboxResponse
        {
            Id = Guid.NewGuid(),
            Namespace = "test-ns",
            IdempotencyKey = "mailbox",
            Timeout = TimeSpan.FromHours(1),
            Deadline = DateTimeOffset.UtcNow.AddHours(1),
            Status = MailboxStatus.Disposed,
            DisposedReason = MailboxDisposedReason.Request,
            NextIdx = 3,
            NextSeq = 3,
            CreatedAt = DateTimeOffset.UtcNow,
            DisposedAt = DateTimeOffset.UtcNow,
        };

        var batchSizes = new List<int>();

        // Verdicts are assigned per key and the array is built in the batch's own order, so a fan-out pairing
        // callers with results any other way hands every caller somebody else's verdict.
        repo.Setup(r =>
                r.BatchDeliverToMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxDeliveryRequest>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedMailboxDeliveryRequest> reqs, int _, CancellationToken _) =>
                {
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                    }

                    return reqs.Select<BufferedMailboxDeliveryRequest, MailboxDeliveryResult>(request =>
                            request.IdempotencyKey switch
                            {
                                "verdict-1" => new MailboxDeliveryResult.NotFound(),
                                "verdict-2" => new MailboxDeliveryResult.Closed(closedMailbox),
                                "verdict-3" => new MailboxDeliveryResult.LogFull(MaxLogLength),
                                "verdict-4" => new MailboxDeliveryResult.Duplicate(
                                    new MailboxDeliveryResponse
                                    {
                                        MailboxId = request.MailboxId,
                                        Idx = 7,
                                        IdempotencyKey = request.IdempotencyKey,
                                        AcceptedAt = request.Now,
                                    }
                                ),
                                _ => Accepted(request, 8),
                            }
                        )
                        .ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 5, TestContext.Current.CancellationToken, keyPrefix: "verdict");

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var results = await Task.WhenAll(tasks);

            List<int> expected = [5];
            Assert.Equal(expected, batchSizes);
            Assert.IsType<MailboxDeliveryResult.NotFound>(results[0]);
            Assert.Equal(closedMailbox, Assert.IsType<MailboxDeliveryResult.Closed>(results[1]).Mailbox);
            Assert.Equal<long>(MaxLogLength, Assert.IsType<MailboxDeliveryResult.LogFull>(results[2]).LogLength);
            Assert.Equal(7L, Assert.IsType<MailboxDeliveryResult.Duplicate>(results[3]).Delivery.Idx);
            Assert.Equal(8L, Assert.IsType<MailboxDeliveryResult.Accepted>(results[4]).Delivery.Idx);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_RepositoryThrows_FaultsEveryCallerInTheBatch()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10));

        var expectedException = new InvalidOperationException("DB connection failed");
        repo.Setup(r =>
                r.BatchDeliverToMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxDeliveryRequest>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(expectedException);

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 3, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            foreach (var task in tasks)
            {
                var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => task);
                Assert.Same(expectedException, ex);
            }
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task Enqueue_AlreadyCanceledToken_ThrowsWithoutQueueing()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockAccepted(repo);

        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        // Nothing is draining yet, so the queue depth after the throw is the whole story.
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Deliver(buffer, "canceled", cts.Token));
        Assert.Equal(0, buffer.QueueDepth);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var result = await Deliver(buffer, "kept", TestContext.Current.CancellationToken);
            Assert.IsType<MailboxDeliveryResult.Accepted>(result);
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
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10));
        SetupMockAccepted(repo);

        using var cts = new CancellationTokenSource();
        var (canceledTask, keptTask) = PreloadAbandonedAndKept(
            buffer,
            cts.Token,
            TestContext.Current.CancellationToken
        );

        // Canceled while queued and before anything drains, so the flush meets it already canceled — the state
        // a caller that gave up while waiting leaves behind.
        await cts.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => canceledTask);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            Assert.IsType<MailboxDeliveryResult.Accepted>(await keptTask);

            // The canceled request never reached the database, and it did not take its batch-mate with it.
            repo.Verify(
                r =>
                    r.BatchDeliverToMailboxes(
                        It.Is<IReadOnlyList<BufferedMailboxDeliveryRequest>>(b =>
                            b.Count == 1 && b[0].IdempotencyKey == "kept"
                        ),
                        It.IsAny<int>(),
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
    public async Task Shutdown_DrainsWhatIsLeft_InBatchesOfTheSameSize()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 2, flushConcurrency: 1));

        var batchSizes = new List<int>();
        var gate = new TaskCompletionSource();
        repo.Setup(r =>
                r.BatchDeliverToMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxDeliveryRequest>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BufferedMailboxDeliveryRequest> reqs, int _, CancellationToken _) =>
                {
                    int flushNumber;
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                        flushNumber = batchSizes.Count;
                    }

                    if (flushNumber == 1)
                        await gate.Task;

                    MailboxDeliveryResult[] results = [.. reqs.Select((request, i) => Accepted(request, i))];
                    return results;
                }
            );

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 5, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        // The gated first flush holds the only flush permit, so the loop drains a second batch and parks on the
        // semaphore still holding it. Exactly one request is left in the channel: that is the arrangement.
        await WaitForQueueDepth(buffer, 1, TestContext.Current.CancellationToken);

        using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var stopTask = buffer.StopAsync(stopCts.Token);
        gate.SetResult();
        await stopTask;

        // The batch the loop was holding and the request still queued are both flushed on the way out, each
        // bounded by MaxBatchSize rather than merged into one command.
        await Task.WhenAll(tasks);

        List<int> expected = [2, 2, 1];
        Assert.Equal(expected, batchSizes);
    }

    [Fact]
    public async Task Enqueue_UnderAnActivity_CarriesTheTraceContextAndLinksTheFlushToIt()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockAccepted(repo);

        var flushActivities = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source == Metrics.Source,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
            // Started rather than stopped: the links are fixed at creation, and the flush answers its callers
            // before it disposes its own activity.
            ActivityStarted = activity =>
            {
                if (activity.OperationName != $"{nameof(MailboxDeliveryBuffer)}.FlushBatch")
                    return;

                lock (flushActivities)
                {
                    flushActivities.Add(activity);
                }
            },
        };
        ActivitySource.AddActivityListener(listener);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            using var caller = Metrics.Source.StartActivity("test.caller");
            Assert.NotNull(caller);

            await Deliver(buffer, "traced", TestContext.Current.CancellationToken);

            repo.Verify(
                r =>
                    r.BatchDeliverToMailboxes(
                        It.Is<IReadOnlyList<BufferedMailboxDeliveryRequest>>(b => b[0].TraceContext == caller.Id),
                        It.IsAny<int>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );

            // The flush is a separate trace, tied back to the enqueueing call by a link built from that
            // captured context rather than by parentage.
            Activity flush;
            lock (flushActivities)
            {
                flush = Assert.Single(flushActivities);
            }

            var link = Assert.Single(flush.Links);
            Assert.Equal(caller.TraceId, link.Context.TraceId);
            Assert.Equal(caller.SpanId, link.Context.SpanId);
            Assert.NotEqual(caller.SpanId, flush.ParentSpanId);
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }
}
