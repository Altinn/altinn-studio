---
marp: true
theme: gaia
paginate: true
size: 16:9
style: |
  :root {
    --color-background: #1e2a3a;
    --color-foreground: #cfd8dc;
    --color-highlight: #4fc3f7;
    --color-dimmed: #78909c;
  }
  section {
    font-size: 20px;
    padding: 30px 40px;
  }
  h1 {
    margin-bottom: 0.5em;
  }
  h3 {
    font-size: 1.1em;
    margin-top: 0.4em;
    margin-bottom: 0.2em;
  }
  pre {
    font-size: 0.85em;
    margin: 1em 0;
  }
  table {
    font-size: 0.8em;
    margin: 1em 0;
    width: 100%;
  }
  th, td {
    padding: 0.5em 1em;
  }
  ul, ol {
    margin: 0.2em 0;
  }
  li {
    margin: 0.1em 0;
  }
  p {
    margin: 0.3em 0;
  }
  blockquote {
    padding: 0.4em 0.8em;
    margin: 0.4em 0;
  }
---

<!-- _class: lead -->

# Workflow Engine

Async process orchestration for Altinn

---

# How _process/next_ works today

`PUT /process/next` executes the entire process transition in a single HTTP request:

```
ProcessController.NextElement()
    │
    └── ProcessEngine.Next()               ← in-memory loop (max 100 iterations)
            │
            ├── Authorize
            ├── AcquireInstanceLock        ← 5-minute TTL via Platform Storage
            ├── HandleServiceTask()        ← or HandleUserAction()
            ├── Validate()
            ├── HandleMoveToNext()
            │     ├── HandleEvents()       ← task start/end handlers, PDF, signing, payment...
            │     └── DispatchToStorage()  ← PUT to Platform Storage (events + state)
            │
            └── if next is service task → loop again
```

If the task after the current one is a service task (PDF, signing, payment), the loop continues automatically within the same request. Every handler, every validation, every storage call happens inline.

---

# Where it breaks

The entire chain runs synchronously inside one HTTP request/response cycle.

| Failure point | What happens |
|---|---|
| Service task crashes (PDF, signing, payment) | In-memory changes lost. Instance stays at previous state. |
| Storage API call times out | State unknown. May or may not have persisted. No idempotency. |
| Pod killed mid-processing | Instance lock held for 5 minutes. Data state unclear. |
| Timeout during auto-loop iteration N | Iterations 1..N-1 persisted. Iteration N partially executed. |
| Network failure to Platform Storage | Client gets 5xx. No retry. Manual intervention required. |

The common thread: **no automatic recovery**. If it fails, someone has to investigate and fix it.

---

# What we built

A dedicated workflow engine that moves process execution out of the HTTP request cycle.

```
Altinn App                              Workflow Engine
    │                                          │
    │──── POST /workflows ───────────────────▶│  Validate & persist
    │◀─── 201 Created ────────────────────────│  to PostgreSQL
    │                                          │
    │                                          │
    │                                          │
    │                                   Processor picks up
    │                                    workflow from DB
    │                                          │
    │◀─── POST /callbacks ────────────────────│  Step 1
    │──── 200 + { state } ───────────────────▶│
    │                                          │
    │◀─── POST /callbacks ────────────────────│  Step 2
    │──── 200 + { state } ───────────────────▶│
    │                                          │
    │                                  Completed or Failed
```

The app enqueues and returns immediately. The engine handles execution, retries, and failure.

---

# How it handles the same failures

| Failure point | Current behavior | Workflow Engine behavior |
|---|---|---|
| Service task crashes | Lost. Manual recovery. | Requeued with backoff. Retried automatically. |
| Storage/network timeout | Unknown state. No retry. | Step marked retryable. Engine retries. |
| Pod killed mid-processing | Lock held 5 min. State unclear. | Heartbeat expires. Another worker reclaims. |
| Retries exhausted | N/A (no retries exist) | Workflow marked Failed with error detail. Queryable. |
| Downstream 5xx | Request fails. User sees error. | Retried with exponential backoff up to deadline. |
| Downstream 4xx | Request fails. User sees error. | Marked as critical error. No retry. Clear in dashboard. |

Every failure path ends in either **successful retry** or **explicit, visible failure**.

---

# Tech stack

| Component | Technology |
|---|---|
| Runtime | .NET 10, C# 14 |
| Database | PostgreSQL (EF Core, `FOR UPDATE SKIP LOCKED`) |
| Telemetry | OpenTelemetry &rarr; OTLP &rarr; Grafana (Tempo, Prometheus) |
| Testing | xUnit v3, Testcontainers (PostgreSQL), WireMock, Verify.Net |
| Dashboard | Vanilla JS ES modules (no build step), embedded in Core |
| Containerization | Docker, multi-stage build |

---

# Architecture

The engine is a **reusable class library**. Hosts compose it and register their own commands.

