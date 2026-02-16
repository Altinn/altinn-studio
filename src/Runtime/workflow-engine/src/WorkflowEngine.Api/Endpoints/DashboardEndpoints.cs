using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Endpoints;

internal static class DashboardEndpoints
{
    public static WebApplication MapDashboardEndpoints(this WebApplication app)
    {
        app.MapGet("/dashboard", () => Results.Content(DashboardHtml, "text/html")).ExcludeFromDescription();

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

    private const string DashboardHtml = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Workflow Engine Dashboard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0f;--bg2:#12121a;--bg3:#1a1a26;--border:#2a2a3a;
  --text:#e0e0e8;--text-dim:#888898;--text-bright:#ffffff;
  --cyan:#00d4ff;--amber:#ffaa00;--green:#00ff88;--orange:#ff6600;--red:#ff3366;--gray:#666;
  --font:ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace;
}
html{background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;line-height:1.5}
body{min-height:100vh;padding:0}

/* Header */
.header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 24px;border-bottom:1px solid var(--border);background:var(--bg2);
}
.header h1{font-size:18px;font-weight:700;letter-spacing:2px;color:var(--text-bright);
  text-shadow:0 0 20px rgba(0,212,255,0.3)}
.header h1 .bolt{color:var(--cyan);margin-right:8px}
.status-badges{display:flex;gap:12px;align-items:center}
.badge{
  display:inline-flex;align-items:center;gap:6px;
  padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;
  border:1px solid var(--border);background:var(--bg3);
}
.badge .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.badge.running .dot{background:var(--green);box-shadow:0 0 8px var(--green)}
.badge.stopped .dot{background:var(--red);box-shadow:0 0 8px var(--red)}
.badge.healthy .dot{background:var(--green);box-shadow:0 0 8px var(--green)}
.badge.unhealthy .dot{background:var(--red);box-shadow:0 0 8px var(--red)}
.badge.idle .dot{background:var(--amber);box-shadow:0 0 6px var(--amber)}
.badge.disabled .dot{background:var(--gray)}
.badge.queue-full .dot{background:var(--red);box-shadow:0 0 8px var(--red)}

.connection{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim)}
.connection .dot{width:6px;height:6px;border-radius:50%;display:inline-block}
.connection.connected .dot{background:var(--green)}
.connection.disconnected .dot{background:var(--red)}

/* Capacity meters */
.capacity-section{padding:20px 24px;border-bottom:1px solid var(--border)}
.meter{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.meter:last-child{margin-bottom:0}
.meter-label{width:50px;font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px}
.meter-bar{flex:1;height:22px;background:var(--bg3);border-radius:4px;overflow:hidden;position:relative;border:1px solid var(--border)}
.meter-fill{height:100%;border-radius:3px;transition:width 0.5s ease,background 0.5s ease;min-width:0}
.meter-fill.low{background:linear-gradient(90deg,var(--cyan),var(--green))}
.meter-fill.mid{background:linear-gradient(90deg,var(--amber),var(--orange))}
.meter-fill.high{background:linear-gradient(90deg,var(--orange),var(--red))}
.meter-value{width:110px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:var(--text)}

/* Live section */
.section{padding:20px 24px}
#live-section{min-height:140px}
.section-title{
  font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;
  color:var(--text-dim);margin-bottom:16px;display:flex;align-items:center;gap:8px;
}
.section-title .count{
  background:var(--bg3);border:1px solid var(--border);border-radius:12px;
  padding:2px 10px;font-size:12px;font-variant-numeric:tabular-nums;color:var(--cyan);
}

/* Workflow cards */
.workflow-card{
  background:var(--bg2);border:1px solid var(--border);border-radius:8px;
  padding:18px 24px;margin-bottom:14px;
  animation:fade-in 0.4s ease;
}
.workflow-card.removing{animation:slide-out 0.5s ease forwards}
.card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.instance-id{font-size:15px;font-weight:700;color:var(--text-bright);letter-spacing:0.5px}
.instance-guid{color:var(--cyan);font-size:16px;font-weight:700}
.card-meta{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-size:13px;color:var(--text-dim)}
.card-meta .wf-key{opacity:0.7}
.status-pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
}
.status-pill.Enqueued{color:var(--cyan);border:1px solid var(--cyan);background:rgba(0,212,255,0.08)}
.status-pill.Processing{color:var(--amber);border:1px solid var(--amber);background:rgba(255,170,0,0.08);animation:pulse-border 2s ease-in-out infinite}
.status-pill.Completed{color:var(--green);border:1px solid var(--green);background:rgba(0,255,136,0.08)}
.status-pill.Requeued{color:var(--orange);border:1px solid var(--orange);background:rgba(255,102,0,0.08)}
.status-pill.Failed{color:var(--red);border:1px solid var(--red);background:rgba(255,51,102,0.08)}
.status-pill.Canceled{color:var(--gray);border:1px solid var(--gray);background:rgba(102,102,102,0.08)}
.elapsed{font-variant-numeric:tabular-nums;color:var(--text-dim);font-size:13px;font-weight:600}
.retry-badge{
  background:var(--orange);color:#000;font-size:13px;font-weight:800;
  padding:3px 10px;border-radius:10px;margin-left:4px;
}

