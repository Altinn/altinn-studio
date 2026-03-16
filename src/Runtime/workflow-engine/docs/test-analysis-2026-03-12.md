# Test Suite Analysis — 2026-03-12

## Overview

Across both solutions (`workflow-engine` and `workflow-engine-app`) there are **~237 test methods** (212 in workflow-engine, 25 in workflow-engine-app). All tests pass. Infrastructure (Testcontainers, WireMock, Verify snapshots, fixture reuse) is well-designed.

---

## What's Solid

- **API endpoint response shapes** — Good Verify snapshot coverage (12 `.verified.txt` files across both solutions)
- **Repository CRUD & queries** — 80+ tests hitting a real Postgres container, including sophisticated fault injection for DB retries
- **Error code classification** — Both WebhookCommand and AppCommand exhaustively test retryable vs. non-retryable HTTP status codes
- **Authentication** — API key validation, namespace isolation
- **Telemetry** — In-process collectors validate counters, histograms, activity hierarchy
- **Validation** — Graph validation (Kahn's algorithm, cycle detection), command validation, input size limits
- **AppCommand validation** — All 8 rules covered with edge cases
- **DAG execution** — Complex multi-workflow dependency graphs execute and complete correctly

---

## Medium Priority Gaps

| Area | Issue |
|---|---|
| **Boundary limits** | `MaxWorkflowsPerRequest` (1000), `MaxStepsPerWorkflow` (1000), `MaxLabels` (100) — no boundary tests at or beyond these limits |
| **Timeout/cancellation** | No test for step timeout enforcement or CancellationToken propagation through the async chain |
| **Concurrent execution** | ConcurrencyLimiter has unit tests but no test validates actual concurrent command execution under load |
| **Cascade failures** | No test for dependency failure propagation (parent fails → children get `DependencyFailed`) |
| **`BatchEnqueueWorkflowsAsync` edge cases** | The most complex DB method (idempotency hash comparison, duplicate classification, cross-request dedup within a batch) — tested through integration but not with targeted edge cases |
| **Dashboard label/search queries** | 13 dashboard endpoint tests, but JSONB label containment and GUID-aware search deserve more targeted coverage |

---

## Where Verify Snapshots Should Be Added

The existing snapshots are well-done. Expansion candidates:

1. **AppCommand callback payload** — Snapshot the WireMock-captured request body to lock down the contract the app receives
2. **Error responses** — Snapshot all validation error shapes (not just missing lockToken), including: missing actor, invalid org/app, cycle detection error, size limit exceeded
3. **GetWorkflow after retry** — Snapshot a workflow that was retried (shows `requeueCount`, `backoffUntil`, `lastError` fields)
4. **GetWorkflow with DependencyFailed** — Snapshot the cascade failure shape
5. **Dashboard query responses** — Lock down the query response format with snapshots
6. **State progression endpoint** — Snapshot `/dashboard/state` showing `initialState` → step `stateOut` chain

---

## Fragility Concerns

- **`Task.Delay` in TelemetryTests** (lines 48, 223, 256) — timing-sensitive, could flake on slow CI. Consider event-based synchronization.
- **`EngineShutdownTests.ActiveWorkerCount_IncreasesWhenProcessingWorkflows`** — polls with 10s timeout, unreliable on loaded machines.
- **xUnit collection fixtures** — If `InitializeAsync` fails, tests may hang rather than fail cleanly.

---

## Lower Priority / Nice to Have

- Dashboard SSE stream tests (`/dashboard/stream`, `/dashboard/stream/recent`)
- Replace `Task.Delay` with deterministic synchronization in timing-sensitive tests
- Load/stress tests via k6 (infrastructure already exists in `.k6/`)
- WorkflowProcessor main loop tests (semaphore management, debounce, graceful shutdown)
- Write buffer tests (WorkflowWriteBuffer, StatusWriteBuffer — flush failures, back-pressure, cancellation of in-flight items, concurrent flush contention)
- Test `BatchEnqueueWorkflowsAsync` edge cases (within-batch dedup, hash mismatch conflict detection)
- Test dependency failure cascade (`DependencyFailed` propagation)
- Add boundary/limit tests for max workflows, max steps, max labels

---

## Bottom Line

The test suite is **structurally sound** and covers the "does it work" question well for happy paths. Where it falls short is in testing the **decision logic** (retry state machine, state resolution, failure cascading) and **error/edge scenarios**. The most concerning gap is that the three most complex runtime components — WorkflowHandler, WorkflowProcessor, and the write buffers — have zero dedicated tests and rely entirely on implicit coverage through integration tests.
