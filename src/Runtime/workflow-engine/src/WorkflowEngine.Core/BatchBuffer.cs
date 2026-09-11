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
/// Coalesces concurrent single-request calls into batched database writes: each caller awaits the
/// <see cref="TaskCompletionSource{TResult}"/> on its request while a drain loop hands batches to a bounded pool
/// of flushers, each using its own DB connection.
/// </summary>
/// <remarks>
/// The assertion in <see cref="FillBatch"/> escapes as an unhandled <see cref="BackgroundService"/> exception and
/// stops the host under the framework default <see cref="BackgroundServiceExceptionBehavior.StopHost"/>. That is
/// wanted, and why a host composing these buffers must not switch to
/// <see cref="BackgroundServiceExceptionBehavior.Ignore"/>: a dead drain loop behind a
/// <see cref="BoundedChannelFullMode.Wait"/> channel blocks callers forever, with neither an error nor a refusal.
/// Subclasses record nothing: commit-gated metrics belong to the repository, verdict-shaped ones to the
/// caller-facing layer.
/// </remarks>
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
    /// <paramref name="operation"/> tags this buffer's flush measurements. A constructor argument rather than
    /// <see cref="object.GetType"/>, so a class rename cannot move a dashboard's series.
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

        _name = GetType().Name;
        _enqueueActivityName = $"{_name}.Enqueue";
        _flushActivityName = $"{_name}.FlushBatch";

        _channel = Channel.CreateBounded<TItem>(
            new BoundedChannelOptions(_settings.MaxQueueSize)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = true,
                SingleWriter = false,
            }
        );
    }

    internal int QueueDepth => _channel.Reader.Count;

    /// <summary>
    /// Runs one batch and answers every request in it. Results are positional; a throw faults every request in
    /// the batch, so exceptions may escape.
    /// </summary>
    protected abstract Task FlushCore(IReadOnlyList<TItem> batch, IEngineRepository repository, CancellationToken ct);

    /// <summary>
    /// Whether <paramref name="item"/> may join the batch being drained, which already holds
    /// <paramref name="batch"/>. Override where requests differ in what they cost a flush, such as payload size.
    /// </summary>
    /// <remarks>
    /// Never consulted for a batch's first item, which always joins: an item nothing would accept would sit at
    /// the head of the channel forever.
    /// </remarks>
    protected virtual bool CanAddToBatch(TItem item, IReadOnlyList<TItem> batch) => true;

    /// <summary>
    /// Submits <paramref name="item"/> for batched execution, answered with the verdict at its own position once
    /// its batch has flushed. A full queue delays the caller rather than refusing.
    /// </summary>
    /// <remarks>
    /// Cancelling <paramref name="ct"/> abandons the wait, not the work: a request canceled after its flush
    /// started may still commit, and replaying the idempotency key is how a caller finds out which happened.
    /// </remarks>
    protected async Task<TResult> EnqueueItem(TItem item, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity(_enqueueActivityName);

        // Registered before the write: the token could otherwise fire in the gap and leave the request queued
        // but never canceled
        await using var reg = ct.Register(() => item.Completion.TrySetCanceled(ct));

        await _channel.Writer.WriteAsync(item, ct);

        return await item.Completion.Task;
    }

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

                // Yield so more items accumulate before draining — measurably better batch fill under stampede
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

        using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            for (int i = 0; i < _settings.FlushConcurrency; i++)
            {
                await flushSemaphore.WaitAsync(drainCts.Token);
            }

            // batch may still hold items from an interrupted iteration
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
            foreach (var pending in batch)
            {
                pending.Completion.TrySetCanceled(drainCts.Token);
            }

            while (_channel.Reader.TryRead(out var pending))
            {
                pending.Completion.TrySetCanceled(drainCts.Token);
            }

            _logger.BatchBufferDrainTimedOut(_name, _settings.FlushConcurrency);
        }
    }

    private void FillBatch(List<TItem> batch)
    {
        while (batch.Count < _settings.MaxBatchSize && _channel.Reader.TryPeek(out var next))
        {
            if (batch.Count > 0 && !CanAddToBatch(next, batch))
            {
                break;
            }

            bool read = _channel.Reader.TryRead(out var item);
            Assert.That(read && ReferenceEquals(item, next), "A peeked item was not the one read.");

            batch.Add(next);
        }
    }

    private async Task FlushBatch(List<TItem> batch, CancellationToken ct)
    {
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

            // Recorded together, at the one point a batch is known answered: a dashboard divides the two, so a
            // faulted flush must count in neither
            Metrics.MailboxBufferFlushedItems.Add(batch.Count, ("operation", _operation));
            Metrics.MailboxBufferFlushedBatches.Add(1, ("operation", _operation));
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
