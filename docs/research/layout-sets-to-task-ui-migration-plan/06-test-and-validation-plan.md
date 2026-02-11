# Step 6: Test and Validation Plan

## Goal

Execute end-to-end verification that runtime and migration behavior match expectations.

## Scope

- Backend, frontend, and CLI regression coverage
- Manual validation of high-risk paths

## Tasks

1. Backend test matrix:
   - bootstrap payload includes `ui`
   - task-bound layout loading from `ui/{taskId}`
   - stateless `onEntry.show` datatype resolution
   - PDF and validation/expression fallback behavior
2. Frontend test matrix:
   - no `layoutSets` assumptions in global data
   - task routing and data-task behavior
   - subform datatype inference from settings
   - page settings merge (global + per-layout)
3. CLI test matrix:
   - folder rename/copy scenarios
   - `defaultDataType` persistence
   - root `Settings.json` migration
   - deletion of `layout-sets.json`
4. Add representative fixtures for edge cases:
   - missing `defaultDataType`
   - mixed task/non-task folders
   - multi-task duplicated folders
5. Run full relevant test suites and document outcomes.

## Deliverables

- Passing automated tests across all impacted projects.
- Short validation report listing tested scenarios and known limitations.

## Risks

- Existing fixtures tightly coupled to old bootstrap shape.
- Hidden cross-project regressions discovered late.

## Acceptance Criteria

- CI suites pass for affected areas.
- Manual smoke checks confirm expected runtime behavior on migrated app samples.
