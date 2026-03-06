using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Endpoints;

internal static class DashboardEndpoints
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
                                var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
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
                "/dashboard/orgs-and-apps",
                async (IServiceProvider sp, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
                    IReadOnlyList<(string Org, string App)> pairs = await repo.GetDistinctOrgsAndApps(ct);
                    var result = pairs.Select(p => new { org = p.Org, app = p.App });
                    return Results.Json(result, _jsonCompact);
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
                    string? org,
                    string? app,
                    string? party,
                    string? instanceGuid,
                    CancellationToken ct
                ) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
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

                    (IReadOnlyList<Workflow> workflows, int totalCount) = await repo.GetFinishedWorkflowsWithCount(
                        statuses: statuses,
                        search: search,
                        take: maxResults,
                        before: before,
                        since: since,
                        retriedOnly: retriedOnly,
                        org: org,
                        app: app,
                        party: party,
                        instanceGuid: instanceGuid,
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
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
                    IReadOnlyList<Workflow> workflows = await repo.GetScheduledWorkflows(ct);
                    return Results.Json(workflows.Select(DashboardMapper.MapWorkflow), _jsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/step",
                async (IServiceProvider sp, Guid wfId, string step, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
                    Workflow? workflow = await repo.GetWorkflow(wfId, ct);

                    if (workflow is null)
                        return Results.NotFound();

                    Step? s = workflow.Steps.FirstOrDefault(st => st.IdempotencyKey == step);
                    if (s is null)
                        return Results.NotFound();

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
                            errorHistory = s.ErrorHistory.Count > 0 ? s.ErrorHistory : null,
                            createdAt = s.CreatedAt,
                            executionStartedAt = s.ExecutionStartedAt,
                            updatedAt = s.UpdatedAt,
                            backoffUntil = s.BackoffUntil,
                            actor = s.Actor,
                            command = s.Command,
                            retryStrategy = s.RetryStrategy,
                            traceId = workflow.EngineTraceId ?? workflow.EngineActivity?.TraceId.ToString(),
                            stateIn,
                            stateOut = s.StateOut,
                        },
                        _jsonIndented
                    );
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/stream/live",
                async (
                    StatusChangeSignal statusChangeSignal,
                    IServiceProvider sp,
                    HttpContext ctx,
                    CancellationToken ct
                ) =>
                {
                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    string? previousActiveFingerprint = null;
                    string? previousRecentFingerprint = null;

                    while (!ct.IsCancellationRequested)
                    {
                        // Arm the signal before querying so changes during the query aren't lost
                        statusChangeSignal.Reset();

                        try
                        {
                            using IServiceScope scope = sp.CreateScope();
                            var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();

                            IReadOnlyList<Workflow> active = await repo.GetActiveWorkflows(ct);
                            IReadOnlyList<Workflow> recent = await repo.GetFinishedWorkflows(
                                statuses: [PersistentItemStatus.Completed, PersistentItemStatus.Failed],
                                take: 100,
                                cancellationToken: ct
                            );

                            List<DashboardWorkflowDto> activeMapped = active
                                .Select(DashboardMapper.MapWorkflow)
                                .ToList();
                            List<DashboardWorkflowDto> recentMapped = recent
                                .Select(DashboardMapper.MapWorkflow)
                                .ToList();

                            string activeFingerprint = string.Join(
                                ",",
                                activeMapped.Select(w =>
                                    $"{w.IdempotencyKey}|{w.Status}|"
                                    + string.Join(
                                        ";",
                                        w.Steps.Select(s => $"{s.Status}:{s.RetryCount}:{s.BackoffUntil}")
                                    )
                                )
                            );
                            string recentFingerprint = string.Join(
                                ",",
                                recentMapped.Select(w => $"{w.IdempotencyKey}|{w.UpdatedAt}")
                            );

                            bool activeChanged = activeFingerprint != previousActiveFingerprint;
                            bool recentChanged = recentFingerprint != previousRecentFingerprint;

                            if (activeChanged || recentChanged)
                            {
                                previousActiveFingerprint = activeFingerprint;
                                previousRecentFingerprint = recentFingerprint;

                                string json = JsonSerializer.Serialize(
                                    new
                                    {
                                        active = activeChanged ? activeMapped : null,
                                        recent = recentChanged ? recentMapped : null,
                                    },
                                    _jsonCompact
                                );
                                await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                                await ctx.Response.Body.FlushAsync(ct);
                            }
                        }
                        catch (OperationCanceledException) when (ct.IsCancellationRequested)
                        {
                            break;
                        }
                        catch
                        { /* transient DB error — keep SSE alive */
                        }

                        // Debounce: coalesce rapid step transitions
                        await Task.Delay(100, ct);

                        // Wait for a status change (near-instant via PG NOTIFY) or 2s timeout (idle fallback)
                        try
                        {
                            await statusChangeSignal.WaitAsync(ct).WaitAsync(TimeSpan.FromSeconds(2), ct);
                        }
                        catch (TimeoutException)
                        { /* expected when idle */
                        }
                    }
                }
            )
            .ExcludeFromDescription();

        app.MapPost(
                "/dashboard/retry",
                async (AsyncSignal workflowSignal, IServiceProvider sp, HttpContext ctx, CancellationToken ct) =>
                {
                    using var doc = await JsonDocument.ParseAsync(ctx.Request.Body, cancellationToken: ct);
                    JsonElement root = doc.RootElement;

                    if (!root.TryGetProperty("workflowId", out JsonElement idEl))
                    {
                        return Results.BadRequest("Missing workflowId");
                    }

                    Guid workflowId = idEl.GetGuid();

                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
                    Workflow? workflow = await repo.GetWorkflow(workflowId, ct);

                    if (workflow is null)
                        return Results.NotFound();

                    if (workflow.Status != PersistentItemStatus.Failed)
                        return Results.BadRequest($"Workflow status is {workflow.Status}, expected Failed");

                    workflow.Status = PersistentItemStatus.Enqueued;
                    List<Step> stepsToUpdate = [];

                    foreach (Step step in workflow.Steps)
                    {
                        if (step.Status == PersistentItemStatus.Failed || step.Status == PersistentItemStatus.Requeued)
                        {
                            step.Status = PersistentItemStatus.Enqueued;
                            step.BackoffUntil = null;
                            stepsToUpdate.Add(step);
                        }
                    }

                    await repo.BatchUpdateWorkflowAndSteps(workflow, stepsToUpdate, cancellationToken: ct);
                    workflowSignal.Signal();

                    return Results.Ok();
                }
            )
            .ExcludeFromDescription();

        app.MapPost(
                "/dashboard/skip-backoff",
                async (AsyncSignal workflowSignal, IServiceProvider sp, HttpContext ctx, CancellationToken ct) =>
                {
                    using var doc = await JsonDocument.ParseAsync(ctx.Request.Body, cancellationToken: ct);
                    JsonElement root = doc.RootElement;

                    if (
                        !root.TryGetProperty("workflowId", out JsonElement idEl)
                        || !root.TryGetProperty("stepIdempotencyKey", out JsonElement stepKeyEl)
                    )
                    {
                        return Results.BadRequest("Missing workflowId or stepIdempotencyKey");
                    }

                    Guid workflowId = idEl.GetGuid();
                    string stepIdempotencyKey = stepKeyEl.GetString()!;

                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
                    Workflow? workflow = await repo.GetWorkflow(workflowId, ct);

                    if (workflow is null)
                        return Results.NotFound();

                    Step? step = workflow.Steps.FirstOrDefault(s => s.IdempotencyKey == stepIdempotencyKey);
                    if (step is null)
                        return Results.NotFound();

                    step.BackoffUntil = null;
                    await repo.BatchUpdateWorkflowAndSteps(workflow, [step], cancellationToken: ct);
                    workflowSignal.Signal();

                    return Results.Ok();
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/state",
                async (IServiceProvider sp, Guid wfId, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IDashboardRepository>();
                    Workflow? workflow = await repo.GetWorkflow(wfId, ct);

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
}
