# Research: Remove `layout-sets.json` and move to task-folder UI model

## Decision baseline (confirmed)

- `layout-sets.json` will be removed entirely. No compatibility fallback.
- For task-bound UI folders, folder name is the task id (`ui/{taskId}`), enforced.
- Subform continues to infer datatype from layout settings (no new `Subform.dataType` now).
- No migration of implicit bindings/expressions now. Keep default datatype concept, but move it to per-layout `Settings.json` and make it optional.

## Scope

- Included:
  - `src/App/backend`
  - `src/App/frontend`
  - `src/cli` (`Upgrade/v8Tov10`)
- Excluded for now:
  - Studio/Designer

## Target model

### File system + config model

- `App/ui/{taskId}/...` for task-bound UI customization.
- Keep non-task folders unchanged (stateless/subform-only layout folders not tied to tasks).
- `App/ui/{layoutSetId}/Settings.json` gets optional default datatype, e.g. `defaultDataType`.
- Global page settings move from `layout-sets.json.uiSettings` to optional `App/ui/Settings.json`.

### Runtime model

- Backend bootstrap (`window.altinnAppGlobalData`) should contain a new task/layout bootstrap payload:
  - available UI folders (task-bound and non-task-bound)
  - parsed settings for each folder (including optional default datatype)
  - optional global UI settings from `App/ui/Settings.json`
- Frontend should stop relying on `layoutSets` and instead use this new payload.

## Current coupling and impact

### Backend coupling to `layout-sets.json`

Main usages:

- `src/App/backend/src/Altinn.App.Core/Implementation/AppResourcesSI.cs`
  - `GetLayoutSetsString`
  - `GetLayoutSets`
  - `GetLayoutSetForTask`
  - `GetLayoutModelForTask` (loads all sets from mapping)
  - `LoadLayout` currently gets datatype from `layoutSet.DataType`
- `src/App/backend/src/Altinn.App.Api/Controllers/ResourceController.cs`
  - `/api/layoutsets`
- `src/App/backend/src/Altinn.App.Core/Features/Bootstrap/BootstrapGlobalService.cs`
  - bootstrap includes `LayoutSets`
- `src/App/backend/src/Altinn.App.Api/Controllers/HomeController.cs`
  - stateless anonymous lookup reads layout-sets
- `src/App/backend/src/Altinn.App.Api/Controllers/PdfController.cs`
  - resolves layout set via `(taskId,dataType)` against layout-sets mapping
- `src/App/backend/src/Altinn.App.Core/Features/Validation/Default/RequiredLayoutValidator.cs`
  - `ShouldRunForTask` checks task membership from layout-sets
- `src/App/backend/src/Altinn.App.Core/Internal/Process/ExpressionsExclusiveGateway.cs`
  - fallback datatype resolution via `GetLayoutSetForTask`

### Frontend coupling to `layoutSets`

Main usages:

- Global type surface:
  - `src/App/frontend/src/global.ts`
  - `src/App/frontend/src/features/form/layoutSets/types.ts`
- Task/layout/dtype routing and selection:
  - `src/App/frontend/src/features/form/layoutSets/useCurrentLayoutSet.ts`
  - `src/App/frontend/src/features/instance/instanceUtils.ts`
  - `src/App/frontend/src/utils/layout/index.tsx`
- Task behavior logic (`behavesLikeDataTask`) currently depends on `set.tasks`:
  - `src/App/frontend/src/utils/formLayout.ts`
  - consumers in `useNavigatePage`, `ButtonComponent`, `FixWrongReceiptType`, `useProcessQuery`
- Stateless anonymous:
  - `src/App/frontend/src/features/stateless/getAllowAnonymous.ts`
- Subform datatype resolution:
  - `src/App/frontend/src/features/form/layout/LayoutsContext.tsx`
  - `src/App/frontend/src/layout/Subform/SubformWrapper.tsx`
  - `src/App/frontend/src/layout/Subform/useValidateSubform.ts`
- Global page settings merge currently uses `layoutSets.uiSettings`:
  - `src/App/frontend/src/features/form/layoutSettings/LayoutSettingsContext.tsx`

### CLI coupling

- `src/cli/src/altinn-studio-cli/Upgrade/v8Tov10/V8Tov10Upgrade.cs`
  - current jobs 1..6
- `src/cli/src/altinn-studio-cli/Upgrade/v8Tov10/RuleConfiguration/DataProcessingRules/DataModelResolver.cs`
  - Job 4 resolves datatype/classref through `layout-sets.json`
- Jobs 3/5 iterate `ui/*` directories as layout sets.

## Additional findings from focused research

### 1. Bootstrap is the correct insertion point for new payload

- Global payload is created in:
  - `src/App/backend/src/Altinn.App.Core/Features/Bootstrap/BootstrapGlobalService.cs`
- Serialized into `window.altinnAppGlobalData` in:
  - `src/App/backend/src/Altinn.App.Core/Internal/App/IndexPageGenerator.cs`
- This matches your direction: preload all UI folders + each folder’s settings once.

### 2. Backend `LayoutSettings` model must be extended

- Current model does **not** include global settings fields or datatype:
  - `src/App/backend/src/Altinn.App.Core/Models/LayoutSettings.cs`
  - `src/App/backend/src/Altinn.App.Core/Models/Pages.cs`
- To support your model cleanly, backend needs a model change (or dedicated DTO parse) for:
  - optional per-layout `defaultDataType`
  - global ui settings from root `ui/Settings.json` for bootstrap

