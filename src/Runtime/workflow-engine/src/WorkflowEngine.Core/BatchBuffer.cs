using System.Threading.Channels;
using Altinn.Studio.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Coalesces concurrent single-request calls into batched database writes. Each caller submits a request into a
/// shared channel and awaits the <see cref="TaskCompletionSource{TResult}"/> on it; a background loop drains the
/// channel and hands batches to a bounded pool of concurrent flushers, each using its own DB connection.
/// <para>
/// The mechanics are <see cref="WorkflowWriteBuffer"/>'s — the bounded channel, the greedy drain, the
/// semaphore-bounded flushers, the 30-second shutdown drain — plus <see cref="WorkflowUpdateBuffer"/>'s
/// accumulate-before-draining yield. One thing is deliberately not carried over verbatim: the shutdown drain
/// keeps the batch bounds rather than flushing everything left as one batch, since a subclass bounding a
/// batch's cost has the same reason to on the way out. A subclass supplies only what is specific to its
/// operation: how a caller's arguments become a request (<see cref="EnqueueItem"/>), and what one batch does
/// in the database (<see cref="FlushCore"/>).
/// </para>
/// </summary>
/// <remarks>
/// The two assertions in here fail into deliberately different domains, which matters when registering a
/// subclass as a hosted service. <see cref="CompleteInOrder"/> asserts inside <see cref="FlushBatch"/>'s
/// <c>try</c>, so a violation faults that one batch's callers and the loop carries on. The assertion in
/// <see cref="FillBatch"/> has no such catch — <see cref="ExecuteAsync"/> handles only cancellation — so it
/// escapes as an unhandled <see cref="BackgroundService"/> exception and, under the framework default
/// <see cref="BackgroundServiceExceptionBehavior.StopHost"/>, stops the process loudly. That is the wanted
/// direction, and the engine configures no other behaviour: under
/// <see cref="BackgroundServiceExceptionBehavior.Ignore"/> the drain loop would be dead while the channel kept
/// accepting writes, and since a full channel waits rather than refusing, callers would block forever with
/// neither an error nor a refusal. Do not switch a host composing these buffers to ignoring
/// background-service exceptions.
/// </remarks>
/// <typeparam name="TItem">The buffered request type.</typeparam>
/// <typeparam name="TResult">The verdict a request is answered with.</typeparam>
internal abstract class BatchBuffer<TItem, TResult> : BackgroundService
    where TItem : class, IBufferedRequest<TResult>
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger _logger;
    private readonly BatchBufferSettings _settings;
    private readonly Channel<TItem> _channel;
    private readonly string _name;
    private readonly string _operation;
    private readonly string _enqueueActivityName;
    private readonly string _flushActivityName;

    /// <remarks>
    /// <paramref name="operation"/> is the <c>operation</c> tag this buffer's
    /// <see cref="Metrics.MailboxBufferFlushedItems"/> measurements carry — the mailbox path it serves. A
    /// constructor argument rather than something derived from <see cref="object.GetType"/>, so the tag values a
    /// dashboard groups by are not a class rename away from changing.
    /// </remarks>
    protected BatchBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger logger,
        BatchBufferSettings settings,
        string operation
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = settings;
        _operation = operation;

        // The concrete type's own name, so activities and logs cannot drift from the class they came from.
        _name = GetType().Name;
        _enqueueActivityName = $"{_name}.Enqueue";
        _flushActivityName = $"{_name}.FlushBatch";

        _channel = Channel.CreateBounded<TItem>(
            new BoundedChannelOptions(_settings.MaxQueueSize)
            {
                // Wait rather than drop or refuse: a caller meeting a full queue is delayed until the buffer
                // has room, never answered an admission refusal.
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = true,
                SingleWriter = false,
            }
        );
    }

    /// <summary>
    /// Requests waiting for a flush. Read as a gauge — it is a snapshot of a channel being written and drained
    /// concurrently, never a count anything can be decided on.
    /// </summary>
    internal int QueueDepth => _channel.Reader.Count;

    /// <summary>
    /// Runs one batch against the database and answers every request in it. Results are positional, so an
    /// implementation is a batch repository call followed by <see cref="CompleteInOrder"/>.
    /// </summary>
    /// <remarks>
    /// Records nothing: commit-gated metrics belong to the repository, which knows what committed, and
    /// verdict-shaped metrics belong to the caller-facing layer, which knows what a verdict means. A throw
    /// faults every request in the batch — <see cref="FlushBatch"/> does that, so an implementation may let
    /// exceptions out.
    /// </remarks>
    protected abstract Task FlushCore(IReadOnlyList<TItem> batch, IEngineRepository repository, CancellationToken ct);

    /// <summary>
    /// Whether <paramref name="item"/> may join the batch currently being drained, which already holds
    /// <paramref name="batch"/>. Default <c>true</c>: the batch size is the only bound.
    /// <para>
    /// Override where requests differ in what they cost a flush — large payloads can build an oversized command
    /// well before the batch-size limit is reached. Only the drain loop can hold a candidate back, since it is
    /// what owns the channel, which is why this is a hook rather than something a subclass could decide inside
    /// its <see cref="FlushCore"/>.
    /// </para>
    /// </summary>
    /// <remarks>
    /// Never consulted for a batch's first item, which always joins: an item nothing would accept would sit at
    /// the head of the channel forever.
    /// </remarks>
    protected virtual bool CanAddToBatch(TItem item, IReadOnlyList<TItem> batch) => true;

    /// <summary>
    /// Submits <paramref name="item"/> for batched execution. The returned task completes when the batch
    /// containing it has been flushed, carrying the verdict at this request's position.
    /// </summary>
    /// <remarks>
    /// Cancelling <paramref name="ct"/> abandons the wait, not the work. A request whose token fires before its
    /// batch reaches the database is dropped from that batch and writes nothing, but one canceled after the
    /// flush has started may still commit — the caller is answered canceled either way. Replaying the same
    /// idempotency key is how a caller finds out which of the two happened.
    /// </remarks>
    protected async Task<TResult> EnqueueItem(TItem item, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity(_enqueueActivityName);

        // Register cancellation before writing so there's no window where the token fires
        // after the write but before the registration is in place
        await using var reg = ct.Register(() => item.Completion.TrySetCanceled(ct));

        await _channel.Writer.WriteAsync(item, ct);

        return await item.Completion.Task;
    }

    /// <summary>
    /// Answers every request in <paramref name="batch"/> with the result at its own position — the shape every
    /// batch repository method returns.
    /// </summary>
    protected static void CompleteInOrder(IReadOnlyList<TItem> batch, TResult[] results)
    {
        Assert.That(results.Length == batch.Count, "Batch results are not index-aligned with the batch.");

        for (int i = 0; i < batch.Count; i++)
        {
            batch[i].Completion.TrySetResult(results[i]);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.BatchBufferStarted(_name, _settings.MaxBatchSize, _settings.FlushConcurrency);

        using var flushSemaphore = new SemaphoreSlim(_settings.FlushConcurrency);
        var batch = new List<TItem>(_settings.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                // Brief yield to let more items accumulate before draining — the same one
                // WorkflowUpdateBuffer takes, which credits it with significantly better batch fill under
                // stampede conditions.
                await Task.Yield();

                FillBatch(batch);

                await flushSemaphore.WaitAsync(stoppingToken);

                _ = FlushAndRelease([.. batch]);
                batch = new List<TItem>(_settings.MaxBatchSize);

                async Task FlushAndRelease(List<TItem> batchToFlush)
                {
                    try
                    {
                        await FlushBatch(batchToFlush, stoppingToken);
                    }
                    finally
                    {
                        flushSemaphore.Release();
                    }
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        // Wait for all in-flight flushes to complete (bounded to prevent indefinite hangs)
        using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            for (int i = 0; i < _settings.FlushConcurrency; i++)
            {
                await flushSemaphore.WaitAsync(drainCts.Token);
            }

            // batch may still hold items from an interrupted iteration — top it up from the channel and flush,
            // in batches bounded exactly as the loop above bounds them. Shutting down is no reason to build a
            // bigger command than a running engine would.
            FillBatch(batch);
            while (batch.Count > 0)
            {
                drainCts.Token.ThrowIfCancellationRequested();

                await FlushBatch(batch, drainCts.Token);

                batch = new List<TItem>(_settings.MaxBatchSize);
                FillBatch(batch);
            }

            _logger.BatchBufferShutdownComplete(_name);
        }
        catch (OperationCanceledException) when (drainCts.IsCancellationRequested)
        {
            // Cancel any items still in the current batch
            foreach (var pending in batch)
            {
                pending.Completion.TrySetCanceled(drainCts.Token);
            }

            // Cancel any items still queued in the channel
            while (_channel.Reader.TryRead(out var pending))
            {
                pending.Completion.TrySetCanceled(drainCts.Token);
            }

            _logger.BatchBufferDrainTimedOut(_name, _settings.FlushConcurrency);
        }
    }

    /// <summary>
    /// Moves what is already queued into <paramref name="batch"/>, stopping at
    /// <see cref="BatchBufferSettings.MaxBatchSize"/> or at the first item <see cref="CanAddToBatch"/> holds
    /// back. A held-back item stays at the head of the channel and leads the next batch.
    /// </summary>
    private void FillBatch(List<TItem> batch)
    {
        while (batch.Count < _settings.MaxBatchSize && _channel.Reader.TryPeek(out var next))
        {
            if (batch.Count > 0 && !CanAddToBatch(next, batch))
            {
                break;
            }

            // Nothing else reads this channel: ExecuteAsync's drain loop and its shutdown path are the only
            // readers and run in sequence, so the read takes the item that was just peeked.
            bool read = _channel.Reader.TryRead(out var item);
            Assert.That(read && ReferenceEquals(item, next), "A peeked item was not the one read.");

            batch.Add(next);
        }
    }

    private async Task FlushBatch(List<TItem> batch, CancellationToken ct)
    {
        // Filter out items whose callers have already canceled
        for (int i = batch.Count - 1; i >= 0; i--)
        {
            if (batch[i].Completion.Task.IsCanceled)
                batch.RemoveAt(i);
        }

        if (batch.Count == 0)
        {
            return;
        }

        using var activity = Metrics.Source.StartActivity(
            _flushActivityName,
            tags: [("batch.size", batch.Count)],
            links: batch.Select(x => Metrics.ParseTraceContext(x.TraceContext)).ToActivityLinks()
        );

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            await FlushCore(batch, repo, ct);

            // Here and nowhere else: the batch's database work has returned and its verdicts are out. Anything
            // earlier would count requests that a fault is about to answer with an exception instead.
            Metrics.MailboxBufferFlushedItems.Add(batch.Count, ("operation", _operation));
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            foreach (var item in batch)
            {
                item.Completion.TrySetCanceled(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.BatchBufferFlushFailed(_name, batch.Count, ex);

            activity?.Errored(ex);

            foreach (var item in batch)
            {
                item.Completion.TrySetException(ex);
            }
        }
    }
}

internal static partial class BatchBufferLogs
{
    [LoggerMessage(LogLevel.Information, "{Buffer} started (MaxBatchSize={MaxBatchSize}, Concurrency={Concurrency})")]
    internal static partial void BatchBufferStarted(
        this ILogger logger,
        string buffer,
        int maxBatchSize,
        int concurrency
    );

    [LoggerMessage(LogLevel.Information, "{Buffer} shutdown complete")]
    internal static partial void BatchBufferShutdownComplete(this ILogger logger, string buffer);

    [LoggerMessage(LogLevel.Warning, "{Buffer} drain timed out — {Count} in-flight flushes may not have completed")]
    internal static partial void BatchBufferDrainTimedOut(this ILogger logger, string buffer, int count);

    [LoggerMessage(LogLevel.Error, "{Buffer} flush failed for {Count} requests")]
    internal static partial void BatchBufferFlushFailed(this ILogger logger, string buffer, int count, Exception ex);
}
