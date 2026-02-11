# Step 2: Backend Runtime Migration

## Goal

Remove runtime dependency on `layout-sets.json` and provide the new UI bootstrap metadata model.

## Scope

- `src/App/backend`
- Bootstrap generation and runtime resolution paths
- Controllers and validators currently depending on layout set mapping

## Out of Scope

- Frontend migration and global data consumer refactors (covered by Step 3)
- CLI upgrade transforms of app files on disk (covered by Step 4)
- Removal of legacy endpoint and rollout communication (covered by Step 5)
- Cross-project full validation report and final sign-off (covered by Step 6)

## Tasks

1. Introduce backend model(s) for bootstrapped UI config:
   - discovered UI folder ids
   - per-folder parsed `Settings.json` (with optional `defaultDataType`)
   - optional root/global `App/ui/Settings.json`
2. Update bootstrap generation to emit `ui` instead of `LayoutSets`.
3. Refactor task layout resolution:
   - load task UI from `App/ui/{taskId}`
   - keep non-task folders available for subform/stateless usage
4. Move datatype fallback lookup to per-folder settings.
5. Refactor affected runtime paths:
   - `HomeController` stateless datatype lookup
   - `PdfController` task/datatype layout resolution
   - `RequiredLayoutValidator` task applicability logic
   - `ExpressionsExclusiveGateway` fallback datatype behavior
6. Remove or isolate legacy `AppResourcesSI` methods tied to layout sets.

## Deliverables

- Backend no longer reads `layout-sets.json` during runtime.
- `window.altinnAppGlobalData` contains `ui`.
- Existing task and stateless flows work with folder/settings-based lookup.

## Risks

- Task resolution regressions for apps with mixed task-bound and non-task layouts.
- PDF routing behavior differences when `defaultDataType` is absent.

## Acceptance Criteria

- Backend unit/integration tests updated and passing.
- Manual verification for task load, stateless entry, and PDF path succeeds.
