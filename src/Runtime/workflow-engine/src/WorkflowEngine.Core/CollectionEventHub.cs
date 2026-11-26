using System.Threading.Channels;
using Altinn.Studio.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Serves this replica's collection event streams. Maps each subscribed collection to its subscribers, and one loop
/// reads the collections marked dirty in batches, so all waiting on a replica holds at most one database slot
/// however many subscribers there are.
/// </summary>
/// <remarks>
/// A collection is marked dirty when a subscriber joins, when a <c>collection_changed</c> notification names it, when
/// the listener reconnects and at every sweep. The loop reads the ones a subscriber joined or a notification named
/// ahead of the others, so that a first snapshot and a change never wait behind a sweep. Every read is delivered,
/// changed or not: an event is a snapshot, so a repeat is harmless, and the sweep's reads are what keep an idle
/// stream alive.
/// </remarks>
internal sealed class CollectionEventHub(
    IServiceScopeFactory scopeFactory,
    IOptions<EngineSettings> settings,
    TimeProvider timeProvider,
    ILogger<CollectionEventHub> logger
) : BackgroundService
{
    private static readonly TimeSpan _initialRetryDelay = TimeSpan.FromSeconds(1);

    // The default sweep interval. While reads fail the streams are silent, and a client gives up a silent stream, so
    // a longer delay would keep clients reconnecting after the database is back.
    private static readonly TimeSpan _maxRetryDelay = TimeSpan.FromSeconds(5);

    private readonly CollectionEventSettings _settings = settings.Value.CollectionEvents;
    private readonly AsyncSignal _wake = new();
    private readonly Lock _lock = new();
    private readonly Dictionary<CollectionId, HashSet<CollectionEventSubscription>> _subscribers = [];

    // The dirty collections: the ones a subscriber joined or a notification named, and the ones only a sweep marked.
    // Each queue is read oldest mark first, so a hot collection cannot keep others waiting, and holds subscribed
    // collections only.
    private readonly DirtyQueue _changed = new();
    private readonly DirtyQueue _swept = new();
    private int _streamCount;
    private long _batchesTaken;

    /// <summary>
    /// Subscribes to <paramref name="collection"/>. The first snapshot arrives through the same batched read as
    /// every later one. <see langword="null"/> when the replica already serves
    /// <see cref="CollectionEventSettings.MaxStreams"/> streams.
    /// </summary>
    public CollectionEventSubscription? TrySubscribe(CollectionId collection)
    {
        CollectionEventSubscription subscription;
        lock (_lock)
        {
            if (_streamCount >= _settings.MaxStreams)
                return null;

            subscription = new CollectionEventSubscription(this, collection, joinedAfterBatch: _batchesTaken);
            if (!_subscribers.TryGetValue(collection, out var subscribers))
            {
                subscribers = [];
                _subscribers[collection] = subscribers;
            }
            subscribers.Add(subscription);
            _streamCount++;

            // The subscriber's first snapshot comes from a batch taken after this mark, so it can never predate
            // the subscription
            MarkChangedLocked(collection);
        }

        Metrics.CollectionEventStreams.Add(1);
        _wake.Signal();
        return subscription;
    }

    /// <summary>Costs one lookup when no subscriber on this replica follows <paramref name="collection"/>.</summary>
    public void MarkDirty(CollectionId collection)
    {
        lock (_lock)
        {
            if (!_subscribers.ContainsKey(collection) || !MarkChangedLocked(collection))
                return;
        }

        _wake.Signal();
    }

    /// <summary>Marks every subscribed collection for a read that gives way to the changed collections.</summary>
    public void MarkAllDirty()
    {
        lock (_lock)
        {
            foreach (var collection in _subscribers.Keys.Where(c => !_changed.Contains(c)))
                _swept.Add(collection);
        }

        _wake.Signal();
    }

    internal void Unsubscribe(CollectionEventSubscription subscription)
    {
        lock (_lock)
        {
            if (
                !_subscribers.TryGetValue(subscription.Collection, out var subscribers)
                || !subscribers.Remove(subscription)
            )
                return;

            _streamCount--;
            if (subscribers.Count == 0)
            {
                _subscribers.Remove(subscription.Collection);
                _changed.Remove(subscription.Collection);
                _swept.Remove(subscription.Collection);
            }
        }

        Metrics.CollectionEventStreams.Add(-1);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var nextSweep = timeProvider.GetUtcNow() + _settings.SweepInterval;
        var retryDelay = _initialRetryDelay;

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var now = timeProvider.GetUtcNow();
                if (now >= nextSweep)
                {
                    MarkAllDirty();
                    nextSweep = now + _settings.SweepInterval;
                }

                // Reset before taking the batch, so a mark made after the take wakes the wait below at once
                _wake.Reset();
                var (batch, batchNumber) = TakeDirty();
                if (batch.Count == 0)
                {
                    await WaitForWork(nextSweep - now, stoppingToken);
                    continue;
                }

                if (await TryRead(batch, batchNumber, stoppingToken))
                {
                    retryDelay = _initialRetryDelay;
                    continue;
                }

                lock (_lock)
                {
                    foreach (var collection in batch.Where(_subscribers.ContainsKey))
                        MarkChangedLocked(collection);
                }

                await Task.Delay(retryDelay, timeProvider, stoppingToken);
                retryDelay = TimeSpan.FromTicks(Math.Min(retryDelay.Ticks * 2, _maxRetryDelay.Ticks));
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }
    }

    private bool MarkChangedLocked(CollectionId collection)
    {
        if (!_changed.Add(collection))
            return false;

        _swept.Remove(collection);
        return true;
    }

    /// <summary>
    /// Takes up to a batch of dirty collections, the changed ones first, and numbers it. Their marks are cleared
    /// before they are read, so a notification that arrives during the read marks them again and causes another read.
    /// </summary>
    private (List<CollectionId> Batch, long BatchNumber) TakeDirty()
    {
        lock (_lock)
        {
            var size = Math.Min(_changed.Count + _swept.Count, _settings.MaxBatchSize);

            // Up to a quarter of the batch is the sweep's. Changes alone could otherwise fill every batch, and the
            // idle streams would go silent.
            var sweepShare = Math.Min(_swept.Count, Math.Max(1, _settings.MaxBatchSize / 4));
            var batch = new List<CollectionId>(size);
            _changed.TakeInto(batch, size - sweepShare);
            _swept.TakeInto(batch, size - batch.Count);

            return (batch, ++_batchesTaken);
        }
    }

    private async Task WaitForWork(TimeSpan untilSweep, CancellationToken stoppingToken)
    {
        using var waitCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        await Task.WhenAny(_wake.Wait(waitCts.Token), Task.Delay(untilSweep, timeProvider, waitCts.Token));
        await waitCts.CancelAsync();
        stoppingToken.ThrowIfCancellationRequested();
    }

    private async Task<bool> TryRead(List<CollectionId> batch, long batchNumber, CancellationToken stoppingToken)
    {
        using var activity = Metrics.Source.StartActivity(
            "CollectionEventHub.Read",
            tags: [(TelemetryAttributes.BatchSize, batch.Count)]
        );
        var startedAt = timeProvider.GetTimestamp();

        try
        {
            using var scope = scopeFactory.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
            var snapshots = await repository.GetCollectionDetails(batch, stoppingToken);

            Metrics.CollectionEventCollectionsRead.Add(batch.Count);
            Publish(batch, batchNumber, snapshots);
            return true;
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.ReadFailed(batch.Count, ex);
            return false;
        }
        finally
        {
            Metrics.CollectionEventReadDuration.Record(timeProvider.GetElapsedTime(startedAt).TotalSeconds);
        }
    }

    /// <summary>
    /// Skips the subscribers that joined after the batch was taken: the read may predate them, and the read their
    /// own mark causes serves them.
    /// </summary>
    private void Publish(
        List<CollectionId> batch,
        long batchNumber,
        IReadOnlyDictionary<CollectionId, WorkflowCollectionDetailResponse> snapshots
    )
    {
        lock (_lock)
        {
            foreach (var collection in batch)
            {
                if (!_subscribers.TryGetValue(collection, out var subscribers))
                    continue;

                var snapshot = snapshots.GetValueOrDefault(collection);
                foreach (var subscriber in subscribers.Where(s => s.JoinedAfterBatch < batchNumber))
                    subscriber.Publish(snapshot);
            }
        }
    }

    /// <summary>Collections in the order they were added, each at most once. Any of them can leave.</summary>
    private sealed class DirtyQueue
    {
        private readonly LinkedList<CollectionId> _order = new();
        private readonly Dictionary<CollectionId, LinkedListNode<CollectionId>> _nodes = [];

        public int Count => _nodes.Count;

        public bool Contains(CollectionId collection) => _nodes.ContainsKey(collection);

        public bool Add(CollectionId collection)
        {
            if (_nodes.ContainsKey(collection))
                return false;

            _nodes[collection] = _order.AddLast(collection);
            return true;
        }

        public void Remove(CollectionId collection)
        {
            if (_nodes.Remove(collection, out var node))
                _order.Remove(node);
        }

        /// <summary>Moves the <paramref name="count"/> oldest collections, or all there are, to the batch.</summary>
        public void TakeInto(List<CollectionId> batch, int count)
        {
            for (; count > 0 && _order.First is { } oldest; count--)
            {
                batch.Add(oldest.Value);
                _nodes.Remove(oldest.Value);
                _order.RemoveFirst();
            }
        }
    }
}

