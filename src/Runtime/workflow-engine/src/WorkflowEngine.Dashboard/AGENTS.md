# Dashboard

Real-time monitoring UI for the workflow engine. Vanilla JS ES Modules (no build step), JSDoc type-checked by VS Code.

## Architecture

- **Static file server**: ASP.NET Core minimal API serving `wwwroot/` + a single `/api/config` endpoint returning the engine URL.
- **Data flow**: Frontend connects via SSE to the engine's `/dashboard/stream` and `/dashboard/stream/recent` endpoints. Scheduled and query data are fetched on-demand.
- **CORS**: Engine allows dashboard origin (`http://localhost:8090`) via `CorsSettings:AllowedOrigins` in the Api project's appsettings.
- **Hot-reload**: Dashboard server polls `wwwroot/` for file changes (Docker bind mounts on Windows don't propagate inotify) and pushes SSE events via `/api/hot-reload`. Frontend listens and reloads.

## Files

| File | Purpose |
|------|---------|
| `wwwroot/index.html` | Single-page shell. `<script type="module">` loads app.js. |
| `wwwroot/style.css` | All styles (~784 lines). Dark theme with CSS custom properties. |
| `wwwroot/app.js` | Entry point (~60 lines). Imports modules, wires callbacks, runs `init()`. |
| `wwwroot/modules/core/state.js` | JSDoc types, DOM refs, state objects, BPMN helpers. |
| `wwwroot/modules/core/helpers.js` | `cssId`, `esc`, `escHtml`, `formatElapsed`, `fmtDuration`, `fmtAgo`, JSON utilities. |
| `wwwroot/modules/core/sse.js` | `connectSSE()`, hot-reload watcher. Pure SSE plumbing. |
| `wwwroot/modules/shared/dropdown.js` | Searchable multi-select dropdown: `rebuildDropdown()`, `toggleDropdown()`, search/close wiring. |
| `wwwroot/modules/shared/chips.js` | Selection chip bars: `rebuildSelectedOnlyChips()`, `wireChipBar()`, party/guid labels. |
| `wwwroot/modules/shared/cards.js` | All card renderers: `buildCardHTML()`, `buildCompactCardHTML()`, `buildScheduledCardHTML()`, copy/trace icons. |
| `wwwroot/modules/shared/pipeline.js` | `buildPipelineHTML()`, step nodes, connectors, scroll. |
| `wwwroot/modules/shared/section.js` | Section collapse/expand, compact/full toggle, card expand/collapse. |
| `wwwroot/modules/shared/timers.js` | `requestAnimationFrame` loop for elapsed/backoff countdowns. |
| `wwwroot/modules/features/header.js` | `updateStatusBadges()`, `updateCapacity()`. |
| `wwwroot/modules/features/scheduled.js` | `updateScheduledBadge()`, `loadScheduled()`. |
| `wwwroot/modules/features/live.js` | `fingerprint()`, `updateLiveWorkflows()`. |
| `wwwroot/modules/features/recent.js` | `updateRecentWorkflows()`, glow animations. |
| `wwwroot/modules/features/filters.js` | Filter state, org/app dropdowns, status chips, tabs (~327 lines). |
| `wwwroot/modules/features/url.js` | `syncUrl()`, `restoreUrl()`, time range state. |
| `wwwroot/modules/features/query.js` | `fetchQuery()`, pagination, auto-refresh, time range. |
| `wwwroot/modules/features/modal.js` | Step detail modal: fetch, render, open/close. |
| `wwwroot/modules/features/settings.js` | Settings modal: timestamp visibility, UTC mode toggle, localStorage persistence. |
| `wwwroot/modules/features/theme.js` | `getTheme()`, `setTheme()`, `toggleTheme()`. |
| `Program.cs` | Static file server + `/api/config` + `/api/hot-reload` endpoints. |

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
      theme.js                       — theme toggle (dark/altinn)
```

**Layer rule:** `core/ ← shared/ ← features/` (no backward imports).

**Folder philosophy:**
- `core/` — you almost never open these. State management, utilities, SSE plumbing.
- `shared/` — stable building blocks. Card/pipeline renderers, dropdown/chip components. Changes here affect all views.
- `features/` — where you work day-to-day. Each file = one visible part of the UI.

## Shared State

- `state.js` exports `state`, `workflowData`, and `dom` as mutable objects
- All modules `import { state, workflowData, dom } from '../core/state.js'`
- Since JS objects are references, mutations in any module are visible to all

## Circular Dependencies

Some modules have circular call dependencies (e.g., `filters.js` calls `loadQuery()`, `query.js` calls `applyFilter()`). These are broken with late-bound callbacks:
- Each module with circular deps exports a `bind*Callbacks()` function
- `app.js` wires them all up at startup: `bindFilterCallbacks({ syncUrl, loadQuery })`
- All `bind*` calls happen before `init()`, so callbacks are ready when first used

## Engine Endpoints Used

| Endpoint | Method | Used by |
|----------|--------|---------|
| `/dashboard/stream` | SSE | Main loop — engine status, capacity, inbox workflows, scheduled count |
| `/dashboard/stream/recent` | SSE | Recent workflows (deduped by fingerprint on backend) |
| `/dashboard/orgs-and-apps` | GET | Populate org/app dropdowns on connect |
| `/dashboard/scheduled` | GET | Scheduled section (on-demand) |
| `/dashboard/query?status=&search=&limit=&before=&since=&org=&app=&party=&instanceGuid=&retried=` | GET | Query tab (on-demand, paginated) |
| `/dashboard/step?wf=&step=` | GET | Step detail modal |

## Dashboard Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config` | GET | Returns `{ engineUrl }` from config |
| `/api/hot-reload` | SSE | Polls wwwroot for changes, sends reload events |

## UI Sections

**Live tab** — all sections collapsible (collapse state persisted to `localStorage` and URL):

- **Scheduled** (collapsed by default) — workflows with future `startAt`, live countdown, time-bucket chips (10s/1m/5m/later)
- **Inbox** — current engine inbox, real-time via SSE, status chips (Processing/Retrying)
- **Recent** — workflows that just left the inbox, via SSE, status chips (Completed/Failed)

**Query tab** — loads from DB on-demand:
- Toggle chips for Completed/Failed status (multi-select)
- Time range dropdown (presets + custom date range)
- "Has retries" checkbox filter
- Search input (smart GUID detection bypasses filters)
- Auto-refresh interval selector (off/5s/10s/30s/1m/5m)
- Cursor-based pagination with prev/next

## Filtering

- **Org/App dropdowns** (filter bar): searchable multi-select dropdowns with Select All/None. Org fetched from DB on connect. App dropdown cascades from selected org(s). Auto-selects sole org, auto-selects all apps when ≤10.
- **Party/Instance chips** (filter bar): selection-only chips (toggled by clicking card segments)
- **Per-section status chips**: inline with section titles
  - Scheduled: All / 10s / 1m / 5m / Later
  - Inbox: All / Processing / Retrying
  - Recent: All / Completed / Failed
  - Query: Completed / Failed (toggle, multi-select)
- **Live tab text filter**: filters inbox/recent/scheduled cards by text match
- **Segment clicks** on workflow cards (org/app/party/guid) toggle the corresponding filter
- All filter state synced to URL query params for shareable links

## Card Views

Each section supports **Compact** and **Full** views, toggled by buttons in section headers:
- **Full**: shows card header (instance path, status pill, elapsed time) + full step pipeline
- **Compact**: single-row summary with mini step dots, status pill, retry badge, elapsed time
- Individual cards can be clicked to expand/collapse within a compact section
- Compact preference persisted to `localStorage`

## Patterns

- Cards use `data-*` attributes for filter matching (avoids re-parsing)
- Workflow fingerprinting (`status|step1status:retries:backoff,...`) to skip unchanged DOM updates
- `workflowData` object stores full workflow objects keyed by idempotencyKey for expand/collapse
- Searchable dropdowns with `rebuildDropdown()` for org/app; `rebuildSelectedOnlyChips()` for party/guid
- Inline `onclick` handlers exposed via `window.*` for cards generated as HTML strings
- URL state sync via `syncUrl()`/`restoreUrl()` — shareable URLs capture full dashboard state including tab, filters, collapse, compact mode, and individually expanded cards (base64-encoded)
- Grafana trace links built from workflow `traceId` for Tempo integration
