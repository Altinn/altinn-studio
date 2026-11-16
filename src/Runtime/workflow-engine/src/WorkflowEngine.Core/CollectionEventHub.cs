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
/// the listener reconnects and at every sweep. Every read is delivered, changed or not: an event is a snapshot, so a
/// repeat is harmless, and the sweep's reads are what keep an idle stream alive.
/// </remarks>
internal sealed class CollectionEventHub(
    IServiceScopeFactory scopeFactory,
    IOptions<EngineSettings> settings,
    TimeProvider timeProvider,
    ILogger<CollectionEventHub> logger
) : BackgroundService
{
    private static readonly TimeSpan _initialRetryDelay = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan _maxRetryDelay = TimeSpan.FromSeconds(30);

    private readonly CollectionEventSettings _settings = settings.Value.CollectionEvents;
    private readonly AsyncSignal _wake = new();
    private readonly Lock _lock = new();
    private readonly Dictionary<CollectionId, HashSet<CollectionEventSubscription>> _subscribers = [];

    // Dirty collections are read oldest mark first, so a hot collection cannot keep others waiting. The queue may
    // hold an id the set no longer does, which the read loop skips.
    private readonly HashSet<CollectionId> _dirty = [];
    private readonly Queue<CollectionId> _dirtyOrder = new();
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
            MarkDirtyLocked(collection);
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
            if (!_subscribers.ContainsKey(collection) || !MarkDirtyLocked(collection))
                return;
        }

        _wake.Signal();
    }

    public void MarkAllDirty()
    {
        lock (_lock)
        {
            foreach (var collection in _subscribers.Keys)
                MarkDirtyLocked(collection);
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
                _dirty.Remove(subscription.Collection);
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
                        MarkDirtyLocked(collection);
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

    private bool MarkDirtyLocked(CollectionId collection)
    {
        if (!_dirty.Add(collection))
            return false;

        _dirtyOrder.Enqueue(collection);
        return true;
    }

    /// <summary>
    /// Takes up to a batch of dirty collections, and numbers it. Their marks are cleared before they are read, so a
    /// notification that arrives during the read marks them again and causes another read.
    /// </summary>
    private (List<CollectionId> Batch, long BatchNumber) TakeDirty()
    {
        lock (_lock)
        {
            var batch = new List<CollectionId>(Math.Min(_dirty.Count, _settings.MaxBatchSize));
            while (batch.Count < _settings.MaxBatchSize && _dirtyOrder.TryDequeue(out var collection))
            {
                if (_dirty.Remove(collection))
                    batch.Add(collection);
            }

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
