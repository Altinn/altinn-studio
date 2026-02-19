using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Endpoints;

internal static class DashboardEndpoints
{
    private static readonly JsonSerializerOptions JsonCompact = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private static readonly JsonSerializerOptions JsonIndented = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
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

                    object MapWorkflow(Workflow w) =>
                        new
                        {
                            idempotencyKey = w.IdempotencyKey,
                            operationId = w.OperationId,
                            status = w.Status.ToString(),
                            traceId = w.EngineTraceId ?? w.EngineActivity?.TraceId.ToString(),

                            instance = new
                            {
                                org = w.InstanceInformation.Org,
                                app = w.InstanceInformation.App,
                                instanceOwnerPartyId = w.InstanceInformation.InstanceOwnerPartyId,
                                instanceGuid = w.InstanceInformation.InstanceGuid,
                            },
                            createdAt = w.CreatedAt,
                            executionStartedAt = w.ExecutionStartedAt,
                            steps = w
                                .Steps.OrderBy(s => s.ProcessingOrder)
                                .Select(s => new
                                {
                                    idempotencyKey = s.IdempotencyKey,
                                    operationId = s.OperationId,
                                    commandType = s.Command.GetType().Name,
                                    commandDetail = s.Command.OperationId,
                                    commandPayload = (s.Command as Command.AppCommand)?.Payload,
                                    status = s.Status.ToString(),
                                    processingOrder = s.ProcessingOrder,
                                    retryCount = s.RequeueCount,
                                    backoffUntil = s.BackoffUntil,
                                    createdAt = s.CreatedAt,
                                    executionStartedAt = s.ExecutionStartedAt,
                                    updatedAt = s.UpdatedAt,
                                }),
                        };

                    var scheduledCount = 0;
                    var iteration = 0;

                    while (!ct.IsCancellationRequested)
                    {
                        if (iteration % 100 == 0) // refresh every ~5s
                        {
                            try
                            {
                                using var scope = sp.CreateScope();
                                var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                                scheduledCount = await repo.CountScheduledWorkflows(ct);
                            }
                            catch
                            { /* non-critical */
                            }
                        }
                        iteration++;

                        var status = engine.Status;
                        var dbSlot = limiter.DbSlotStatus;
                        var httpSlot = limiter.HttpSlotStatus;
                        var engineSettings = settings.Value;
                        var workflows = engine.GetAllInboxWorkflows();

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
                                    used = engine.InboxCount,
                                    available = engineSettings.QueueCapacity - engine.InboxCount,
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
                            workflows = workflows.Select(MapWorkflow),
                        };

                        var json = JsonSerializer.Serialize(payload, JsonCompact);
                        await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                        await ctx.Response.Body.FlushAsync(ct);

                        await Task.Delay(50, ct);
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
                        var recent = engine.GetRecentWorkflows(100);
                        var fingerprint = string.Join(",", recent.Select(r => r.IdempotencyKey));

