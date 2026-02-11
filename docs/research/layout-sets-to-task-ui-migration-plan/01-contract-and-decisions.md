# Step 1: Contract and Decision Lock

## Goal

Finalize all cross-cutting contracts and naming so backend, frontend, and CLI can be implemented in parallel without rework.

## Scope

- Bootstrap payload naming replacing all legacy layout-set terminology
- Per-folder settings datatype field name
- Root-level global UI settings source
- Final naming for the new bootstrap payload contract

## Out of Scope

- Backend runtime code changes (covered by Step 2)
- Frontend runtime code changes (covered by Step 3)
- CLI upgrade implementation and file transforms (covered by Step 4)
- Endpoint removal and rollout communication (covered by Step 5)
- Full regression execution and validation reporting (covered by Step 6)

## Tasks

1. Define bootstrap payload shape in a shared contract note:
   - `ui.folders: Record<string, FolderUiSettings>`
   - `ui.settings?: GlobalPageSettings`
   - each `ui.folders[folderId]` value is the parsed content of `App/ui/{folderId}/Settings.json`
2. Confirm per-folder settings key name as `defaultDataType`.
3. Confirm root global settings file path as `App/ui/Settings.json`.
4. Lock endpoint decision: remove `/api/layoutsets` (no compatibility fallback).
5. Identify all DTO/type definitions to change first to avoid drift.

## Deliverables

- Approved contract doc update in research notes.
- Agreed naming decisions recorded in one place.
- Initial checklist of code locations (backend/frontend/cli) that must match the contract.

## Risks

- Ambiguity in field names causes repeated refactors.
- Frontend and backend merge different payload shapes.

## Acceptance Criteria

- Contract names and JSON shape are explicitly documented.
- Team can start Step 2 and Step 3 independently using the same schema.
