# Workflow Concurrency Rules

This document describes the concurrency constraints enforced by the workflow engine. These rules govern how many workflows of a given type can be active simultaneously for a single instance, and how dependency chains interact with those limits.

## Scope

Concurrency constraints are scoped to **`(InstanceGuid, WorkflowType)`**. Two different instances can each independently have their own active workflows of the same type without interfering with each other.

## Concurrency Policies

Each `WorkflowType` is annotated with a `[ConcurrencyPolicy]` attribute that determines its constraint behaviour:

| Policy | Behaviour |
|---|---|
| `Unrestricted` | No limits. Any number of workflows can be active concurrently. |
| `SingleActive` | At most one Processing workflow and one Pending workflow per instance. The pending workflow must be connected to the processing one via a dependency chain. |

Current assignments:

| WorkflowType | Policy |
|---|---|
| `Generic` | `Unrestricted` (default) |
| `AppProcessChange` | `SingleActive` |

## Status Categories

Statuses are grouped into two categories for the purpose of constraint enforcement:

| Category | Statuses | Role in Constraint |
|---|---|---|
| **Non-terminal** | `Enqueued (0)`, `Processing (1)`, `Requeued (2)` | Counted as "active" — occupies a slot |
| **Terminal** | `Completed (3)`, `Failed (4)`, `Canceled (5)`, `DependencyFailed (6)` | Ignored by the constraint entirely |

## SingleActive Rules

The `SingleActive` policy enforces a linear chain invariant: for a given `(InstanceGuid, WorkflowType)`, the set of non-terminal workflows must form a chain of **at most two** — one Processing and one Pending connected to it.

### What is allowed

**1. No active workflows exist for the instance+type**

A new workflow can be added freely, with or without dependencies. Dependencies on terminal workflows are transparent to the constraint — a dependency on a `Completed` or `Failed` workflow is effectively a no-op from the constraint's perspective.

This also covers the race condition where a caller checks for an active workflow, decides to depend on it, but the workflow completes before the insert arrives. The dependency target is now terminal, the active count is zero, and the new workflow becomes the sole active one.

**2. Exactly one Processing workflow exists, and the new workflow connects to it**

The new workflow's dependency chain (walked recursively through the `WorkflowDependency` table) must reach the currently Processing workflow. If it does, the new workflow fills the "pending slot" — it will begin processing once the current one completes.

### What is rejected

**3. A pending (non-processing) workflow already exists as the sole active workflow**

If the only active workflow is `Enqueued` or `Requeued` (not yet `Processing`), no new workflow can be added. Allowing it would risk concurrent execution once the engine picks up both.

> Rejection reason: `pending_exists`

**4. The active chain is full (2+ non-terminal workflows already exist)**

The Processing + Pending slots are both occupied. The caller must wait for the current Processing workflow to complete before the Pending one advances and frees a slot.

> Rejection reason: `slot_full`

**5. A Processing workflow exists, but the new workflow does not connect to it**

The new workflow either has no dependencies, or its dependency chain resolves to a different workflow (or a terminal one) rather than the currently Processing workflow. Allowing disconnected workflows would break the linear chain and risk concurrent execution.

> Rejection reason: `disconnected`

## Dependency Failure Cascade

When a workflow reaches `Failed` or `Canceled` status, any non-terminal workflows that depend on it (directly or transitively) can never execute — the engine only releases dependents when a dependency reaches `Completed`. A periodic maintenance task marks these unreachable workflows as `DependencyFailed`, which is a terminal status. This frees the active slots they were occupying.

## Enforcement Mechanism

The constraint is enforced atomically during workflow insertion via:

1. **Advisory lock** — A PostgreSQL transaction-scoped advisory lock (`pg_advisory_xact_lock`) keyed on `(InstanceGuid, WorkflowType)` prevents concurrent inserts from racing.
2. **Insert + check** — The workflow and its dependencies are inserted within the transaction, then a stored function (`check_active_workflow_constraint`) validates the invariant against the current database state.
3. **Rollback on violation** — If the constraint is violated, the transaction is rolled back and an `ActiveWorkflowConstraintException` is thrown. The caller receives a `Duplicate` rejection response.

Workflows with an `Unrestricted` concurrency policy bypass all of this — they are inserted directly without locking or constraint checks.

## Test Scenarios

The following scenarios should be covered by integration tests. All assume `SingleActive` policy and the same `(InstanceGuid, WorkflowType)`.

### Allowed

| # | Scenario | Expected |
|---|---|---|
| A1 | No active workflows. Add a workflow with no dependencies. | Accepted |
| A2 | No active workflows. Add a workflow depending on a `Completed` workflow. | Accepted |
| A3 | No active workflows. Add a workflow depending on a `Failed` workflow. | Accepted (becomes unreachable, cleaned up by maintenance) |
| A4 | Workflow P is `Processing`. Add a workflow depending on P. | Accepted (fills pending slot) |
| A5 | Different instance, same type. Each has its own Processing workflow. | Accepted (independent scopes) |
| A6 | Same instance, different type. Add an `Unrestricted` workflow while a `SingleActive` one is processing. | Accepted (different type) |

### Rejected

| # | Scenario | Expected | Reason |
|---|---|---|---|
| R1 | Workflow P is `Processing`. Add a workflow with no dependencies. | Rejected | `disconnected` |
| R2 | Workflow P is `Processing`. Add a workflow depending on a `Completed` workflow (not P). | Rejected | `disconnected` |
| R3 | Workflow P is `Processing`, workflow Q is `Enqueued` and depends on P. Add a third workflow depending on Q. | Rejected | `slot_full` |
| R4 | Workflow Q is `Enqueued` (no Processing workflow). Add another workflow. | Rejected | `pending_exists` |
| R5 | Workflow P is `Processing`. Add a workflow depending on a different Processing workflow (from another type or scope — but claiming the same scope). | Rejected | `disconnected` |

### Edge Cases

| # | Scenario | Expected | Notes |
|---|---|---|---|
| E1 | Workflow P is `Processing`. Submit B depending on P. P completes before B is inserted. | Accepted | P is now terminal; active count = 0; B becomes the sole active workflow. |
| E2 | Workflow P is `Processing` with dependent Q `Enqueued`. P fails. Maintenance runs. | Q becomes `DependencyFailed` | Frees the active slots. A new workflow can now be added. |
| E3 | Workflow P is `Processing` with dependent Q `Enqueued`. P completes. | Q advances to `Processing` | The pending slot is freed. A new dependent can be added. |
| E4 | Two concurrent insert requests for the same `(InstanceGuid, WorkflowType)`. | One accepted, one rejected | Advisory lock serialises the inserts. |

## Key Files

| File | Role |
|---|---|
| `WorkflowEngine.Models/WorkflowType.cs` | Enum with `[ConcurrencyPolicy]` attributes |
| `WorkflowEngine.Models/ConcurrencyPolicy.cs` | Policy enum, attribute, and cached extension method |
| `WorkflowEngine.Data/Sql/Functions/check_active_workflow_constraint.sql` | Stored function enforcing the constraint |
| `WorkflowEngine.Data/Sql/Functions/cascade_dependency_failures.sql` | Stored function for dependency failure cascade |
| `WorkflowEngine.Data/Repository/EnginePgRepository.cs` | `AddWorkflowConstrained` — transactional insert with advisory lock and constraint check |
| `WorkflowEngine.Models/Exceptions/ActiveWorkflowConstraintException.cs` | Exception with rejection reason and blocking workflow ID |
