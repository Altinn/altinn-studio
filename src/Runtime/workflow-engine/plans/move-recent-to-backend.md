# Plan: Move "Recent" Concept from Frontend to Backend Cache

## Problem

The "recently finished workflows" feature currently lives entirely in the frontend (`app.js`). When a workflow disappears from the SSE inbox snapshot, the frontend:

1. Puts it in `state.pendingRemoval` with a 500ms grace period
2. Deep-clones the last known state and guesses the final status
3. Moves it to `state.recentlyFinished` with a DOM animation
4. Evicts the oldest entries when the count exceeds `MAX_RECENT=5`

Meanwhile, the backend SSE endpoint _also_ detects disappeared workflows and does a DB query to backfill their final state (the `finished` array in the payload). This means:

- The frontend is guessing final status from partial data before the DB backfill arrives
- There's a 500ms artificial delay (grace period) before the workflow shows as "recent"
- The logic is split across frontend state management and backend SSE diffing
- Every connected dashboard client independently queries the same DB rows

## Goal

Move the "recently finished" tracking to the backend so:
- The SSE payload includes a `recent` array with authoritative final state
- No DB queries needed per SSE tick — the cache is populated at removal time
- The frontend simply renders whatever the backend sends
- Multiple dashboard clients share the same cache

## Architecture

### Backend: Add `RecentWorkflowCache` to `Engine`

A simple bounded in-memory list inside `Engine` that captures workflows at removal time.

### Where to hook in

`Engine.Lifecycle.cs` → `RemoveWorkflowAndReleaseQueueSlot(Workflow workflow)` — this is the single exit point where workflows leave the inbox after processing. The workflow object still has its full final state at this point (status, steps, timings).

### SSE payload change

Replace the current `finished` array (which requires a DB query per tick) with a `recent` array served from the in-memory cache (zero DB queries).

## Changes

### 1. Create `RecentWorkflowCache.cs`

Location: `src/WorkflowEngine.Api/RecentWorkflowCache.cs`

```csharp
namespace WorkflowEngine.Api;

internal sealed class RecentWorkflowCache
{
    private readonly LinkedList<CachedWorkflow> _entries = new();
    private readonly Lock _lock = new();
    private readonly int _maxEntries;

    public RecentWorkflowCache(int maxEntries = 10)
    {
        _maxEntries = maxEntries;
    }

    public void Add(Workflow workflow)
    {
        // Snapshot the workflow state at removal time
        var cached = new CachedWorkflow
        {
            IdempotencyKey = workflow.IdempotencyKey,
            OperationId = workflow.OperationId,
            Status = workflow.Status,
            InstanceInformation = workflow.InstanceInformation,
            CreatedAt = workflow.CreatedAt,
            ExecutionStartedAt = workflow.ExecutionStartedAt,
            RemovedAt = DateTimeOffset.UtcNow,
            Steps = workflow.Steps
                .OrderBy(s => s.ProcessingOrder)
                .Select(s => new CachedStep
                {
                    IdempotencyKey = s.IdempotencyKey,
                    OperationId = s.OperationId,
                    CommandType = s.Command.GetType().Name,
                    CommandDetail = s.Command.OperationId,
                    Status = s.Status,
                    ProcessingOrder = s.ProcessingOrder,
                    RetryCount = s.RequeueCount,
                    BackoffUntil = s.BackoffUntil,
                    CreatedAt = s.CreatedAt,
                    ExecutionStartedAt = s.ExecutionStartedAt,
                    UpdatedAt = s.UpdatedAt,
                })
                .ToList(),
        };

        lock (_lock)
        {
            _entries.AddFirst(cached);
            while (_entries.Count > _maxEntries)
                _entries.RemoveLast();
        }
    }

    public IReadOnlyList<CachedWorkflow> GetAll()
    {
        lock (_lock)
        {
            return _entries.ToList();
        }
    }
}
```

This snapshots the workflow into a simple POCO at removal time, so we don't hold references to the full `Workflow` domain object (which has `Task` fields, retry strategies, etc.).

The `CachedWorkflow` and `CachedStep` records would be simple DTOs (either nested classes or a separate file). They mirror the shape already sent over SSE.

### 2. Modify `Engine.cs` — add the cache field

```csharp
// Add field
private readonly RecentWorkflowCache _recentWorkflows = new(maxEntries: 10);

// Add public accessor
public IReadOnlyList<CachedWorkflow> RecentWorkflows => _recentWorkflows.GetAll();
```

### 3. Modify `IEngine` interface — expose recent workflows

```csharp
IReadOnlyList<CachedWorkflow> RecentWorkflows { get; }
```

### 4. Modify `Engine.Lifecycle.cs` — capture at removal time

In `RemoveWorkflowAndReleaseQueueSlot`, add one line **before** the `_inbox.TryRemove` call:

```csharp
private void RemoveWorkflowAndReleaseQueueSlot(Workflow workflow)
{
    using var activity = Telemetry.Source.StartActivity("Engine.RemoveWorkflowAndReleaseQueueSlot");
    _logger.ReleasingQueueSlot();

    // Capture final state before removal
    _recentWorkflows.Add(workflow);

    lock (_activeSetLock)
    {
        // ... existing removal logic unchanged ...
    }
    // ... rest unchanged ...
}
```

### 5. Modify `DashboardEndpoints.cs` — SSE stream

Replace the "backfill" logic (lines 102-126) and the `finished` field with a `recent` field served from the cache.

**Remove:**
- The `previousKeys` HashSet and all diff-based disappearance detection
- The `finishedPayloads` list and the DB queries for `GetCompletedWorkflows`/`GetFailedWorkflows`
- The `finished` field from the payload

