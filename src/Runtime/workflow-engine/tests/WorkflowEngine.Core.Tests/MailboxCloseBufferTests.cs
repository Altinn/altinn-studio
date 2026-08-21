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
public class MailboxCloseBufferTests
{
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
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            MailboxBuffers = new MailboxBufferSettings
            {
                Close = new BatchBufferSettings
                {
                    MaxBatchSize = maxBatchSize,
                    MaxQueueSize = maxQueueSize,
                    FlushConcurrency = flushConcurrency,
                },
            },
        };

    private static (MailboxCloseBuffer Buffer, Mock<IEngineRepository> Repo) CreateBuffer(
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

        var buffer = new MailboxCloseBuffer(
            scopeFactory.Object,
            NullLogger<MailboxCloseBuffer>.Instance,
            Options.Create(settings)
        );

        return (buffer, repo);
    }

    private static Guid[] NewIds(int count) => [.. Enumerable.Range(0, count).Select(_ => Guid.NewGuid())];

    /// <summary>The mailbox the request named, as the repository would have returned it just closed.</summary>
    private static MailboxResponse ClosedMailbox(BufferedMailboxCloseRequest request) =>
        new()
        {
            Id = request.MailboxId,
            Namespace = request.Namespace,
            IdempotencyKey = "mailbox",
            Timeout = TimeSpan.FromHours(1),
            Deadline = request.Now.AddHours(1),
            Status = MailboxStatus.Disposed,
            DisposedReason = request.Reason,
            NextIdx = 1,
            NextSeq = 1,
            CreatedAt = request.Now.AddMinutes(-5),
            DisposedAt = request.Now,
        };

    /// <summary>Sets the mock up to close everything it is handed.</summary>
    private static void SetupMockClosed(Mock<IEngineRepository> repo)
    {
        repo.Setup(r =>
                r.BatchCloseMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxCloseRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedMailboxCloseRequest> reqs, CancellationToken _) =>
                {
                    MailboxCloseResult[] results =
                    [
                        .. reqs.Select(request => new MailboxCloseResult.Closed(
                            ClosedMailbox(request),
                            new MailboxReleaseCounts(Delivered: 0, Closed: 0)
                        )),
                    ];
                    return results;
                }
            );
    }

    /// <summary>
    /// Waits for the buffer's queue to reach <paramref name="depth"/>. A condition rather than a delay: a test
    /// whose arrangement never materializes fails on its own deadline instead of racing.
    /// </summary>
    private static async Task WaitForQueueDepth(MailboxCloseBuffer buffer, int depth, CancellationToken ct)
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
    private static List<Task<MailboxCloseResult>> Preload(
        MailboxCloseBuffer buffer,
        Guid[] mailboxIds,
        CancellationToken ct
    )
    {
        var tasks = mailboxIds
            .Select(id => buffer.Enqueue(id, "test-ns", MailboxDisposedReason.Request, DateTimeOffset.UtcNow, ct))
            .ToList();

        Assert.Equal(mailboxIds.Length, buffer.QueueDepth);

        return tasks;
    }

    [Fact]
    public async Task Enqueue_SingleRequest_FlushesToRepository()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockClosed(repo);

        var mailboxId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow.AddMinutes(-3);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var result = await buffer.Enqueue(
                mailboxId,
                "test-ns",
                MailboxDisposedReason.Deadline,
                now,
                TestContext.Current.CancellationToken
            );

            var closed = Assert.IsType<MailboxCloseResult.Closed>(result);
            Assert.Equal(mailboxId, closed.Mailbox.Id);
            Assert.Equal(now, closed.Mailbox.DisposedAt);

            // The caller's own reason and instant reach the repository untouched.
            repo.Verify(
                r =>
                    r.BatchCloseMailboxes(
                        It.Is<IReadOnlyList<BufferedMailboxCloseRequest>>(b =>
                            b.Count == 1
                            && b[0].MailboxId == mailboxId
                            && b[0].Namespace == "test-ns"
                            && b[0].Reason == MailboxDisposedReason.Deadline
                            && b[0].Now == now
                        ),
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
    public async Task Enqueue_MixedVerdicts_EachCallerGetsTheResultAtItsOwnPosition()
    {
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 10));

        var ids = NewIds(3);
        var (notFoundId, alreadyClosedId) = (ids[0], ids[1]);

        // The disposal of a mailbox somebody else closed first, which a replay is answered with instead of a
        // freshly stamped one.
        var originalDisposal = new MailboxResponse
        {
            Id = alreadyClosedId,
            Namespace = "test-ns",
            IdempotencyKey = "mailbox",
            Timeout = TimeSpan.FromHours(1),
            Deadline = DateTimeOffset.UtcNow.AddHours(1),
            Status = MailboxStatus.Disposed,
            DisposedReason = MailboxDisposedReason.Deadline,
            NextIdx = 3,
            NextSeq = 3,
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-1),
            DisposedAt = DateTimeOffset.UtcNow.AddMinutes(-20),
        };

        var batchSizes = new List<int>();

        // Verdicts are assigned per mailbox id and the array is built in the batch's own order, so a fan-out
        // pairing callers with results any other way hands every caller somebody else's verdict.
        repo.Setup(r =>
                r.BatchCloseMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxCloseRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedMailboxCloseRequest> reqs, CancellationToken _) =>
                {
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                    }

                    return reqs.Select<BufferedMailboxCloseRequest, MailboxCloseResult>(request =>
                        {
                            if (request.MailboxId == notFoundId)
                                return new MailboxCloseResult.NotFound();

                            if (request.MailboxId == alreadyClosedId)
                                return new MailboxCloseResult.AlreadyClosed(originalDisposal);

                            return new MailboxCloseResult.Closed(
                                ClosedMailbox(request),
                                new MailboxReleaseCounts(Delivered: 0, Closed: 2)
                            );
                        })
                        .ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, ids, TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var results = await Task.WhenAll(tasks);

            List<int> expected = [3];
            Assert.Equal(expected, batchSizes);
            Assert.IsType<MailboxCloseResult.NotFound>(results[0]);
            Assert.Equal(originalDisposal, Assert.IsType<MailboxCloseResult.AlreadyClosed>(results[1]).Mailbox);
            Assert.Equal(ids[2], Assert.IsType<MailboxCloseResult.Closed>(results[2]).Mailbox.Id);
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
                r.BatchCloseMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxCloseRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(expectedException);

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, NewIds(3), TestContext.Current.CancellationToken);

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
    public async Task SerialFlushConcurrency_SecondBatchWaitsForFirst()
    {
        // Closing is configured to flush serially (Defaults.EngineSettings.MailboxBuffers.Close), which is what
        // this arrangement reproduces: one flush permit, and two batches' worth of requests to spend it on.
        var (buffer, repo) = CreateBuffer(CreateSettings(maxBatchSize: 2, flushConcurrency: 1));

        var batchSizes = new List<int>();
        var firstFlushEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var gate = new TaskCompletionSource();
        repo.Setup(r =>
                r.BatchCloseMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxCloseRequest>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (IReadOnlyList<BufferedMailboxCloseRequest> reqs, CancellationToken _) =>
                {
                    int flushNumber;
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                        flushNumber = batchSizes.Count;
                    }

                    if (flushNumber == 1)
                    {
                        firstFlushEntered.SetResult();
                        await gate.Task;
                    }

                    MailboxCloseResult[] results =
                    [
                        .. reqs.Select(request => new MailboxCloseResult.Closed(
                            ClosedMailbox(request),
                            new MailboxReleaseCounts(Delivered: 0, Closed: 0)
                        )),
                    ];
                    return results;
                }
            );

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, NewIds(4), TestContext.Current.CancellationToken);

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            await firstFlushEntered.Task.WaitAsync(TestContext.Current.CancellationToken);

            // The gated first flush holds the only flush permit while the loop takes the remaining two requests
            // out of the channel and parks on the semaphore with them. An empty queue is therefore a resting
            // state, not a window: nothing can advance until the gate opens.
            await WaitForQueueDepth(buffer, 0, TestContext.Current.CancellationToken);

            lock (batchSizes)
            {
                List<int> beforeGate = [2];
                Assert.Equal(beforeGate, batchSizes);
            }

            gate.SetResult();

            await Task.WhenAll(tasks);

            List<int> expected = [2, 2];
            Assert.Equal(expected, batchSizes);
        }
        finally
        {
            gate.TrySetResult();

            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await buffer.StopAsync(stopCts.Token);
        }
    }
}
