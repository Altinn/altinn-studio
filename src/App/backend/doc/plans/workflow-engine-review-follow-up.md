# Workflow Engine Review Follow-up

This folder contains the remaining follow-up work from reviewing `feat/workflow-engine-integration` against `main`.

## Scope

The remaining work falls into three separate tracks:

1. Move workflow-engine-owned payment cleanup fully onto `IInstanceDataMutator`
2. Preserve caller identity when handing work off to the workflow engine
3. Remove the legacy `IProcessTaskStart` / `IProcessTaskEnd` / `IProcessTaskAbandon` hook layer

## Recommended Order

### 1. Payment mutator cleanup

Smallest functional change. It is directly tied to the intended architecture rule that workflow-engine-owned writes must go through the mutator.

Plan file:
- `payment-process-task-mutator-cleanup.md`

### 2. Actor propagation

Medium-sized correctness fix. This closes the gap where async workflow processing loses auth details compared to synchronous `process/next`.

Plan file:
- `workflow-engine-actor-propagation.md`

### 3. Remove legacy task hook layer

Largest cleanup. This touches workflow command composition, DI, tests, snapshots, and analyzer test apps. It is easiest to do after the more isolated correctness fixes are in place.

Plan file:
- `remove-legacy-process-task-hooks.md`

## Success Criteria

- All workflow-engine-owned task logic mutates instance data through `IInstanceDataMutator`
- Workflow-driven follow-up work preserves the same actor fidelity as synchronous processing
- Only the new mutator-based `IProcessTask` lifecycle remains for task start/end/abandon logic