### 3. Subform inference remains feasible with preload map

- Subform config only has `layoutSet` id today:
  - `src/App/frontend/src/layout/Subform/config.generated.ts`
- If bootstrap includes `layoutSetId -> settings.defaultDataType`, subform can keep current inference approach without early extra network requests.

## Required changes by project

## Backend changes (`src/App/backend`)

1. Remove layout-sets API/model usage from runtime paths.

- Delete or retire `/api/layoutsets` endpoint usage path:
  - `ResourceController.GetLayoutSets`
- Remove/replace `LayoutSets` dependency in bootstrap DTO (`BootstrapGlobalResponse`).

2. Introduce new bootstrap UI metadata shape.

- Include:
  - list of UI folder ids discovered under `App/ui/*` (excluding root files)
  - per-folder parsed settings
  - optional root/global settings from `App/ui/Settings.json`
- Frontend global type must align with this new shape.

3. Refactor task->layout resolution.

- For task-bound steps: use folder `taskId` directly.
- Non-task folders remain available for subform/stateless references.
- `GetLayoutModelForTask(taskId)` should load `ui/{taskId}` directly.

4. Move default datatype lookup from layout-sets to per-layout settings.

- `LoadLayout` should read default datatype from `ui/{id}/Settings.json`.
- datatype remains optional (per your decision #4).

5. Rework stateless anonymous detection.

- `HomeController.GetStatelessDataType` currently uses layout-sets.
- Replace with lookup based on `onEntry.show` + corresponding folder settings default datatype.

6. Update PDF/validator/gateway integration points.

- `PdfController` layout-set resolution should not use layout-sets mapping.
- `RequiredLayoutValidator.ShouldRunForTask` should be based on presence of UI folder for task.
- `ExpressionsExclusiveGateway` should stop inferring via layout-sets fallback (prefer explicit process configuration or folder-based settings lookup).

## Frontend changes (`src/App/frontend`)

1. Replace `layoutSets` global contract.

- Remove `layoutSets` requirement from `AltinnAppGlobalData`.
- Add new bootstrap UI metadata contract from backend.

2. Replace task/layout/dtype lookups.

- `useCurrentLayoutSet` should use task-id folder convention.
- `instanceUtils` datatype lookup should use per-layout settings map.
- `behavesLikeDataTask` should no longer depend on `set.tasks`; use process task type + explicit task-id folder existence rules.

3. Update subform datatype inference.

- `useDataTypeFromLayoutSet` should resolve from bootstrapped per-folder settings.
- Keep existing subform behavior; source changes only.

4. Global page settings source.

- `usePageSettings` should merge:
  - global settings from root `ui/Settings.json` (from bootstrap)
  - per-layout settings from `ui/{id}/Settings.json` (already fetched in layout settings query path)

5. Keep fallback behavior for optional default datatype.

- If `defaultDataType` missing in settings:
  - layout bindings/expressions must explicitly include datatype (existing behavior can throw when absent).

## CLI changes (`src/cli`, `v8Tov10`)

1. Add new migration job in `V8Tov10Upgrade` (new step after current rule jobs).

- Read `App/ui/layout-sets.json`.
- For each set with `tasks`:
  - if one task: rename folder to task id.
  - if multiple tasks: copy folder once per task id.
- Leave sets with no tasks unchanged.

2. Migrate default datatype into each affected folder `Settings.json`.

- Add optional `defaultDataType` from set-level `dataType`.
- For duplicated folders, write same default initially.

3. Migrate global ui settings.

- If `layout-sets.json.uiSettings` exists: create/update `App/ui/Settings.json`.
- If missing: do not create root settings file.

4. Remove `layout-sets.json` at end of migration.

- No fallback runtime, so file should be deleted by upgrade.

5. Address existing job dependency.

- Current Job 4 (`GenerateDataProcessors`) still reads `layout-sets.json`.
- Therefore new job should run **after** Job 4 and Job 5, then delete mapping file.

## Explicit non-goals in this cycle

- No Studio/Designer migration.
- No migration of implicit string bindings / `dataModel(path)` expressions to explicit datatype.
- No introducing explicit `Subform.dataType` now.

## Risk areas to cover in plan/testing

- Bootstrap contract break (`layoutSets` removed) requires synchronized backend+frontend changes.
- `useProcessQuery` and receipt/task behavior currently use `behavesLikeDataTask`; logic must be redefined without `tasks[]` mapping.
- Backend public API snapshots and frontend test fixtures heavily reference `layout-sets.json` and mock layout sets.
- PDF format endpoint behavior may change if task/datatype mapping assumptions are wrong in edge apps.

## Open implementation details to settle during planning

1. Name of new bootstrap field replacing `layoutSets`.

- Suggested: `uiConfig` with:
  - `layouts: { [layoutSetId: string]: LayoutSettingsLike }`
  - `globalSettings?: GlobalPageSettings`

2. Exact JSON field name for per-layout default datatype in `Settings.json`.

- Suggested: `defaultDataType`.

3. Whether `/api/layoutsets` endpoint is removed or kept as dead-end/obsolete in v10.

- Since no fallback: prefer removal or explicit non-functional response.

## Ready-for-planning status

Research is now aligned with your decisions and covers the concrete file-level impact across backend/frontend/cli. I’m ready to produce a stepwise implementation plan next.
