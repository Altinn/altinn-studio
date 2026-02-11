# Step 4: CLI Upgrade Migration (v8 to v10)

## Goal

Ensure existing apps are transformed to the new folder/settings model during upgrade.

## Scope

- `src/cli/src/altinn-studio-cli/Upgrade/v8Tov10`

## Tasks

1. Add a new migration job after current jobs that still depend on `layout-sets.json` (notably job 4 and job 5).
2. Read `App/ui/layout-sets.json` and transform each set:
   - single task: rename folder to task id
   - multiple tasks: duplicate folder per task id
   - no tasks: keep folder unchanged
   - collision rule:
     - if rename source and destination are the same folder path, continue (no-op)
     - if destination exists and source differs, fail migration (no overwrite/merge)
3. Write `defaultDataType` into each affected folder `Settings.json` from set-level `dataType` (optional).
4. Migrate global `uiSettings` to `App/ui/Settings.json` if present.
5. Delete `App/ui/layout-sets.json` as final step of this job.
6. Update upgrade logging/messages and test fixtures.

## Deliverables

- Deterministic migration job that fully removes `layout-sets.json`.
- Migrated apps have folder-per-task structure and preserved settings.

## Risks

- Folder rename/copy collisions with pre-existing task-id folders.
- Partial migration on failure if operations are not atomic enough.

## Acceptance Criteria

- Upgrade tests cover single-task, multi-task, no-task, and missing-settings cases.
- Upgrade tests cover collision behavior:
  - same-path rename no-op succeeds
  - different source->existing destination fails hard
- Resulting app structure runs with new backend/frontend runtime without manual fixes.
