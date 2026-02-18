# Dashboard

Real-time monitoring UI for the workflow engine. Vanilla JS (no build step), JSDoc type-checked by VS Code.

## Architecture

- **Static file server**: ASP.NET Core minimal API serving `wwwroot/` + a single `/api/config` endpoint returning the engine URL.
- **Data flow**: Frontend connects via SSE to the engine's `/dashboard/stream` and `/dashboard/stream/recent` endpoints. Scheduled and query data are fetched on-demand.
- **CORS**: Engine allows dashboard origin (`http://localhost:8090`) via `CorsSettings:AllowedOrigins` in the Api project's appsettings.
- **Hot-reload**: Dashboard server polls `wwwroot/` for file changes (Docker bind mounts on Windows don't propagate inotify) and pushes SSE events via `/api/hot-reload`. Frontend listens and reloads.

## Files

| File | Purpose |
|------|---------|
| `wwwroot/app.js` | All application logic (~1960 lines). Numbered sections 0-18 + subsections. |
| `wwwroot/style.css` | All styles (~545 lines). Dark theme with CSS custom properties. |
| `wwwroot/index.html` | Single-page shell (~197 lines). Minimal markup, no dependencies. |
| `Program.cs` | Static file server + `/api/config` + `/api/hot-reload` endpoints. |

## app.js Structure

Entire file is wrapped in an IIFE (`(() => { 'use strict'; ... })()`). Sections are numbered in comments (`/* 0. TYPE DEFINITIONS */`, etc.):

0. **Type definitions** — JSDoc typedefs (`Step`, `Workflow`, `DashboardPayload`, `DashboardState`, etc.)
1. **DOM references** — `dom` object with all getElementById calls
2. **State** — `state` object (filters, timers, fingerprints, compact sections, org/app map) + `workflowData` lookup
3. **SSE connection** — `connectSSE()` with auto-reconnect; `addOrgAndApp()`, `refreshOrgAppDropdowns()`, `fetchOrgsAndApps()`
4. **Dashboard update** — entry point for every SSE message
5. **Header badges** — engine status icon (running/idle/stopped/unhealthy/disabled/queue-full with cog animation)
6. **Capacity meters** — inbox/db/http usage bars with low/mid/high color thresholds
7. **Scheduled workflows** — count badge, on-demand fetch, collapsible section, countdown timers, time-bucket status chips (10s/1m/5m/later)
8. **Inbox (live) workflows** — add/update/remove cards with fingerprint diffing, exit animations (success/fail)
9. **Recent workflows** — rendered from backend `RecentWorkflowCache`, glow animations on arrival
10. **Card rendering** — `buildCardHTML()` + `buildCompactCardHTML()` shared by all views; copy/open/Grafana trace links
11. **Pipeline rendering** — step circles + animated connectors + step-type badges + compact dot view
12. **Timers** — `requestAnimationFrame` loop for elapsed/backoff/startAt countdowns
13. **Filtering** — text search, per-section status chips, org/app searchable dropdowns, party/guid chip bars
  - 13b. **Compact view toggle** — `collapseAll()`/`fullAll()` per section, persisted to `localStorage`
  - 13c. **Compact card expand/collapse** — click to toggle individual cards between compact and full view
14. **Tabs** — live/query tab switching
15. **Query** — on-demand DB fetch with cursor-based pagination, time range (preset + custom), auto-refresh interval, retried filter, smart GUID fallback
16. **Step detail modal** — click step circle to fetch full step JSON, error display
17. **JSON utilities** — expand embedded JSON strings + syntax highlighting
18. **Generic helpers** — `cssId()`, `esc()`, `escHtml()`
- **Hot-reload** — `watchForChanges()` listens to `/api/hot-reload` SSE
- **URL sync** — `syncUrl()`/`restoreUrl()` persist full dashboard state to query params (tab, filters, collapse, compact, expanded cards)
- **Init** — fetches `/api/config`, restores URL state, connects SSE streams, starts timer loop

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