/* Step pipeline */
.pipeline{display:flex;align-items:flex-start;gap:0;margin-top:12px;overflow-x:auto;overflow-y:visible;padding:6px 0 8px 0}
.step-node{display:flex;flex-direction:column;align-items:center;position:relative;min-width:110px;max-width:110px}
.step-circle{
  width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;border:2px solid var(--border);background:var(--bg);
  position:relative;z-index:1;transition:all 0.3s ease;
}
.step-circle.Enqueued{border-color:var(--cyan);color:var(--cyan);opacity:0.5}
.step-circle.Processing{
  border-color:var(--amber);color:var(--amber);
  animation:pulse-glow 2s ease-in-out infinite;
  box-shadow:0 0 12px rgba(255,170,0,0.4);
}
.step-circle.Completed{border-color:var(--green);background:var(--green);color:#000}
.step-circle.Requeued{border-color:var(--orange);color:var(--orange);animation:bounce 1s ease infinite}
.step-circle.Failed{border-color:var(--red);color:var(--red);animation:shake 0.5s ease}
.step-circle.Canceled{border-color:var(--gray);color:var(--gray);opacity:0.5}
.step-circle[onclick]:hover{transform:scale(1.15);filter:brightness(1.3)}
.step-label{font-size:11px;color:var(--text-dim);margin-top:8px;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.step-connector{
  width:56px;height:2px;position:relative;overflow:visible;flex-shrink:0;margin-top:16px;
}
.step-connector svg{display:block;width:56px;height:6px;overflow:visible}
.step-connector line{stroke:var(--border);stroke-width:2;stroke-dasharray:6,4}
.step-connector line.active{stroke:var(--green);animation:flow 0.8s linear infinite}
.step-connector line.processing{stroke:var(--amber);stroke-dasharray:6,4;animation:flow 0.8s linear infinite}
.step-retry{font-size:10px;color:var(--orange);font-weight:700;margin-top:3px}
.step-meta{display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:5px}
.step-type{
  font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;
  padding:2px 6px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);
  color:var(--text-dim);
}
.step-type.AppCommand{color:var(--cyan);border-color:rgba(0,212,255,0.3)}
.step-type.Webhook{color:var(--amber);border-color:rgba(255,170,0,0.3)}
.step-type.Noop{color:var(--gray);border-color:rgba(102,102,102,0.3)}
.step-type.Throw{color:var(--red);border-color:rgba(255,51,102,0.3)}
.step-type.Timeout{color:var(--amber);border-color:rgba(255,170,0,0.3)}
.step-type.Delegate{color:var(--green);border-color:rgba(0,255,136,0.3)}
.step-timing{font-size:10px;color:var(--text-dim);font-variant-numeric:tabular-nums;opacity:0.8}
.step-backoff{font-size:10px;color:var(--orange);font-variant-numeric:tabular-nums;animation:pulse-border 1.5s ease-in-out infinite}

/* Tabs */
.tab-bar{
  display:flex;gap:0;border-bottom:2px solid var(--border);padding:0 24px;background:var(--bg2);
}
.tab{
  padding:12px 24px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;
  color:var(--text-dim);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;
  transition:color 0.2s,border-color 0.2s;user-select:none;display:flex;align-items:center;gap:8px;
}
.tab:hover{color:var(--text)}
.tab.active{color:var(--cyan);border-bottom-color:var(--cyan)}
.tab .tab-count{
  background:var(--bg3);border:1px solid var(--border);border-radius:12px;
  padding:1px 8px;font-size:11px;font-variant-numeric:tabular-nums;color:inherit;
}
.tab-panel{display:none}
.tab-panel.active{display:block}

/* History */
.history-controls{display:flex;gap:12px;align-items:center;margin-bottom:16px}
.history-controls select{
  background:var(--bg3);color:var(--text);border:1px solid var(--border);
  padding:6px 12px;border-radius:6px;font-family:var(--font);font-size:12px;cursor:pointer;
}
.history-controls button{
  background:var(--cyan);color:#000;border:none;padding:6px 16px;border-radius:6px;
  font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;transition:opacity 0.2s;
}
.history-controls button:hover{opacity:0.8}
.history-controls button:disabled{opacity:0.4;cursor:not-allowed}

.empty-state{text-align:center;padding:40px 20px;color:var(--text-dim);font-size:13px}

/* Modal */
.modal-overlay{
  display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;
  align-items:center;justify-content:center;backdrop-filter:blur(4px);
}
.modal-overlay.open{display:flex}
.modal{
  background:var(--bg2);border:1px solid var(--border);border-radius:12px;
  max-width:720px;width:90%;max-height:80vh;display:flex;flex-direction:column;
  box-shadow:0 24px 48px rgba(0,0,0,0.5);
}
.modal-header{
  display:flex;justify-content:space-between;align-items:center;
  padding:16px 20px;border-bottom:1px solid var(--border);
}
.modal-header h2{font-size:14px;font-weight:700;color:var(--text-bright);letter-spacing:1px;text-transform:uppercase}
.modal-close{
  background:none;border:none;color:var(--text-dim);font-size:20px;cursor:pointer;
  padding:4px 8px;border-radius:4px;transition:color 0.2s;
}
.modal-close:hover{color:var(--text-bright)}
.modal-body{padding:20px;overflow-y:auto;flex:1}
.modal-body pre{
  background:var(--bg);border:1px solid var(--border);border-radius:8px;
  padding:16px;overflow-x:auto;font-size:13px;line-height:1.6;color:var(--text);
  white-space:pre-wrap;word-break:break-word;
}
.modal-body .json-key{color:var(--cyan)}
.modal-body .json-string{color:var(--green)}
.modal-body .json-number{color:var(--amber)}
.modal-body .json-bool{color:var(--orange)}
.modal-body .json-null{color:var(--gray)}
.modal-loading{text-align:center;padding:40px;color:var(--text-dim)}

/* Animations */
@keyframes pulse-glow{
  0%,100%{box-shadow:0 0 8px rgba(255,170,0,0.3)}
  50%{box-shadow:0 0 24px rgba(255,170,0,0.6),0 0 48px rgba(255,170,0,0.2)}
}
@keyframes pulse-border{
  0%,100%{border-color:rgba(255,170,0,0.6)}
  50%{border-color:rgba(255,170,0,1);box-shadow:0 0 12px rgba(255,170,0,0.15)}
}
@keyframes flow{to{stroke-dashoffset:-20}}
@keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slide-out{to{opacity:0;transform:translateX(60px);max-height:0;margin:0;padding:0;overflow:hidden}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
</style>
</head>
<body>

<div class="header">
  <h1><span class="bolt">&#9889;</span>WORKFLOW ENGINE</h1>
  <div class="status-badges">
    <div class="badge stopped" id="badge-running"><span class="dot"></span><span id="badge-running-text">Stopped</span></div>
    <div class="badge unhealthy" id="badge-healthy"><span class="dot"></span><span id="badge-healthy-text">Unknown</span></div>
    <div class="connection disconnected" id="connection"><span class="dot"></span><span id="connection-text">SSE Disconnected</span></div>
  </div>
</div>

<div class="capacity-section">
  <div class="meter">
    <span class="meter-label">Inbox</span>
    <div class="meter-bar"><div class="meter-fill low" id="meter-inbox" style="width:0%"></div></div>
    <span class="meter-value" id="meter-inbox-val">0 / 0</span>
  </div>
  <div class="meter">
    <span class="meter-label">DB</span>
    <div class="meter-bar"><div class="meter-fill low" id="meter-db" style="width:0%"></div></div>
    <span class="meter-value" id="meter-db-val">0 / 0</span>
  </div>
  <div class="meter">
    <span class="meter-label">HTTP</span>
    <div class="meter-bar"><div class="meter-fill low" id="meter-http" style="width:0%"></div></div>
    <span class="meter-value" id="meter-http-val">0 / 0</span>
  </div>
</div>

<div class="tab-bar">
  <div class="tab active" data-tab="live" onclick="switchTab('live')">Live</div>
  <div class="tab" data-tab="history" onclick="switchTab('history')">History</div>
</div>

<div class="tab-panel active" id="panel-live">
  <div class="section" id="live-section">
    <div class="section-title">ACTIVE <span class="count" id="live-count">0</span></div>
    <div id="live-workflows"></div>
    <div class="empty-state" id="live-empty">No active workflows</div>
  </div>

  <div class="section" id="recent-section">
    <div class="section-title" style="color:var(--text-dim);opacity:0.7">RECENT <span class="count" id="recent-count">0</span></div>
    <div id="recent-workflows"></div>
  </div>
</div>

<div class="tab-panel" id="panel-history">
  <div class="section">
    <div class="history-controls">
      <select id="history-filter">
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
      <button id="history-load" onclick="loadHistory()">Load</button>
    </div>
    <div id="history-workflows"></div>
    <div class="empty-state" id="history-empty">Click Load to fetch history</div>
  </div>
</div>

<div class="modal-overlay" id="step-modal" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modal-title">Step Details</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" id="modal-body">
      <div class="modal-loading">Loading...</div>
    </div>
  </div>
</div>

<script>
(function(){
  'use strict';

  const liveContainer = document.getElementById('live-workflows');
  const liveCount = document.getElementById('live-count');
  const liveEmpty = document.getElementById('live-empty');
  const recentContainer = document.getElementById('recent-workflows');
  const recentCount = document.getElementById('recent-count');
  const recentSection = document.getElementById('recent-section');
  const historyContainer = document.getElementById('history-workflows');
  const historyEmpty = document.getElementById('history-empty');
  const connEl = document.getElementById('connection');
  const connText = document.getElementById('connection-text');

  let previousWorkflows = {};
  let workflowFingerprints = {};
  let workflowTimers = {};
  let recentlyFinished = {};
  let sseConnected = false;
  let historyLoaded = false;

  // --- Tab switching ---
  window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'panel-' + tabName);
    });
    if (tabName === 'history' && !historyLoaded) {
      historyLoaded = true;
      loadHistory();
    }
  };

  function fingerprint(wf) {
    return wf.status + '|' + wf.steps.map(function(s) {
      return s.status + ':' + s.retryCount + ':' + (s.backoffUntil || '');
    }).join(',');
  }

  // --- SSE ---
  function connectSSE() {
    const es = new EventSource('/dashboard/stream');
    es.onopen = function() {
      sseConnected = true;
      connEl.className = 'connection connected';
      connText.textContent = 'SSE Connected';
    };
    es.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        updateDashboard(data);
      } catch(err) {
        console.error('SSE parse error:', err);
      }
    };
    es.onerror = function() {
      sseConnected = false;
      connEl.className = 'connection disconnected';
      connText.textContent = 'SSE Disconnected';
      es.close();
      setTimeout(connectSSE, 2000);
    };
  }

  // --- Update dashboard ---
  function updateDashboard(data) {
    updateStatusBadges(data.engineStatus);
    updateCapacity(data.capacity);
    updateLiveWorkflows(data.workflows, data.timestamp);
    if (data.finished && data.finished.length > 0) mergeFinished(data.finished);
  }

  function updateStatusBadges(s) {
    const rb = document.getElementById('badge-running');
    const rt = document.getElementById('badge-running-text');
    const hb = document.getElementById('badge-healthy');
    const ht = document.getElementById('badge-healthy-text');

    if (s.running) { rb.className = 'badge running'; rt.textContent = 'Running'; }
    else { rb.className = 'badge stopped'; rt.textContent = 'Stopped'; }

    if (s.healthy) { hb.className = 'badge healthy'; ht.textContent = 'Healthy'; }
    else { hb.className = 'badge unhealthy'; ht.textContent = 'Unhealthy'; }

    if (s.idle) { rb.className = 'badge idle'; rt.textContent = 'Idle'; }
    if (s.disabled) { rb.className = 'badge disabled'; rt.textContent = 'Disabled'; }
    if (s.queueFull) {
      const qb = document.getElementById('badge-healthy');
      qb.className = 'badge queue-full';
      document.getElementById('badge-healthy-text').textContent = 'Queue Full';
    }
  }

  function updateCapacity(cap) {
    updateMeter('inbox', cap.inbox);
    updateMeter('db', cap.db);
    updateMeter('http', cap.http);
  }

  function updateMeter(id, slot) {
    const fill = document.getElementById('meter-' + id);
    const val = document.getElementById('meter-' + id + '-val');
    const pct = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;
    fill.style.width = Math.max(pct, 0.5) + '%';
    fill.className = 'meter-fill ' + (pct < 50 ? 'low' : pct < 80 ? 'mid' : 'high');
    val.textContent = slot.used.toLocaleString() + ' / ' + slot.total.toLocaleString();
  }

  var MAX_RECENT = 5;
  var GRACE_MS = 500;
  var pendingRemoval = {};

  function moveToRecent(key) {
    var lastWf = pendingRemoval[key];
    if (!lastWf) return;
    delete pendingRemoval[key];

    var finishedWf = JSON.parse(JSON.stringify(lastWf));
    var anyFailed = finishedWf.steps.some(function(s) { return s.status === 'Failed'; });
    var finalStatus = anyFailed ? 'Failed' : 'Completed';
    finishedWf.status = finalStatus;
    finishedWf.steps.forEach(function(s) {
      if (s.status !== 'Failed' && s.status !== 'Canceled') s.status = finalStatus;
    });
    recentlyFinished[key] = { wf: finishedWf, removedAt: Date.now() };
    if (workflowTimers[key]) workflowTimers[key].frozenAt = Date.now();
    delete previousWorkflows[key];
    delete workflowFingerprints[key];

    var liveEl = document.getElementById('wf-' + css(key));
    if (liveEl) liveEl.remove();

    var recentCard = document.createElement('div');
    recentCard.className = 'workflow-card';
    recentCard.id = 'wf-' + css(key);
    recentCard.style.animation = 'none';
    recentCard.innerHTML = buildCardHTML(finishedWf, true);
    recentContainer.prepend(recentCard);

    // Evict oldest if over capacity
    var rfKeys = Object.keys(recentlyFinished).sort(function(a, b) {
      return recentlyFinished[b].removedAt - recentlyFinished[a].removedAt;
    });
    while (rfKeys.length > MAX_RECENT) {
      var evictKey = rfKeys.pop();
      var el = document.getElementById('wf-' + css(evictKey));
      if (el) {
        el.classList.add('removing');
        setTimeout((function(e) { return function() { e.remove(); }; })(el), 500);
      }
      delete recentlyFinished[evictKey];
      delete workflowTimers[evictKey];
      delete workflowFingerprints[evictKey];
    }

    var recentN = Object.keys(recentlyFinished).length;
    recentCount.textContent = recentN;
    recentSection.style.display = recentN > 0 ? 'block' : 'none';
    tabActiveCount.textContent = Object.keys(previousWorkflows).length;
  }

  function mergeFinished(finished) {
    finished.forEach(function(fin) {
      var key = fin.idempotencyKey;
      var target = pendingRemoval[key];
      if (!target) return;
      // Merge step updatedAt from DB-backed final state
      fin.steps.forEach(function(fs) {
        var existing = target.steps.find(function(s) { return s.idempotencyKey === fs.idempotencyKey; });
        if (existing && !existing.updatedAt && fs.updatedAt) {
          existing.updatedAt = fs.updatedAt;
        }
      });
    });
  }

  // --- Live workflows ---
  function updateLiveWorkflows(workflows, timestamp) {
    var currentKeys = new Set(workflows.map(function(w) { return w.idempotencyKey; }));
    var previousKeys = new Set(Object.keys(previousWorkflows));

    // When a workflow disappears from SSE, start grace period before moving to recent
    previousKeys.forEach(function(key) {
      if (!currentKeys.has(key) && !recentlyFinished[key] && !pendingRemoval[key]) {
        pendingRemoval[key] = previousWorkflows[key];
        setTimeout(function() { moveToRecent(key); }, GRACE_MS);
      }
    });

    // If a pending-removal workflow reappears, cancel the move
    currentKeys.forEach(function(key) {
      if (pendingRemoval[key]) {
        delete pendingRemoval[key];
      }
    });

    // Add/update active workflows
    workflows.forEach(function(wf) {
      var elId = 'wf-' + css(wf.idempotencyKey);
      var card = document.getElementById(elId);

      // If it was in recentlyFinished, it's back — remove from that list
      delete recentlyFinished[wf.idempotencyKey];

      var fp = fingerprint(wf);
      if (!card) {
        card = createWorkflowCard(wf, elId);
        liveContainer.appendChild(card);
        workflowTimers[wf.idempotencyKey] = {
          startedAt: wf.executionStartedAt || wf.createdAt
        };
        workflowFingerprints[wf.idempotencyKey] = fp;
      } else if (workflowFingerprints[wf.idempotencyKey] !== fp) {
        updateWorkflowCard(card, wf);
        workflowFingerprints[wf.idempotencyKey] = fp;
      }

      previousWorkflows[wf.idempotencyKey] = wf;
    });

    var liveN = workflows.length;
    var recentN = Object.keys(recentlyFinished).length;
    liveCount.textContent = liveN;
    liveEmpty.style.display = liveN === 0 && recentN === 0 ? 'block' : 'none';
    recentCount.textContent = recentN;
    recentSection.style.display = recentN > 0 ? 'block' : 'none';
  }

  function scrollPipelineToActive(card) {
    var p = card.querySelector('.pipeline');
    if (!p) return;
    var active = p.querySelector('.step-circle.Processing') || p.querySelector('.step-circle.Requeued');
    if (active) {
      var node = active.closest('.step-node');
      if (node) {
        var offset = node.offsetLeft - p.offsetLeft - (p.clientWidth / 2) + (node.offsetWidth / 2);
        p.scrollLeft = Math.max(0, offset);
        return;
      }
    }
    // Fallback: scroll to end
    p.scrollLeft = p.scrollWidth;
  }

  function createWorkflowCard(wf, elId) {
    const card = document.createElement('div');
    card.className = 'workflow-card';
    card.id = elId;
    card.innerHTML = buildCardHTML(wf);
    requestAnimationFrame(function() { scrollPipelineToActive(card); });
    return card;
  }

  function updateWorkflowCard(card, wf) {
    card.innerHTML = buildCardHTML(wf);
    scrollPipelineToActive(card);
  }

  function buildCardHTML(wf, isStatic) {
    const inst = wf.instance;
    const guid = inst.instanceGuid;
    const retries = wf.steps.reduce(function(sum, s) { return sum + s.retryCount; }, 0);
    const statusClass = isStatic ? '' : ' ' + wf.status;

    let html = '<div class="card-header">';
    html += '<div><span class="instance-id">' + esc(inst.org) + '/' + esc(inst.app) + '/' + inst.instanceOwnerPartyId + '/</span>';
    html += '<span class="instance-guid">' + esc(guid) + '</span></div>';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<span class="status-pill ' + wf.status + '"' + (isStatic ? ' style="animation:none"' : '') + '>' + wf.status + '</span>';
    if (!isStatic) {
      html += '<span class="elapsed" data-timer="' + esc(wf.idempotencyKey) + '">0.0s</span>';
    }
    html += '</div></div>';

    html += '<div class="card-meta">';
    html += '<span class="wf-key">wf: ' + esc(wf.operationId) + '</span>';
    if (retries > 0) html += '<span class="retry-badge">&#8635;' + retries + '</span>';
    html += '</div>';

    html += buildPipelineHTML(wf.idempotencyKey, wf.steps, isStatic);
    return html;
  }

  function buildPipelineHTML(wfKey, steps, isStatic) {
    if (!steps || steps.length === 0) return '';
    let html = '<div class="pipeline">';
    steps.forEach(function(step, i) {
      if (i > 0) {
        const prevDone = steps[i-1].status === 'Completed';
        const curActive = step.status === 'Processing' || step.status === 'Requeued';
        const isLeadingEdge = prevDone && curActive;
        const lineClass = isStatic ? (prevDone ? 'active' : '') : (isLeadingEdge ? 'processing' : prevDone ? 'active' : '');
        const staticLine = isStatic || (prevDone && !isLeadingEdge);
        html += '<div class="step-connector"><svg viewBox="0 0 56 6"><line x1="0" y1="3" x2="56" y2="3" class="' + lineClass + '"' + (staticLine ? ' style="animation:none;stroke-dasharray:12,6.67"' : '') + '/></svg></div>';
      }
      html += '<div class="step-node">';
      html += '<div class="step-circle ' + step.status + '" style="cursor:pointer' + (isStatic ? ';animation:none;box-shadow:none' : '') + '" onclick="openStepModal(\'' + esc(wfKey) + '\',\'' + esc(step.idempotencyKey) + '\',\'' + esc(step.commandDetail) + '\')">' + stepIcon(step.status) + '</div>';
      html += '<div class="step-label" title="' + esc(step.commandDetail) + '">' + esc(step.commandDetail) + '</div>';
      html += '<div class="step-meta">';
      html += '<span class="step-type ' + esc(step.commandType) + '">' + esc(step.commandType) + '</span>';
      if (step.retryCount > 0) html += '<div class="step-retry">&#8635;' + step.retryCount + '</div>';
      if (step.status === 'Requeued' && step.backoffUntil && !isStatic) {
        html += '<span class="step-backoff" data-backoff="' + step.backoffUntil + '"></span>';
      }
      if (step.executionStartedAt && (step.status === 'Completed' || step.status === 'Failed') && step.updatedAt) {
        var dur = (new Date(step.updatedAt).getTime() - new Date(step.executionStartedAt).getTime()) / 1000;
        html += '<span class="step-timing">' + (dur < 1 ? (dur * 1000).toFixed(0) + 'ms' : dur.toFixed(1) + 's') + '</span>';
      } else if (step.status === 'Processing' && !isStatic) {
        html += '<span class="step-timing">&hellip;</span>';
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function stepIcon(status) {
    switch(status) {
      case 'Completed': return '&#10003;';
      case 'Processing': return '&#9673;';
      case 'Failed': return '&#10007;';
      case 'Requeued': return '&#8635;';
      case 'Canceled': return '&#8212;';
      default: return '&#9675;';
    }
  }

  // --- Elapsed time updater ---
  function formatElapsed(seconds) {
    if (seconds < 60) return seconds.toFixed(1) + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's';
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
  }

  function updateTimers() {
    const now = Date.now();
    document.querySelectorAll('[data-timer]').forEach(function(el) {
      const key = el.getAttribute('data-timer');
      const timer = workflowTimers[key];
      if (timer) {
        const started = new Date(timer.startedAt).getTime();
        const end = timer.frozenAt || now;
        el.textContent = formatElapsed((end - started) / 1000);
      }
    });
    // Backoff countdowns
    document.querySelectorAll('[data-backoff]').forEach(function(el) {
      const until = new Date(el.getAttribute('data-backoff')).getTime();
      const remaining = (until - now) / 1000;
      if (remaining > 0) {
        el.textContent = 'retry ' + remaining.toFixed(1) + 's';
      } else {
        el.textContent = 'retrying...';
      }
    });
    requestAnimationFrame(updateTimers);
  }
  requestAnimationFrame(updateTimers);

  // --- History ---
  window.loadHistory = function() {
    const filter = document.getElementById('history-filter').value;
    const btn = document.getElementById('history-load');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    fetch('/dashboard/history?status=' + filter + '&limit=50')
      .then(function(r) { return r.json(); })
      .then(function(workflows) {
        historyContainer.innerHTML = '';
        if (workflows.length === 0) {
          historyEmpty.textContent = 'No ' + filter + ' workflows found';
          historyEmpty.style.display = 'block';
        } else {
          historyEmpty.style.display = 'none';
          workflows.forEach(function(wf) {
            const card = document.createElement('div');
            card.className = 'workflow-card';
            card.style.animation = 'none';
            card.innerHTML = buildCardHTML(wf, true);
            historyContainer.appendChild(card);
          });
        }
      })
      .catch(function(err) {
        historyEmpty.textContent = 'Error loading history: ' + err.message;
        historyEmpty.style.display = 'block';
      })
      .finally(function() {
        btn.disabled = false;
        btn.textContent = 'Load';
      });
  };

  // --- Step modal ---
  var modalEl = document.getElementById('step-modal');
  var modalTitle = document.getElementById('modal-title');
  var modalBody = document.getElementById('modal-body');

  window.openStepModal = function(wfKey, stepKey, stepName) {
    modalTitle.textContent = stepName || 'Step Details';
    modalBody.innerHTML = '<div class="modal-loading">Loading...</div>';
    modalEl.classList.add('open');

    fetch('/dashboard/step?wf=' + encodeURIComponent(wfKey) + '&step=' + encodeURIComponent(stepKey))
      .then(function(r) {
        if (!r.ok) throw new Error('Step not found (may have left inbox)');
        return r.json();
      })
      .then(function(data) {
        modalBody.innerHTML = '<pre>' + syntaxHighlight(expandJsonStrings(data)) + '</pre>';
      })
      .catch(function(err) {
        modalBody.innerHTML = '<div class="modal-loading">' + esc(err.message) + '</div>';
      });
  };

  window.closeModal = function() {
    modalEl.classList.remove('open');
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  function expandJsonStrings(obj) {
    if (typeof obj === 'string') {
      var t = obj.trim();
      if ((t[0] === '{' && t[t.length-1] === '}') || (t[0] === '[' && t[t.length-1] === ']')) {
        try { return expandJsonStrings(JSON.parse(t)); } catch(e) {}
      }
      return obj;
    }
    if (Array.isArray(obj)) return obj.map(expandJsonStrings);
    if (obj && typeof obj === 'object') {
      var r = {};
      for (var k in obj) { if (obj.hasOwnProperty(k)) r[k] = expandJsonStrings(obj[k]); }
      return r;
    }
    return obj;
  }

  function syntaxHighlight(obj) {
    var json = JSON.stringify(obj, null, 2);
    return json.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
      var cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          match = match.replace(/:$/, '') + ':';
          return '<span class="' + cls + '">' + escHtml(match.slice(0, -1)) + '</span>:';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + escHtml(match) + '</span>';
    });
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Helpers ---
  function css(s) { return s.replace(/[^a-zA-Z0-9-_]/g, '_'); }
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  // --- Init ---
  connectSSE();
})();
</script>
</body>
</html>
""";
}
