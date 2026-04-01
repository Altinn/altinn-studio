# Workflow Engine — Technical Guide

This document is aimed at internal developers who need to understand, integrate with, or extend the Workflow Engine.

## Table of Contents

- [Workflow Engine — Technical Guide](#workflow-engine--technical-guide)
    - [Table of Contents](#table-of-contents)
    - [Overview](#overview)
    - [Architecture](#architecture)
    - [Project Structure](#project-structure)
    - [Hosting Model](#hosting-model)
    - [Workflow Lifecycle](#workflow-lifecycle)
    - [Command System](#command-system)
    - [Retry \& Error Handling](#retry--error-handling)
    - [Concurrency Model](#concurrency-model)
    - [Heartbeat \& Stale Recovery](#heartbeat--stale-recovery)
    - [Cancellation](#cancellation)
    - [Resume](#resume)
    - [Dependency Graphs](#dependency-graphs)
    - [Telemetry \& Observability](#telemetry--observability)
    - [Dashboard](#dashboard)
    - [API Reference](#api-reference)
    - [Health Checks](#health-checks)
    - [Configuration](#configuration)
    - [Testing](#testing)
    - [Creating a New Host](#creating-a-new-host)
    - [The App Layer: `WorkflowEngine.App`](#the-app-layer-workflowengineapp)

---

## Overview

The Workflow Engine is an asynchronous workflow orchestration service. It accepts workflow requests, queues them in PostgreSQL, and executes each step sequentially with at-least-once delivery, automatic retries, idempotency, and distributed tracing. Failed workflows are always left in an explicit error state — never silently lost.

Built on .NET 10, PostgreSQL, and OpenTelemetry.

## Architecture

The engine is a **reusable class library**, not a standalone application. Hosts compose it via extension methods and add their own domain-specific commands.

```
┌──────────────────────────────────────────────────┐
│                Host Application                  │
│            (e.g. WorkflowEngine.App)             │
│                                                  │
│  Program.cs:                                     │
│    builder.AddWorkflowEngine(connectionString)   │
│    builder.Services.AddCommand<AppCommand>()     │
│    app.UseWorkflowEngine()                       │
└──────────────────────┬───────────────────────────┘
                       │ references
┌──────────────────────▼───────────────────────────┐
│              WorkflowEngine.Core                 │
│                                                  │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Processor  │  │ Executor │  │  Endpoints   │  │
│  │ (bg loop)  │──│          │  │  (API/Dash)  │  │
│  └─────┬──────┘  └────┬─────┘  └──────────────┘  │
│        │              │                          │
│  ┌─────▼──────┐  ┌────▼─────┐  ┌──────────────┐  │
│  │   Data     │  │ Commands │  │  Telemetry   │  │
│  │ (Postgres) │  │ Registry │  │ (OTel/OTLP)  │  │
│  └────────────┘  └──────────┘  └──────────────┘  │
│                                                  │
│  ┌────────────┐  ┌──────────┐                    │
│  │ Resilience │  │  Models  │                    │
│  │ (Limiter)  │  │          │                    │
│  └────────────┘  └──────────┘                    │
└──────────────────────────────────────────────────┘
```

- **Database is the single source of truth** — no in-memory queue. The processor fetches work from PostgreSQL using `FOR UPDATE SKIP LOCKED`.
- **Horizontal scaling** — multiple engine instances can run against the same database. Row-level locking prevents double-processing.
- **Pluggable commands** — the engine knows nothing about what it's executing. Commands are registered via DI and looked up by type string.

## Project Structure

| Project                     | Purpose                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `WorkflowEngine.Core`       | Processing loop, HTTP endpoints, executor, host composition extensions                |
| `WorkflowEngine.Commands`   | Built-in commands (WebhookCommand). Host-specific commands live in their own projects |
| `WorkflowEngine.Models`     | Domain models: `Workflow`, `Step`, `CommandDefinition`, status enums, exceptions      |
| `WorkflowEngine.Data`       | EF Core persistence, `IEngineRepository`, PostgreSQL implementation                   |
| `WorkflowEngine.Resilience` | `IConcurrencyLimiter` (DB/HTTP/Worker semaphore pools), `RetryStrategy`               |
| `WorkflowEngine.Telemetry`  | OpenTelemetry counters, histograms, observable gauges, activity source                |
| `WorkflowEngine.TestKit`    | Reusable integration test infrastructure: fixtures, API client, test helpers          |

## Hosting Model

Two extension methods compose the engine into a host:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.AddWorkflowEngine(connectionString);        // registers all core services
builder.Services.AddCommand<MyCustomCommand>();     // host-specific commands

var app = builder.Build();
await app.UseWorkflowEngine();                      // middleware, endpoints, migrations
await app.RunAsync();
```

`AddWorkflowEngine()` registers core services, health checks, OpenTelemetry, OpenAPI, HttpClientFactory, and the built-in WebhookCommand.

`UseWorkflowEngine()` configures the middleware pipeline, maps API and dashboard endpoints, and applies EF Core migrations.

## Workflow Lifecycle

```
                    ┌──────────┐
                    │ Enqueued │
                    └────┬─────┘
                         │ processor picks up
                    ┌────▼──────┐
              ┌─────│Processing │───────┐
              │     └─────┬─────┘       │
              │           │             │
         all steps    step fails   cancellation
          succeed    (exhausted)    requested
              │           │             │
        ┌─────▼───┐   ┌───▼───┐   ┌─────▼────┐
        │Completed│   │Failed │   │ Canceled │
        └─────────┘   └───────┘   └──────────┘
```

Additional states:

- **DependencyFailed** — a dependency workflow failed
- **Requeued** — a retryable error occurred; the workflow returns to the queue with a backoff delay

Terminal workflows (Failed, Canceled, DependencyFailed) can be **resumed** back to Enqueued via the resume API. See [Resume](#resume).

### Processing Loop

The `WorkflowProcessor` (`BackgroundService`) runs continuously:

1. Check available worker slots
2. `FetchAndLockWorkflows()` — atomic PostgreSQL query using `FOR UPDATE SKIP LOCKED`
3. For each workflow, spawn a fire-and-forget task through `WorkflowHandler`
4. `WorkflowHandler` iterates steps in order, calling `WorkflowExecutor.Execute()` for each
5. On completion/failure, update status and release the worker slot

Stale workflows (crashed workers) are automatically reclaimed — see [Heartbeat & Stale Recovery](#heartbeat--stale-recovery).

## Command System

Commands define what happens when a step is executed.

### ICommand Interface

```csharp
public interface ICommand
{
    string CommandType { get; }           // e.g. "webhook", "app"
    Type? CommandDataType { get; }        // typed payload schema
    Type? WorkflowContextType { get; }    // typed workflow context

    CommandValidationResult Validate(object? data, object? context);
    Task<ExecutionResult> ExecuteAsync(CommandExecutionContext context, CancellationToken ct);
}
```

Base classes `Command<TData, TContext>` and `Command<TData>` provide typed overrides.

### Built-in: WebhookCommand

Executes HTTP requests (GET or POST). Response classification:

| Response      | Classification | Action             |
| ------------- | -------------- | ------------------ |
| 2xx           | Success        | Next step          |
| 408, 429, 5xx | Retryable      | Retry with backoff |
| Other 4xx     | Critical       | Fail immediately   |

### Registration

```csharp
builder.Services.AddCommand<WebhookCommand>();   // done by Core automatically
builder.Services.AddCommand<AppCommand>();       // host adds its own
```

The `CommandRegistry` maps type strings to `ICommand` singletons. Commands validate their data at **enqueue time** — invalid requests are rejected before anything is persisted.

### ExecutionResult

| Result                                    | Meaning                      |
| ----------------------------------------- | ---------------------------- |
| `ExecutionResult.Success()`               | Step completed               |
| `ExecutionResult.RetryableError(message)` | Transient failure — retry    |
| `ExecutionResult.CriticalError(message)`  | Permanent failure — no retry |

### State Passing

Each step's `StateOut` becomes the next step's `StateIn`:

```
Step 1 (validate) → StateOut: {"validated": true}
Step 2 (sign)     → StateIn:  {"validated": true}  →  StateOut: {"signed": true}
Step 3 (confirm)  → StateIn:  {"signed": true}
```

## Retry & Error Handling

### RetryStrategy

Per-step, configurable:

| Field          | Purpose                                      |
| -------------- | -------------------------------------------- |
| `BackoffType`  | `Exponential`, `Linear`, or `Constant`       |
| `BaseInterval` | Initial delay                                |
| `MaxRetries`   | Max retry count (optional)                   |
| `MaxDelay`     | Cap on individual delay (optional)           |
| `MaxDuration`  | Total deadline from first attempt (optional) |

**Default**: Exponential, 1s base, 5m max delay, 24h deadline.

### Backoff Calculation

| Type        | Formula                  | Example (1s base)                      |
| ----------- | ------------------------ | -------------------------------------- |
| Constant    | `base`                   | 1s, 1s, 1s...                          |
| Linear      | `base × iteration`       | 1s, 2s, 3s...                          |
| Exponential | `base × 2^(iteration-1)` | 1s, 2s, 4s, 8s... (capped at MaxDelay) |

### Failure Outcomes

When a workflow fails:

1. Step marked `Failed` with error details recorded in `ErrorHistory`
2. Workflow marked `Failed`
3. Dependent workflows marked `DependencyFailed`
4. All visible via API, dashboard, and telemetry

## Concurrency Model

Three independent semaphore pools via `IConcurrencyLimiter`:

| Pool          | Default | Purpose                              |
| ------------- | ------- | ------------------------------------ |
| Workers       | 400     | Concurrent workflow processing tasks |
| DB Operations | 90      | PostgreSQL connection slots          |
| HTTP Calls    | 400     | Outbound HTTP requests               |

When `ActiveWorkflowCount` ≥ `BackpressureThreshold` (default: 500,000), the engine returns HTTP 429 on enqueue requests.

## Heartbeat & Stale Recovery

If a worker crashes mid-processing, the `HeartbeatService` enables recovery:

1. Workers update `HeartbeatAt` for all in-flight workflows on a regular interval (default: 3s)
2. The processor detects stale workflows where the heartbeat has expired (default threshold: 15s)
3. Stale workflows are reclaimed — reset to `Enqueued` and retried
4. After `MaxReclaimCount` (default: 3) reclaim attempts, the workflow is marked `Failed`

This enables safe horizontal scaling: if Instance A crashes, Instance B reclaims its work.

## Cancellation

```
POST /api/v1/{namespace}/workflows/{workflowId}/cancel
```

1. Sets `CancellationRequestedAt` in the database
2. `CancellationWatcherService` polls for pending cancellations
3. In-flight workflows receive a cancellation token signal
4. `WorkflowHandler` catches the cancellation and marks the workflow `Canceled`

Cancellation is **idempotent** — multiple calls return the original timestamp.

## Resume

Terminal workflows (Failed, Canceled, DependencyFailed) can be resumed for re-processing:

```
POST /api/v1/{namespace}/workflows/{workflowId}/resume?cascade=false
```

1. Resets the workflow to `Enqueued`, clearing `CancellationRequestedAt`, `BackoffUntil`, `HeartbeatAt`, and `ReclaimCount`
2. Resets all non-completed steps to `Enqueued`
3. The processor picks up the workflow on its next cycle

When `cascade=true`, all transitively dependent workflows in `DependencyFailed` state are also resumed. This is useful when a parent workflow's failure cascaded to its children — resuming the parent with cascade fixes the entire chain.

**Response (200 OK):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "resumedAt": "2026-03-19T10:02:00+00:00",
    "cascadeResumed": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

Returns 404 if the workflow does not exist, or 409 if it is not in a resumable state (e.g. `Completed` or `Processing`).

## Dependency Graphs

### Within a Single Request (DAG)

Use `ref` + `dependsOn` for arbitrary dependency graphs:

```json
{
  "workflows": [
    { "ref": "A", "operationId": "op-a", "steps": [...] },
    { "ref": "B", "operationId": "op-b", "dependsOn": ["A"], "steps": [...] },
    { "ref": "C", "operationId": "op-c", "dependsOn": ["A"], "steps": [...] },
    { "ref": "D", "operationId": "op-d", "dependsOn": ["B", "C"], "steps": [...] }
  ]
}
```

The engine resolves refs via topological sort (Kahn's algorithm), detects cycles, and inserts atomically. When a workflow fails, dependents are marked `DependencyFailed`.

### Across Requests

Reference previously-enqueued workflows by database ID:

```json
{ "ref": "new-workflow", "dependsOn": ["local-ref", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"] }
```

## Telemetry & Observability

OpenTelemetry data exported via OTLP, designed for Grafana (Tempo + Prometheus).

### Metrics

| Type       | Examples                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Counters   | `engine.workflows.request.received`, `.execution.success`, `.failed`, `.requeued`, `.reclaimed`  |
| Histograms | `engine.workflows.time.queue`, `.time.service`, `.time.total` (also per step)                    |
| Gauges     | `engine.workflows.active`, `.scheduled`, `.failed`; `engine.slots.workers.*`, `.db.*`, `.http.*` |

### Traces

Activity source `WorkflowEngine` with spans for workflow handling, step execution, command callbacks, and resource acquisition. Workflows carry W3C `DistributedTraceContext` for cross-service correlation.

## Dashboard

Real-time monitoring UI (vanilla JS, no build step), embedded in `WorkflowEngine.Core`.

- SSE streams for engine health and active workflows
- Visual step pipeline with status colors
- Step detail modal (command, retry strategy, trace ID, errors)
- State evolution viewer
- Grafana Tempo click-through links
- Paginated query interface with namespace/status/label filters

## API Reference

### Enqueue Workflows

```
POST /api/v1/{namespace}/workflows
```

**Request:**

```json
{
    "idempotencyKey": "process-next-abc123",
    "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "labels": {
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": "50001234",
        "instanceGuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "context": {
        "actor": { "userIdOrOrgNumber": "12345678901" },
        "lockToken": "lock-token-from-app",
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": 50001234,
        "instanceGuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "workflows": [
        {
            "ref": "validate-and-sign",
            "operationId": "process-task-2",
            "steps": [
                {
                    "operationId": "validate-form",
                    "command": {
                        "type": "app",
                        "data": { "commandKey": "ValidateFormData" }
                    }
                },
                {
                    "operationId": "generate-pdf",
                    "command": {
                        "type": "app",
                        "data": { "commandKey": "GeneratePdf" }
                    },
                    "retryStrategy": {
                        "backoffType": "Exponential",
                        "baseInterval": "00:00:02",
                        "maxDelay": "00:05:00",
                        "maxDuration": "01:00:00"
                    }
                },
                {
                    "operationId": "notify-complete",
                    "command": {
                        "type": "webhook",
                        "data": {
                            "uri": "https://hooks.example.com/workflow-done",
                            "method": "POST"
                        }
                    }
                }
            ]
        }
    ]
}
```

**Response (201 Created):**

```json
{
    "workflows": [
        {
            "ref": "validate-and-sign",
            "databaseId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "namespace": "ttd:my-app"
        }
    ]
}
```

**Response (200 OK — duplicate idempotency key):**

Same shape. The original workflow is returned, no new workflow is created.

**Response (400 Bad Request — validation failure):**

```json
{
    "message": "Command validation failed for step 'validate-form': commandKey is required"
}
```

### Get Single Workflow

```
GET /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Response (200 OK):**

```json
{
    "databaseId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "operationId": "process-task-2",
    "idempotencyKey": "process-next-abc123",
    "namespace": "ttd:my-app",
    "createdAt": "2026-03-19T10:00:00+00:00",
    "updatedAt": "2026-03-19T10:00:05+00:00",
    "overallStatus": "Completed",
    "labels": {
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": "50001234",
        "instanceGuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    "steps": [
        {
            "databaseId": "c1d2e3f4-a5b6-7890-cdef-123456789abc",
            "operationId": "validate-form",
            "processingOrder": 0,
            "updatedAt": "2026-03-19T10:00:02+00:00",
            "command": { "type": "app" },
            "status": "Completed",
            "retryCount": 0
        },
        {
            "databaseId": "d2e3f4a5-b6c7-8901-defg-23456789abcd",
            "operationId": "generate-pdf",
            "processingOrder": 1,
            "updatedAt": "2026-03-19T10:00:04+00:00",
            "command": { "type": "app" },
            "status": "Completed",
            "retryCount": 1,
            "retryStrategy": {
                "backoffType": "Exponential",
                "baseInterval": "00:00:02",
                "maxDelay": "00:05:00",
                "maxDuration": "01:00:00"
            }
        },
        {
            "databaseId": "e3f4a5b6-c7d8-9012-efgh-3456789abcde",
            "operationId": "notify-complete",
            "processingOrder": 2,
            "updatedAt": "2026-03-19T10:00:05+00:00",
            "command": { "type": "webhook" },
            "status": "Completed",
            "retryCount": 0
        }
    ]
}
```

### List Workflows

Filter by labels:

```http
GET /api/v1/ttd:my-app/workflows?labels.org=ttd&labels.app=my-app
```

Find all workflows for a specific instance via correlationId (instanceGuid):

```http
GET /api/v1/ttd:my-app/workflows?correlationId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Or combine filters — e.g. all workflows for a specific instance owner:

```http
GET /api/v1/ttd:my-app/workflows?labels.instanceOwnerPartyId=50001234
```

Returns an array of `WorkflowStatusResponse` (same shape as the single workflow GET above).

### Cancel Workflow

```http
POST /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancel
```

**Response (200 OK):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "cancellationRequestedAt": "2026-03-19T10:01:00+00:00",
    "canceledImmediately": true
}
```

### Resume Workflow

```
POST /api/v1/{namespace}/workflows/f47ac10b-58cc-4372-a567-0e02b2c3d479/resume?cascade=true
```

**Response (200 OK):**

```json
{
    "workflowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "resumedAt": "2026-03-19T10:02:00+00:00",
    "cascadeResumed": []
}
```

## Health Checks

```
GET /health        — basic health
GET /health/ready  — readiness (includes DB + engine status)
GET /health/live   — liveness
```

| Flag                      | Health Result |
| ------------------------- | ------------- |
| `Running + Healthy`       | Healthy       |
| `QueueFull` or `Disabled` | Degraded      |
| `Unhealthy` or `Stopped`  | Unhealthy     |

Response includes worker counts, connection pool utilization, and queue depths.

## Configuration

All via `EngineSettings` (bound from `appsettings.json`):

### Processing

| Setting                     | Default                  | Description                            |
| --------------------------- | ------------------------ | -------------------------------------- |
| `MaxWorkflowsPerRequest`    | —                        | Max workflows in a single enqueue call |
| `MaxStepsPerWorkflow`       | —                        | Max steps per workflow                 |
| `MaxLabels`                 | —                        | Max label key-value pairs              |
| `DefaultStepCommandTimeout` | 30s                      | Per-step execution timeout             |
| `DefaultStepRetryStrategy`  | Exponential(1s, 5m, 24h) | Default retry strategy                 |

### Heartbeat & Recovery

| Setting                       | Default | Description                                |
| ----------------------------- | ------- | ------------------------------------------ |
| `HeartbeatInterval`           | 3s      | Worker liveness proof interval             |
| `StaleWorkflowThreshold`      | 15s     | Time before a workflow is considered stale |
| `MaxReclaimCount`             | 3       | Reclaim attempts before marking as failed  |
| `CancellationWatcherInterval` | 2s      | Cross-pod cancellation poll interval       |

### Concurrency

| Setting                             | Default | Description                          |
| ----------------------------------- | ------- | ------------------------------------ |
| `Concurrency.MaxWorkers`            | 400     | Concurrent workflow processing tasks |
| `Concurrency.MaxDbOperations`       | 90      | DB connection pool limit             |
| `Concurrency.MaxHttpCalls`          | 400     | Outbound HTTP request limit          |
| `Concurrency.BackpressureThreshold` | 500,000 | Active workflow count before 429     |

### Write Buffer

| Setting                        | Default | Description                |
| ------------------------------ | ------- | -------------------------- |
| `WriteBuffer.MaxBatchSize`     | 100     | Workflows per batch insert |
| `WriteBuffer.MaxQueueSize`     | 1,000   | Channel buffer size        |
| `WriteBuffer.FlushConcurrency` | 4       | Concurrent batch flushers  |

## Testing

### TestKit

`WorkflowEngine.TestKit` provides reusable infrastructure:

- **`EngineAppFixture<TProgram>`** — shared fixture with PostgreSQL (Testcontainers), WireMock, and `WebApplicationFactory`
- **`EngineApiClient`** — typed HTTP client with `WaitForWorkflowStatusAsync`, `PollUntilAsync`
- **`TestHelpers`** — builders for workflows, steps, and enqueue requests
- **`TelemetryCollector`** — in-process OpenTelemetry collector for assertions

### Running Tests

```sh
dotnet test
```

No Docker Compose needed — Testcontainers manages all container lifecycle.

### Example

```csharp
[Collection("AppTests")]
public class MyTests(AppTestFixture fixture)
{
    [Fact]
    public async Task Workflow_completes_successfully()
    {
        var request = fixture.Helpers.CreateEnqueueRequest(/* ... */);
        var response = await fixture.Client.EnqueueWorkflow(request, TestContext.Current.CancellationToken);

        var completed = await fixture.Client.WaitForWorkflowStatusAsync(
            response.WorkflowId,
            WorkflowStatus.Completed,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(WorkflowStatus.Completed, completed.Status);
    }
}
```

## Creating a New Host

### 1. Create the Project

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <ProjectReference Include="path/to/WorkflowEngine.Core/WorkflowEngine.Core.csproj" />
  </ItemGroup>
</Project>
```

### 2. Define Your Command

```csharp
public sealed class MyCommand : Command<MyCommandData>
{
    public override string CommandType => "my-command";

    public override CommandValidationResult Validate(MyCommandData? data)
    {
        if (string.IsNullOrWhiteSpace(data?.Target))
            return CommandValidationResult.Invalid("target is required");
        return CommandValidationResult.Valid();
    }

    public override async Task<ExecutionResult> ExecuteAsync(
        CommandExecutionContext context, CancellationToken ct)
    {
        var response = await httpClient.PostAsync(data.Target, content, ct);

        return response.IsSuccessStatusCode
            ? ExecutionResult.Success()
            : ExecutionResult.RetryableError($"HTTP {response.StatusCode}");
    }
}
```

### 3. Compose in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException("Missing connection string");

builder.AddWorkflowEngine(connectionString);
builder.Services.AddCommand<MyCommand>();

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();
```

### 4. Write Tests

```csharp
public class MyTestFixture : EngineAppFixture<Program>
{
    protected override void ConfigureBuilder(IWebHostBuilder builder)
    {
        // Add test-specific configuration
    }
}
```

---

## The App Layer: `WorkflowEngine.App`

The `workflow-engine-app` project is the Altinn-specific host. It adds `AppCommand` — an HTTP callback command targeting Altinn apps.

### AppCommand

- **Type string**: `"app"`
- **Data**: `AppCommandData` — `{ commandKey, payload? }`
- **Context**: `AppWorkflowContext` — `{ actor, lockToken, org, app, instanceOwnerPartyId, instanceGuid }`
- **Execution**: HTTP POST to a templated URL expanded from the workflow context

### Error Classification

| HTTP Response | Classification      |
| ------------- | ------------------- |
| 2xx           | Success             |
| 408, 418, 429 | Retryable           |
| 5xx           | Retryable           |
| Other 4xx     | Critical — no retry |

### State Passing

AppCommand reads `{ "state": "..." }` from the response body and stores it as `step.StateOut`. The next step receives it as `state` in its callback payload.

### Configuration

```json
{
    "AppCommandSettings": {
        "ApiKey": "your-api-key",
        "CommandEndpoint": "http://host/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/process-engine-callbacks"
    }
}
```

Placeholders are expanded from `AppWorkflowContext` at execution time.
