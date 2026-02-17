using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Endpoints;

internal static class DashboardEndpoints
{
    private const string DashboardDir = "Endpoints/Dashboard";

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
                "/dashboard",
                (IWebHostEnvironment env) =>
                    Results.File(Path.Combine(env.ContentRootPath, DashboardDir, "index.html"), "text/html")
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/style.css",
                (IWebHostEnvironment env) =>
                    Results.File(Path.Combine(env.ContentRootPath, DashboardDir, "style.css"), "text/css")
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/app.js",
                (IWebHostEnvironment env) =>
                    Results.File(Path.Combine(env.ContentRootPath, DashboardDir, "app.js"), "text/javascript")
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/stream",
                async (
                    IEngine engine,
                    ConcurrencyLimiter limiter,
                    IOptions<EngineSettings> settings,
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
                            traceId = w.EngineTraceContext?.TraceId.ToString(),
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
                                    status = s.Status.ToString(),
                                    processingOrder = s.ProcessingOrder,
                                    retryCount = s.RequeueCount,
                                    backoffUntil = s.BackoffUntil,
                                    createdAt = s.CreatedAt,
                                    executionStartedAt = s.ExecutionStartedAt,
                                    startAt = s.StartAt,
                                    updatedAt = s.UpdatedAt,
                                }),
                        };

                    while (!ct.IsCancellationRequested)
                    {
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

                    var previousFingerprint = "";

                    while (!ct.IsCancellationRequested)
                    {
                        var recent = engine.GetRecentWorkflows(10);
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
                                    s.Status,
                                    s.ProcessingOrder,
                                    s.RetryCount,
                                    s.BackoffUntil,
                                    s.CreatedAt,
                                    s.ExecutionStartedAt,
                                    s.StartAt,
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
                "/dashboard/history",
                async (IServiceProvider sp, string? status, string? search, int? limit, CancellationToken ct) =>
                {
                    using var scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    var maxResults = Math.Min(limit ?? 50, 200);

                    var statuses = (status?.ToUpperInvariant()) switch
                    {
                        "FAILED" => new[] { PersistentItemStatus.Failed },
                        "RETRYING" => new[] { PersistentItemStatus.Requeued },
                        "COMPLETED" => new[] { PersistentItemStatus.Completed },
                        _ => new[]
                        {
                            PersistentItemStatus.Completed,
                            PersistentItemStatus.Failed,
                            PersistentItemStatus.Requeued,
                        },
                    };

                    var workflows = await repo.GetFinishedWorkflows(
                        statuses: statuses,
                        search: search,
                        take: maxResults,
                        cancellationToken: ct
                    );

                    var result = workflows.Select(w => new
                    {
                        idempotencyKey = w.IdempotencyKey,
                        operationId = w.OperationId,
                        status = w.Status.ToString(),
                        traceId = w.EngineTraceContext?.TraceId.ToString(),
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
                                status = s.Status.ToString(),
                                processingOrder = s.ProcessingOrder,
                                retryCount = s.RequeueCount,
                                backoffUntil = s.BackoffUntil,
                                createdAt = s.CreatedAt,
                                executionStartedAt = s.ExecutionStartedAt,
                            }),
                    });

                    return Results.Json(result, JsonCompact);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/step",
                async (IEngine engine, IServiceProvider sp, string wf, string step, CancellationToken ct) =>
                {
                    // Try inbox first (live workflows)
                    var workflow = engine.GetAllInboxWorkflows().FirstOrDefault(w => w.IdempotencyKey == wf);

                    // Fall back to DB with targeted search (avoid loading entire history)
                    if (workflow is null)
                    {
                        using var scope = sp.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                        var completed = await repo.GetCompletedWorkflows(search: wf, take: 1, cancellationToken: ct);
                        var failed = await repo.GetFailedWorkflows(search: wf, take: 1, cancellationToken: ct);
                        workflow = completed.FirstOrDefault() ?? failed.FirstOrDefault();
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
                        startAt = s.StartAt,
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
