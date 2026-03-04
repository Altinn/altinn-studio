using System.Threading.Channels;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

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
            "Engine.SubmitStatusUpdate",
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

        var request = new StatusUpdateRequest(workflow, dirtySteps, tcs);

        await _channel.Writer.WriteAsync(request, ct);

        // Register cancellation so the caller isn't stuck if the request is cancelled
        await using var reg = ct.Register(() => tcs.TrySetCanceled(ct));

        await tcs.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "StatusWriteBuffer started (MaxBatchSize={MaxBatchSize}, FlushIntervalMs={FlushIntervalMs})",
            _options.MaxBatchSize,
            _options.FlushIntervalMs
        );

        var batch = new List<StatusUpdateRequest>(_options.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                batch.Clear();

                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                if (_channel.Reader.TryRead(out var first))
                {
                    batch.Add(first);
                }

                // Drain more items up to MaxBatchSize, waiting up to FlushIntervalMs
                if (batch.Count < _options.MaxBatchSize)
                {
                    using var flushCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                    flushCts.CancelAfter(_options.FlushIntervalMs);

                    try
                    {
                        while (batch.Count < _options.MaxBatchSize)
                        {
                            var item = await _channel.Reader.ReadAsync(flushCts.Token);
                            batch.Add(item);
                        }
                    }
                    catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)
                    {
                        // Flush interval expired — flush what we have
                    }
                }

                // Also drain any remaining immediately-available items
                while (batch.Count < _options.MaxBatchSize && _channel.Reader.TryRead(out var extra))
                {
                    batch.Add(extra);
                }

                if (batch.Count == 0)
                {
                    continue;
                }

                await FlushBatchAsync(batch, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        // Drain remaining items on shutdown
        batch.Clear();
        while (_channel.Reader.TryRead(out var remaining))
        {
            batch.Add(remaining);
        }

        if (batch.Count > 0)
        {
            await FlushBatchAsync(batch, CancellationToken.None);
        }

        _logger.LogInformation("StatusWriteBuffer shutdown complete");
    }

    private async Task FlushBatchAsync(List<StatusUpdateRequest> batch, CancellationToken ct)
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
            "Engine.FlushStatusBatch",
            tags: [("batch.size", batch.Count)]
        );

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineNpgsqlRepository>();

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
}
