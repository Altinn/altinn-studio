using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
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
                    IEngine engine,
                    IConcurrencyLimiter limiter,
                    IOptions<EngineSettings> settings,
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

                        EngineHealthStatus status = engine.Status;
                        ConcurrencyLimiter.SlotStatus dbSlot = limiter.DbSlotStatus;
                        ConcurrencyLimiter.SlotStatus httpSlot = limiter.HttpSlotStatus;
                        int inboxCount = engine.InboxCount;
                        IReadOnlyList<Workflow> workflows = engine.GetAllInboxWorkflows();

                        string fingerprint = BuildStreamFingerprint(
                            status,
                            inboxCount,
                            dbSlot,
                            httpSlot,
                            scheduledCount,
                            workflows
                        );

                        long elapsed = Stopwatch.GetTimestamp() - lastSendTime;
                        if (fingerprint != previousFingerprint && elapsed >= minSendIntervalTicks)
                        {
                            previousFingerprint = fingerprint;
                            lastSendTime = Stopwatch.GetTimestamp();
                            EngineSettings engineSettings = settings.Value;

                            var payload = new
                            {
                                timestamp = DateTimeOffset.UtcNow,
                                engineStatus = new
                                {
                                    running = status.HasFlag(EngineHealthStatus.Running),
                                    healthy = status.HasFlag(EngineHealthStatus.Healthy),
                                    idle = status.HasFlag(EngineHealthStatus.Idle),
                                    disabled = status.HasFlag(EngineHealthStatus.Disabled),
                                    queueFull = status.HasFlag(EngineHealthStatus.QueueFull),
                                },
                                capacity = new
                                {
                                    inbox = new
                                    {
                                        used = inboxCount,
                                        available = engineSettings.QueueCapacity - inboxCount,
                                        total = engineSettings.QueueCapacity,
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
                                workflows = workflows.Select(DashboardMapper.MapWorkflow),
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
                async (IEngine engine, HttpContext ctx, CancellationToken ct) =>
                {
                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    string? previousFingerprint = null;

                    while (!ct.IsCancellationRequested)
                    {
                        IReadOnlyList<DashboardWorkflowDto> recent = engine.GetRecentWorkflows(100);
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
                "/dashboard/orgs-and-apps",
                async (IServiceProvider sp, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
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
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    IReadOnlyList<Workflow> workflows = await repo.GetScheduledWorkflows(ct);
                    return Results.Json(workflows.Select(DashboardMapper.MapWorkflow), _jsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/step",
                async (
                    IEngine engine,
                    IServiceProvider sp,
                    string wf,
                    string step,
                    DateTimeOffset? createdAt,
                    CancellationToken ct
                ) =>
                {
                    // Try inbox first (live workflows)
                    Workflow? workflow = engine.GetAllInboxWorkflows().FirstOrDefault(w => w.IdempotencyKey == wf);

                    // Try recent cache (has lastError still in memory)
                    DashboardWorkflowDto? cached = workflow is null
                        ? engine.GetRecentWorkflows(100).FirstOrDefault(c => c.IdempotencyKey == wf)
                        : null;
                    if (cached is not null)
                    {
                        DashboardStepDto? cs = cached.Steps.FirstOrDefault(s => s.IdempotencyKey == step);
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
                                cached.TraceId,
                                command = new
                                {
                                    type = cs.CommandType,
                                    operationId = cs.CommandDetail,
                                    payload = cs.CommandPayload,
                                },
                            },
                            _jsonIndented
                        );
                    }

                    // Fall back to DB by idempotency key + createdAt
                    if (workflow is null && createdAt.HasValue)
                    {
                        using IServiceScope scope = sp.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                        workflow = await repo.GetWorkflow(wf, createdAt.Value, ct);
                    }

                    Step? s = workflow?.Steps.FirstOrDefault(st => st.IdempotencyKey == step);

                    if (s is null || workflow is null)
                        return Results.NotFound();

                    var result = new
                    {
                        idempotencyKey = s.IdempotencyKey,
                        operationId = s.OperationId,
                        status = s.Status.ToString(),
                        processingOrder = s.ProcessingOrder,
                        retryCount = s.RequeueCount,
                        lastError = s.LastError,
                        createdAt = s.CreatedAt,
                        executionStartedAt = s.ExecutionStartedAt,
                        updatedAt = s.UpdatedAt,
                        backoffUntil = s.BackoffUntil,
                        actor = s.Actor,
                        command = s.Command,
                        retryStrategy = s.RetryStrategy,
                        traceId = workflow.EngineTraceId ?? workflow.EngineActivity?.TraceId.ToString(),
                    };

                    return Results.Json(result, _jsonIndented);
                }
            )
            .ExcludeFromDescription();

        return app;
    }

    private static string BuildStreamFingerprint(
        EngineHealthStatus status,
        int inboxCount,
        ConcurrencyLimiter.SlotStatus dbSlot,
        ConcurrencyLimiter.SlotStatus httpSlot,
        int scheduledCount,
        IReadOnlyList<Workflow> workflows
    )
    {
        var sb = new StringBuilder();
        sb.Append((int)status)
            .Append('|')
            .Append(inboxCount)
            .Append('|')
            .Append(dbSlot.Used)
            .Append('|')
            .Append(httpSlot.Used)
            .Append('|')
            .Append(scheduledCount);

        foreach (var wf in workflows)
        {
            sb.Append('|').Append(wf.IdempotencyKey).Append(':').Append((int)wf.Status);

            foreach (var step in wf.Steps)
            {
                sb.Append(':')
                    .Append((int)step.Status)
                    .Append(':')
                    .Append(step.RequeueCount)
                    .Append(':')
                    .Append(step.BackoffUntil?.Ticks ?? 0);
            }
        }

        return sb.ToString();
    }
}
