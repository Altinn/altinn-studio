using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

public sealed class CollectionEventHubTests : IAsyncDisposable
{
    private static readonly CollectionId _collection = new("ns", "key");
    private static readonly TimeSpan _sweepInterval = TimeSpan.FromSeconds(5);

    private readonly FakeTimeProvider _time = new(DateTimeOffset.UtcNow);
    private readonly Mock<IEngineRepository> _repository = new();
    private readonly ConcurrentQueue<IReadOnlyList<CollectionId>> _reads = new();
    private readonly CollectionEventHub _hub;
    private int _version;

    public CollectionEventHubTests()
    {
        // Each read answers every requested collection with a snapshot whose UpdatedAt counts the reads
        _repository
            .Setup(r =>
                r.GetCollectionDetails(It.IsAny<IReadOnlyCollection<CollectionId>>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (IReadOnlyCollection<CollectionId> collections, CancellationToken _) =>
                {
                    _reads.Enqueue([.. collections]);
                    var version = Interlocked.Increment(ref _version);
                    return collections.ToDictionary(c => c, c => Snapshot(c, version));
                }
            );

        _hub = CreateHub(maxBatchSize: 3, maxStreams: 4);
    }

    public async ValueTask DisposeAsync()
    {
        await _hub.StopAsync(CancellationToken.None);
        _hub.Dispose();
    }

    [Fact]
    public async Task TrySubscribe_DeliversTheFirstSnapshotThroughTheBatchedRead()
    {
        // Arrange
        await StartHub();

        // Act
        using var subscription = _hub.TrySubscribe(_collection);

        // Assert
        Assert.NotNull(subscription);
        Assert.Equal(_collection.Key, (await Next(subscription))?.Key);
        Assert.Equal([_collection], Assert.Single(_reads));
    }

    [Fact]
    public async Task MarkDirty_OnAWatchedCollection_DeliversAFreshSnapshot()
    {
        // Arrange
        await StartHub();
        using var subscription = _hub.TrySubscribe(_collection)!;
        var first = await Next(subscription);

        // Act
        _hub.MarkDirty(_collection);

        // Assert
        var second = await Next(subscription);
        Assert.True(second?.UpdatedAt > first?.UpdatedAt);
    }

    [Fact]
    public async Task MarkDirty_OnACollectionNobodyWatches_ReadsNothing()
    {
        // Arrange
        await StartHub();
        using var subscription = _hub.TrySubscribe(_collection)!;
        await Next(subscription);

        // Act
        _hub.MarkDirty(new CollectionId("ns", "unwatched"));
        _hub.MarkDirty(_collection);
        await Next(subscription);

        // Assert
        Assert.DoesNotContain(_reads, read => read.Contains(new CollectionId("ns", "unwatched")));
    }

    [Fact]
    public async Task DirtyCollections_AreReadInBatchesOfAtMostMaxBatchSize()
    {
        // Arrange
        var collections = Enumerable.Range(0, 4).Select(i => new CollectionId("ns", $"key-{i}")).ToList();
        var subscriptions = collections.Select(c => _hub.TrySubscribe(c)!).ToList();

        // Act
        await StartHub();
        foreach (var subscription in subscriptions)
            await Next(subscription);

        // Assert
        Assert.Equal([3, 1], _reads.Select(r => r.Count));
        Assert.Equal(collections, _reads.SelectMany(r => r));
        subscriptions.ForEach(s => s.Dispose());
    }

    [Fact]
    public async Task MarkDirty_WhileItsCollectionIsBeingRead_CausesAnotherRead()
    {
        // Arrange
        var (started, gates) = GateReads(2);
        await StartHub();
        using var subscription = _hub.TrySubscribe(_collection)!;
        await WaitFor(started[0]);

        // Act
        _hub.MarkDirty(_collection);
        gates[0].SetResult();
        var first = await Next(subscription);
        await WaitFor(started[1]);
        gates[1].SetResult();

        // Assert
        Assert.Equal(1, first?.UpdatedAt?.Second);
        Assert.Equal(2, (await Next(subscription))?.UpdatedAt?.Second);
    }

    [Fact]
    public async Task SlowSubscriber_GetsOnlyTheLatestSnapshot()
    {
        // Arrange
        await StartHub();
        using var slow = _hub.TrySubscribe(_collection)!;
        using var fast = _hub.TrySubscribe(_collection)!;
        await Next(fast);

        // Act
        for (int i = 0; i < 3; i++)
        {
            _hub.MarkDirty(_collection);
            await Next(fast);
        }

        // Assert
        var latest = await Next(slow);
        Assert.Equal(_version, latest?.UpdatedAt?.Second);
        await Assert.ThrowsAsync<TimeoutException>(() => Next(slow, TimeSpan.FromMilliseconds(200)));
    }

    [Fact]
    public async Task FailedRead_KeepsTheCollectionDirty_AndRetriesAfterABackoff()
    {
        // Arrange
        var failed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        _repository
            .Setup(r =>
                r.GetCollectionDetails(It.IsAny<IReadOnlyCollection<CollectionId>>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (IReadOnlyCollection<CollectionId> collections, CancellationToken _) =>
                {
                    _reads.Enqueue([.. collections]);
                    if (Interlocked.Increment(ref _version) == 1)
                    {
                        failed.SetResult();
                        throw new InvalidOperationException("database unavailable");
                    }
                    return collections.ToDictionary(c => c, c => Snapshot(c, _version));
                }
            );
        await StartHub();
        var subscription = _hub.TrySubscribe(_collection)!;
        var retried = Next(subscription);
        await failed.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

        // Act
        await Task.Delay(200, TestContext.Current.CancellationToken);
        var readsBeforeBackoff = _reads.Count;
        var advanced = TimeSpan.Zero;
        while (!retried.IsCompleted && advanced < _sweepInterval)
        {
            _time.Advance(TimeSpan.FromMilliseconds(100));
            advanced += TimeSpan.FromMilliseconds(100);
            await Task.Delay(10, TestContext.Current.CancellationToken);
        }

        // Assert
        Assert.Equal(1, readsBeforeBackoff);
        Assert.Equal(_collection.Key, (await retried)?.Key);
        Assert.True(advanced < _sweepInterval, "The snapshot came from the sweep, not from a retry.");
        subscription.Dispose();
    }

    [Fact]
    public async Task Sweep_RereadsEveryWatchedCollection_ChangedOrNot()
    {
        // Arrange
        await StartHub();
        var subscription = _hub.TrySubscribe(_collection)!;
        await Next(subscription);
        var swept = Next(subscription);

        // Act: the hub may not have armed its sweep timer yet, so time moves on until it fires
        for (int i = 0; !swept.IsCompleted && i < 10; i++)
        {
            _time.Advance(_sweepInterval);
            await Task.Delay(10, TestContext.Current.CancellationToken);
        }

        // Assert
        Assert.Equal(2, (await swept)?.UpdatedAt?.Second);
        subscription.Dispose();
    }

    [Fact]
    public async Task MissingCollection_EndsTheSubscription()
    {
        // Arrange
        _repository
            .Setup(r =>
                r.GetCollectionDetails(It.IsAny<IReadOnlyCollection<CollectionId>>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(new Dictionary<CollectionId, WorkflowCollectionDetailResponse>());
        await StartHub();

        // Act
        using var subscription = _hub.TrySubscribe(_collection)!;

        // Assert
        Assert.Null(await Next(subscription));
    }

    [Fact]
    public async Task LastUnsubscribe_StopsReadingTheCollection()
    {
        // Arrange
        await StartHub();
        var first = _hub.TrySubscribe(_collection)!;
        var second = _hub.TrySubscribe(_collection)!;
        await Next(second);

        // Act
        first.Dispose();
        _hub.MarkDirty(_collection);
        var readWhileOneRemains = await Next(second);
        second.Dispose();
        var readsAfterTheLast = _reads.Count;
        _hub.MarkDirty(_collection);
        await Task.Delay(200, TestContext.Current.CancellationToken);

        // Assert
        Assert.NotNull(readWhileOneRemains);
        Assert.Equal(readsAfterTheLast, _reads.Count);
    }

    [Fact]
    public async Task FirstSnapshot_ComesFromAReadThatStartedAfterTheSubscription()
    {
        // Arrange
        var (started, gates) = GateReads(2);
        await StartHub();
        using var early = _hub.TrySubscribe(_collection)!;
        await WaitFor(started[0]);

        // Act: the late subscriber joins while the first read is in flight
        using var late = _hub.TrySubscribe(_collection)!;
        gates[0].SetResult();
        var earlyFirst = await Next(early);
        await WaitFor(started[1]);
        using var noSnapshotYet = CancellationTokenSource.CreateLinkedTokenSource(
            TestContext.Current.CancellationToken
        );
        noSnapshotYet.CancelAfter(TimeSpan.FromMilliseconds(200));
        var lateFromTheFirstRead = await Record.ExceptionAsync(async () => await late.Next(noSnapshotYet.Token));
        gates[1].SetResult();

        // Assert
        Assert.Equal(1, earlyFirst?.UpdatedAt?.Second);
        Assert.IsType<OperationCanceledException>(lateFromTheFirstRead, exactMatch: false);
        Assert.Equal(2, (await Next(late))?.UpdatedAt?.Second);
    }

    [Fact]
    public void TrySubscribe_AtMaxStreams_IsRefused_UntilOneLeaves()
    {
        // Arrange
        var subscriptions = Enumerable.Range(0, 4).Select(i => _hub.TrySubscribe(new("ns", $"key-{i}"))!).ToList();

        // Act
        var refused = _hub.TrySubscribe(_collection);
        subscriptions[0].Dispose();
        using var admitted = _hub.TrySubscribe(_collection);

        // Assert
        Assert.Null(refused);
        Assert.NotNull(admitted);
        subscriptions.ForEach(s => s.Dispose());
    }

    private CollectionEventHub CreateHub(int maxBatchSize, int maxStreams)
    {
        var services = new ServiceCollection();
        services.AddSingleton(_repository.Object);
        var provider = services.BuildServiceProvider();

        var settings = new EngineSettings
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
            CollectionEvents = new CollectionEventSettings
            {
                MaxBatchSize = maxBatchSize,
                SweepInterval = _sweepInterval,
                MaxStreams = maxStreams,
            },
        };

        return new CollectionEventHub(
            provider.GetRequiredService<IServiceScopeFactory>(),
            Options.Create(settings),
            _time,
            NullLogger<CollectionEventHub>.Instance
        );
    }

    /// <summary>
    /// Makes the first <paramref name="count"/> reads signal when they start and wait for their gate, so a test
    /// decides what happens while each read is in flight.
    /// </summary>
    private (TaskCompletionSource[] Started, TaskCompletionSource[] Gates) GateReads(int count)
    {
        var started = Enumerable.Range(0, count).Select(_ => new TaskCompletionSource()).ToArray();
        var gates = Enumerable.Range(0, count).Select(_ => new TaskCompletionSource()).ToArray();
        _repository
            .Setup(r =>
                r.GetCollectionDetails(It.IsAny<IReadOnlyCollection<CollectionId>>(), It.IsAny<CancellationToken>())
            )
            .Returns(
                async (IReadOnlyCollection<CollectionId> collections, CancellationToken _) =>
                {
                    _reads.Enqueue([.. collections]);
                    var version = Interlocked.Increment(ref _version);
                    if (version <= count)
                    {
                        started[version - 1].TrySetResult();
                        await gates[version - 1].Task;
                    }
                    return (IReadOnlyDictionary<CollectionId, WorkflowCollectionDetailResponse>)
                        collections.ToDictionary(c => c, c => Snapshot(c, version));
                }
            );
        return (started, gates);
    }

    private static Task WaitFor(TaskCompletionSource started) =>
        started.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

    private Task StartHub() => _hub.StartAsync(TestContext.Current.CancellationToken);

    private static async Task<WorkflowCollectionDetailResponse?> Next(
        CollectionEventSubscription subscription,
        TimeSpan? timeout = null
    ) =>
        await subscription
            .Next(TestContext.Current.CancellationToken)
            .AsTask()
            .WaitAsync(timeout ?? TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

    /// <summary>A snapshot whose <c>UpdatedAt</c> second is the number of the read that produced it.</summary>
    private static WorkflowCollectionDetailResponse Snapshot(CollectionId collection, int version) =>
        new()
        {
            Key = collection.Key,
            Namespace = collection.Namespace,
            Heads = [],
            CreatedAt = DateTimeOffset.UnixEpoch,
            UpdatedAt = DateTimeOffset.UnixEpoch.AddSeconds(version),
        };
}
