# Dashboard

Real-time monitoring UI for the workflow engine. Vanilla JS (no build step), JSDoc type-checked by VS Code.

## Architecture

- **Static file server**: ASP.NET Core minimal API serving `wwwroot/` + a single `/api/config` endpoint returning the engine URL.
- **Data flow**: Frontend connects via SSE to the engine's `/dashboard/stream` and `/dashboard/stream/recent` endpoints. History and scheduled data are fetched on-demand.
- **CORS**: Engine allows dashboard origin (`http://localhost:8090`) via `CorsSettings:AllowedOrigins` in the Api project's appsettings.
- **Hot-reload**: `watchForChanges()` polls HEAD on all three static files every 1s, reloads on `Last-Modified` change. Works because `wwwroot/` is bind-mounted into the container.

## Files

| File | Purpose |
|------|---------|
| `wwwroot/app.js` | All application logic (~1050 lines). Numbered sections 0-18. |
| `wwwroot/style.css` | All styles (~290 lines). Dark theme with CSS custom properties. |
| `wwwroot/index.html` | Single-page shell. Minimal markup, no dependencies. |
| `Program.cs` | Static file server + `/api/config` endpoint. |

## app.js Structure

Sections are numbered in comments (`/* 0. TYPE DEFINITIONS */`, etc.):

0. **Type definitions** — JSDoc typedefs (`Step`, `Workflow`, `DashboardPayload`, etc.)
1. **DOM references** — `dom` object with all getElementById calls
2. **State** — `state` object (filters, timers, fingerprints)
3. **SSE connection** — `connectSSE()` with auto-reconnect
4. **Dashboard update** — entry point for SSE messages
5. **Header badges** — engine status (running/healthy/idle)
6. **Capacity meters** — inbox/db/http usage bars
7. **Scheduled workflows** — count badge, on-demand fetch, countdown timers
8. **Inbox (live) workflows** — add/update/remove cards with fingerprint diffing
9. **Recent workflows** — rendered from backend `RecentWorkflowCache`
10. **Card rendering** — `buildCardHTML()` shared by all views
11. **Pipeline rendering** — step circles + animated connectors
12. **Timers** — `requestAnimationFrame` loop for elapsed/backoff/startAt countdowns
13. **Filtering** — text search, per-section status chips, org/app/party/guid chip bars
14. **Tabs** — live/history tab switching
15. **History** — on-demand DB fetch with status/search params
16. **Step detail modal** — click step circle to fetch full step JSON
17. **JSON utilities** — expand embedded JSON strings + syntax highlighting
18. **Generic helpers** — `cssId()`, `esc()`, `escHtml()`

## Engine Endpoints Used

| Endpoint | Method | Used by |
|----------|--------|---------|
| `/dashboard/stream` | SSE | Main loop — engine status, capacity, inbox workflows, scheduled count |
| `/dashboard/stream/recent` | SSE | Recent workflows (deduped by fingerprint on backend) |
| `/dashboard/history?status=&search=&limit=` | GET | History tab (on-demand) |
| `/dashboard/scheduled` | GET | Scheduled section (on-demand) |
| `/dashboard/step?wf=&step=` | GET | Step detail modal |

## UI Sections

All sections in the Live tab are collapsible (collapse state persisted in `localStorage`):

- **Scheduled** (collapsed by default) — workflows with future `startAt`, live countdown
- **Inbox** — current engine inbox, real-time via SSE
- **Recent** — workflows that just left the inbox, via SSE

History tab loads from DB on-demand.

## Filtering

- **Per-section status chips**: inline with section titles, only visible when expanded
  - Inbox: All / Processing / Retrying
  - Recent: All / Completed / Failed
  - History: All / Completed / Failed / Retrying
- **Global filters** (filter bar): Org / App / Party / Instance chip bars, text search
- Segment clicks on workflow cards (org/app/party/guid) toggle the corresponding filter

## Patterns

- Cards use `data-*` attributes for filter matching (avoids re-parsing)
- Workflow fingerprinting (`status|step1status:retries:backoff,...`) to skip unchanged DOM updates
- `rebuildChipBar()` for dimension chips from visible cards; `rebuildSelectedOnlyChips()` for selection-only chips (party, guid)
- Inline `onclick` handlers exposed via `window.*` for cards generated as HTML strings
