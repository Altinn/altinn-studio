# Remove Legacy Process Task Hooks

## Problem

The branch has already migrated concrete `IProcessTask` implementations to the new mutator-based lifecycle:

- `Start(IInstanceDataMutator ...)`
- `End(IInstanceDataMutator ...)`
- `Abandon(IInstanceDataMutator ...)`

But the workflow engine still executes a parallel legacy hook layer:

- `IProcessTaskStart`
- `IProcessTaskEnd`
- `IProcessTaskAbandon`
- `StartTaskLegacyHook`
- `EndTaskLegacyHook`
- `AbandonTaskLegacyHook`

If the next major version is supposed to standardize on the new task model, this old path should be removed instead of kept around indefinitely.

## Target State

- task lifecycle logic runs through the new `IProcessTask` APIs only
- the workflow command chain no longer includes legacy hook commands
- tests and snapshots reflect the new behavior

## Proposed Changes

### 1. Remove the old hook interfaces

Delete:

- `src/Altinn.App.Core/Features/IProcessTaskStart.cs`
- `src/Altinn.App.Core/Features/IProcessTaskEnd.cs`
- `src/Altinn.App.Core/Features/IProcessTaskAbandon.cs`

### 2. Remove workflow-engine legacy hook commands

Delete:

- `StartTaskLegacyHook`
- `EndTaskLegacyHook`
- `AbandonTaskLegacyHook`

Remove their DI registrations and payload serialization entries.

### 3. Simplify `WorkflowCommandSet`

Update task lifecycle command groups so they contain only:

- the new `IProcessTask` commands
- other current hook layers that still belong in the design, such as `OnTaskStartingHook` / `OnTaskEndingHook` / `OnTaskAbandonHook`

### 4. Update tests and test apps

Replace test app tracing that currently logs legacy task hook execution with tracing on the new `IProcessTask` implementations.

This likely affects:

- integration test shared tracing services
- instance-lock scenario helper
- workflow-engine snapshots
- request-factory command sequence tests
- validator/process engine command tests
- analyzer test apps that intentionally implement the old interfaces

## Affected Areas

- `src/Altinn.App.Core/Features/IProcessTaskStart.cs`
- `src/Altinn.App.Core/Features/IProcessTaskEnd.cs`
- `src/Altinn.App.Core/Features/IProcessTaskAbandon.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/Commands/ProcessNext/*LegacyHook*.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/WorkflowCommandSet.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/DependencyInjection/ServiceCollectionExtensions.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/Commands/_Base/CommandPayload.cs`
- related Core/API/integration/analyzer tests

## Test Plan

- workflow command sequence tests updated to the new command order
- direct command tests for `StartTask`, `EndTask`, `AbandonTask`
- integration tests updated to assert new tracing output
- analyzer tests adjusted if the old interfaces were used as fixtures
- public API snapshot updated

## Definition of Done

- no runtime path depends on `IProcessTaskStart`, `IProcessTaskEnd`, or `IProcessTaskAbandon`
- workflow-engine command graphs no longer reference `*LegacyHook`
- test baselines are updated and passing

