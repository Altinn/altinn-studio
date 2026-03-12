using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Endpoints;

public static class DashboardEndpoints
{
    private static readonly JsonSerializerOptions _jsonCompact = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly JsonSerializerOptions _jsonIndented = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static WebApplication MapDashboardEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/dashboard/stream",
                async (
                    IEngineStatus engineStatus,
                    IConcurrencyLimiter limiter,
                    IServiceProvider sp,
                    HttpContext ctx,
                    CancellationToken ct
                ) =>
                {
                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    var scheduledCount = 0;
                    var iteration = 0;
                    string? previousFingerprint = null;
                    var lastSendTime = Stopwatch.GetTimestamp();
                    long minSendIntervalTicks = Stopwatch.Frequency / 20; // 50ms

                    while (!ct.IsCancellationRequested)
                    {
                        if (iteration % 300 == 0) // refresh every ~5s
                        {
                            try
                            {
                                using IServiceScope scope = sp.CreateScope();
                                var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                                scheduledCount = await repo.CountScheduledWorkflows(ct);
                            }
                            catch
                            { /* non-critical */
                            }
                        }
                        iteration++;

                        EngineHealthStatus status = engineStatus.Status;
                        ConcurrencyLimiter.SlotStatus dbSlot = limiter.DbSlotStatus;
                        ConcurrencyLimiter.SlotStatus httpSlot = limiter.HttpSlotStatus;
                        int activeWorkers = engineStatus.ActiveWorkerCount;
                        int maxWorkers = engineStatus.MaxWorkers;

                        string fingerprint =
                            $"{(int)status}|{activeWorkers}|{dbSlot.Used}|{httpSlot.Used}|{scheduledCount}";

                        long elapsed = Stopwatch.GetTimestamp() - lastSendTime;
                        if (fingerprint != previousFingerprint && elapsed >= minSendIntervalTicks)
                        {
                            previousFingerprint = fingerprint;
                            lastSendTime = Stopwatch.GetTimestamp();

                            var payload = new
                            {
                                timestamp = DateTimeOffset.UtcNow,
                                engineStatus = new
                                {
                                    running = status.HasFlag(EngineHealthStatus.Running),
                                    healthy = status.HasFlag(EngineHealthStatus.Healthy),
                                    idle = activeWorkers == 0,
                                    disabled = status.HasFlag(EngineHealthStatus.Disabled),
                                    queueFull = status.HasFlag(EngineHealthStatus.QueueFull),
                                },
                                capacity = new
                                {
                                    workers = new
                                    {
                                        used = activeWorkers,
                                        available = maxWorkers - activeWorkers,
                                        total = maxWorkers,
                                    },
                                    db = new
                                    {
                                        used = dbSlot.Used,
                                        available = dbSlot.Available,
                                        total = dbSlot.Total,
                                    },
                                    http = new
                                    {
                                        used = httpSlot.Used,
                                        available = httpSlot.Available,
                                        total = httpSlot.Total,
                                    },
                                },
                                scheduledCount,
                            };

                            string json = JsonSerializer.Serialize(payload, _jsonCompact);
                            await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                            await ctx.Response.Body.FlushAsync(ct);
                        }

                        await Task.Delay(16, ct);
                    }
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/stream/recent",
                async (IEngineStatus engineStatus, HttpContext ctx, CancellationToken ct) =>
                {
                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    string? previousFingerprint = null;

                    while (!ct.IsCancellationRequested)
                    {
                        IReadOnlyList<DashboardWorkflowDto> recent = engineStatus.GetRecentWorkflows(100);
                        string fingerprint = string.Join(",", recent.Select(r => r.IdempotencyKey));

                        if (fingerprint != previousFingerprint)
                        {
                            previousFingerprint = fingerprint;

                            string json = JsonSerializer.Serialize(recent, _jsonCompact);
                            await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                            await ctx.Response.Body.FlushAsync(ct);
                        }

                        await Task.Delay(500, ct);
                    }
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/labels",
                async (IServiceProvider sp, string key, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    IReadOnlyList<string> values = await repo.GetDistinctLabelValues(key, ct);
                    return Results.Json(values, _jsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/query",
                async (
                    IServiceProvider sp,
                    string? status,
                    string? search,
                    int? limit,
                    DateTimeOffset? before,
                    DateTimeOffset? since,
                    bool? retried,
                    string? labels,
                    CancellationToken ct
                ) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    int maxResults = Math.Min(limit ?? 100, 200);

                    PersistentItemStatus[] statuses = string.IsNullOrWhiteSpace(status)
                        ? [PersistentItemStatus.Completed, PersistentItemStatus.Failed, PersistentItemStatus.Requeued]
                        : status
                            .Split(',')
                            .Select(s =>
                                s.Trim().ToUpperInvariant() switch
                                {
                                    "COMPLETED" => PersistentItemStatus.Completed,
                                    "FAILED" => PersistentItemStatus.Failed,
                                    "REQUEUED" => PersistentItemStatus.Requeued,
                                    "ENQUEUED" => PersistentItemStatus.Enqueued,
                                    "PROCESSING" => PersistentItemStatus.Processing,
                                    "CANCELED" => (PersistentItemStatus?)PersistentItemStatus.Canceled,
                                    _ => null,
                                }
                            )
                            .Where(s => s != null)
                            .Select(s => s!.Value)
                            .ToArray();

                    bool retriedOnly = retried == true;

                    // Parse label filters from comma-separated "key:value" pairs
                    Dictionary<string, string>? labelFilters = ParseLabelFilters(labels);

                    (IReadOnlyList<Workflow> workflows, int totalCount) = await repo.GetFinishedWorkflowsWithCount(
                        statuses: statuses,
                        search: search,
                        take: maxResults,
                        before: before,
                        since: since,
                        retriedOnly: retriedOnly,
                        labelFilters: labelFilters,
                        cancellationToken: ct
                    );

                    var result = new { totalCount, workflows = workflows.Select(DashboardMapper.MapWorkflow) };

                    return Results.Json(result, _jsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/scheduled",
                async (IServiceProvider sp, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    IReadOnlyList<Workflow> workflows = await repo.GetScheduledWorkflows(ct);
                    return Results.Json(workflows.Select(DashboardMapper.MapWorkflow), _jsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/step",
                async (
                    IEngineStatus engineStatus,
                    IServiceProvider sp,
                    string wf,
                    string step,
                    DateTimeOffset? createdAt,
                    CancellationToken ct
                ) =>
                {
                    // Try DB first
                    Workflow? workflow = null;

                    if (createdAt.HasValue)
                    {
                        using IServiceScope scope = sp.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                        workflow = await repo.GetWorkflow(wf, createdAt.Value, ct);
                    }

                    if (workflow is not null)
                    {
                        Step? s = workflow.Steps.FirstOrDefault(st => st.IdempotencyKey == step);
                        if (s is null)
                            return Results.NotFound();

                        // Merge lastError from recent cache if the DB doesn't have it
                        DashboardWorkflowDto? cached = s.LastError is null
                            ? engineStatus.GetRecentWorkflows(100).FirstOrDefault(c => c.IdempotencyKey == wf)
                            : null;
                        string? lastError =
                            s.LastError ?? cached?.Steps.FirstOrDefault(cs => cs.IdempotencyKey == step)?.LastError;

                        var stateIn =
                            s.ProcessingOrder == 0
                                ? workflow.InitialState
                                : workflow
                                    .Steps.Where(st => st.ProcessingOrder < s.ProcessingOrder)
                                    .OrderByDescending(st => st.ProcessingOrder)
                                    .Select(st => st.StateOut)
                                    .FirstOrDefault(st => st is not null);

                        return Results.Json(
                            new
                            {
                                idempotencyKey = s.IdempotencyKey,
                                operationId = s.OperationId,
                                status = s.Status.ToString(),
                                processingOrder = s.ProcessingOrder,
                                retryCount = s.RequeueCount,
                                lastError,
                                createdAt = s.CreatedAt,
                                executionStartedAt = s.ExecutionStartedAt,
                                updatedAt = s.UpdatedAt,
                                backoffUntil = s.BackoffUntil,
                                command = s.Command,
                                retryStrategy = s.RetryStrategy,
                                traceId = Metrics.ParseTraceContext(workflow.EngineTraceContext)?.TraceId.ToString()
                                    ?? workflow.EngineActivity?.TraceId.ToString(),
                                stateIn,
                                stateOut = s.StateOut,
                            },
                            _jsonIndented
                        );
                    }

                    // Fall back to recent cache only (has lastError but no state)
                    DashboardWorkflowDto? recentCached = engineStatus
                        .GetRecentWorkflows(100)
                        .FirstOrDefault(c => c.IdempotencyKey == wf);
                    if (recentCached is not null)
                    {
                        DashboardStepDto? cs = recentCached.Steps.FirstOrDefault(s => s.IdempotencyKey == step);
                        if (cs is null)
                            return Results.NotFound();

                        return Results.Json(
                            new
                            {
                                cs.IdempotencyKey,
                                cs.OperationId,
                                cs.Status,
                                cs.ProcessingOrder,
                                cs.RetryCount,
                                cs.LastError,
                                cs.CreatedAt,
                                cs.ExecutionStartedAt,
                                cs.UpdatedAt,
                                cs.BackoffUntil,
                                recentCached.TraceId,
                                command = new { type = cs.CommandType, operationId = cs.CommandDetail },
                                stateIn = (string?)null,
                                stateOut = (string?)null,
                            },
                            _jsonIndented
                        );
                    }

                    return Results.NotFound();
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/state",
                async (IServiceProvider sp, string wf, DateTimeOffset? createdAt, CancellationToken ct) =>
                {
                    Workflow? workflow = null;

                    if (createdAt.HasValue)
                    {
                        using IServiceScope scope = sp.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                        workflow = await repo.GetWorkflow(wf, createdAt.Value, ct);
                    }

                    if (workflow is null)
                        return Results.NotFound();

                    var steps = workflow
                        .Steps.OrderBy(s => s.ProcessingOrder)
                        .Select(s => new
                        {
                            s.OperationId,
                            s.ProcessingOrder,
                            s.StateOut,
                        })
                        .ToList();

                    return Results.Json(
                        new
                        {
                            initialState = workflow.InitialState,
                            steps,
                            updatedAt = workflow.UpdatedAt,
                        },
                        _jsonIndented
                    );
                }
            )
            .ExcludeFromDescription();

        return app;
    }

    private static Dictionary<string, string>? ParseLabelFilters(string? labels)
    {
        if (string.IsNullOrWhiteSpace(labels))
            return null;

        var filters = new Dictionary<string, string>();
        foreach (var pair in labels.Split(','))
        {
            var parts = pair.Split(':', 2);
            if (parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[0]) && !string.IsNullOrWhiteSpace(parts[1]))
            {
                filters[parts[0].Trim()] = parts[1].Trim();
            }
        }

        return filters.Count > 0 ? filters : null;
    }
}
