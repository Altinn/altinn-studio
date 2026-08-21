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
    /// A payload length that puts three requests over the buffer's 4 MiB payload budget and two under it, with
    /// margin on both sides so a split is the budget's doing and not a boundary's.
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
    /// Waits for the buffer's queue to reach <paramref name="depth"/> — a condition rather than a delay, so an
    /// arrangement that never materializes fails on its own deadline instead of racing.
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
    /// Submits without the service running: <c>Enqueue</c> runs synchronously up to its wait, so a batch's exact
    /// contents can be arranged before the drain loop sees them.
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

    /// <summary>Submits from the thread pool rather than from one caller: the channel allows many writers.</summary>
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

    /// <summary>
    /// The one assertion the flush-counter pair exists for: over a batch that split, requests ÷ batches is the
    /// mean batch size achieved, and reads as neither 1 nor <c>MaxBatchSize</c>.
    /// </summary>
    [Fact]
    public async Task TheFlushCounters_OverASplitBatch_DivideIntoTheMeanBatchSize()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 2));

        var batchSizes = new List<int>();
        SetupMockAccepted(repo, batchSizes);

        using var meters = new MeterCollector();
        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 5, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            await Task.WhenAll(tasks);

            Assert.Equal(3, batchSizes.Count);

            // 5 ÷ 3 = 1.67. A counter carrying the other's units would read 1.00 here and hide the split.
            Assert.Equal(
                new Dictionary<string, long>(StringComparer.Ordinal) { ["delivery"] = 5 },
                meters.ByTag("engine.mailbox_buffer.flushed", "operation")
            );
            Assert.Equal(
                new Dictionary<string, long>(StringComparer.Ordinal) { ["delivery"] = 3 },
                meters.ByTag("engine.mailbox_buffer.batches", "operation")
            );
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

        await cts.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => canceledTask);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            Assert.IsType<MailboxDeliveryResult.Accepted>(await keptTask);

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

        await WaitForQueueDepth(buffer, 1, TestContext.Current.CancellationToken);

        using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var stopTask = buffer.StopAsync(stopCts.Token);
        gate.SetResult();
        await stopTask;

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

    [Fact]
    public async Task TheFlushCounters_CountWhatABatchAnswered_AndNothingForAFaultedFlush()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10));
        SetupMockAccepted(repo);

        using var meters = new MeterCollector();
        using var serviceCts = new CancellationTokenSource();
        var answered = Preload(buffer, 3, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            await Task.WhenAll(answered);

            Assert.Equal(
                new Dictionary<string, long>(StringComparer.Ordinal) { ["delivery"] = 3 },
                meters.ByTag("engine.mailbox_buffer.flushed", "operation")
            );

            Assert.Equal(
                new Dictionary<string, long>(StringComparer.Ordinal) { ["delivery"] = 1 },
                meters.ByTag("engine.mailbox_buffer.batches", "operation")
            );

            repo.Reset();
            repo.Setup(r =>
                    r.BatchDeliverToMailboxes(
                        It.IsAny<IReadOnlyList<BufferedMailboxDeliveryRequest>>(),
                        It.IsAny<int>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new InvalidOperationException("DB connection failed"));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                Deliver(buffer, "faulted", TestContext.Current.CancellationToken)
            );

            Assert.Equal(
                new Dictionary<string, long>(StringComparer.Ordinal) { ["delivery"] = 3 },
                meters.ByTag("engine.mailbox_buffer.flushed", "operation")
            );
            Assert.Equal(
                new Dictionary<string, long>(StringComparer.Ordinal) { ["delivery"] = 1 },
                meters.ByTag("engine.mailbox_buffer.batches", "operation")
            );
        }
        finally
        {
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }
}
