using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Batches workflow + step status updates from concurrent workers into single DB writes.
/// Workers submit dirty workflow state via <see cref="SubmitAsync"/> and await confirmation
/// that the update has been persisted. A background loop drains the channel and flushes
/// updates to the database.
/// </summary>
internal sealed class StatusWriteBuffer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StatusWriteBuffer> _logger;
    private readonly Channel<StatusUpdateRequest> _channel;
    private readonly StatusWriteBufferOptions _options;

    public StatusWriteBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<StatusWriteBuffer> logger,
        IOptions<StatusWriteBufferOptions> options
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;

        _channel = Channel.CreateBounded<StatusUpdateRequest>(
            new BoundedChannelOptions(_options.MaxQueueSize)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = false,
                SingleWriter = false,
            }
        );
    }

    /// <summary>
    /// Submits a workflow and its dirty steps for batched persistence.
    /// Returns when the update has been flushed to the database.
    /// </summary>
    public async Task SubmitAsync(Workflow workflow, CancellationToken ct)
    {
        var dirtySteps = workflow.Steps.Where(s => s.HasPendingChanges).ToList();

        using var activity = Metrics.Source.StartActivity(
            "StatusWriteBuffer.SubmitAsync",
            parentContext: workflow.EngineActivity?.Context,
            tags:
            [
                ("workflow.database.id", workflow.DatabaseId),
                ("workflow.operation.id", workflow.OperationId),
                ("workflow.status", workflow.Status.ToString()),
                ("dirty.steps.count", dirtySteps.Count),
            ]
        );

        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        // Register cancellation before writing so there's no window where the token fires
        // after the write but before the registration is in place
        await using var reg = ct.Register(() => tcs.TrySetCanceled(ct));

        var request = new StatusUpdateRequest(workflow, dirtySteps, tcs);

        await _channel.Writer.WriteAsync(request, ct);

        await tcs.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "StatusWriteBuffer started (MaxBatchSize={MaxBatchSize}, Concurrency={Concurrency})",
            _options.MaxBatchSize,
            _options.FlushConcurrency
        );

        using var flushSemaphore = new SemaphoreSlim(_options.FlushConcurrency);
        var batch = new List<StatusUpdateRequest>(_options.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                while (batch.Count < _options.MaxBatchSize && _channel.Reader.TryRead(out var item))
                {
                    batch.Add(item);
                }

                await flushSemaphore.WaitAsync(stoppingToken);

                var batchToFlush = batch;
                batch = new List<StatusUpdateRequest>(_options.MaxBatchSize);

                _ = FlushBatchAsync(batchToFlush, flushSemaphore, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        batch = [];
        while (_channel.Reader.TryRead(out var remaining))
        {
            batch.Add(remaining);
        }

        if (batch.Count > 0)
        {
            await FlushBatchCoreAsync(batch, CancellationToken.None);
        }

        _logger.LogInformation("StatusWriteBuffer shutdown complete");
    }

    private async Task FlushBatchAsync(List<StatusUpdateRequest> batch, SemaphoreSlim semaphore, CancellationToken ct)
    {
        try
        {
            await FlushBatchCoreAsync(batch, ct);
        }
        finally
        {
            semaphore.Release();
        }
    }

    private async Task FlushBatchCoreAsync(List<StatusUpdateRequest> batch, CancellationToken ct)
    {
        // Filter out items whose callers have already cancelled
        for (int i = batch.Count - 1; i >= 0; i--)
        {
            if (batch[i].Completion.Task.IsCanceled)
            {
                batch.RemoveAt(i);
            }
        }

        if (batch.Count == 0)
        {
            return;
        }

        using var activity = Metrics.Source.StartActivity(
            "StatusWriteBuffer.FlushBatchCoreAsync",
            tags: [("batch.size", batch.Count)],
            links: batch.Select(x => Metrics.ParseTraceContext(x.Workflow.EngineTraceContext)).ToActivityLinks()
        );

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            var updates = batch.Select(r => new BatchWorkflowStatusUpdate(r.Workflow, r.DirtySteps)).ToList();

            await repo.BatchUpdateWorkflowsAndSteps(updates, ct);

            foreach (var request in batch)
            {
                request.Completion.TrySetResult();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Status flush failed for {Count} requests", batch.Count);
            activity?.Errored(ex);

            // Fault all waiting callers
            foreach (var request in batch)
            {
                request.Completion.TrySetException(ex);
            }
        }
    }
}

/// <summary>
/// A single status update request waiting in the buffer.
/// </summary>
internal sealed record StatusUpdateRequest(
    Workflow Workflow,
    IReadOnlyList<Step> DirtySteps,
    TaskCompletionSource Completion
);

/// <summary>
/// Configuration options for the <see cref="StatusWriteBuffer"/>.
/// </summary>
internal sealed class StatusWriteBufferOptions
{
    /// <summary>Maximum number of status updates per batch flush.</summary>
    public int MaxBatchSize { get; set; } = 50;

    /// <summary>Maximum time (ms) to wait for the batch to fill before flushing.</summary>
    public int FlushIntervalMs { get; set; } = 5;

    /// <summary>Maximum number of pending requests in the channel before backpressure is applied.</summary>
    public int MaxQueueSize { get; set; } = 5_000;

    /// <summary>Number of concurrent flush operations (each uses its own DB connection).</summary>
    public int FlushConcurrency { get; set; } = 8;
}
