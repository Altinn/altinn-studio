# Phase 6: Follow-up fixes for options + validation

## Objective

Close the remaining gaps after the bootstrap rollout:

1. `useGetOptions` should use bootstrap static options when possible, and avoid duplicate fetches.
2. Initial backend validations should be modeled per data element (`DataModelInfo`), not as a single top-level list.
3. Re-evaluate whether `backendValidationQuery.ts` is still needed after (2).

## Decisions (clarified)

- Keep task-level validations at top level (as-is behavior).
- Add per-data-element initial validations in `DataModelInfo` in addition to top-level task-level validations.
- Change bootstrap static options shape from a flat map to a deeper structure that supports multiple static query-parameter variants per `optionsId`.

---

## Verified current behavior

### Options

- `FormBootstrapProvider` exposes `staticOptions`, but `useGetOptions` still fetches whenever `optionsId` is set.
- The static options map is currently used by `useCodeListSelector` (`optionLabel` expressions), not by `useGetOptions`.
- Result: duplicate options requests even when bootstrap already contains the list.

### Validation

- Backend bootstrap currently sets `ValidationIssues = null` for both instance and stateless flows.
- Frontend bootstrap types still include top-level `validationIssues?: BackendValidationIssue[] | null`.
- `DataModelInfo` does not carry initial validation issues.
- `BackendValidation` still falls back to `useBackendValidationQuery` (`/validate`) when bootstrap has no initial issues.

### `backendValidationQuery.ts` usage today

- Used for initial validation fetch fallback.
- Also used for explicit refetch flows (page navigation with subforms, "show all backend errors", signing validation checks).
- Conclusion: it cannot be removed immediately without replacing those explicit `/validate` use cases.

---

## Plan

## 1. Use bootstrap static options in `useGetOptions`

- Update `useFetchOptions` to short-circuit API fetch when:
  - `optionsId` exists,
  - bootstrap has a matching static options variant for that `optionsId` + static query parameters,
  - no `mapping` is configured,
  - no dynamic `queryParameters` are configured.
- Keep API fetch behavior when:
  - `mapping` exists, or
  - query parameters are dynamic / data-dependent, or
  - bootstrap has no matching static options variant.
- Update bootstrap options contract to support variant lookup without encoding params into a single string key. Suggested direction:
  - `staticOptions[optionsId].variants[]`
  - each variant contains `{ queryParameters, options }`
  - frontend matches by deep equality on resolved static query parameters.
- Add/adjust tests in `useGetOptions.test.tsx`:
  - Uses bootstrap options and does not call `fetchOptions`.
  - Still fetches with `mapping`.
  - Still fetches with dynamic query parameters.
  - Uses the correct variant when same `optionsId` exists with different static query parameters.

## 2. Move initial validation to `DataModelInfo`

- Backend contract change:
  - Add `initialValidationIssues?: ValidationIssueWithSource[] | null` to `DataModelInfo`.
  - Keep top-level bootstrap `validationIssues` for task-level validations.
  - Hard cutover: top-level `validationIssues` contains task-level issues only (no backward-compat dual-writing).
- Backend bootstrap implementation:
  - For instance mode and non-PDF mode, run initial validation once during bootstrap.
  - Partition field/data-element issues by `dataElementId`.
  - Attach each partition to the corresponding `DataModelInfo.initialValidationIssues`.
  - Keep task-level issues (without `field`/`dataElementId`) in top-level `validationIssues`.
  - Stateless and PDF flows keep validation empty.
- Frontend types/provider:
  - Add `initialValidationIssues` to frontend `DataModelInfo`.
  - Keep top-level `initialValidationIssues` in bootstrap context for task-level issues.

## 3. Update frontend validation initialization path

- `BackendValidation` should initialize from:
  - data-model-scoped bootstrap issues (for field/data-element validations), and
  - top-level bootstrap issues (for task-level validations).
- Remove only the "fetch initial validations on mount" fallback path.
- Remove compatibility paths expecting initial field/data-element issues at bootstrap top-level.
- Keep explicit refetch behavior for non-initial flows (subform navigation, show-all-errors, signing checks), still backed by `backendValidationQuery.ts`.

## 4. Re-scope `backendValidationQuery.ts` (do not delete now)

- Keep file for explicit `/validate` refetch operations.
- Remove only the initial-load responsibility from this module/hook path.
- Optional cleanup: rename/split API to reflect "manual full validation refresh" rather than "initial validation query".

---

## Testing plan

- Frontend unit tests:
  - `useGetOptions` static-options short-circuit.
  - Validation initialization from per-data-model bootstrap payload.
- Backend unit tests (`FormBootstrapServiceTests`):
  - Instance bootstrap includes per-data-element initial validations.
  - No initial validations in stateless/PDF.
  - Partitioning behavior for multiple data elements.
- Integration/E2E smoke:
  - No duplicate options request for static options in normal form load.
  - Dynamic options still refetch when mapping/query dependencies change.
  - Initial backend errors visible without initial `/validate` request.

---

## Risks and mitigations

- Risk: contract break between backend/frontend bootstrap types.
  - Mitigation: coordinated backend+frontend merge and keep top-level task-level validations stable.
- Risk: static options key collisions if same `optionsId` is used with different static query params.
  - Mitigation: move to variant structure under each `optionsId` (no stringified composite key).

---

## Decision status

- No backward compatibility layer for this follow-up.
- Implement as a single coordinated backend+frontend cutover.
