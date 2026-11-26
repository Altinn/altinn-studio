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
    public async Task ChangedCollection_IsReadAheadOfTheSweptOnes_AndOnlyOnce()
    {
        // Arrange: the first read takes three of the four collections and leaves the last one dirty
        var collections = Enumerable.Range(0, 4).Select(i => new CollectionId("ns", $"key-{i}")).ToList();
        var subscriptions = collections.Select(c => _hub.TrySubscribe(c)!).ToList();
        var (started, gates) = GateReads(1);
        await StartHub();
        await WaitFor(started[0]);

        // Act: while that read is in flight a sweep marks all four, and a notification names the third
        _hub.MarkAllDirty();
        _hub.MarkDirty(collections[2]);
        gates[0].SetResult();
        await WaitForReads(3);

        // Assert
        Assert.Equal(
            [
                [collections[0], collections[1], collections[2]],
                [collections[3], collections[2], collections[0]],
                [collections[1]],
            ],
            _reads
        );
        subscriptions.ForEach(s => s.Dispose());
    }

    [Fact]
    public async Task SweptCollections_KeepAPlaceInABatchThatChangedOnesCouldFill()
    {
        // Arrange: the first read takes three of the four collections and leaves the last one dirty
        var collections = Enumerable.Range(0, 4).Select(i => new CollectionId("ns", $"key-{i}")).ToList();
        var subscriptions = collections.Select(c => _hub.TrySubscribe(c)!).ToList();
        var (started, gates) = GateReads(1);
        await StartHub();
        await WaitFor(started[0]);

        // Act: while that read is in flight a sweep marks all four, and notifications name two of them
        _hub.MarkAllDirty();
        _hub.MarkDirty(collections[1]);
        _hub.MarkDirty(collections[2]);
        gates[0].SetResult();
        await WaitForReads(3);

        // Assert
        Assert.Equal(
            [
                [collections[0], collections[1], collections[2]],
                [collections[3], collections[1], collections[0]],
                [collections[2]],
            ],
            _reads
        );
        subscriptions.ForEach(s => s.Dispose());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DirtyCollection_WhoseLastSubscriberLeaves_IsNotRead(bool markedBySweep)
    {
        // Arrange: both collections have had their first read, and the next read is in flight
        CollectionId left = new("ns", "left");
        var (started, gates) = GateReads(2);
        using var staying = _hub.TrySubscribe(_collection)!;
        var leaving = _hub.TrySubscribe(left)!;
        await StartHub();
        gates[0].SetResult();
        await Next(leaving);
        _hub.MarkDirty(_collection);
        await WaitFor(started[1]);

        // Act: both are marked, and one is left before the loop takes its next batch
        if (markedBySweep)
            _hub.MarkAllDirty();
        else
            _hub.MarkDirty(left);
        _hub.MarkDirty(_collection);
        leaving.Dispose();
        gates[1].SetResult();
        await WaitForReads(3);

        // Assert
        Assert.Equal([_collection], _reads.ElementAt(2));
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
    public async Task FailedRead_KeepsTheCollectionDirty_AndIsRetriedAfterABackoffThatDoublesUpToFiveSeconds()
    {
        // Arrange
        var attempts = new ConcurrentQueue<DateTimeOffset>();
        _repository
            .Setup(r =>
                r.GetCollectionDetails(It.IsAny<IReadOnlyCollection<CollectionId>>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (IReadOnlyCollection<CollectionId> collections, CancellationToken _) =>
                {
                    attempts.Enqueue(_time.GetUtcNow());
                    if (attempts.Count <= 4)
                        throw new InvalidOperationException("database unavailable");
                    return collections.ToDictionary(c => c, c => Snapshot(c, version: 1));
                }
            );
        await StartHub();
        var subscription = _hub.TrySubscribe(_collection)!;
        var retried = Next(subscription, TimeSpan.FromSeconds(30));

        // Act: time moves on in steps, since the hub arms each delay only after the read before it has failed
        for (int i = 0; !retried.IsCompleted && i < 200; i++)
        {
            _time.Advance(TimeSpan.FromMilliseconds(200));
            await Task.Delay(10, TestContext.Current.CancellationToken);
        }

        // Assert: a delay shows up to a few steps longer when the hub was slow to arm it
        Assert.Equal(_collection.Key, (await retried)?.Key);
        var times = attempts.ToArray();
        Assert.Equal(
            [1, 2, 4, 5],
            times.Zip(times.Skip(1), (attempt, next) => (next - attempt).TotalSeconds),
            (expected, actual) => actual >= expected && actual < expected + 1
        );
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
                async (IReadOnlyCollection<CollectionId> collections, CancellationToken cancellationToken) =>
                {
                    _reads.Enqueue([.. collections]);
                    var version = Interlocked.Increment(ref _version);
                    if (version <= count)
                    {
                        started[version - 1].TrySetResult();
                        await gates[version - 1].Task.WaitAsync(cancellationToken);
                    }
                    return (IReadOnlyDictionary<CollectionId, WorkflowCollectionDetailResponse>)
                        collections.ToDictionary(c => c, c => Snapshot(c, version));
                }
            );
        return (started, gates);
    }

    private static Task WaitFor(TaskCompletionSource started) =>
        started.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

    private async Task WaitForReads(int count)
    {
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        while (_reads.Count < count)
            await Task.Delay(10, deadline.Token);
    }

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