                        if (fingerprint != previousFingerprint)
                        {
                            previousFingerprint = fingerprint;

                            var payload = recent.Select(r => new
                            {
                                r.IdempotencyKey,
                                r.OperationId,
                                r.Status,
                                r.TraceId,

                                instance = new
                                {
                                    org = r.InstanceInformation.Org,
                                    app = r.InstanceInformation.App,
                                    instanceOwnerPartyId = r.InstanceInformation.InstanceOwnerPartyId,
                                    instanceGuid = r.InstanceInformation.InstanceGuid,
                                },
                                r.CreatedAt,
                                r.ExecutionStartedAt,
                                r.RemovedAt,
                                steps = r.Steps.Select(s => new
                                {
                                    s.IdempotencyKey,
                                    s.OperationId,
                                    s.CommandType,
                                    s.CommandDetail,
                                    s.CommandPayload,
                                    s.Status,
                                    s.ProcessingOrder,
                                    s.RetryCount,
                                    s.BackoffUntil,
                                    s.CreatedAt,
                                    s.ExecutionStartedAt,
                                    s.UpdatedAt,
                                }),
                            });

                            var json = JsonSerializer.Serialize(payload, JsonCompact);
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
                    using var scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    var pairs = await repo.GetDistinctOrgsAndApps(ct);
                    var result = pairs.Select(p => new { org = p.Org, app = p.App });
                    return Results.Json(result, JsonCompact);
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
                    using var scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    var maxResults = Math.Min(limit ?? 100, 200);

                    var statuses = (status?.ToUpperInvariant()) switch
                    {
                        "FAILED" => new[] { PersistentItemStatus.Failed },
                        "COMPLETED" => new[] { PersistentItemStatus.Completed },
                        _ => new[]
                        {
                            PersistentItemStatus.Completed,
                            PersistentItemStatus.Failed,
                            PersistentItemStatus.Requeued,
                        },
                    };

                    var retriedOnly = retried == true;

                    var (workflows, totalCount) = await repo.GetFinishedWorkflowsWithCount(
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

                    var result = new
                    {
                        totalCount,
                        workflows = workflows.Select(w => new
                        {
                            idempotencyKey = w.IdempotencyKey,
                            operationId = w.OperationId,
                            status = w.Status.ToString(),
                            traceId = w.EngineTraceId ?? w.EngineActivity?.TraceId.ToString(),
                            instance = new
                            {
                                org = w.InstanceInformation.Org,
                                app = w.InstanceInformation.App,
                                instanceOwnerPartyId = w.InstanceInformation.InstanceOwnerPartyId,
                                instanceGuid = w.InstanceInformation.InstanceGuid,
                            },
                            createdAt = w.CreatedAt,
                            updatedAt = w.UpdatedAt,
                            executionStartedAt = w.ExecutionStartedAt,
                            steps = w
                                .Steps.OrderBy(s => s.ProcessingOrder)
                                .Select(s => new
                                {
                                    idempotencyKey = s.IdempotencyKey,
                                    operationId = s.OperationId,
                                    commandType = s.Command.GetType().Name,
                                    commandDetail = s.Command.OperationId,
                                    commandPayload = (s.Command as Command.AppCommand)?.Payload,
                                    status = s.Status.ToString(),
                                    processingOrder = s.ProcessingOrder,
                                    retryCount = s.RequeueCount,
                                    backoffUntil = s.BackoffUntil,
                                    createdAt = s.CreatedAt,
                                    executionStartedAt = s.ExecutionStartedAt,
                                }),
                        }),
                    };

                    return Results.Json(result, JsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/scheduled",
                async (IServiceProvider sp, CancellationToken ct) =>
                {
                    using var scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    var workflows = await repo.GetScheduledWorkflows(ct);

                    var result = workflows.Select(w => new
                    {
                        idempotencyKey = w.IdempotencyKey,
                        operationId = w.OperationId,
                        status = w.Status.ToString(),
                        startAt = w.StartAt,
                        instance = new
                        {
                            org = w.InstanceInformation.Org,
                            app = w.InstanceInformation.App,
                            instanceOwnerPartyId = w.InstanceInformation.InstanceOwnerPartyId,
                            instanceGuid = w.InstanceInformation.InstanceGuid,
                        },
                        createdAt = w.CreatedAt,
                        steps = w
                            .Steps.OrderBy(s => s.ProcessingOrder)
                            .Select(s => new
                            {
                                idempotencyKey = s.IdempotencyKey,
                                operationId = s.OperationId,
                                commandType = s.Command.GetType().Name,
                                commandDetail = s.Command.OperationId,
                                commandPayload = (s.Command as Command.AppCommand)?.Payload,
                                status = s.Status.ToString(),
                                processingOrder = s.ProcessingOrder,
                            }),
                    });

                    return Results.Json(result, JsonCompact);
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
                    var workflow = engine.GetAllInboxWorkflows().FirstOrDefault(w => w.IdempotencyKey == wf);

                    // Fall back to DB by idempotency key + createdAt
                    if (workflow is null && createdAt.HasValue)
                    {
                        using var scope = sp.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                        workflow = await repo.GetWorkflow(wf, createdAt.Value, ct);
                    }

                    var s = workflow?.Steps.FirstOrDefault(st => st.IdempotencyKey == step);

                    if (s is null)
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
                    };

                    return Results.Json(result, JsonIndented);
                }
            )
            .ExcludeFromDescription();

        return app;
    }
}