/// <summary>
/// One stream's view of a subscribed collection: the latest snapshot it has not taken yet. A slow reader misses the
/// snapshots in between and never holds up the hub or another subscriber.
/// </summary>
internal sealed class CollectionEventSubscription : IDisposable
{
    private readonly CollectionEventHub _hub;
    private readonly Channel<WorkflowCollectionDetailResponse> _snapshots =
        Channel.CreateBounded<WorkflowCollectionDetailResponse>(
            new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true }
        );
    private CancellationTokenSource? _ending;
    private int _disposed;

    internal CollectionEventSubscription(CollectionEventHub hub, CollectionId collection, long joinedAfterBatch)
    {
        _hub = hub;
        Collection = collection;
        JoinedAfterBatch = joinedAfterBatch;
    }

    public CollectionId Collection { get; }

    /// <summary>The number of batches the hub had taken when this subscription joined.</summary>
    internal long JoinedAfterBatch { get; }

    /// <summary>
    /// Waits for the next snapshot. <see langword="null"/> once the collection no longer exists or the subscription
    /// is disposed.
    /// </summary>
    public async ValueTask<WorkflowCollectionDetailResponse?> Next(CancellationToken cancellationToken)
    {
        while (await _snapshots.Reader.WaitToReadAsync(cancellationToken))
        {
            if (_snapshots.Reader.TryRead(out var snapshot))
                return snapshot;
        }

        return null;
    }

    /// <summary>
    /// Disposes the subscription when any of the tokens fires, so that <see cref="Next"/> returns
    /// <see langword="null"/> where a canceled wait would throw. Call it once; disposing the subscription releases
    /// the tokens.
    /// </summary>
    public void EndWhen(params ReadOnlySpan<CancellationToken> tokens)
    {
        Assert.That(_ending is null, "EndWhen is called once per subscription");
        _ending = CancellationTokenSource.CreateLinkedTokenSource(tokens);
        _ending.Token.UnsafeRegister(static s => (s as CollectionEventSubscription)?.Dispose(), this);
    }

    /// <summary>A <see langword="null"/> snapshot means the collection is gone, which ends the subscription.</summary>
    internal void Publish(WorkflowCollectionDetailResponse? snapshot)
    {
        if (snapshot is null)
            _snapshots.Writer.TryComplete();
        else
            _snapshots.Writer.TryWrite(snapshot);
    }

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) == 1)
            return;

        _snapshots.Writer.TryComplete();
        _hub.Unsubscribe(this);
        _ending?.Dispose();
    }
}

internal static partial class CollectionEventHubLogs
{
    [LoggerMessage(LogLevel.Warning, "Reading {Count} subscribed collections failed; they stay dirty and are retried")]
    internal static partial void ReadFailed(this ILogger<CollectionEventHub> logger, int count, Exception ex);
}
