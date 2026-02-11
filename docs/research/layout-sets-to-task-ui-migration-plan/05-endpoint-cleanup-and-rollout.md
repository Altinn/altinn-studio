# Step 5: Endpoint Cleanup and Rollout

## Goal

Finalize removal of obsolete API behavior and reduce migration risk during rollout.

## Scope

- Legacy API surface and internal dead code references
- Release notes and migration communication

## Out of Scope

- Introducing new backend/frontend migration behavior beyond cleanup
- New CLI transformation logic or algorithm changes (covered by Step 4)
- Broad feature refactors outside direct legacy endpoint/type cleanup
- Full validation execution ownership (covered by Step 6)

## Tasks

1. Remove `/api/layoutsets` endpoint (no compatibility fallback).
2. Remove dead backend and frontend references to old layout set types.
3. Validate no remaining runtime calls to legacy endpoint in tests and tooling.
4. Update docs/changelog with migration requirements and breaking changes.
5. Add a short rollback strategy for emergency patch releases.

## Deliverables

- Clean runtime with no hidden `layout-sets.json` dependency.
- Documented breaking-change behavior for app teams.

## Risks

- External integrations or tests still calling `/api/layoutsets`.
- Incomplete documentation causing upgrade confusion.

## Acceptance Criteria

- Search confirms no production code depends on legacy endpoint.
- Breaking-change notes published with actionable upgrade guidance.

## Breaking-Change Notes (Rollout)

- Removed endpoint: `GET /{org}/{app}/api/layoutsets`.
- `window.altinnAppGlobalData.layoutSets` is no longer part of the runtime contract. Use `window.altinnAppGlobalData.ui`.
- Runtime no longer reads `App/ui/layout-sets.json`.
- Upgrade path for existing apps is the v8->v10 CLI migration job introduced in Step 4. It renames/duplicates folders by task, moves `uiSettings` to `App/ui/Settings.json`, writes `defaultDataType` to per-folder `Settings.json`, and deletes `layout-sets.json`.

## Migration Requirements For App Teams

- Upgrade apps with the v8->v10 upgrade command before deploying on this runtime.
- Verify all task UI folders exist under `App/ui/{taskId}`.
- Verify `defaultDataType` in each task folder `Settings.json` where datatype inference is required.
- Remove any direct client/test/tooling usage of `GET /api/layoutsets`; use bootstrap `ui` metadata and task-id based folder lookup.

## Emergency Rollback Strategy

- Runtime rollback:
  - Revert/deploy previous runtime patch that still exposed `GET /api/layoutsets`.
- App-side rollback:
  - Keep a backup branch/tag before running CLI migration.
  - If emergency rollback is needed, restore pre-migration `App/ui` files (including `layout-sets.json`) from that tag.
- Forward recovery after rollback:
  - Re-run the v8->v10 migration on a fresh branch.
  - Validate endpoint consumers are removed before re-deploying upgraded runtime.
