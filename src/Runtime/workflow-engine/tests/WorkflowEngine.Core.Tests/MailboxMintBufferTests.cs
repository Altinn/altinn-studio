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
public class MailboxMintBufferTests
{
    private const int MaxOpenPerCollection = 42;

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
            MaxOpenMailboxesPerCollection = MaxOpenPerCollection,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            MailboxBuffers = new MailboxBufferSettings
            {
                Mint = new BatchBufferSettings
                {
                    MaxBatchSize = maxBatchSize,
                    MaxQueueSize = maxQueueSize,
                    FlushConcurrency = flushConcurrency,
                },
            },
        };

    private static (MailboxMintBuffer Buffer, Mock<IEngineRepository> Repo) CreateBuffer(
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

        var buffer = new MailboxMintBuffer(
            scopeFactory.Object,
            NullLogger<MailboxMintBuffer>.Instance,
            Options.Create(settings)
        );

        return (buffer, repo);
    }

    /// <summary>The mailbox the request asked for, as the repository would have returned it freshly minted.</summary>
    private static MailboxResponse MintedMailbox(BufferedMailboxMintRequest request) =>
        new()
        {
            Id = request.MailboxId,
            Namespace = request.Namespace,
            IdempotencyKey = request.IdempotencyKey,
            CollectionKey = request.CollectionKey,
            Timeout = request.Timeout,
            Deadline = request.Now + request.Timeout,
            Status = MailboxStatus.Open,
            NextIdx = 0,
            NextSeq = 0,
            CreatedAt = request.Now,
        };

    /// <summary>Sets the mock up to mint everything it is handed.</summary>
    private static void SetupMockMinted(Mock<IEngineRepository> repo)
    {
        repo.Setup(r =>
                r.BatchMintMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxMintRequest>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedMailboxMintRequest> reqs, int _, CancellationToken _) =>
                {
                    MailboxMintResult[] results =
                    [
                        .. reqs.Select(request => new MailboxMintResult.Minted(MintedMailbox(request))),
                    ];
                    return results;
                }
            );
    }

    /// <summary>
    /// Submits without the service running, which leaves every request sitting in the channel: <c>Enqueue</c>
    /// runs synchronously up to its wait on the verdict, so a batch's exact contents can be arranged before the
    /// drain loop ever sees them.
    /// </summary>
    private static List<Task<MailboxMintResult>> Preload(
        MailboxMintBuffer buffer,
        int count,
        CancellationToken ct,
        string keyPrefix = "key"
    )
    {
        var tasks = Enumerable
            .Range(1, count)
            .Select(i =>
                buffer.Enqueue(
                    Guid.NewGuid(),
                    "test-ns",
                    $"{keyPrefix}-{i}",
                    collectionKey: "collection",
                    TimeSpan.FromMinutes(30),
                    DateTimeOffset.UtcNow,
                    ct
                )
            )
            .ToList();

        Assert.Equal(count, buffer.QueueDepth);

        return tasks;
    }

    [Fact]
    public async Task Enqueue_SingleRequest_FlushesToRepository()
    {
        var (buffer, repo) = CreateBuffer();
        SetupMockMinted(repo);

        var mailboxId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow.AddMinutes(-3);
        var timeout = TimeSpan.FromHours(4);

        using var serviceCts = new CancellationTokenSource();
        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var result = await buffer.Enqueue(
                mailboxId,
                "test-ns",
                "idem-1",
                "collection-1",
                timeout,
                now,
                TestContext.Current.CancellationToken
            );

            var minted = Assert.IsType<MailboxMintResult.Minted>(result);
            Assert.Equal(mailboxId, minted.Mailbox.Id);
            Assert.Equal(now + timeout, minted.Mailbox.Deadline);

            // The caller's own candidate id and instant reach the repository untouched, and the collection cap
            // comes from settings.
            repo.Verify(
                r =>
                    r.BatchMintMailboxes(
                        It.Is<IReadOnlyList<BufferedMailboxMintRequest>>(b =>
                            b.Count == 1
                            && b[0].MailboxId == mailboxId
                            && b[0].Namespace == "test-ns"
                            && b[0].IdempotencyKey == "idem-1"
                            && b[0].CollectionKey == "collection-1"
                            && b[0].Timeout == timeout
                            && b[0].Now == now
                        ),
                        MaxOpenPerCollection,
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

        // Somebody else's mailbox, so a replay answered with it cannot be confused with the caller's own
        // candidate id.
        var existingMailbox = new MailboxResponse
        {
            Id = Guid.NewGuid(),
            Namespace = "test-ns",
            IdempotencyKey = "verdict-2",
            Timeout = TimeSpan.FromHours(1),
            Deadline = DateTimeOffset.UtcNow.AddHours(1),
            Status = MailboxStatus.Open,
            NextIdx = 2,
            NextSeq = 1,
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
        };

        var batchSizes = new List<int>();

        // Verdicts are assigned per key and the array is built in the batch's own order, so a fan-out pairing
        // callers with results any other way hands every caller somebody else's verdict.
        repo.Setup(r =>
                r.BatchMintMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxMintRequest>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (IReadOnlyList<BufferedMailboxMintRequest> reqs, int _, CancellationToken _) =>
                {
                    lock (batchSizes)
                    {
                        batchSizes.Add(reqs.Count);
                    }

                    return reqs.Select<BufferedMailboxMintRequest, MailboxMintResult>(request =>
                            request.IdempotencyKey switch
                            {
                                "verdict-1" => new MailboxMintResult.AtCollectionCapacity(),
                                "verdict-2" => new MailboxMintResult.Existing(existingMailbox),
                                _ => new MailboxMintResult.Minted(MintedMailbox(request)),
                            }
                        )
                        .ToArray();
                }
            );

        using var serviceCts = new CancellationTokenSource();
        var tasks = Preload(buffer, 3, TestContext.Current.CancellationToken, keyPrefix: "verdict");

        await buffer.StartAsync(serviceCts.Token);

        try
        {
            var results = await Task.WhenAll(tasks);

            List<int> expected = [3];
            Assert.Equal(expected, batchSizes);
            Assert.IsType<MailboxMintResult.AtCollectionCapacity>(results[0]);
            Assert.Equal(existingMailbox, Assert.IsType<MailboxMintResult.Existing>(results[1]).Mailbox);
            Assert.Equal("verdict-3", Assert.IsType<MailboxMintResult.Minted>(results[2]).Mailbox.IdempotencyKey);
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
                r.BatchMintMailboxes(
                    It.IsAny<IReadOnlyList<BufferedMailboxMintRequest>>(),
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
}
