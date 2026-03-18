# Dashboard

Real-time monitoring UI for the workflow engine. Vanilla JS ES Modules (no build step), JSDoc type-checked by VS Code.

The dashboard is embedded in `WorkflowEngine.Core` — static files are compiled as embedded resources and served by `MapDashboardUI()`. In development, files are served from disk via `PhysicalFileProvider` for live editing.

## Architecture

- **Embedded in Core**: `MapDashboardUI()` serves static files + `/dashboard/hot-reload` (dev only). All endpoints are same-origin under `/dashboard/`.
- **Data flow**: Frontend connects via SSE to `/dashboard/stream` and `/dashboard/stream/active` endpoints (same origin).
- **Hot-reload**: In dev/Docker, the engine polls `wwwroot/` for file changes and pushes SSE events via `/dashboard/hot-reload`.

## Module Structure

```
wwwroot/
  app.js                             — entry point: init(), updateDashboard() hub
  modules/
    core/                            — "set and forget" plumbing (no imports from shared/ or features/)
      state.js                       — types, DOM refs, state objects, BPMN helpers
      helpers.js                     — cssId, esc, escHtml, formatElapsed, fmtDuration, fmtAgo, JSON utilities
      sse.js                         — connectSSE(), hot-reload watcher
    shared/                          — reusable UI building blocks (imports from core/ only)
      dropdown.js                    — searchable multi-select dropdown component
      chips.js                       — selection-only chip bars (party/guid)
      cards.js                       — all card renderers incl. scheduled
      pipeline.js                    — buildPipelineHTML(), step nodes, connectors
      section.js                     — collapse/expand, compact/full, card expand
      timers.js                      — requestAnimationFrame timer loop
    features/                        — one file per visible UI section (imports from core/ and shared/)
      header.js                      — engine status badges + capacity meters
      scheduled.js                   — scheduled workflows fetch + badge
      live.js                        — inbox (live) workflows section
      recent.js                      — recent workflows section
      filters.js                     — filter state, org/app dropdowns, status chips, tabs
      url.js                         — syncUrl(), restoreUrl(), time range state
      query.js                       — query tab with pagination
      modal.js                       — step detail modal
      settings.js                    — settings modal (timestamps, UTC toggle)
      state-modal.js                 — state evolution modal
      theme.js                       — theme toggle (dark/altinn)
```

**Layer rule:** `core/ ← shared/ ← features/` (no backward imports).

## Shared State

- `state.js` exports `state`, `workflowData`, and `dom` as mutable objects
- All modules `import { state, workflowData, dom } from '../core/state.js'`
- Since JS objects are references, mutations in any module are visible to all

## Circular Dependencies

Some modules have circular call dependencies (e.g., `filters.js` calls `loadQuery()`, `query.js` calls `applyFilter()`). These are broken with late-bound callbacks:

- Each module with circular deps exports a `bind*Callbacks()` function
- `app.js` wires them all up at startup: `bindFilterCallbacks({ syncUrl, loadQuery })`
- All `bind*` calls happen before `init()`, so callbacks are ready when first used

## Endpoints Used

| Endpoint                   | Method | Used by                                              |
| -------------------------- | ------ | ---------------------------------------------------- |
| `/dashboard/stream`        | SSE    | Main loop — engine status, capacity, scheduled count |
| `/dashboard/stream/active` | SSE    | Active and recent workflows                          |
| `/dashboard/labels`        | GET    | Populate label dropdowns on connect                  |
| `/dashboard/scheduled`     | GET    | Scheduled section (on-demand)                        |
| `/dashboard/query`         | GET    | Query tab (on-demand, paginated)                     |
| `/dashboard/step`          | GET    | Step detail modal                                    |
| `/dashboard/state`         | GET    | State evolution modal                                |
| `/dashboard/hot-reload`    | SSE    | Dev file change watcher                              |

## Patterns

- Cards use `data-*` attributes for filter matching (avoids re-parsing)
- Workflow fingerprinting to skip unchanged DOM updates
- `workflowData` object stores full workflow objects keyed by idempotencyKey
- Inline `onclick` handlers exposed via `window.*` for cards generated as HTML strings
- URL state sync via `syncUrl()`/`restoreUrl()` — shareable URLs capture full dashboard state
- Grafana trace links built from workflow `traceId` for Tempo integration
