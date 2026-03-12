using System.Threading.Channels;
using Altinn.Studio.Runtime.Common;
using Microsoft.Extensions.Options;
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
    private readonly WorkflowWriteBufferOptions _options;
    private readonly AsyncSignal _workflowSignal;

    public WorkflowWriteBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<WorkflowWriteBuffer> logger,
        IOptions<WorkflowWriteBufferOptions> options,
        AsyncSignal workflowSignal
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
        _workflowSignal = workflowSignal;

        _channel = Channel.CreateBounded<BufferedEnqueueRequest>(
            new BoundedChannelOptions(_options.MaxQueueSize)
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
    public async Task<Guid[]> EnqueueAsync(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        byte[] requestBodyHash,
        CancellationToken ct
    )
    {
        using var activity = Metrics.Source.StartActivity("WorkflowWriteBuffer.EnqueueAsync");

        var tcs = new TaskCompletionSource<Guid[]>(TaskCreationOptions.RunContinuationsAsynchronously);
        var item = new BufferedEnqueueRequest(request, metadata, requestBodyHash, tcs);

        await _channel.Writer.WriteAsync(item, ct);

        // Register cancellation so the caller isn't stuck if the request is cancelled
        await using var reg = ct.Register(() => tcs.TrySetCanceled(ct));

        return await tcs.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "WorkflowWriteBuffer started (MaxBatchSize={MaxBatchSize}, Concurrency={Concurrency})",
            _options.MaxBatchSize,
            _options.FlushConcurrency
        );

        using var flushSemaphore = new SemaphoreSlim(_options.FlushConcurrency);
        var batch = new List<BufferedEnqueueRequest>(_options.MaxBatchSize);

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
                batch = new List<BufferedEnqueueRequest>(_options.MaxBatchSize);

                _ = FlushBatchAsync(batchToFlush, flushSemaphore, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        // Wait for all in-flight flushes to complete
        for (int i = 0; i < _options.FlushConcurrency; i++)
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
            await FlushBatchCoreAsync(batch, CancellationToken.None);
        }

        _logger.LogInformation("WorkflowWriteBuffer shutdown complete");
    }

    private async Task FlushBatchAsync(
        List<BufferedEnqueueRequest> batch,
        SemaphoreSlim semaphore,
        CancellationToken ct
    )
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

    private async Task FlushBatchCoreAsync(List<BufferedEnqueueRequest> batch, CancellationToken ct)
    {
        // TODO: Get rid of the `active` alias and just mutate `batch`, since that's what's happening anyway
        // Filter out items whose callers have already cancelled
        var active = batch;
        for (int i = active.Count - 1; i >= 0; i--)
        {
            if (active[i].Completion.Task.IsCanceled)
                active.RemoveAt(i);
        }

        if (active.Count == 0)
        {
            return;
        }

        using var activity = Metrics.Source.StartActivity(
            "WorkflowWriteBuffer.FlushBatchCoreAsync",
            tags: [("batch.size", active.Count)],
            links: active.Select(x => Metrics.ParseTraceContext(x.Metadata.TraceContext)).ToActivityLinks()
        );

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            var results = await repo.BatchEnqueueWorkflowsAsync(active, ct);

            // Distribute results back to each caller
            bool anyNewWorkflows = false;
            int totalWorkflowsCreated = 0;
            int totalStepsCreated = 0;

            for (int i = 0; i < active.Count; i++)
            {
                var item = active[i];
                var result = results[i];

                switch (result.Status)
                {
                    case BatchEnqueueResultStatus.Created:
                        Assert.That(result.WorkflowIds is not null);
                        anyNewWorkflows = true;
                        totalWorkflowsCreated += item.Request.Workflows.Count;
                        totalStepsCreated += item.Request.Workflows.Sum(w => w.Steps.Count());
                        item.Completion.TrySetResult(result.WorkflowIds);
                        break;

                    case BatchEnqueueResultStatus.Duplicate:
                        Assert.That(result.WorkflowIds is not null);
                        item.Completion.TrySetResult(result.WorkflowIds);
                        break;

                    case BatchEnqueueResultStatus.Conflict:
                        item.Completion.TrySetException(new IdempotencyConflictException(item.Request.IdempotencyKey));
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Batch flush failed for {Count} requests", active.Count);

            activity?.Errored(ex);

            foreach (var item in active)
            {
                item.Completion.TrySetException(ex);
            }
        }
    }
}

/// <summary>
/// Configuration options for the <see cref="WorkflowWriteBuffer"/>.
/// </summary>
internal sealed class WorkflowWriteBufferOptions
{
    /// <summary>Maximum number of enqueue requests per batch flush.</summary>
    public int MaxBatchSize { get; set; } = 100;

    /// <summary>Maximum number of pending requests in the channel before backpressure is applied.</summary>
    public int MaxQueueSize { get; set; } = 10_000;

    /// <summary>Number of concurrent flush operations (each uses its own DB connection).</summary>
    public int FlushConcurrency { get; set; } = 8;
}
