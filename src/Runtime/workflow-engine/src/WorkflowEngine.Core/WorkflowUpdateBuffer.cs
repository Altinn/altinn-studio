using System.Threading.Channels;
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
/// Abstraction for submitting workflow status updates for batched persistence.
/// </summary>
internal interface IWorkflowUpdateBuffer
{
    /// <summary>
    /// Submits a workflow and its dirty steps for batched persistence.
    /// Returns when the update has been flushed to the database.
    /// </summary>
    Task Submit(Workflow workflow, CancellationToken ct);
}

/// <summary>
/// Batches workflow + step status updates from concurrent workers into single DB writes.
/// Workers submit dirty workflow state via <see cref="Submit"/> and await confirmation
/// that the update has been persisted. A background loop drains the channel and flushes
/// updates to the database.
/// </summary>
internal sealed class WorkflowUpdateBuffer : BackgroundService, IWorkflowUpdateBuffer
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WorkflowUpdateBuffer> _logger;
    private readonly Channel<WorkflowUpdateRequest> _channel;
    private readonly EngineSettings _settings;

    public WorkflowUpdateBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<WorkflowUpdateBuffer> logger,
        IOptions<EngineSettings> settings
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = settings.Value;

        _channel = Channel.CreateBounded<WorkflowUpdateRequest>(
            new BoundedChannelOptions(_settings.UpdateBuffer.MaxQueueSize)
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
    public async Task Submit(Workflow workflow, CancellationToken ct)
    {
        var dirtySteps = workflow.Steps.Where(s => s.HasPendingChanges).ToList();

        using var activity = Metrics.Source.StartActivity(
            "WorkflowUpdateBuffer.Submit",
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

        var request = new WorkflowUpdateRequest(workflow, dirtySteps, tcs);

        await _channel.Writer.WriteAsync(request, ct);

        await tcs.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "WorkflowUpdateBuffer started (MaxBatchSize={MaxBatchSize}, Concurrency={Concurrency})",
            _settings.UpdateBuffer.MaxBatchSize,
            _settings.UpdateBuffer.FlushConcurrency
        );

        using var flushSemaphore = new SemaphoreSlim(_settings.UpdateBuffer.FlushConcurrency);
        var batch = new List<WorkflowUpdateRequest>(_settings.UpdateBuffer.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                while (batch.Count < _settings.UpdateBuffer.MaxBatchSize && _channel.Reader.TryRead(out var item))
                {
                    batch.Add(item);
                }

                await flushSemaphore.WaitAsync(stoppingToken);

                var batchToFlush = batch;
                batch = new List<WorkflowUpdateRequest>(_settings.UpdateBuffer.MaxBatchSize);

                _ = FlushBatch(batchToFlush, flushSemaphore, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        // Wait for all in-flight flushes to complete
        for (int i = 0; i < _settings.UpdateBuffer.FlushConcurrency; i++)
        {
            await flushSemaphore.WaitAsync(CancellationToken.None);
        }

        // batch may still hold items from an interrupted iteration — append remaining channel items
        while (_channel.Reader.TryRead(out var remaining))
        {
            batch.Add(remaining);
        }

        if (batch.Count > 0)
        {
            await FlushBatchCore(batch, CancellationToken.None);
        }

        _logger.LogInformation("WorkflowUpdateBuffer shutdown complete");
    }

    private async Task FlushBatch(List<WorkflowUpdateRequest> batch, SemaphoreSlim semaphore, CancellationToken ct)
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

    private async Task FlushBatchCore(List<WorkflowUpdateRequest> batch, CancellationToken ct)
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
            "WorkflowUpdateBuffer.FlushBatchCore",
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
            _logger.LogError(ex, "Update flush failed for {Count} requests", batch.Count);
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
internal sealed record WorkflowUpdateRequest(
    Workflow Workflow,
    IReadOnlyList<Step> DirtySteps,
    TaskCompletionSource Completion
);
