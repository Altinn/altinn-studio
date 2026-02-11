# Layout Sets to Task-UI Migration: Implementation Plan

This folder contains a phased implementation plan for removing `layout-sets.json`
and migrating to the task-folder UI model.

## Plan files

- `docs/research/layout-sets-to-task-ui-migration-plan/01-contract-and-decisions.md`
- `docs/research/layout-sets-to-task-ui-migration-plan/02-backend-runtime-migration.md`
- `docs/research/layout-sets-to-task-ui-migration-plan/03-frontend-migration.md`
- `docs/research/layout-sets-to-task-ui-migration-plan/04-cli-upgrade-migration.md`
- `docs/research/layout-sets-to-task-ui-migration-plan/05-endpoint-cleanup-and-rollout.md`
- `docs/research/layout-sets-to-task-ui-migration-plan/06-test-and-validation-plan.md`
- `docs/research/layout-sets-to-task-ui-migration-plan/07-backend-legacy-layoutset-cleanup.md`

## Recommended execution order

1. Step 1: Lock contract and naming decisions.
2. Step 2: Implement backend runtime support and bootstrap payload.
3. Step 3: Migrate frontend to new bootstrap contract.
4. Step 4: Implement CLI upgrade migration and file transforms.
5. Step 5: Remove obsolete endpoint and finalize rollout behavior.
6. Step 6: Execute validation matrix and regression tests.
7. Step 7: Remove remaining backend legacy `LayoutSet` compatibility indirection.
