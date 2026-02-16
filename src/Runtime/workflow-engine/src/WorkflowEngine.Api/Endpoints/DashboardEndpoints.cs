using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Endpoints;

internal static class DashboardEndpoints
{
    private const string DashboardDir = "Endpoints/Dashboard";

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
                    IServiceProvider sp,
                    HttpContext ctx,
                    CancellationToken ct
                ) =>
                {
                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    var jsonOptions = new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        WriteIndented = false,
                    };

                    var previousKeys = new HashSet<string>();

                    object MapWorkflow(Workflow w) =>
                        new
                        {
                            idempotencyKey = w.IdempotencyKey,
                            operationId = w.OperationId,
                            status = w.Status.ToString(),
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
                        var currentKeys = new HashSet<string>(workflows.Select(w => w.IdempotencyKey));

                        // Backfill: when workflows leave the inbox, fetch their final state from DB
                        var finishedPayloads = new List<object>();
                        var disappeared = previousKeys.Except(currentKeys).ToList();
                        if (disappeared.Count > 0)
                        {
                            try
                            {
                                using var scope = sp.CreateScope();
                                var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                                var completed = await repo.GetCompletedWorkflows(cancellationToken: ct);
                                var failed = await repo.GetFailedWorkflows(cancellationToken: ct);
                                foreach (var key in disappeared)
                                {
                                    var wf =
                                        completed.FirstOrDefault(w => w.IdempotencyKey == key)
                                        ?? failed.FirstOrDefault(w => w.IdempotencyKey == key);
                                    if (wf is not null)
                                        finishedPayloads.Add(MapWorkflow(wf));
                                }
                            }
                            catch
                            {
                                // Best effort — dashboard is non-critical
                            }
                        }

                        previousKeys = currentKeys;

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
                            finished = finishedPayloads,
                        };

                        var json = JsonSerializer.Serialize(payload, jsonOptions);
                        await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                        await ctx.Response.Body.FlushAsync(ct);

                        await Task.Delay(50, ct);
                    }
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/history",
                async (IServiceProvider sp, string? status, int? limit, CancellationToken ct) =>
                {
                    using var scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    var maxResults = Math.Min(limit ?? 50, 200);

                    var workflows = status?.ToUpperInvariant() switch
                    {
                        "FAILED" => await repo.GetFailedWorkflows(cancellationToken: ct),
                        _ => await repo.GetCompletedWorkflows(cancellationToken: ct),
                    };

                    var jsonOptions = new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        WriteIndented = false,
                    };

                    var result = workflows
                        .Take(maxResults)
                        .Select(w => new
                        {
                            idempotencyKey = w.IdempotencyKey,
                            operationId = w.OperationId,
                            status = w.Status.ToString(),
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

                    return Results.Json(result, jsonOptions);
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/step",
                async (IEngine engine, IServiceProvider sp, string wf, string step, CancellationToken ct) =>
                {
                    var jsonOptions = new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        WriteIndented = true,
                    };

                    // Try inbox first (live workflows)
                    var workflow = engine.GetAllInboxWorkflows().FirstOrDefault(w => w.IdempotencyKey == wf);

                    // Fall back to DB (completed/failed workflows for recent + history views)
                    if (workflow is null)
                    {
                        using var scope = sp.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                        var completed = await repo.GetCompletedWorkflows(cancellationToken: ct);
                        var failed = await repo.GetFailedWorkflows(cancellationToken: ct);
                        workflow =
                            completed.FirstOrDefault(w => w.IdempotencyKey == wf)
                            ?? failed.FirstOrDefault(w => w.IdempotencyKey == wf);
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
                        createdAt = s.CreatedAt,
                        executionStartedAt = s.ExecutionStartedAt,
                        updatedAt = s.UpdatedAt,
                        backoffUntil = s.BackoffUntil,
                        startAt = s.StartAt,
                        actor = s.Actor,
                        command = s.Command,
                        retryStrategy = s.RetryStrategy,
                    };

                    return Results.Json(result, jsonOptions);
                }
            )
            .ExcludeFromDescription();

        return app;
    }
}
