using System.Threading.Channels;
using Altinn.Studio.Runtime.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Coalesces concurrent workflow enqueue requests into batched database writes.
/// Each HTTP caller submits work into a shared channel and awaits a <see cref="TaskCompletionSource{TResult}"/>
/// for its result (the workflow IDs). A background loop drains the channel and dispatches
/// batches to a pool of concurrent flushers, each using its own DB connection.
/// </summary>
internal class WorkflowWriteBuffer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WorkflowWriteBuffer> _logger;
    private readonly Channel<BufferedEnqueueRequest> _channel;
    private readonly EngineSettings _settings;
    private readonly AsyncSignal _workflowSignal;

    public WorkflowWriteBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<WorkflowWriteBuffer> logger,
        IOptions<EngineSettings> settings,
        AsyncSignal workflowSignal
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = settings.Value;
        _workflowSignal = workflowSignal;

        _channel = Channel.CreateBounded<BufferedEnqueueRequest>(
            new BoundedChannelOptions(_settings.WriteBuffer.MaxQueueSize)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = true,
                SingleWriter = false,
            }
        );
    }

    /// <summary>
    /// Submit workflows for batched insertion. The returned task completes when the
    /// batch containing this request has been flushed to the database.
    /// </summary>
    public async Task<WorkflowEnqueueOutcome> Enqueue(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        byte[] requestBodyHash,
        CancellationToken ct
    )
    {
        using var activity = Metrics.Source.StartActivity("WorkflowWriteBuffer.Enqueue");

        var tcs = new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously);
        var item = new BufferedEnqueueRequest(request, metadata, requestBodyHash, tcs);

        // Register cancellation before writing so there's no window where the token fires
        // after the write but before the registration is in place
        await using var reg = ct.Register(() => tcs.TrySetCanceled(ct));

        await _channel.Writer.WriteAsync(item, ct);

        return await tcs.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.WriteBufferStarted(_settings.WriteBuffer.MaxBatchSize, _settings.WriteBuffer.FlushConcurrency);

        using var flushSemaphore = new SemaphoreSlim(_settings.WriteBuffer.FlushConcurrency);
        var batch = new List<BufferedEnqueueRequest>(_settings.WriteBuffer.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                while (batch.Count < _settings.WriteBuffer.MaxBatchSize && _channel.Reader.TryRead(out var item))
                {
                    batch.Add(item);
                }

                await flushSemaphore.WaitAsync(stoppingToken);

                _ = FlushAndRelease([.. batch]);
                batch = new List<BufferedEnqueueRequest>(_settings.WriteBuffer.MaxBatchSize);

                async Task FlushAndRelease(List<BufferedEnqueueRequest> batchToFlush)
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
            for (int i = 0; i < _settings.WriteBuffer.FlushConcurrency; i++)
            {
                await flushSemaphore.WaitAsync(drainCts.Token);
            }

            // batch may still hold items from an interrupted iteration — append remaining channel items
            while (_channel.Reader.TryRead(out var remaining))
            {
                batch.Add(remaining);
            }

            if (batch.Count > 0)
            {
                await FlushBatch(batch, drainCts.Token);
            }

            _logger.WriteBufferShutdownComplete();
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

            _logger.WriteBufferDrainTimedOut(_settings.WriteBuffer.FlushConcurrency);
        }
    }

    private async Task FlushBatch(List<BufferedEnqueueRequest> batch, CancellationToken ct)
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
            "WorkflowWriteBuffer.FlushBatch",
            tags: [("batch.size", batch.Count)],
            links: batch.Select(x => Metrics.ParseTraceContext(x.Metadata.TraceContext)).ToActivityLinks()
        );

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            var results = await repo.BatchEnqueueWorkflowsAsync(batch, ct);

            // Distribute results back to each caller
            bool anyNewWorkflows = false;
            int totalWorkflowsCreated = 0;
            int totalStepsCreated = 0;

            for (int i = 0; i < batch.Count; i++)
            {
                var item = batch[i];
                var result = results[i];

                switch (result.Status)
                {
                    case BatchEnqueueResultStatus.Created:
                        Assert.That(result.WorkflowIds is not null);
                        anyNewWorkflows = true;
                        totalWorkflowsCreated += item.Request.Workflows.Count;
                        totalStepsCreated += item.Request.Workflows.Sum(w => w.Steps.Count);
                        item.Completion.TrySetResult(new WorkflowEnqueueOutcome(result.WorkflowIds, result.Status));
                        break;

                    case BatchEnqueueResultStatus.Duplicate:
                        Assert.That(result.WorkflowIds is not null);
                        item.Completion.TrySetResult(new WorkflowEnqueueOutcome(result.WorkflowIds, result.Status));
                        break;

                    case BatchEnqueueResultStatus.Conflict:
                        item.Completion.TrySetException(new IdempotencyConflictException(item.Metadata.IdempotencyKey));
                        break;

                    case BatchEnqueueResultStatus.InvalidReference:
                        Assert.That(result.ErrorMessage is not null);
                        item.Completion.TrySetException(new InvalidWorkflowReferenceException(result.ErrorMessage));
                        break;
                }
            }

            if (totalWorkflowsCreated > 0)
            {
                Metrics.WorkflowRequestsAccepted.Add(totalWorkflowsCreated);
            }

            if (totalStepsCreated > 0)
            {
                Metrics.StepRequestsAccepted.Add(totalStepsCreated);
            }

            if (anyNewWorkflows)
            {
                _workflowSignal.Signal();
            }
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
            _logger.WriteBufferFlushFailed(batch.Count, ex);

            activity?.Errored(ex);

            foreach (var item in batch)
            {
                item.Completion.TrySetException(ex);
            }
        }
    }
}

internal static partial class WorkflowWriteBufferLogs
{
    [LoggerMessage(
        LogLevel.Information,
        "WorkflowWriteBuffer started (MaxBatchSize={MaxBatchSize}, Concurrency={Concurrency})"
    )]
    internal static partial void WriteBufferStarted(
        this ILogger<WorkflowWriteBuffer> logger,
        int maxBatchSize,
        int concurrency
    );

    [LoggerMessage(LogLevel.Information, "WorkflowWriteBuffer shutdown complete")]
    internal static partial void WriteBufferShutdownComplete(this ILogger<WorkflowWriteBuffer> logger);

    [LoggerMessage(
        LogLevel.Warning,
        "WorkflowWriteBuffer drain timed out — {Count} in-flight flushes may not have completed"
    )]
    internal static partial void WriteBufferDrainTimedOut(this ILogger<WorkflowWriteBuffer> logger, int count);

    [LoggerMessage(LogLevel.Error, "Batch flush failed for {Count} requests")]
    internal static partial void WriteBufferFlushFailed(
        this ILogger<WorkflowWriteBuffer> logger,
        int count,
        Exception ex
    );
}