**Replace with:**
```csharp
var recent = engine.RecentWorkflows;

var payload = new
{
    timestamp = DateTimeOffset.UtcNow,
    engineStatus = new { ... },  // unchanged
    capacity = new { ... },      // unchanged
    workflows = workflows.Select(MapWorkflow),
    recent = recent.Select(r => new
    {
        r.IdempotencyKey,
        r.OperationId,
        status = r.Status.ToString(),
        instance = new
        {
            org = r.InstanceInformation.Org,
            app = r.InstanceInformation.App,
            instanceOwnerPartyId = r.InstanceInformation.InstanceOwnerPartyId,
            instanceGuid = r.InstanceInformation.InstanceGuid,
        },
        r.CreatedAt,
        r.ExecutionStartedAt,
        removedAt = r.RemovedAt,
        steps = r.Steps.Select(s => new
        {
            s.IdempotencyKey,
            s.OperationId,
            s.CommandType,
            s.CommandDetail,
            status = s.Status.ToString(),
            s.ProcessingOrder,
            retryCount = s.RetryCount,
            s.BackoffUntil,
            s.CreatedAt,
            s.ExecutionStartedAt,
            s.UpdatedAt,
        }),
    }),
};
```

This eliminates the `IServiceProvider`/`IEngineRepository` dependency from the SSE loop, removing all DB queries from the hot path.

### 6. Modify `app.js` — simplify frontend

**Remove entirely:**
- `state.pendingRemoval` and `state.recentlyFinished` from state
- `GRACE_MS` and `MAX_RECENT` constants
- `moveToRecent()` function
- `evictOldRecent()` function
- `mergeFinished()` function
- Grace period `setTimeout` calls
- All the pending-removal/reappearance logic in `updateLiveWorkflows`

**Replace with:**
```javascript
// In updateDashboard:
const updateDashboard = (data) => {
    updateStatusBadges(data.engineStatus);
    updateCapacity(data.capacity);
    updateLiveWorkflows(data.workflows);
    updateRecentWorkflows(data.recent);
};

// New simple function:
const updateRecentWorkflows = (recent) => {
    const recentN = recent?.length ?? 0;
    dom.recentCount.textContent = recentN;
    dom.recentSection.style.display = recentN > 0 ? 'block' : 'none';

    // Only re-render if the set of keys changed
    const newKeys = (recent ?? []).map(r => r.idempotencyKey).join(',');
    if (newKeys === lastRecentKeys) return;
    lastRecentKeys = newKeys;

    dom.recentContainer.innerHTML = '';
    for (const wf of recent ?? []) {
        const card = document.createElement('div');
        card.className = 'workflow-card';
        card.id = `wf-${cssId(wf.idempotencyKey)}`;
        card.style.animation = 'none';
        card.innerHTML = buildCardHTML(wf, true);
        dom.recentContainer.appendChild(card);
    }
};
```

**Simplify `updateLiveWorkflows`:**
- Remove the `previousKeys` diff loop (no more grace periods)
- Remove the `pendingRemoval` reappearance check
- Keep only: add/update cards based on fingerprint, remove cards for workflows no longer in the `workflows` array

### 7. Update JSDoc types in `app.js`

Update the `DashboardPayload` typedef:
```javascript
/**
 * @typedef {{
 *   timestamp:    string,
 *   engineStatus: EngineStatus,
 *   capacity:     { inbox: SlotStatus, db: SlotStatus, http: SlotStatus },
 *   workflows:    Workflow[],
 *   recent:       Workflow[],
 * }} DashboardPayload
 */
```

Remove the `RecentEntry` typedef. Remove `pendingRemoval` and `recentlyFinished` from `DashboardState`.

## Files Touched

| File | Action | Description |
|------|--------|-------------|
| `RecentWorkflowCache.cs` | New | Bounded in-memory cache with lock |
| `Engine.cs` | Modified | Add `_recentWorkflows` field + `RecentWorkflows` property |
| `IEngine` in `Engine.cs` | Modified | Add `RecentWorkflows` to interface |
| `Engine.Lifecycle.cs` | Modified | Add `_recentWorkflows.Add(workflow)` in removal method |
| `DashboardEndpoints.cs` | Modified | Remove backfill logic, add `recent` from cache |
| `app.js` | Modified | Remove ~70 lines of recent/pending logic, add ~20 line `updateRecentWorkflows` |

**Untouched:** `Program.cs`, `Dockerfile`, `docker-compose.yaml`, `index.html`, `style.css`, `.csproj`

## Verification

1. `dotnet build src/WorkflowEngine.Api` — compiles, no errors
2. `cd C:\dev\digdir\altinn-studio\src\Runtime\workflow-engine && docker compose build workflow-engine && docker compose --profile app up -d --no-deps workflow-engine`
3. Open `http://localhost:8080/dashboard`
4. Trigger a workflow — it appears in "Live" section
5. Workflow completes — it immediately moves to "Recent" section (no 500ms delay)
6. Trigger 10+ workflows — only the last 10 appear in "Recent" (bounded cache)
7. Open a second browser tab — both tabs show the same "Recent" list
8. Check Docker logs — no DB queries in SSE loop (only on `/dashboard/history` requests)

## Notes

- The `maxEntries: 10` default is generous enough for a dev dashboard. Could be made configurable via `EngineSettings` if needed.
- The `RemovedAt` timestamp lets the frontend show "finished X seconds ago" if desired.
- The cache is cleared on engine restart (via `Cleanup()` → `InitializeInbox()`) — this is fine since it's a dev tool.
- The `/dashboard/history` endpoint remains unchanged for full DB-backed history browsing.
