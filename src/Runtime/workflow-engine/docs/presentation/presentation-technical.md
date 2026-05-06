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
      margin-top: 1em;
      margin-bottom: 0.3em;
    }
    pre {
      font-size: 0.85em;
      margin: 1em 0;
      font-family: "Menlo", "Consolas", "DejaVu Sans Mono", "Courier New", monospace;
    }
    code {
      font-size: 0.85em;
      font-family: "Menlo", "Consolas", "DejaVu Sans Mono", "Courier New", monospace;
      padding: 0.1em 0.3em;
      margin: 0;
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
            └── if next is service task    → loop again
```

If the task after the current one is a service task (PDF, signing, payment), the loop continues automatically within the same request. Every handler, every validation, every storage call happens inline.

---

# Where it breaks

The entire chain runs synchronously inside one HTTP request/response cycle.

| Failure point                                | What happens                                                  |
| -------------------------------------------- | ------------------------------------------------------------- |
| Service task crashes (PDF, signing, payment) | In-memory changes lost. Instance stays at previous state.     |
| Storage API call times out                   | State unknown. May or may not have persisted. No idempotency. |
| Pod killed mid-processing                    | Instance lock held for 5 minutes. Data state unclear.         |
| Timeout during auto-loop iteration N         | Iterations 1..N-1 persisted. Iteration N partially executed.  |
| Network failure to Platform Storage          | Client gets 5xx. No retry. Manual intervention required.      |

The common thread: **no automatic recovery**. If it fails, someone has to investigate and fix it.

---

# What we built

A dedicated workflow engine that moves process execution out of the HTTP request cycle.

```
Altinn App                              Workflow Engine
    │                                          │
    │──── POST /workflows ────────────────────►│  Validate & persist
    │◄─── 201 Created ─────────────────────────│  to PostgreSQL
    │                                          │
    │                                          │
    │                                          │
    │                                   Processor picks up
    │                                    workflow from DB
    │                                          │
    │◄─── POST /callbacks ─────────────────────│  Step 1
    │──── 200 + { state } ────────────────────►│
    │                                          │
    │◄─── POST /callbacks ─────────────────────│  Step 2
    │──── 200 + { state } ────────────────────►│
    │                                          │
    │                                  Completed or Failed
```

The app enqueues and returns immediately. The engine handles execution, retries, and failure.

---

# How it handles the same failures

| Failure point             | Current behaviour               | Workflow Engine behaviour                               |
| ------------------------- | ------------------------------- | ------------------------------------------------------- |
| Service task crashes      | Lost. Manual recovery.          | Requeued with backoff. Retried automatically.           |
| Storage/network timeout   | Unknown state. No retry.        | Step marked retryable. Engine retries.                  |
| Pod killed mid-processing | Lock held 5 min. State unclear. | Heartbeat expires. Another worker reclaims.             |
| Retries exhausted         | N/A (no retries exist)          | Workflow marked Failed with error detail. Queryable.    |
| Downstream 5xx            | Request fails. User sees error. | Retried with exponential backoff up to deadline.        |
| Downstream 4xx            | Request fails. User sees error. | Marked as critical error. No retry. Clear in dashboard. |

Every failure path ends in either **successful retry** or **explicit, visible failure**.

---

# Tech stack

| Component        | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Runtime          | .NET 10, C# 14                                               |
| Database         | PostgreSQL (EF Core + raw SQL for hot paths)                 |
| Telemetry        | OpenTelemetry &rarr; OTLP &rarr; Grafana (Tempo, Prometheus) |
| Testing          | xUnit v3, Testcontainers (PostgreSQL), WireMock, Verify.Net  |
| Dashboard        | Vanilla JS ES modules (no build step), embedded in Core      |
| Containerization | Docker, multi-stage build                                    |

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
      ├── Processor   // background loop, fetches from DB
      ├── Executor    // executes the actual step commands
      ├── Commands    // pluggable: Webhook, App, <future>
      ├── Data        // repository, EF Core entities
      ├── Resilience  // concurrency limiters, retry strategies
      └── Telemetry   // OpenTelemetry via OTLP
```

`WorkflowEngine.App` is the Altinn-specific host. It adds `AppCommand` &mdash; an HTTP callback into Altinn apps carrying full instance context (org, app, actor, lockToken, instanceGuid).

Database is the single source of truth. No in-memory queue. Enqueue and status-update paths use channel-based write buffers for throughput.

---

# Processing model

### How work flows through the engine

- `WorkflowProcessor` polls PostgreSQL &mdash; `FOR UPDATE SKIP LOCKED` for atomic, non-blocking row locking
- Multiple engine instances can run against the same database safely
- Each workflow's steps are executed sequentially by `WorkflowExecutor`
- Three independent semaphore pools (workers, DB connections, HTTP calls) prevent resource exhaustion
- When load exceeds capacity, the engine returns **HTTP 429** on enqueue requests

### How failures are classified

| HTTP response | Classification | Action                     |
| ------------- | -------------- | -------------------------- |
| 2xx           | Success        | Next step                  |
| 408, 429, 5xx | Retryable      | Requeue with backoff       |
| Other 4xx     | Critical       | Fail immediately, no retry |

Retries are per-step with configurable backoff (exponential, linear, constant), delay caps, and total deadline.

### How crashes are handled

- `HeartbeatService` proves worker liveness &mdash; if heartbeat expires, another worker reclaims the workflow
- Poison workflow protection after configurable max reclaim attempts
- Cross-pod cancellation propagation via DB polling; resume support for failed/canceled workflows

---

# Observability

### OpenTelemetry &rarr; Grafana

- Counters, histograms, and gauges across the full workflow and step lifecycle
- Distributed tracing with W3C trace context &mdash; spans for processing, execution, callbacks, slot acquisition
- Activity links between dependent workflows

### Dashboard (built-in)

- Real-time SSE streams: engine health, active workflows, step pipelines
- Query interface with namespace/status/label filters
- Click-through to Grafana Tempo traces

---

# Workflow Dependencies

![](workflow-dependencies.drawio.svg)

- Workflows are submitted as dependency graphs &mdash; resolved via topological sort with cycle detection.
- A workflow starts only when all its dependencies have completed.
- If a dependency fails, all dependents are transitively marked `DependencyFailed`.
- Graphs can span multiple requests &mdash; later submissions reference existing workflows by ID.