```
Host Application (e.g. WorkflowEngine.App)
│
├── AddWorkflowEngine(connectionString)  // registers everything
├── AddCommand<AppCommand>()             // host-specific command
├── UseWorkflowEngine()                  // wires pipeline
│
└── WorkflowEngine.Core (class library)
      ├── Processor   (background loop, fetches from DB)
      ├── Executor    (runs commands per step)
      ├── Commands    (pluggable: Webhook, App, <future>)
      ├── Data        (PostgreSQL, EF Core)
      ├── Resilience  (concurrency limiters, retry strategies)
      └── Telemetry   (OpenTelemetry via OTLP)
```

`WorkflowEngine.App` is the Altinn-specific host. It adds `AppCommand` &mdash; an HTTP callback into Altinn apps carrying full instance context (org, app, actor, lockToken, instanceGuid).

Database is the single source of truth. No in-memory queue.

---

# Processing model

### How work is picked up
- `WorkflowProcessor` (BackgroundService) polls PostgreSQL in a loop
- `FOR UPDATE SKIP LOCKED` provides atomic, non-blocking row locking
- Multiple engine instances can run against the same database safely

### How work is executed
- Each workflow's steps are executed sequentially by `WorkflowExecutor`
- Commands return `Success`, `RetryableError`, or `CriticalError`
- On retryable error: workflow requeued with configurable backoff (exponential, linear, constant)
- On critical error: workflow marked Failed immediately

### How crashes are handled
- `HeartbeatService` updates a timestamp for all in-flight workflows on a regular interval
- If heartbeat expires, another worker reclaims the workflow
- After a configurable number of reclaim attempts: marked Failed (poison workflow protection)

---

# Retry strategy

Per-step, configurable:

| Parameter | Purpose |
|---|---|
| `BackoffType` | Exponential, Linear, or Constant |
| `BaseInterval` | Initial delay between retries |
| `MaxRetries` | Max retry count (optional) |
| `MaxDelay` | Cap on individual delay (optional) |
| `MaxDuration` | Total deadline from first attempt (optional) |

Error classification drives retry behavior:

| HTTP response | Classification | Action |
|---|---|---|
| 2xx | Success | Next step |
| 408, 429, 5xx | Retryable | Requeue with backoff |
| Other 4xx | Critical | Fail immediately, no retry |

---

# Concurrency & backpressure

Three independent semaphore pools prevent resource exhaustion:

| Pool | Controls |
|---|---|
| Workers | Concurrent workflow processing tasks |
| DB connections | PostgreSQL connection slots |
| HTTP calls | Outbound HTTP requests to apps/webhooks |

When active workflows exceed the backpressure threshold, the engine returns **HTTP 429** on enqueue requests.

### Cancellation
- `POST /api/v1/workflows/{id}/cancel`
- Propagated across pods via DB polling
- Idempotent &mdash; safe to call multiple times

### Resume
- `POST /api/v1/workflows/{id}/resume?cascade=false`
- Resumes failed, canceled, or dependency-failed workflows
- Optional `cascade=true` to resume transitively dependent workflows

---

# Observability

### Metrics (OpenTelemetry &rarr; Grafana)
- Workflow counters: received, accepted, succeeded, failed, requeued, reclaimed
- Timing histograms: queue time, service time, total time (workflow + step level)
- Resource gauges: worker/DB/HTTP slot utilization

### Traces
- Full distributed trace per workflow (W3C trace context)
- Spans for: processing, step execution, command callbacks, slot acquisition
- Activity links between dependent workflows

### Dashboard (built-in)
- Real-time SSE streams: engine health, active workflows, step pipelines
- Query interface with namespace/status/label filters
- Click-through to Grafana Tempo traces

### API
- `GET /api/v1/workflows/{id}` &mdash; status, steps, errors, retry counts
- `GET /api/v1/workflows` &mdash; list with filtering
- Health endpoints: `/health`, `/health/ready`, `/health/live`

---

# Workflow Dependencies

A single enqueue request can express **fan-out / fan-in** patterns:

```
              ┌──────────────────┐
              │   process/next   │
              │     (Task 1)     │
              └────────┬─────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
   ┌────────▼─────────┐   ┌───────▼──────────┐
   │   notification   │   │   eFormidling    │
   └────────┬─────────┘   └───────┬──────────┘
            │                     │
            └──────────┬──────────┘
                       │
              ┌────────▼─────────┐
              │   process/next   │
              │     (Task 2)     │
              └──────────────────┘
```

- DAG resolution via topological sort. Cycle detection. Atomic insert.
- A workflow only starts when all its dependencies have completed.
- If a dependency fails, dependents are marked `DependencyFailed`.

---

# Current Status

| Area | Status |
|---|---|
| Core engine (processing, retries, heartbeat, cancellation) | Implemented |
| Command system (Webhook, AppCommand) | Implemented |
| PostgreSQL persistence (EF Core, migrations, batch operations) | Implemented |
| Telemetry (metrics, traces, OTLP export) | Implemented |
| Dashboard (real-time monitoring, query, step detail) | Implemented |
| API (enqueue, query, cancel, health) | Implemented |
| Workflow dependencies (DAG, topological sort) | Implemented |
| Integration tests (Testcontainers, WireMock) | Implemented |
| Load testing (k6 scripts) | Implemented |
| Integration with Altinn app process engine | In progress |
| Production deployment | In progress |

