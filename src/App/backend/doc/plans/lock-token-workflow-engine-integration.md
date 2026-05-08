# Plan: Integrate Storage Lock Token into Workflow Engine Flow

## Context

On `main`, `IInstanceLocker` acquires real lock tokens from Storage. On `feat/workflow-engine-integration`, controllers generate fake `Guid.NewGuid()` GUIDs instead. The lock token must flow through the workflow engine and back into callback commands so all Storage writes include the `Altinn-Storage-Lock-Token` header.

**PR #1699** (`data-client-lock-token-header` by colleague) already implements the core pattern on `main`:
- `AsyncLocal<InstanceLockHolder>` for async-safe scoped state
- Singleton `IInstanceLocker` with `CurrentLockToken` property reading from AsyncLocal
- Separate `IInstanceLock` handle for lifecycle (acquire/release via `IAsyncDisposable`)
- `lockToken` param added to `HttpClientExtension` write methods (Post, Put, Delete)
- `DataClient` already passes `_instanceLocker.CurrentLockToken`

## Approach: Build on PR #1699's AsyncLocal pattern

### What PR #1699 provides (merge first)

| Component | Change |
|-----------|--------|
| `IInstanceLocker` | Singleton. `InitLock()`, `Lock()`, `Lock(ttl)`, `CurrentLockToken` |
| `IInstanceLock` | Handle: `Lock(ttl?)`, `UpdateTtl(ttl)`, `IAsyncDisposable` |
| `InstanceLocker` | `AsyncLocal<InstanceLockHolder>` stores token; `InstanceLockHandle` manages lifecycle |
| `InstanceLockClient` | Singleton via `IHttpClientFactory`. `ReleaseInstanceLock` → `UpdateInstanceLock(ttl)` |
| `HttpClientExtension` | `lockToken` param on `PostAsync`, `PutAsync`, `DeleteAsync` |
| `DataClient` | Injects `IInstanceLocker`, passes `CurrentLockToken` to write calls |
| `Constants.General` | `LockTokenHeaderName = "Altinn-Storage-Lock-Token"` |

### What we add on top

## Implementation

### Step 0: Merge PR #1699 into this branch

Merge the `data-client-lock-token-header` branch into `feat/workflow-engine-integration`. This gives us the `AsyncLocal` foundation and the `DataClient` integration.

### Step 1: Add external lock token support for callbacks

The workflow engine callback controller receives the lock token from the engine payload. It needs to set the AsyncLocal **without acquiring** from Storage (the API request that initiated the flow owns the lock).

**File:** `src/Altinn.App.Core/Internal/InstanceLocking/IInstanceLocker.cs`
- Add: `void UseExternalLockToken(string lockToken)`

**File:** `src/Altinn.App.Core/Internal/InstanceLocking/InstanceLocker.cs`
- Implement: Sets `_currentLock.Value = new InstanceLockHolder { LockToken = lockToken }` directly
- No `InstanceLockHandle` is created — no acquire, no release on dispose
- The AsyncLocal value is naturally scoped to the callback's async context

### Step 2: Add explicit lock for instantiation

InstancesController creates new instances where identifiers aren't in route values yet. Need an overload that accepts explicit identifiers.

**File:** `src/Altinn.App.Core/Internal/InstanceLocking/IInstanceLocker.cs`
- Add: `IInstanceLock InitLock(int instanceOwnerPartyId, Guid instanceGuid)`
- (Companion to the existing route-value-based `InitLock()`)

**File:** `src/Altinn.App.Core/Internal/InstanceLocking/InstanceLocker.cs`
- Implement: Creates `InstanceLockHandle` with explicit identifiers instead of extracting from `HttpContext.Request.RouteValues`

### Step 3: Extend remaining Storage clients

PR #1699 only covers `DataClient`. Add `IInstanceLocker` injection and `CurrentLockToken` to all Storage write clients.

