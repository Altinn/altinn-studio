# Step 3: Frontend Migration

## Goal

Switch frontend behavior from `layoutSets` to bootstrapped `ui` and folder-based task layout conventions.

## Scope

- `src/App/frontend`
- Global data typing and consumers of layout/task/datatype resolution

## Out of Scope

- Backend bootstrap contract redesign and runtime lookup logic (covered by Step 2)
- CLI upgrade/migration behavior for existing app repositories (covered by Step 4)
- Endpoint removal and release communication tasks (covered by Step 5)
- Full end-to-end validation matrix ownership across backend/frontend/CLI (covered by Step 6)

## Tasks

1. Update `AltinnAppGlobalData` types to replace `layoutSets` with `ui`.
2. Refactor current layout selection to use task-id folder convention.
3. Refactor datatype lookup utilities to use `ui.folders[uiFolderId].defaultDataType`.
4. Rework `behavesLikeDataTask` logic to avoid `set.tasks` mapping dependency.
5. Update subform datatype inference to use bootstrapped layout settings map.
6. Update page settings merge flow:
   - root `ui.settings`
   - per-layout `Settings.json`
7. Remove dead `layoutSets` type modules/hooks and adjust tests/fixtures.

## Deliverables

- No frontend runtime dependency on `layoutSets`.
- Data task behavior and subform inference preserved with new source data.
- Frontend fixtures/mocks aligned with new global bootstrap contract.

## Risks

- Process and receipt navigation regressions due to changed data-task heuristics.
- Missing `defaultDataType` may expose implicit assumptions in layouts.

## Acceptance Criteria

- Frontend unit tests updated and passing.
- Manual checks pass for task navigation, subform operations, and page settings behavior.
