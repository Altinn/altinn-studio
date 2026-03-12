# Merge Guide: feature/workflow-engine → feature/workflow-engine-abstraction-poc

## Strategy

Merge `feature/workflow-engine` INTO `feature/workflow-engine-abstraction-poc`. Use `git merge` (not rebase) — both branches have extensive rewrites and a merge commit is cleaner than replaying individual commits.

**Guiding principle**: Our branch defines the architectural direction (Core/App split, command descriptor pattern, typed deserialization). The parent branch has valuable feature additions (CorrelationId, BackoffUntil relocation, bulk insert) that we adopt.

---

## Merge Execution Plan

### Phase 1: Merge and Resolve Conflicts

```bash
git checkout feature/workflow-engine-abstraction-poc
git merge feature/workflow-engine
```

Expected conflict categories and resolution strategy:

#### 1.1 — Files We Renamed (parent modified the old name)

These will appear as "deleted by us, modified by theirs" or content conflicts:

| Our File | Parent's File | Resolution |
|----------|---------------|------------|
| `CommandRegistry.cs` | `CommandHandlerRegistry.cs` | Keep our file. Cherry-pick any logic changes from parent (unlikely — parent didn't change the registry). |
| `AppCommandDescriptor.cs` | `AppCommandHandler.cs` | Keep our file. Parent didn't change this handler. |
| `WebhookCommandDescriptor.cs` | `WebhookCommandHandler.cs` | Keep our file. Parent didn't change this handler. |
| `ICommand.cs` (new) | `ICommandHandler.cs` (deleted by us) | Keep our deletion + our new file. |

#### 1.2 — Files Both Branches Modified Heavily

| File | Resolution |
|------|------------|
| **`Engine.cs`** | Keep our version (descriptor-based `ValidateCommands`). Apply parent's change: add `correlationId` to activity tags. |
| **`WorkflowExecutor.cs`** | Keep our version (centralized typed deserialization). No parent logic changes needed here. |
| **`WorkflowHandler.cs`** | Keep our version as base. Apply parent's changes: (1) move backoff logic from step to workflow, (2) update `RecordStepQueueTime` and `RecordWorkflowQueueTime` to use `workflow.BackoffUntil`. |
| **`ServiceCollectionExtensions.cs`** | Keep our version (`AddCommand<T>` pattern). Apply parent's addition: register `SqlBulkInserter` as singleton. |
| **`EngineEndpoints.cs`** | Keep our version (flat `/api/v1/workflows` routes). Apply parent's additions: (1) `correlationId` query param on list/get, (2) pass `correlationId` to repository calls. Cross-namespace disclosure check already present on our branch. |

#### 1.3 — Model Files

| File | Resolution |
|------|------------|
| **`Workflow.cs`** | Keep our version. Add parent's new fields: `CorrelationId` (Guid?), `BackoffUntil` (DateTimeOffset?) moved from Step. |
| **`Step.cs`** | Keep our version. Remove `BackoffUntil` if still present (parent moved it to Workflow). |
| **`WorkflowEnqueueRequest.cs`** | Keep our version. Add `CorrelationId` (Guid?) if not already present. Verify `Namespace` is required (both branches agree). |
| **`WorkflowStatusResponse.cs`** | Keep our version. Add `CorrelationId` and `BackoffUntil` to response + `FromWorkflow()` mapping. |
| **`CommandExecutionContext.cs`** | Keep our version entirely (typed properties are our addition, parent didn't touch this). |

#### 1.4 — Data Layer

| File | Resolution |
|------|------------|
| **`WorkflowEntity.cs`** | Accept parent's additions: `CorrelationId`, `BackoffUntil`. Verify `Namespace` is present (both branches have it). |
| **`StepEntity.cs`** | Accept parent's removal of `BackoffUntil`. |
| **`IdempotencyKeyEntity.cs`** | Both branches simplified to `(IdempotencyKey, Namespace)` — should merge cleanly. |
| **`EngineDbContext.cs`** | Accept parent's index changes: `BackoffUntil` queue index, `CorrelationId` index. Keep our `(Namespace, Status)` index (both branches have it). |
| **`IEngineRepository.cs`** | Accept parent's new methods: `GetActiveWorkflowsByCorrelationId()`. Update existing method signatures that added `correlationId` param. |
| **`EngineRepository.cs` / `.Writes.cs`** | Accept parent's bulk insert refactor. Our branch didn't change the write path significantly. |
| **`EngineRepository.QueryExtensions.cs`** | Accept parent's additions: `MaybeFilterByCorrelationId()`. Both branches have `MaybeFilterByNamespace()`. |
| **`SqlBulkInserter.cs`** (new) | Accept entirely from parent. |
| **`TupleArrayExtensions.cs`** (new) | Accept entirely from parent. |

#### 1.5 — Dashboard

| File | Resolution |
|------|------------|
| **`DashboardMapper.cs`** | Accept parent's change: move `BackoffUntil` from step DTO to workflow DTO. |
| **`DashboardEndpoints.cs`** | Accept parent's additions: `correlationId` query param support. |

#### 1.6 — Migrations

Both branches deleted all migrations. No conflict expected — just ensure the migrations directory is empty after merge.

#### 1.7 — Tests

| Area | Resolution |
|------|------------|
| **Unit tests** | Accept parent's model test changes (BackoffUntil move, CorrelationId). Ensure tests reference our command pattern (`ICommand`, not `ICommandHandler`). |
| **Integration tests** | Keep our test infrastructure (TestKit, fixtures). Apply parent's changes: updated API client calls, new response fields in verified snapshots. |
| **Verified snapshots** (`.verified.txt`) | Will need regeneration after merge — accept ours as base, re-run tests to update. |

#### 1.8 — Infrastructure

| File | Resolution |
|------|------------|
| **k6 scripts** | Accept parent's updates (correlationId, new payload structure). Verify endpoint URLs match our routes. |
| **Docker Compose** | Keep our version (Core/App split). Parent didn't change compose structure. |
| **CI workflows** | Keep our version. |

---

### Phase 2: Post-Merge Compilation Fixes

After resolving conflicts, expect build errors. Fix in this order:

1. **Dead references to old types** — Search and eliminate:
   - `ICommandHandler` → replaced by `ICommand`
   - `AddCommandHandler` → replaced by `AddCommand`
   - `CommandHandlerRegistry` → replaced by `CommandRegistry`
   - `InstanceRouteParams` → removed (instance info is in request body)

2. **BackoffUntil relocation** — Any code referencing `step.BackoffUntil` must change to `workflow.BackoffUntil`:
   - `WorkflowHandler.cs` — retry/backoff assignment
   - `WorkflowEntity.FromDomainModel` / `ToDomainModel` — field mapping
   - Metrics calculations in `WorkflowHandler`
   - Dashboard mappers

3. **CorrelationId wiring** — Ensure the new field flows through the full pipeline:
   - `WorkflowEnqueueRequest` → `WorkflowRequestMetadata` → `Workflow` → `WorkflowEntity` → `WorkflowStatusResponse`
   - Repository query methods accept and pass `correlationId`
   - Dashboard endpoints accept `correlationId` query param

4. **Bulk insert compatibility** — `SqlBulkInserter` references entity types. Verify column mappings still match after our entity changes.

5. **Missing usings** — Parent's new files may need usings added to `GlobalUsings.cs` if they were in the old `WorkflowEngine.Api` web project.

---

### Phase 3: Build and Test

```bash
# 1. Build core solution
dotnet build src/Runtime/workflow-engine/WorkflowEngine.slnx

# 2. Build app solution
dotnet build src/Runtime/workflow-engine-app/WorkflowEngine.App.slnx

# 3. Run all tests
dotnet test src/Runtime/workflow-engine/WorkflowEngine.slnx

# 4. Format
dotnet csharpier src/Runtime/workflow-engine/
dotnet csharpier src/Runtime/workflow-engine-app/
```

---

### Phase 4: Dead Code and Logical Consistency Audit

After tests pass, systematically verify:

#### 4.1 — Dead Code Search
```
# Must return zero results:
grep -r "ICommandHandler" src/Runtime/workflow-engine/ --include="*.cs"
grep -r "AddCommandHandler" src/Runtime/workflow-engine/ --include="*.cs"
grep -r "CommandHandlerRegistry" src/Runtime/workflow-engine/ --include="*.cs"
grep -r "InstanceRouteParams" src/Runtime/workflow-engine/ --include="*.cs"
grep -r "step\.BackoffUntil" src/Runtime/workflow-engine/ --include="*.cs"
grep -r "StepBackoffUntil" src/Runtime/workflow-engine/ --include="*.cs"
```

#### 4.2 — Logical Consistency Checks

| Check | What to verify |
|-------|----------------|
| **Idempotency key scope** | `IdempotencyKeyEntity` uses `(IdempotencyKey, Namespace)` everywhere. No remnants of `(Key, Org, App, PartyId, Guid)`. |
| **Namespace defaulting** | Parent defaults to `"default"` when null. Our branch requires it. Decide which behavior to keep and make it consistent across enqueue endpoint, tests, and docs. |
| **BackoffUntil consistency** | `Step` model has no `BackoffUntil`. `Workflow` model has `BackoffUntil`. All retry/backoff logic uses `workflow.BackoffUntil`. Queue fetch uses `BackoffUntil` index. |
| **CorrelationId flow** | Field exists on: `WorkflowEnqueueRequest`, `Workflow`, `WorkflowEntity`, `WorkflowStatusResponse`, dashboard DTOs. Repository queries support optional filtering. |
| **Route consistency** | All endpoints under `/api/v1/workflows`. No path-based org/app/tenant segments. Namespace and correlationId are query params on GET, body fields on POST. |
| **Command registration** | All commands registered via `AddCommand<T>()`. `CommandRegistry` populated from `ICommand` singletons. No `ICommandHandler` references. |
| **Deserialization consistency** | `Engine.ValidateCommands()` and `WorkflowExecutor.Execute()` both use `CommandSerializerOptions.Default`. Both check `CommandDataType` and `WorkflowContextType` from the command descriptor. |
| **Core/App boundary** | `WorkflowEngine.Core` has no reference to `WorkflowEngine.App`. App references Core. Command implementations (AppCommand, WebhookCommand) are in their respective projects, not in Core. |
| **Test infrastructure** | TestKit fixtures work with the Core/App split. `EngineApiClient` uses correct routes. Test helpers generate `Namespace` and `CorrelationId` values. |

#### 4.3 — Snapshot Regeneration

Integration tests using Verify will have stale snapshots due to new fields. Run tests, accept new snapshots:

```bash
dotnet test src/Runtime/workflow-engine/WorkflowEngine.slnx -- -e VERIFY_ACCEPT=true
```

Or manually review and accept the diff for each `.verified.txt` file.

---

### Phase 5: New Migration

Once everything compiles and tests pass, create a fresh Initial migration:

```bash
# Use the /migration skill to create the initial migration
```

This will be the single unified migration reflecting the merged schema.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Merge (not rebase) | Both branches have large rewrites. Merge preserves history and is simpler to resolve. |
| Keep our routes | Our flat `/api/v1/workflows` route is the abstraction design. Parent converged to the same pattern. |
| Keep our command pattern | `ICommand` / `Command<T>` is the core abstraction work. Parent's `ICommandHandler` is superseded. |
| Adopt parent's CorrelationId | Valuable feature for workflow grouping. Orthogonal to our abstractions. |
| Adopt parent's BackoffUntil move | Correct architectural decision — backoff is a workflow concern, not step. |
| Adopt parent's bulk insert | Performance optimization. Orthogonal to our abstractions. |
| Namespace: keep as required | Our branch requires it (no default). This is safer — forces callers to be explicit about isolation boundaries. |
