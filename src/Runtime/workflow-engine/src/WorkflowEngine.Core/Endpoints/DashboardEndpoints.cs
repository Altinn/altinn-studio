using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Endpoints;

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

    /// <summary>
    /// Maps the dashboard UI: static files (embedded or physical), <c>/api/config</c>,
    /// and the <c>/api/hot-reload</c> dev endpoint.
    /// </summary>
    public static WebApplication MapDashboardUI(this WebApplication app)
    {
        IFileProvider fileProvider;

        if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Docker")
        {
            // In dev/Docker, serve from disk so edits are picked up without a rebuild.
            // Try volume-mounted /app/wwwroot first (Docker), then relative to DLL (dotnet run).
            var coreAssemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
            var wwwrootOnDisk = Path.Combine(coreAssemblyDir, "wwwroot");
            if (!Directory.Exists(wwwrootOnDisk))
                wwwrootOnDisk = Path.GetFullPath(Path.Combine(coreAssemblyDir, "..", "..", "..", "wwwroot"));

            fileProvider = Directory.Exists(wwwrootOnDisk)
                ? new PhysicalFileProvider(wwwrootOnDisk)
                : new ManifestEmbeddedFileProvider(typeof(DashboardEndpoints).Assembly, "wwwroot");
        }
        else
        {
            fileProvider = new ManifestEmbeddedFileProvider(typeof(DashboardEndpoints).Assembly, "wwwroot");
        }

        app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
        app.UseStaticFiles(new StaticFileOptions { FileProvider = fileProvider });

        // Hot-reload (dev/Docker only, physical files only)
        if (fileProvider is PhysicalFileProvider physicalProvider)
        {
            var watchRoot = physicalProvider.Root;
            app.MapGet(
                    "/dashboard/hot-reload",
                    async (IHostApplicationLifetime lifetime, HttpContext ctx, CancellationToken ct) =>
                    {
                        using var cts = CancellationTokenSource.CreateLinkedTokenSource(
                            ct,
                            lifetime.ApplicationStopping
                        );
                        ct = cts.Token;

                        ctx.Response.ContentType = "text/event-stream";
                        ctx.Response.Headers.CacheControl = "no-cache";
                        ctx.Response.Headers.Connection = "keep-alive";

                        var lastHash = HashWebRoot(watchRoot);
                        var heartbeatInterval = 0;

                        try
                        {
                            while (!ct.IsCancellationRequested)
                            {
                                await Task.Delay(500, ct);
                                var currentHash = HashWebRoot(watchRoot);
                                if (currentHash != lastHash)
                                {
                                    lastHash = currentHash;
                                    await ctx.Response.WriteAsync("data: reload\n\n", ct);
                                    await ctx.Response.Body.FlushAsync(ct);
                                }
                                else if (++heartbeatInterval >= 10)
                                {
                                    heartbeatInterval = 0;
                                    await ctx.Response.WriteAsync(": heartbeat\n\n", ct);
                                    await ctx.Response.Body.FlushAsync(ct);
                                }
                            }
                        }
                        catch (OperationCanceledException) when (ct.IsCancellationRequested)
                        {
                            // Clean shutdown
                        }
                    }
                )
                .ExcludeFromDescription();
        }

        return app;
    }

    public static WebApplication MapDashboardEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/dashboard/stream",
                async (
                    IEngineStatus engineStatus,
                    IConcurrencyLimiter limiter,
                    IServiceProvider sp,
                    IHostApplicationLifetime lifetime,
                    HttpContext ctx,
                    CancellationToken ct
                ) =>
                {
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct, lifetime.ApplicationStopping);
                    ct = cts.Token;

                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    try
                    {
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
                    catch (OperationCanceledException) when (ct.IsCancellationRequested)
                    {
                        // Clean shutdown
                    }
                }
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/stream/live",
                async (
                    StatusChangeSignal workflowSignal,
                    IServiceProvider sp,
                    IHostApplicationLifetime lifetime,
                    HttpContext ctx,
                    CancellationToken ct
                ) =>
                {
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct, lifetime.ApplicationStopping);
                    ct = cts.Token;

                    ctx.Response.ContentType = "text/event-stream";
                    ctx.Response.Headers.CacheControl = "no-cache";
                    ctx.Response.Headers.Connection = "keep-alive";

                    string? previousActiveFingerprint = null;
                    string? previousRecentFingerprint = null;

                    while (!ct.IsCancellationRequested)
                    {
                        // Arm the signal before querying so changes during the query aren't lost
                        workflowSignal.Reset();

                        try
                        {
                            using IServiceScope scope = sp.CreateScope();
                            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

                            IReadOnlyList<Workflow> active = await repo.GetActiveWorkflows(cancellationToken: ct);
                            IReadOnlyList<Workflow> recent = await repo.GetFinishedWorkflows(
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
                                    $"{w.DatabaseId}|{w.Status}|{w.BackoffUntil}|"
                                    + string.Join(";", w.Steps.Select(s => $"{s.Status}:{s.RetryCount}"))
                                )
                            );
                            string recentFingerprint = string.Join(
                                ",",
                                recentMapped.Select(w => $"{w.DatabaseId}|{w.UpdatedAt}")
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
                        {
                            // Non-critical — retry next cycle
                        }

                        // Wait for a PG NOTIFY signal or timeout after 2s
                        try
                        {
                            using var signalCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                            signalCts.CancelAfter(2000);
                            await workflowSignal.WaitAsync(signalCts.Token);
                        }
                        catch (OperationCanceledException)
                        {
                            // Expected — either main ct was canceled or timeout
                        }
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
                    string? correlationId,
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

                    (IReadOnlyList<Workflow> workflows, int totalCount) = await repo.QueryWorkflowsWithCount(
                        statuses: statuses,
                        search: search,
                        take: maxResults,
                        before: before,
                        since: since,
                        retriedOnly: retriedOnly,
                        labelFilters: labelFilters,
                        correlationId: correlationId,
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
                async (IServiceProvider sp, Guid wf, string step, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    Workflow? workflow = await repo.GetWorkflow(wf, ct);

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
                            errorHistory = s.ErrorHistory.Select(e => new
                            {
                                timestamp = e.Timestamp,
                                message = e.Message,
                                httpStatusCode = e.HttpStatusCode,
                                wasRetryable = e.WasRetryable,
                            }),
                            createdAt = s.CreatedAt,
                            executionStartedAt = s.ExecutionStartedAt,
                            updatedAt = s.UpdatedAt,
                            backoffUntil = workflow.BackoffUntil,
                            labels = s.Labels,
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
            )
            .ExcludeFromDescription();

        app.MapGet(
                "/dashboard/state",
                async (IServiceProvider sp, Guid wf, CancellationToken ct) =>
                {
                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
                    Workflow? workflow = await repo.GetWorkflow(wf, ct);

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

        app.MapPost(
                "/dashboard/retry",
                async (IServiceProvider sp, HttpContext ctx, CancellationToken ct) =>
                {
                    using var doc = await JsonDocument.ParseAsync(ctx.Request.Body, cancellationToken: ct);
                    if (
                        !doc.RootElement.TryGetProperty("workflowId", out var wfProp)
                        || !Guid.TryParse(wfProp.GetString(), out Guid workflowId)
                    )
                    {
                        return Results.BadRequest("Missing or invalid workflowId");
                    }

                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

                    bool updated = await repo.ResetWorkflowForRetry(workflowId, ct);
                    if (updated)
                        return Results.Ok();

                    PersistentItemStatus? status = await repo.GetWorkflowStatus(workflowId, ct);
                    if (status is null)
                        return Results.NotFound();

                    return Results.Conflict($"Workflow is in {status} state");
                }
            )
            .ExcludeFromDescription();

        app.MapPost(
                "/dashboard/skip-backoff",
                async (IServiceProvider sp, HttpContext ctx, CancellationToken ct) =>
                {
                    using var doc = await JsonDocument.ParseAsync(ctx.Request.Body, cancellationToken: ct);
                    if (
                        !doc.RootElement.TryGetProperty("workflowId", out var wfProp)
                        || !Guid.TryParse(wfProp.GetString(), out Guid workflowId)
                    )
                    {
                        return Results.BadRequest("Missing or invalid workflowId");
                    }

                    using IServiceScope scope = sp.CreateScope();
                    var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

                    bool updated = await repo.SkipBackoff(workflowId, ct);
                    if (updated)
                        return Results.Ok();

                    PersistentItemStatus? status = await repo.GetWorkflowStatus(workflowId, ct);
                    if (status is null)
                        return Results.NotFound();

                    return Results.Conflict($"Workflow is in {status} state");
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

    private static long HashWebRoot(string path)
    {
        long hash = 0;
        foreach (var file in Directory.EnumerateFiles(path, "*.*", SearchOption.AllDirectories))
        {
            using var stream = File.OpenRead(file);
            int b;
            while ((b = stream.ReadByte()) != -1)
                hash = hash * 31 + b;
        }
        return hash;
    }
}
