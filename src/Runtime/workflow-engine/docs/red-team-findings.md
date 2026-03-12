# Red Team Findings — Workflow Engine

Full request lifecycle analysis: API ingress → validation → buffered write → DB persistence → background processing → step execution → status update → completion.

Conducted: 2026-03-12

---

## Tier 1 — Fix Before Shipping

- [x] **1. API key echoed in error response**
  `ApiKeyAuthenticationHandler.cs:35` — `AuthenticateResult.Fail($"Invalid API key: {apiKeyHeader[0]}")` echoes the supplied key back in the 403 body. Never echo secrets.

- [x] **2. Namespace isolation bypass on GetWorkflow / ListActiveWorkflows**
  `EngineEndpoints.cs:103` — The check `if (ns is not null && workflow.Namespace != ns)` only fires when the caller provides `?namespace=`. If omitted, any workflow is returned by GUID alone. If namespace is the tenant isolation boundary, this is a cross-tenant data leak. ListActiveWorkflows (line 80) has the same pattern.

- [x] **3. Unhandled `AtCapacity` rejection reason**
  `EngineEndpoints.cs:64` — The switch on `rejected.Reason` handles `Duplicate`, `Invalid`, `Unavailable` but not `AtCapacity` (defined at `WorkflowEnqueueResponse.cs:46`). Falls through to `throw new UnreachableException()` → HTTP 500.

- [x] **4. OverallStatus() missing `DependencyFailed`**
  `WorkflowExtensions.cs:34-51` — Never returns `DependencyFailed`. Checks `Failed`, `Canceled`, `Requeued`, `Processing`, `Enqueued` — never `DependencyFailed`. If any step has `DependencyFailed` status, it would return `Processing` or `Enqueued` instead.

- [x] **5. Dead code: `DatabaseTask`, `DatabaseUpdateStatus()`, `CleanupDatabaseTask()`**
  `Workflow.cs:41` and `WorkflowExtensions.cs:15-24` — `DatabaseTask` is never assigned. `DatabaseUpdateStatus()` and `CleanupDatabaseTask()` are never called. Orphaned code from a previous design.

---

## Tier 2 — High Priority

- [SKIP] **6. `FetchAndLockWorkflows` lock released before related entities fetched**
  `EngineRepository.Writes.cs:605-650` — Two queries without an explicit transaction. The `FOR UPDATE SKIP LOCKED` lock is released when the first query's implicit transaction commits. Between that and the second query (fetching steps/dependencies), another operation could modify the data. Wrap both in an explicit transaction.

- [x] **7. Exponential backoff formula produces wrong delays**
  `RetryStrategyExtensions.cs:73` — `Math.Pow(2, iteration - 2)`. First retry (iteration=1): `2^(-1) = 0.5x` base interval. Progression is `0.5x, 1x, 2x, 4x...` instead of `1x, 2x, 4x, 8x...`. Exponent should be `iteration - 1`. Also overflows for iteration > 64 before MaxDelay cap can apply.

- [x] **8. Step stuck in `Processing` on cancellation**
  `WorkflowHandler.cs:137-148` — Step status set to `Processing` at line 137. If `OperationCanceledException` fires during `executor.Execute()`, the catch at line 145 re-throws. The workflow catch at line 63-71 sets workflow to `Requeued`, but the step remains `Processing` in memory and gets persisted that way.

- [x] **9. No input size limits**
  `WorkflowEnqueueRequest.Workflows` has no count limit. Each workflow's `Steps` array is unbounded. `Labels`, `Metadata`, `State`, `Context`, and `CommandDefinition.Data` have no size constraints. A malicious client can send unbounded payloads consuming arbitrary memory during validation.

- [x] **10. Command registry leaked in validation errors**
  `Engine.cs:100` — Error message includes all registered command types: `$"Registered types: {string.Join(", ", registry.GetAllCommands().Select(d => d.CommandType))}"`. Reveals internal command structure to callers.

---

## Tier 3 — Medium Priority

- [ ] **11. `ExecutionStartedAt` overwritten on requeue**
  `WorkflowHandler.cs:36` — `workflow.ExecutionStartedAt` is set every time `HandleAsync` runs. On requeue + re-pickup, original queue time is lost. Inflates queue time metrics, deflates service time metrics.

- [ ] **12. Idempotency key lookup missing namespace filter**
  `EngineRepository.Reads.cs` — Workflow lookup by idempotency key doesn't filter by namespace. If two namespaces use the same idempotency key, the wrong workflow could be returned.

- [ ] **13. `SqlBulkInserter` column ordering depends on EF property enumeration order**
  `SqlBulkInserter.cs:31-52` — Column order from `entityType.GetProperties()` isn't guaranteed stable across EF Core versions. COPY binary protocol is position-sensitive. Sort by column name for determinism.

- [ ] **14. Shutdown can hang indefinitely**
  `WorkflowProcessor.cs:81-84` — On shutdown, acquires all semaphore slots with `CancellationToken.None`. If any worker is stuck on a DB/HTTP call, shutdown blocks forever. Add a timeout.

- [ ] **15. `StatusWriteBuffer.SubmitAsync` cancellation race**
  `StatusWriteBuffer.cs:67-72` — Cancellation registration happens after the channel write. If the token fires between `WriteAsync` and `ct.Register(...)`, the TCS cancellation handler isn't registered. Register before writing.

- [ ] **16. `BatchUpdateWorkflowsAndSteps` ignores affected row count**
  `EngineRepository.Writes.cs:718,762` — `ExecuteNonQueryAsync` return value discarded. If a workflow was deleted between fetch and update, the update silently affects 0 rows. Caller believes it succeeded.

---

## Tier 4 — Minor / Hardening

- [ ] **17. API key timing attack**
  `ApiKeyAuthenticationHandler.cs:34` — `Contains()` isn't constant-time. Practical risk is minimal given network latency, but `CryptographicOperations.FixedTimeEquals` would be more correct.

- [ ] **18. Hash computed on re-serialized request**
  `Engine.cs:56` — Hash is computed by re-serializing the deserialized object. Whitespace/ordering differences between original and re-serialized form could produce different hashes for byte-identical re-requests.

- [ ] **19. Case-insensitive command registry**
  `CommandRegistry.cs:28` — Uses `OrdinalIgnoreCase`. `"Webhook"` and `"webhook"` resolve identically. Intentional for UX but could mask typos.

- [ ] **20. No 429/503 response on write buffer backpressure**
  When the `WorkflowWriteBuffer` channel is full (10K items), the caller blocks indefinitely. No HTTP 429 or 503 is returned.

- [ ] **21. Fixed 500ms delay between fetch cycles**
  `WorkflowProcessor.cs:68-71` — Always waits up to 500ms between fetch cycles, even under load. Caps throughput. The signal-based debounce mitigates this somewhat but the 500ms ceiling remains.

- [ ] **22. Index filter hardcodes status enum integers**
  `EngineDbContext.cs` — `.HasFilter("\"Status\" IN (0, 2)")` instead of referencing enum constants. If enum values change, the index becomes stale.
