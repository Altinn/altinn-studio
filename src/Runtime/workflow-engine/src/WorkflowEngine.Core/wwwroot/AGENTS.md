# Dashboard

Real-time monitoring UI for the workflow engine. Vanilla JS ES Modules (no build step), JSDoc type-checked by VS Code.

The dashboard is embedded in `WorkflowEngine.Core` — static files are compiled as embedded resources and served by `MapDashboardUI()`. In development, files are served from disk via `PhysicalFileProvider` for live editing.

## Architecture

- **Embedded in Core**: `MapDashboardUI()` serves static files + `/dashboard/hot-reload` (dev only). All endpoints are same-origin under `/dashboard/`.
- **Data flow**: Frontend connects via SSE to `/dashboard/stream` and `/dashboard/stream/live` endpoints (same origin).
- **Hot-reload**: In dev/Docker, the engine polls `wwwroot/` for file changes and pushes SSE events via `/dashboard/hot-reload`. Requires a volume mount of `wwwroot/` into the container (see `docker-compose.yaml`).

## Module Structure

```
wwwroot/
  app.js                             — entry point: init(), SSE message handling, callback wiring
  modules/
    core/                            — "set and forget" plumbing (no imports from shared/ or features/)
      state.js                       — types, DOM refs, state objects, BPMN transition parsing
      helpers.js                     — cssId, esc, escHtml, formatElapsed, fmtDuration, fmtAgo, JSON utilities, lineDiff
      sse.js                         — connectSSE(), hot-reload watcher
    shared/                          — reusable UI building blocks (imports from core/ only)
      cards.js                       — all card renderers (full, compact, scheduled), filter data, label segments
      pipeline.js                    — buildPipelineHTML(), step nodes, connectors, phase grouping, retry/skip buttons
      section.js                     — collapse/expand, compact/full toggle, card expand
      timers.js                      — requestAnimationFrame timer loop for elapsed counters + backoff countdowns
    features/                        — one file per visible UI section (imports from core/ and shared/)
      header.js                      — engine status badges + capacity meters (workers, DB, HTTP)
      scheduled.js                   — scheduled workflows fetch + badge
      live.js                        — active workflows section (SSE-driven, animations, pulse sync)
      recent.js                      — recent workflows section (SSE-driven, 100-item window)
      filters.js                     — label filters, status chips, text filter, tabs
      url.js                         — syncUrl(), restoreUrl(), time range state
      query.js                       — query tab with pagination, time range, auto-refresh
      modal.js                       — step detail modal (SSE-driven refresh, retry/skip actions)
      settings.js                    — settings modal (timestamps, UTC toggle)
      state-modal.js                 — state evolution modal (SSE-driven refresh)
      theme.js                       — theme toggle (dark/altinn)
```

**Layer rule:** `core/ ← shared/ ← features/` (no backward imports).

## Shared State

- `state.js` exports `state`, `workflowData`, and `dom` as mutable objects
- All modules `import { state, workflowData, dom } from '../core/state.js'`
- Since JS objects are references, mutations in any module are visible to all
- `workflowData` is keyed by `databaseId`

## Circular Dependencies

Some modules have circular call dependencies (e.g., `filters.js` calls `loadQuery()`, `query.js` calls `applyFilter()`). These are broken with late-bound callbacks:

- Each module with circular deps exports a `bind*Callbacks()` function
- `app.js` wires them all up at startup: `bindFilterCallbacks({ syncUrl, loadQuery })`
- All `bind*` calls happen before `init()`, so callbacks are ready when first used

## Endpoints Used

| Endpoint                   | Method | Used by                                              |
| -------------------------- | ------ | ---------------------------------------------------- |
| `/dashboard/stream`        | SSE    | Main loop — engine status, capacity, scheduled count |
| `/dashboard/stream/live`   | SSE    | Active and recent workflows                          |
| `/dashboard/labels`        | GET    | Fetch distinct values for label keys                 |
| `/dashboard/scheduled`     | GET    | Scheduled section (on-demand)                        |
| `/dashboard/query`         | GET    | Query tab (on-demand, paginated)                     |
| `/dashboard/step`          | GET    | Step detail modal                                    |
| `/dashboard/state`         | GET    | State evolution modal                                |
| `/dashboard/retry`         | POST   | Retry a failed workflow                              |
| `/dashboard/skip-backoff`  | POST   | Skip backoff wait on a requeued workflow             |
| `/dashboard/hot-reload`    | SSE    | Dev file change watcher                              |

## Patterns

- Cards use `data-*` attributes for filter matching (avoids re-parsing): `data-namespace`, `data-correlationid`, `data-labels`, `data-status`, `data-filter`
- Workflow fingerprinting (`status + step statuses + retry counts`) to skip unchanged DOM updates
- Pulse animation sync after card re-render prevents CSS animation flicker
- Pipeline scroll-on-change: only scrolls to active step when the processing step index changes
- Inline `onclick` handlers exposed via `window.*` for cards generated as HTML strings
- URL state sync via `syncUrl()`/`restoreUrl()` — shareable URLs capture full dashboard state
- Grafana trace links built from workflow `traceId` for Tempo integration
- Label filters use `toggleLabelFilter(key, value)` from clickable card segments (namespace, correlationId, labels)
- Retry button on failed pipeline steps, skip-backoff button on requeued steps with backoff timer

For full behavioral spec (sections, endpoint contracts, card anatomy, filtering mechanics, modal behavior, URL state sync), see `DASHBOARD_SPEC.md` (same directory).