**Files to modify (same pattern as DataClient in PR #1699):**
- `src/Altinn.App.Core/Infrastructure/Clients/Storage/InstanceClient.cs` — inject `IInstanceLocker`, pass `CurrentLockToken` to write calls (Post, Put, Delete)
- `src/Altinn.App.Core/Infrastructure/Clients/Storage/InstanceEventClient.cs` — pass `CurrentLockToken` to Post calls
- `src/Altinn.App.Core/Infrastructure/Clients/Storage/ProcessClient.cs` — pass `CurrentLockToken` to Put calls
- `src/Altinn.App.Core/Infrastructure/Clients/Storage/SignClient.cs` — pass `CurrentLockToken` to Post calls

**Not modified:**
- `EventsClient` — talks to Events component, not Storage
- `InstanceLockClient` — manages lock tokens directly, already handles its own headers
- Read-only clients (Authorization, Profile, Register) — no Storage writes

### Step 4: Wire up ProcessEngine

**File:** `src/Altinn.App.Core/Internal/Process/ProcessEngine.cs`

In `Next()` (line ~226): Adapt to PR #1699's pattern:
```csharp
await using var instanceLock = _instanceLocker.InitLock();
await instanceLock.Lock();
// _instanceLocker.CurrentLockToken is now set via AsyncLocal
```

In `HandleMoveToNext()`: Use `_instanceLocker.CurrentLockToken!` for the workflow enqueue request instead of the `lockToken` parameter. Remove the `lockToken` parameter.

In `SubmitInitialProcessState()`: Caller (InstancesController) must acquire lock before calling this. Use `_instanceLocker.CurrentLockToken!` for the enqueue.

### Step 5: Wire up WorkflowEngineCallbackController

**File:** `src/Altinn.App.Api/Controllers/WorkflowEngineCallbackController.cs`

Before command execution (~line 92):
```csharp
var instanceLocker = _serviceProvider.GetRequiredService<IInstanceLocker>();
instanceLocker.UseExternalLockToken(payload.LockToken);
```

Since `IInstanceLocker` is singleton and `CurrentLockToken` reads from `AsyncLocal`, this sets the token for the entire async context of the callback. All Storage clients resolved in this scope will read it.

### Step 6: Clean up controllers

**File:** `src/Altinn.App.Api/Controllers/ProcessController.cs`
- Remove `string lockToken = Guid.NewGuid().ToString("N")` (2 locations)
- Remove `LockToken = lockToken` from `ProcessNextRequest`

**File:** `src/Altinn.App.Api/Controllers/InstancesController.cs`
- Remove fake `Guid.NewGuid()` lock token generation (3 locations)
- After instance creation, acquire lock:
  ```csharp
  await using var instanceLock = _instanceLocker.InitLock(partyId, instanceGuid);
  await instanceLock.Lock();
  ```
- Token flows via `_instanceLocker.CurrentLockToken` into `SubmitInitialProcessState`

### Step 7: Simplify ProcessNextRequest

**File:** `src/Altinn.App.Core/Models/Process/ProcessNextRequest.cs`
- Remove `required string LockToken` property

**Update callers:** ProcessController, ProcessEngine, tests

### Step 8: Update tests

- Update `InstanceLockerMock` (already in PR #1699) to support `UseExternalLockToken`
- Update `FakeWorkflowEngineClient` in both Api.Tests and Integration.Tests
- Remove `LockToken` from `ProcessNextRequest` construction in all tests
- Add test for `UseExternalLockToken` setting `CurrentLockToken` correctly

## Lock Token Lifecycle

```
ProcessNext API (user-initiated):
  ProcessEngine.Next()
  → _instanceLocker.InitLock()                     [creates handle from route values]
  → instanceLock.Lock()                             [acquires from Storage, sets AsyncLocal]
  → _instanceLocker.CurrentLockToken is now set     [all Storage clients see it]
  → Enqueue workflow with CurrentLockToken
  → Poll for completion                             [lock held, Storage clients have token]
  → await using disposes → releases lock            [clears AsyncLocal]

Workflow Engine Callback:
  WorkflowEngineCallbackController.ExecuteCommand()
  → instanceLocker.UseExternalLockToken(payload.LockToken)  [sets AsyncLocal directly]
  → command.Execute(context)
  → Storage clients read CurrentLockToken from AsyncLocal    [header included]
  → Callback returns → AsyncLocal naturally scoped            [no release needed]

Instantiation:
  InstancesController
  → Create instance (no lock yet)
  → _instanceLocker.InitLock(partyId, instanceGuid)  [explicit identifiers]
  → instanceLock.Lock()                               [acquires, sets AsyncLocal]
  → SubmitInitialProcessState (reads CurrentLockToken)
  → await using disposes → releases lock
```

## Files Modified (summary)

| File | Change |
|------|--------|
| **From PR #1699 (merge)** | |
| `IInstanceLocker.cs` | Singleton, `InitLock()`, `Lock()`, `CurrentLockToken` |
| `IInstanceLock.cs` | NEW — handle interface |
| `InstanceLocker.cs` | AsyncLocal pattern, InstanceLockHandle |
| `InstanceLockClient.cs` | Singleton, `UpdateInstanceLock` |
| `HttpClientExtension.cs` | `lockToken` on Post/Put/Delete |
| `DataClient.cs` | Injects IInstanceLocker, passes CurrentLockToken |
| `Constants/General.cs` | `LockTokenHeaderName` |
| **Our additions** | |
| `IInstanceLocker.cs` | Add `UseExternalLockToken`, `InitLock(partyId, guid)` |
| `InstanceLocker.cs` | Implement new members |
| `InstanceClient.cs` | Inject IInstanceLocker, pass CurrentLockToken |
| `InstanceEventClient.cs` | Inject IInstanceLocker, pass CurrentLockToken |
| `ProcessClient.cs` | Inject IInstanceLocker, pass CurrentLockToken |
| `SignClient.cs` | Inject IInstanceLocker, pass CurrentLockToken |
| `ProcessEngine.cs` | Use InitLock/Lock pattern, remove lockToken threading |
| `WorkflowEngineCallbackController.cs` | UseExternalLockToken from payload |
| `ProcessController.cs` | Remove fake GUIDs |
| `InstancesController.cs` | Use InitLock with explicit identifiers |
| `ProcessNextRequest.cs` | Remove LockToken property |
| Test files | Update mocks, remove LockToken from requests |

## Verification

1. `dotnet build solutions/All.sln -v m`
2. `dotnet test test/Altinn.App.Core.Tests/ -v m`
3. `dotnet test test/Altinn.App.Api.Tests/ -v m`
4. Verify: ProcessEngine acquires lock → CurrentLockToken set → flows to enqueue
5. Verify: Callback sets UseExternalLockToken → Storage clients include header
6. Verify: InstancesController acquires lock with explicit identifiers
