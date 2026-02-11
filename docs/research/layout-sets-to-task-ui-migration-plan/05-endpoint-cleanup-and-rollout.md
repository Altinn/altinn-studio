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
