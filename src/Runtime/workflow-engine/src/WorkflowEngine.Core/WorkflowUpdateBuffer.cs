using System.Diagnostics;
using System.Text.Json;
using System.Threading.Channels;
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
/// Abstraction for submitting workflow status updates for batched persistence.
/// </summary>
internal interface IWorkflowUpdateBuffer
{
    /// <summary>
    /// Submits a workflow and its dirty steps for batched persistence.
    /// Returns when the update has been flushed to the database.
    /// </summary>
    Task Submit(
        Workflow workflow,
        CancellationToken ct,
        IReadOnlyList<Step>? dirtySteps = null,
        string? reason = null,
        Activity? parentActivity = null
    );

    /// <summary>
    /// Submits a workflow and its dirty steps for batched persistence without awaiting the flush.
    /// The update is best-effort — if a later <see cref="Submit"/> for the same workflow arrives
    /// before this one is flushed, the deduplication logic will discard this entry and only
    /// persist the latest state. Suitable for progress updates (e.g. step started) where
    /// at-least-once delivery of the terminal state is sufficient.
    /// </summary>
    void SubmitAndForget(
        Workflow workflow,
        CancellationToken ct,
        IReadOnlyList<Step>? dirtySteps = null,
        string? reason = null,
        Activity? parentActivity = null
    );
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
                SingleReader = true,
                SingleWriter = false,
            }
        );
    }

    /// <summary>
    /// Submits a workflow and its dirty steps for batched persistence.
    /// Returns when the update has been flushed to the database.
    /// </summary>
    public async Task Submit(
        Workflow workflow,
        CancellationToken ct,
        IReadOnlyList<Step>? dirtySteps = null,
        string? reason = null,
        Activity? parentActivity = null
    )
    {
        dirtySteps ??= [];

        reason ??= $"workflow.{JsonNamingPolicy.CamelCase.ConvertName(workflow.Status.ToString())}";

        using var activity = Metrics.Source.StartActivity(
            "WorkflowUpdateBuffer.Submit",
            parentContext: parentActivity?.Context ?? workflow.EngineActivity?.Context,
            tags:
            [
                ("workflow.database.id", workflow.DatabaseId),
                ("workflow.operation.id", workflow.OperationId),
                ("workflow.status", workflow.Status.ToString()),
                ("dirty.steps.count", dirtySteps.Count),
                ("submit.reason", reason),
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

    /// <inheritdoc/>
    public void SubmitAndForget(
        Workflow workflow,
        CancellationToken ct,
        IReadOnlyList<Step>? dirtySteps = null,
        string? reason = null,
        Activity? parentActivity = null
    )
    {
        dirtySteps ??= [];

        reason ??= $"workflow.{JsonNamingPolicy.CamelCase.ConvertName(workflow.Status.ToString())}";

        Metrics
            .Source.StartActivity(
                "WorkflowUpdateBuffer.SubmitAndForget",
                parentContext: parentActivity?.Context ?? workflow.EngineActivity?.Context,
                tags:
                [
                    ("workflow.database.id", workflow.DatabaseId),
                    ("workflow.operation.id", workflow.OperationId),
                    ("workflow.status", workflow.Status.ToString()),
                    ("dirty.steps.count", dirtySteps.Count),
                    ("submit.reason", reason),
                ]
            )
            ?.Dispose();

        // No TCS — a later Submit() for the same workflow will supersede this via dedup.
        var request = new WorkflowUpdateRequest(workflow, dirtySteps, Completion: null);

        if (!_channel.Writer.TryWrite(request))
        {
            Metrics.UpdateBufferDroppedItems.Add(1);
            _logger.UpdateBufferDropped(workflow.DatabaseId, workflow.OperationId);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.UpdateBufferStarted(_settings.UpdateBuffer.MaxBatchSize);

        var batch = new List<WorkflowUpdateRequest>(_settings.UpdateBuffer.MaxBatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    break;
                }

                // Brief yield to let more items accumulate before draining —
                // under stampede conditions this significantly increases batch fill and deduplication.
                await Task.Yield();

                while (batch.Count < _settings.UpdateBuffer.MaxBatchSize && _channel.Reader.TryRead(out var item))
                {
                    batch.Add(item);
                }

                await FlushBatch(batch, stoppingToken);
                batch = new List<WorkflowUpdateRequest>(_settings.UpdateBuffer.MaxBatchSize);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        // Drain remaining items on shutdown, bounded to prevent indefinite hangs.
        using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            while (_channel.Reader.TryRead(out var remaining))
            {
                batch.Add(remaining);
            }

            if (batch.Count > 0)
            {
                await FlushBatch(batch, drainCts.Token);
            }

            _logger.UpdateBufferShutdownComplete();
        }
        catch (OperationCanceledException) when (drainCts.IsCancellationRequested)
        {
            foreach (var pending in batch)
            {
                pending.Completion?.TrySetCanceled(drainCts.Token);
            }

            while (_channel.Reader.TryRead(out var pending))
            {
                pending.Completion?.TrySetCanceled(drainCts.Token);
            }

            _logger.UpdateBufferDrainTimedOut();
        }
    }

    /// <summary>
    /// Removes duplicate entries for the same workflow, keeping only the latest submission.
    /// Earlier entries are completed immediately — they've been superseded by newer state.
    /// This is safe because the latest entry's dirty steps reflect the most recent mutations,
    /// and the Workflow reference carries the full current state.
    /// </summary>
    /// <remarks>
    /// Completing superseded entries with <c>TrySetResult()</c> before the final item is
    /// flushed cannot incorrectly signal a real caller: the handler is single-threaded per workflow,
    /// so an awaited <see cref="Submit"/> never has a concurrent second <see cref="Submit"/>
    /// in flight for the same workflow id. Only <see cref="SubmitAndForget"/> entries (which
    /// carry a null <c>Completion</c> and are safe under <c>?.TrySetResult</c>) can precede
    /// an awaited submission in a single batch. If that invariant ever changes — e.g. a
    /// second awaited writer enters the mix — this assumption must be revisited, since the
    /// earlier caller would be told "success" even though the final item may be rejected
    /// via lease loss.
    /// </remarks>
    private int DeduplicateBatch(List<WorkflowUpdateRequest> batch)
    {
        if (batch.Count <= 1)
            return 0;

        var latest = new Dictionary<Guid, int>(batch.Count);
        for (int i = 0; i < batch.Count; i++)
        {
            latest[batch[i].Workflow.DatabaseId] = i;
        }

        if (latest.Count == batch.Count)
            return 0;

        int superseded = batch.Count - latest.Count;

        var kept = new List<WorkflowUpdateRequest>(latest.Count);
        for (int i = 0; i < batch.Count; i++)
        {
            if (latest[batch[i].Workflow.DatabaseId] == i)
            {
                kept.Add(batch[i]);
            }
            else
            {
                batch[i].Completion?.TrySetResult();
            }
        }

        batch.Clear();
        batch.AddRange(kept);

        Metrics.UpdateBufferDeduplicatedItems.Add(superseded);
        _logger.UpdateBufferDeduplicated(superseded, batch.Count);

        return superseded;
    }

    private async Task FlushBatch(List<WorkflowUpdateRequest> batch, CancellationToken ct)
    {
        var deduplicated = DeduplicateBatch(batch);

        for (int i = batch.Count - 1; i >= 0; i--)
        {
            if (batch[i].Completion?.Task.IsCanceled == true)
            {
                batch.RemoveAt(i);
            }
        }

        if (batch.Count == 0)
        {
            return;
        }

        var totalDirtySteps = batch.Sum(x => x.DirtySteps.Count);
        var distinctNamespaces = batch.Select(x => x.Workflow.Namespace).Distinct().Count();

        using var activity = Metrics.Source.StartActivity(
            "WorkflowUpdateBuffer.FlushBatch",
            tags:
            [
                ("batch.received", batch.Count + deduplicated),
                ("batch.deduplicated", deduplicated),
                ("batch.flushed", batch.Count),
                ("batch.dirty.steps", totalDirtySteps),
                ("batch.namespaces", distinctNamespaces),
                ("db.operation", "batch_update_workflows_and_steps"),
            ],
            links: batch.Select(x => Metrics.ParseTraceContext(x.Workflow.EngineTraceContext)).ToActivityLinks()
        );

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            var updates = batch.Select(r => new BatchWorkflowStatusUpdate(r.Workflow, r.DirtySteps)).ToList();

            var result = await repo.BatchUpdateWorkflowsAndSteps(updates, ct);

            Metrics.UpdateBufferFlushedItems.Add(batch.Count);

            if (result.Rejected.Count == 0)
            {
                foreach (var request in batch)
                {
                    request.Completion?.TrySetResult();
                }
            }
            else
            {
                // Fault rejected callers with LeaseLostException; complete the rest normally.
                var rejected = result.Rejected.ToHashSet();
                foreach (var request in batch)
                {
                    if (rejected.Contains(request.Workflow.DatabaseId))
                    {
                        request.Completion?.TrySetException(new LeaseLostException(request.Workflow.DatabaseId));
                    }
                    else
                    {
                        request.Completion?.TrySetResult();
                    }
                }
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            foreach (var request in batch)
            {
                request.Completion?.TrySetCanceled(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.UpdateBufferFlushFailed(batch.Count, ex);
            activity?.Errored(ex);

            foreach (var request in batch)
            {
                request.Completion?.TrySetException(ex);
            }
        }
    }
}

internal static partial class WorkflowUpdateBufferLogs
{
    [LoggerMessage(LogLevel.Information, "WorkflowUpdateBuffer started (MaxBatchSize={MaxBatchSize})")]
    internal static partial void UpdateBufferStarted(this ILogger<WorkflowUpdateBuffer> logger, int maxBatchSize);

    [LoggerMessage(LogLevel.Information, "WorkflowUpdateBuffer shutdown complete")]
    internal static partial void UpdateBufferShutdownComplete(this ILogger<WorkflowUpdateBuffer> logger);

    [LoggerMessage(LogLevel.Warning, "WorkflowUpdateBuffer drain timed out — pending items may not have been flushed")]
    internal static partial void UpdateBufferDrainTimedOut(this ILogger<WorkflowUpdateBuffer> logger);

    [LoggerMessage(LogLevel.Error, "Update flush failed for {Count} requests")]
    internal static partial void UpdateBufferFlushFailed(
        this ILogger<WorkflowUpdateBuffer> logger,
        int count,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Warning,
        "SubmitAndForget dropped — update buffer channel full (WorkflowId={WorkflowId}, OperationId={OperationId})"
    )]
    internal static partial void UpdateBufferDropped(
        this ILogger<WorkflowUpdateBuffer> logger,
        Guid workflowId,
        string operationId
    );

    [LoggerMessage(LogLevel.Debug, "WorkflowUpdateBuffer deduplicated {Superseded} items, {Remaining} remain in batch")]
    internal static partial void UpdateBufferDeduplicated(
        this ILogger<WorkflowUpdateBuffer> logger,
        int superseded,
        int remaining
    );
}
