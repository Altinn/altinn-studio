using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http;
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
/// Abstraction for submitting replies for batched persistence.
/// </summary>
internal interface IReplyWriteBuffer
{
    /// <summary>
    /// Submit a reply for batched processing. Validates the idempotency key, computes the
    /// payload hash, and enqueues the request into the channel. The returned task completes
    /// when the batch containing this request has been flushed to the database.
    /// Returns <c>null</c> if the idempotency key is missing (caller should return 400).
    /// </summary>
    Task<SubmitReplyResult> Submit(Guid replyId, string? payload, string idempotencyKey, CancellationToken ct);
}

/// <summary>
/// Coalesces concurrent reply submissions into batched database writes.
/// Each HTTP caller submits work into a shared channel and awaits a <see cref="TaskCompletionSource{TResult}"/>
/// for its result. A background loop drains the channel and dispatches
/// batches to a pool of concurrent flushers, each using its own DB connection.
/// </summary>
internal class ReplyWriteBuffer : BackgroundService, IReplyWriteBuffer
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReplyWriteBuffer> _logger;
    private readonly Channel<BufferedReplyRequest> _channel;
    private readonly EngineSettings _settings;
    private readonly AsyncSignal _workflowSignal;

    public ReplyWriteBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<ReplyWriteBuffer> logger,
        IOptions<EngineSettings> settings,
        AsyncSignal workflowSignal
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = settings.Value;
        _workflowSignal = workflowSignal;

        _channel = Channel.CreateBounded<BufferedReplyRequest>(
            new BoundedChannelOptions(_settings.ReplyBuffer.MaxQueueSize)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = true,
                SingleWriter = false,
            }
        );
    }

    /// <summary>
    /// Submit a reply for batched processing. Validates the idempotency key, computes the
    /// payload hash, and enqueues the request into the channel. The returned task completes
    /// when the batch containing this request has been flushed to the database.
    /// Returns <c>null</c> if the idempotency key is missing (caller should return 400).
    /// </summary>
    public virtual async Task<SubmitReplyResult> Submit(
        Guid replyId,
        string? payload,
        string idempotencyKey,
        CancellationToken ct
    )
    {
        using var activity = Metrics.Source.StartActivity("ReplyWriteBuffer.Submit");

        var payloadHash = SHA256.HashData(Encoding.UTF8.GetBytes(payload ?? string.Empty));

        var tcs = new TaskCompletionSource<SubmitReplyResult>(TaskCreationOptions.RunContinuationsAsynchronously);
        var item = new BufferedReplyRequest(replyId, payload, idempotencyKey, payloadHash, tcs);

        await _channel.Writer.WriteAsync(item, ct);

        // Register cancellation so the caller isn't stuck if the request is canceled
        await using var reg = ct.Register(() => tcs.TrySetCanceled(ct));

        return await tcs.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "ReplyWriteBuffer started (MaxBatchSize={MaxBatchSize}, Concurrency={Concurrency})",
            _settings.ReplyBuffer.MaxBatchSize,
            _settings.ReplyBuffer.FlushConcurrency
        );

        using var flushSemaphore = new SemaphoreSlim(_settings.ReplyBuffer.FlushConcurrency);
        var batch = new List<BufferedReplyRequest>(_settings.ReplyBuffer.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                while (batch.Count < _settings.ReplyBuffer.MaxBatchSize && _channel.Reader.TryRead(out var item))
                {
                    batch.Add(item);
                }

                await flushSemaphore.WaitAsync(stoppingToken);

                var batchToFlush = batch;
                batch = new List<BufferedReplyRequest>(_settings.ReplyBuffer.MaxBatchSize);

                _ = FlushBatch(batchToFlush, flushSemaphore, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        // Wait for all in-flight flushes to complete
        for (int i = 0; i < _settings.ReplyBuffer.FlushConcurrency; i++)
        {
            await flushSemaphore.WaitAsync(CancellationToken.None);
        }

        batch = [];
        while (_channel.Reader.TryRead(out var remaining))
        {
            batch.Add(remaining);
        }

        if (batch.Count > 0)
        {
            await FlushBatchCore(batch, CancellationToken.None);
        }

        _logger.LogInformation("ReplyWriteBuffer shutdown complete");
    }

    private async Task FlushBatch(List<BufferedReplyRequest> batch, SemaphoreSlim semaphore, CancellationToken ct)
    {
        try
        {
            await FlushBatchCore(batch, ct);
        }
        finally
        {
            semaphore.Release();
        }
    }

    private async Task FlushBatchCore(List<BufferedReplyRequest> batch, CancellationToken ct)
    {
        // Filter out items whose callers have already cancelled
        for (int i = batch.Count - 1; i >= 0; i--)
        {
            if (batch[i].Completion.Task.IsCanceled)
                batch.RemoveAt(i);
        }

        if (batch.Count == 0)
        {
            return;
        }

        using var activity = Metrics.Source.StartActivity("ReplyWriteBuffer.FlushBatchCore");
        activity?.SetTag("batch.size", batch.Count);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            var results = await repo.BatchSubmitReplies(batch, ct);

            // Distribute results back to each caller
            bool anyAccepted = false;

            for (int i = 0; i < batch.Count; i++)
            {
                var item = batch[i];
                var result = results[i];

                if (result == SubmitReplyResult.Accepted)
                {
                    anyAccepted = true;
                }

                item.Completion.TrySetResult(result);
            }

            // Signal the processor once if any replies were accepted
            if (anyAccepted)
            {
                _workflowSignal.Signal();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Batch flush failed for {Count} reply requests", batch.Count);

            activity?.Errored(ex);

            foreach (var item in batch)
            {
                item.Completion.TrySetException(ex);
            }
        }
    }
}
