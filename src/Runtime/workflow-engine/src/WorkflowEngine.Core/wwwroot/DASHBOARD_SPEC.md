# Dashboard Functional Specification

Detailed behavioral spec for the workflow engine dashboard. For module structure and architecture patterns, see `src/WorkflowEngine.Core/wwwroot/AGENTS.md`.

---

## Sections Overview

The dashboard has two tabs: **Live** and **Query**.

### Live Tab (default)

Three collapsible sections, top to bottom:

1. **Scheduled** — Workflows with a future `startAt`. Collapsed by default, fetched lazily on expand via `GET /dashboard/scheduled`. Badge in section header shows count from SSE. Cards are categorized by time-to-start: ≤10s, ≤1m, ≤5m, later.

2. **Inbox** — Active workflows currently processing. Driven by SSE (`/dashboard/stream/live`). Cards appear with enter animation, update in-place when fingerprint changes, and exit with animation when completed/failed (unless moving to Recent, which skips animation). Elapsed timers tick via `requestAnimationFrame`.

3. **Recent** — Last 100 finished workflows. Also driven by SSE. Backend controls ordering and the 100-item window. Three view modes (segmented control in the section header, persisted in localStorage as `recentView`, synced to the URL as `rv`): **Chains** (default) groups the window by `collectionKey` and renders each collection as a dependency-ordered spine (see [Chains View](#chains-view)); **Compact** and **Full** are the flat reverse-chronological card modes (new arrivals glow briefly; cards are static, no timers).

### Query Tab

On-demand paginated search against the database. Not SSE-driven — user clicks "Load" or sets an auto-refresh interval.

**Controls:**

- Status checkboxes: Enqueued, Processing, Requeued, Completed, Failed, Canceled
- Time range dropdown: All time (default), 5m, 15m, 30m, 1h, 6h, 24h, 7d, custom (datetime pickers)
- "Has retries" checkbox
- Text search (triggers on Enter)
- Auto-refresh interval: Off, 5s, 10s, 30s, 1m, 5m
- Pagination: 100 per page, cursor-based (uses `updatedAt` as cursor). Page boundary cursors are stored in an array (`queryPageCursors[pageIndex]`) so prev/next can navigate without re-querying all pages.

**Smart GUID fallback:** If searching for a GUID with status filters returns empty, automatically retries without filters and updates the status checkboxes to match the found workflow's actual status.

### Header

Always visible. Shows:

- Engine status icon + label (Running, Idle, Unhealthy, Disabled, Queue Full, Stopped)
- Capacity meters: Workers (used/total), DB connections (used/total), HTTP connections (used/total)
- Color thresholds: green (<50%), yellow (50-80%), red (>80%)

---

## SSE Streams

### Reconnection

Both SSE streams use the same reconnection strategy: on error/close, the `EventSource` is destroyed and a new one is created after a fixed 2-second delay. There is no max retry limit — reconnection attempts continue indefinitely. Visual indicators: SSE dot toggles between `connected`/`disconnected` classes, and the engine status icon changes to `stopped` while disconnected.

### `/dashboard/stream` — Engine Metrics

Pushes engine status and capacity at ~50ms throttle. Only sends when fingerprint changes.

```json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "engineStatus": {
        "running": true,
        "healthy": true,
        "idle": false,
        "disabled": false,
        "queueFull": false
    },
    "capacity": {
        "workers": { "used": 5, "available": 45, "total": 50 },
        "db": { "used": 12, "available": 83, "total": 95 },
        "http": { "used": 3, "available": 297, "total": 300 }
    },
    "scheduledCount": 7
}
```

### `/dashboard/stream/live` — Active & Recent Workflows

Pushes workflow arrays. Uses PG NOTIFY to wake up on changes (2s timeout fallback). Each field is omitted if its fingerprint hasn't changed — frontend receives `null` for unchanged sections.

```json
{
    "active": [
        /* Workflow[] or null */
    ],
    "recent": [
        /* Workflow[] or null */
    ]
}
```

---

## REST Endpoints

### `GET /dashboard/query`

Paginated workflow search.

| Parameter       | Type     | Description                                          |
| --------------- | -------- | ---------------------------------------------------- |
| `status`        | string   | Comma-separated: enqueued,processing,completed, etc. |
| `search`        | string   | Text search (ID, idempotency key, namespace, labels) |
| `limit`         | int      | Page size, max 200, default 100                      |
| `before`        | datetime | Pagination cursor (workflow updatedAt)               |
| `since`         | datetime | Start of time range                                  |
| `retried`       | bool     | Only workflows with step retries                     |
| `labels`        | string   | Comma-separated key:value pairs                      |
| `collectionKey` | string   | Collection key filter                                |

Response: `{ totalCount: int, workflows: Workflow[] }`

**Default statuses** (when `status` param is omitted): `Completed`, `Failed`, `Requeued`.

### `GET /dashboard/step`

Step detail for the modal.

| Parameter | Type   | Description          |
| --------- | ------ | -------------------- |
| `wf`      | guid   | Workflow database ID |
| `step`    | string | Step idempotency key |

Response:

```json
{
    "idempotencyKey": "string",
    "operationId": "string",
    "status": "Completed",
    "processingOrder": 3,
    "retryCount": 0,
    "errorHistory": [
        { "timestamp": "ISO", "message": "string", "httpStatusCode": 500, "wasRetryable": true }
    ],
    "createdAt": "ISO",
    "executionStartedAt": "ISO | null",
    "updatedAt": "ISO | null",
    "backoffUntil": "ISO | null",
    "command": { "type": "webhook", "operationId": "string", "data": {} },
    "retryStrategy": {
        "backoffType": "exponential",
        "baseInterval": "00:00:01",
        "maxRetries": 100,
        "maxDelay": "00:05:00",
        "maxDuration": "1.00:00:00"
    },
    "traceId": "string",
    "stateIn": "any",
    "stateOut": "any"
}
```

### `GET /dashboard/state`

Full state trail for the state evolution modal.

| Parameter | Type | Description          |
| --------- | ---- | -------------------- |
| `wf`      | guid | Workflow database ID |

Response:

```json
{
    "initialState": {},
    "steps": [{ "operationId": "string", "processingOrder": 1, "stateOut": {} }],
    "updatedAt": "ISO"
}
```

### `GET /dashboard/relations`

On-demand relations for cards whose source query does not eager-load them (the recent section and
the query tab; active/scheduled cards get relations inline).

| Parameter | Type   | Description          |
| --------- | ------ | -------------------- |
| `wf`      | guid   | Workflow database ID |
| `ns`      | string | Workflow namespace   |

Response:

```json
{
    "isHead": false,
    "dependsOn": [{ "databaseId": "guid", "operationId": "string", "status": "Completed" }],
    "dependents": [],
    "links": []
}
```

### `GET /dashboard/graph`

Connected dependency graph for the chain modal: every workflow reachable from the given one through
dependency/link relations in either direction (recursive CTE, namespace-scoped). Nodes are full card
DTOs (same shape as the SSE workflow payload, relations included); edges are typed so the frontend
can lay out the spine without re-deriving relations. 404 when the workflow does not exist in the
namespace.

| Parameter | Type   | Description               |
| --------- | ------ | ------------------------- |
| `wf`      | guid   | Root workflow database ID |
| `ns`      | string | Workflow namespace        |

Response:

```json
{
    "root": "guid",
    "workflows": ["Workflow, same shape as the SSE payload"],
    "edges": [{ "from": "guid", "to": "guid", "kind": "dependency | link" }]
}
```

### `GET /dashboard/scheduled`

All workflows with future `startAt`. Response: `Workflow[]`

### `GET /dashboard/labels?key=<string>`

Distinct values for a label key. Response: `string[]`

### `POST /dashboard/retry`

Reset a failed workflow back to Enqueued.

Body: `{ "workflowId": "<guid>" }`

### `POST /dashboard/skip-backoff`

Clear backoff wait on a requeued workflow, making it immediately eligible for processing.

Body: `{ "workflowId": "<guid>" }`

---

## Workflow Card Anatomy

Each workflow renders as a card with a header row and a pipeline of step nodes.

### Header Row

Left to right:

1. **Label segments** — Clickable spans for namespace, collectionKey, and labels. Clicking toggles a label filter. CSS class `seg key` for namespace/collectionKey (bold cyan), `seg` for label values.
2. **Workflow name** — `operationId` text. If the operationId contains a BPMN transition (e.g. `"Process next: Form → Verify"`), shows `from → to`. Note this parsing collapses distinct operationId prefixes into the same transition text (a head and its side-effects sibling display the same name) — the side-chain badge and card chrome carry the distinction; the full operationId is in the name's tooltip.
3. **Spacer**
4. **Retry badge** — Total retry count across all steps (if > 0). Shows `↻N`.
5. **Side-chain badge** — Shown when the workflow was enqueued with `IsHead = false` (deliberately invisible to collection head tracking, e.g. the process-next side-effects workflows). Dashed violet "side chain" pill. The card itself also carries the side-chain identity: dashed violet border plus a violet inset left edge (`.workflow-card.side-chain`, toggled in `setCardFilterData` — and inline for scheduled cards — so it survives re-renders in every section).
6. **Status pill** — Workflow-level status with color-coded CSS class. Note the vocabulary split for workflow statuses vs step names: a workflow in status `Abandoned` had its failure written off by a caller, while `AbandonTask`/`OnTaskAbandonHook` are step operation IDs from the app's task-abandon (reject) command family — one domain act, two artifacts.
7. **Timestamps** — Created → Updated, with elapsed duration. Timers tick for active workflows.
8. **Copy idempotency key button**
9. **Relation chips** — One chip per non-empty relation group: `↑` dependsOn, `↓` dependents, chain icon for links. Each chip shows a status-colored dot per related workflow (capped at 5, then `+N`); the tooltip lists `operationId (status)` pairs. Click behavior: exactly one relation whose card is on screen → smooth-scroll to it and flash it (`rel-flash`); otherwise → toggle the collection filter (connected workflows share a collection). Relation arrays are tri-state: active/scheduled cards carry them inline from their source queries; recent/query cards don't — a ghost `rel?` chip (full cards only) or expanding a compact card fetches them via `/dashboard/relations` and re-renders. Relation dot colors on active cards refresh via the live fingerprint (which includes relation statuses).
10. **Action buttons** — Collection filter funnel, chain modal (tree icon, all cards), open state modal, Grafana trace link.

### Pipeline

Horizontal row of step circles connected by SVG lines.

**Step circle icons by status:**

- Completed: ✓ (green)
- Processing: ◯ animated (blue pulse)
- Failed: ✗ (red)
- Requeued: ↻ (orange)
- Canceled: — (gray)
- Enqueued: ◯ outline (gray)

**Below each circle:**

- Command detail label (e.g. "StartTask", "WebhookCall")
- Sub-label (if applicable)
- Command type badge (`app`, `webhook`, etc.)
- Retry count (if > 0)
- Backoff countdown (if requeued with future backoffUntil)
- Execution duration (if completed/failed)

**Connector lines:**

- Solid colored: step completed
- Animated: processing in progress
- Gray/empty: not yet reached

**Vertical density:** Live pipelines reserve meta-row height (`.step-meta` min-height) so cards
don't jump as retry/backoff/timing rows appear mid-processing; static pipelines
(`.pipeline-static` — recent/query/scheduled and expanded chain rows) render final content and
drop the reservation. The phase-bracket headroom (`.pipeline-grouped`) applies only when at least
one step maps to a phase.

**Scroll-to-active:** When a card renders or updates, the pipeline scrolls horizontally to center the currently Processing or Requeued step. Only triggers when the active step index actually changes (tracked per workflow via `_processingIdx`), preventing redundant scrolls on fingerprint-only updates. Fallback: scrolls to the end if no active step found.

**BPMN grouping:** Steps are grouped by task phase using `stepPhase()` which maps command detail names to `start`/`end`/`process-end` phases. Groups show bracket lines and task labels from `parseTransition()`. The transition is parsed from `operationId` (format: `"Process next: TaskA → TaskB"`).

### Compact Mode

Each section can toggle between full cards and compact cards. Compact cards show a single row with:

- Label segments (same as full)
- Workflow name
- Inline dot pipeline (colored dots instead of full step circles)
- Status pill + timestamps

Compact preference is stored in localStorage per section. Each compact dot is clickable (opens step modal).

**Individual card expansion:** Clicking a compact card (outside interactive elements) toggles it to full view within the compact section. This is tracked per-card, not per-section. The `pendingExpand` set (`state.pendingExpand`) can force specific cards to render expanded — used by URL restore (`exp` param) and when navigating to a card from a modal.

### Card Data Attributes

Cards carry `data-*` attributes for client-side filtering without re-parsing:

```
data-wfkey="{databaseId}"
data-filter="{searchable text: namespace, operationId, idempotencyKey, labels, step commands, related workflow ids/names}"
data-status="{space-separated status tags}"
data-namespace="{namespace lowercase}"
data-collectionKey="{collectionKey lowercase}"
data-labels="{key:value,key:value lowercase}"
```

---

## Step Detail Modal

Opened by clicking a step circle. Fetches `/dashboard/step?wf=<id>&step=<key>`.

### DOM Structure

The modal has four distinct DOM zones:

1. **Title bar** (`dom.modalTitle`) — Step name (e.g. "StartTask"). For `ExecuteServiceTask` steps, enriched with the `serviceTaskType` from command data (e.g. "ExecuteServiceTask: SigningServiceTask").
2. **Tab bar** (`dom.modalTabs`) — Sticky top-level tab buttons. Hidden when only Details tab exists.
3. **Sub-tab bar** (`dom.modalSubtabs`) — Sticky state sub-tab buttons. Only visible when the State tab is active AND both stateIn and stateOut exist.
4. **Body** (`dom.modalBody`) — Scrollable panel area containing the active tab's content.

### Open Flow

1. Set modal title, clear tabs/body, show "Loading..." placeholder
2. Fetch `/dashboard/step?wf=<id>&step=<key>`
3. **Stale guard**: Before and after fetch, check that `_openWfId` and `_openStepKey` still match — discard the response if the modal was closed or switched to a different step during the request
4. Render tabs and panels via `renderStepDetail(data)`
5. If an `initialTab` was requested (e.g. "state"), click that tab programmatically
6. On fetch error, show error message in body

### Tabs

1. **Details** (default) — Rows top to bottom:
    - **Status row**: Status pill + backoff countdown (if Requeued) or elapsed time (if Processing) + retry count badge (if > 0) + action button (Retry for Failed, Retry now for Requeued with >5s backoff remaining). All elements flex-aligned in a single row.
    - Idempotency Key
    - Created (formatted time + relative age)
    - Execution Started (if set)
    - Last Updated (if set)
    - Backoff Until (if set)
    - Retry strategy block: Backoff Type, Base Interval (formatted duration), Max Retries, Max Delay (formatted duration), Max Duration (formatted duration)
    - Command Type
    - Max Execution Time (formatted duration, if set)
    - Webhook-specific: URI, Content-Type (extracted from `command.data`, supports both camelCase and PascalCase keys)
    - Error History (collapsible section, see below)
    - Grafana trace link (if traceId exists)

2. **State** (conditional) — Only shown if step has stateIn or stateOut.
    - **Both stateIn and stateOut exist**: Shows sub-tabs (Diff, State In, State Out). Diff tab is default.
        - **Diff view**: Side-by-side two-column layout with "State In" / "State Out" column headers, line numbers, per-line syntax highlighting. Uses LCS-based `lineDiff()` algorithm. Paired removes/adds are aligned on the same row. Shows "No changes" message if stateIn === stateOut.
        - **State In / State Out views**: Full syntax-highlighted JSON with copy button.
    - **Only one exists**: Shows a single syntax-highlighted JSON view (no sub-tabs, no diff).
    - All JSON values are pre-processed with `expandJsonStrings()` which recursively parses nested JSON-encoded strings before display.

3. **Data** (conditional) — Only shown if `command.data` is non-null. Pretty-printed syntax-highlighted JSON of the command payload with copy button.

### Action Buttons

- **Retry** — Shown for Failed steps in the status row. Calls `POST /dashboard/retry`.
- **Retry now** (skip backoff) — Shown for Requeued steps with future backoffUntil (>5s remaining). Calls `POST /dashboard/skip-backoff`.

**UI feedback pattern**: Button shows "..." while loading. On success, text changes to "Retried"/"Skipped" with success CSS class (stays disabled). On failure, text changes to "Failed" with error CSS class, then resets to original state after 3 seconds. Same pattern for network errors ("Error" text). No explicit query reload — relies on SSE to update.

### SSE-Driven Refresh

While the modal is open, if the workflow's fingerprint changes (from live SSE updates), the modal auto-refreshes via `notifyStepChanged()` after a 300ms debounce. **Tab preservation**: the currently active tab and state sub-tab are remembered and restored after re-render. **Error history expand state** (`_errorExpanded`) persists across re-renders within the same modal session (starts expanded).

### Grafana Link

Opens Grafana Tempo trace view using the workflow's `traceId`. The URL targets `localhost:7070/explore` with a Tempo datasource query. Link text: "Open Grafana". Opens in new tab.

### Error History

Collapsible section (expanded by default) within the Details tab. Entries are shown in **reverse chronological order** (newest first). Each entry shows:

- Badge with retryable/non-retryable label + HTTP status code (if applicable)
- Timestamp (formatted + relative age)
- Error message text

Expand/collapse state is tracked in `_errorExpanded` and persisted across SSE-driven re-renders.

### Keyboard

Escape key closes the modal (document-level `keydown` listener).

---

## State Evolution Modal

Opened by clicking the `{ }` button on a card. Fetches `/dashboard/state?wf=<id>`.

Title: "State Trail". Shows "Loading..." placeholder while fetching. Has the same stale-guard pattern as the step modal (checks `_openWfId` before/after fetch).

**Content:** Renders a vertical list of state blocks:

1. **Initial State** — Always shown (displays "No state" if null)
2. **Step N: {operationId}** — One block per step that has non-null `stateOut`, in processing order

Each block shows syntax-highlighted JSON (pre-processed with `expandJsonStrings()`) with a copy button. If no initial state and no steps have stateOut, shows "No state data available".

**Auto-refresh:** SSE-driven via `notifyWorkflowChanged()` with 1s debounce (longer than the step modal's 300ms to reduce noise). **Keyboard:** Escape closes the modal. The `copyPre()` handler (shared with the step modal) copies the pre block text and briefly shows a "copied" indicator (1.2s).

---

## Chain Rows (shared renderer)

`modules/shared/chain.js` renders a set of workflows as a dependency-ordered vertical spine — the
"story of the collection" — rather than a general graph layout (process-next graphs are a
near-linear spine of heads with side-chain leaves). It is shared by the chain modal and the Recent
section's Chains view.

**Spine layout — two builders:**

1. `buildSpineFromEdges(nodes, edges)` — heads (`isHead !== false`) topologically sorted over
   `dependency` edges (Kahn), `createdAt` as tiebreak; a cycle guard appends anything the sort
   missed in creation order. Each `isHead === false` node attaches under the head it shares an
   edge with, **preferring `link` edges** (side-effects workflows carry a link to their producer
   Main) and falling back to any edge; unattached side nodes render at the bottom.
2. `buildSpineByCreation(nodes)` — no edges needed: plain `createdAt` order with `isHead === false`
   nodes marked as side rows. Correct for process-next collections because side chains are always
   enqueued while their producer Main executes — after the Main's `createdAt` and before the next
   head can exist (heads gate the following transition).

**Row anatomy:** parsed transition name (falls back to raw operationId; full operationId in the
tooltip), side-chain badge where applicable, one status-colored dot per step (clickable — opens the
step modal), duration, status pill. Terminal rows show their real duration; active rows tick via
the shared `[data-timer]` loop when the live section registered a timer. Side rows indent under
their head with the violet side-chain card chrome and an elbow connector to the spine line. The
root workflow (where a root id is given) gets a cyan spine marker and a brightened name.

**Row expansion:** clicking a row (outside interactive elements) swaps it in place for the full
pipeline card (`chainRowToggle`), fetching relations on first expand like compact-card expansion
does; clicking the expanded card collapses it back. The expanded set survives re-renders.

## Chain Modal

Opened by clicking the tree button on a card. Fetches `/dashboard/graph?wf=<id>&ns=<namespace>` and
renders it with the shared chain renderer (`buildSpineFromEdges`).

Title: "Chain — {collectionKey}" when the opening card has a collection key, else "Workflow Chain".
Same stale-guard pattern as the other modals (checks `_openWfId` before/after fetch).

**Auto-refresh:** SSE-driven via `notifyChainChanged()` with 1s debounce. Triggers when a rendered
workflow's fingerprint changes **or when a new live workflow joins the open root's collection** — a
fresh transition's Main + side chains are new ids, so nothing already rendered changes when they
land. **Keyboard:** Escape closes the modal.

## Chains View

The Recent section's default mode: the recent window grouped by `collectionKey`, each collection
rendered as a bordered group — newest collection first (by the window's own ordering), story inside
oldest-first. Workflows without a collection render as plain compact cards in their recency
position.

**Group anatomy:** a header row (label segments from the newest head member, workflow count,
wall-clock span `first enqueue → last update`, aggregate status pill, collection filter funnel,
history control) above the shared chain rows. Aggregate status: an in-flight member wins
(Processing/Requeued/Enqueued), then the worst terminal outcome, then Completed.

**Spine source:** groups use `buildSpineByCreation` over the members in the recent window — no
fetches needed (`isHead` is already on the card DTOs). The **history** control fetches
`/dashboard/graph` for the collection's full connected graph (beyond the 100-item window) and
re-renders the group with the exact edge-based spine; the graph is cached per collection, and when
new members appear that the cache doesn't know, it refetches in the background.

**Live members:** in-flight workflows (from the active section's SSE state) that belong to a
rendered collection are merged into their group, so the story includes the running transition —
its row ticks via the shared timer loop. `notifyRecentChainsChanged()` re-renders the view
(300 ms debounce) when a live workflow that belongs to a rendered group appears, changes, or
finishes.

**Filtering:** groups filter as one unit — `data-filter`/`data-status`/`data-labels` are unions
over the members, so a group matches when any member matches (status chips count groups, not
workflows). The expanded cards inside a group are not matched individually (`:scope >` selectors
in `applyFilter`).

---

## Filtering System

### Label Filters

`Map<string, Set<string>>` — multiple keys, each with one or more selected values.

**Label discovery:** On SSE connect, the frontend fetches distinct values for hardcoded common label keys: `org`, `app`, `partyId`, `env` (via `GET /dashboard/labels?key=<key>`). Results are stored in `state.labelValues` for potential dropdown use.

**Sources:**

- Clicking a label segment on any card calls `toggleLabelFilter(key, value)`
- Selecting from label dropdown (if populated)

**Behavior:**

- Toggling the only selected value for a key clears that key entirely
- Filter chips appear in the filter bar below the header
- Clicking a chip removes that filter
- Active label filters apply to ALL sections (live, recent, query)
- For query tab: label filters are sent to backend as `labels=key:value,key:value` parameter
- Special keys: `namespace` matches `data-namespace`, `collectionKey` matches `data-collectionKey`, others match against `data-labels`

### Status Filters

Per-section chip bars. Only one status active per section at a time. Chips show dynamic counts: `"Failed (3)"` updates as cards are added/removed.

**Chip labels per section:**

- **Scheduled**: All, 10s, 1m, 5m, Later (time-to-start buckets)
- **Inbox**: All, Processing, Retrying
- **Recent**: All, Completed, Failed, Abandoned
- **Query**: (uses checkboxes, not chips) Enqueued, Processing, Requeued, Completed, Failed, Canceled

### Text Filter

- **Live filter** (Inbox only): Filters in real-time as you type. Matches against `data-filter` attribute.
- **Query search**: Triggers on Enter. Sent to backend as `search` parameter.

### Filter Interaction with Query Tab

When a label filter, status filter, or search changes while the query tab is loaded, it automatically re-fetches from the backend.

---

## URL State Sync

All dashboard state is encoded in the URL query string via `syncUrl()` / `restoreUrl()`. Shareable URLs capture the full dashboard state.

| Param   | Description                                              |
| ------- | -------------------------------------------------------- |
| `tab`   | Active tab: `live` or `query`                            |
| `q`     | Query search term                                        |
| `ss`    | Scheduled section status filter                          |
| `ls`    | Live section status filter                               |
| `rs`    | Recent section status filter                             |
| `qs`    | Query section status filter                              |
| `qt`    | Query time range in minutes (0 = all time)               |
| `qtf`   | Custom time range "from" (ISO)                           |
| `qtt`   | Custom time range "to" (ISO)                             |
| `qr`    | "Has retries" checkbox (1/0)                             |
| `lf`    | Label filters (comma-separated key:value pairs)          |
| `c`     | Collapsed sections (comma-separated: sched,inbox,recent) |
| `e`     | Expanded sections (inverse of collapsed)                 |
| `cpt`   | Compact sections (comma-separated)                       |
| `exp`   | Expanded card IDs in compact mode (base64)               |
| `theme` | Theme: `dark` or `altinn`                                |

---

## Workflow Domain Model (Frontend)

TypeDefs in `state.js`:

```typescript
type StepStatus = 'Enqueued' | 'Processing' | 'Completed' | 'Failed' | 'Requeued' | 'Canceled';
type CommandType = 'app' | 'webhook' | 'Noop' | 'Throw' | 'Timeout' | 'Delegate';

interface Step {
    idempotencyKey: string;
    operationId: string;
    commandType: CommandType;
    commandDetail: string;
    status: StepStatus;
    processingOrder: number;
    retryCount: number;
    backoffUntil: string | null;
    createdAt: string;
    executionStartedAt: string | null;
    updatedAt: string | null;
    stateChanged: boolean;
}

interface WorkflowRelation {
    databaseId: string;
    operationId: string;
    status: string;
}

interface Workflow {
    databaseId: string;
    idempotencyKey: string;
    operationId: string;
    status: string;
    traceId: string | null;
    namespace: string;
    collectionKey: string | null;
    labels: Record<string, string> | null;
    backoffUntil: string | null;
    createdAt: string;
    updatedAt: string | null;
    executionStartedAt: string | null;
    removedAt: string | null;
    startAt: string | null;
    hasState: boolean;
    // isHead === false marks workflows deliberately invisible to collection head tracking.
    isHead: boolean | undefined;
    // Tri-state: undefined = not loaded by the source query (fetch via /dashboard/relations),
    // [] = loaded and none exist.
    dependsOn: WorkflowRelation[] | undefined;
    dependents: WorkflowRelation[] | undefined;
    links: WorkflowRelation[] | undefined;
    steps: Step[];
}
```

---

## Key Frontend Patterns

### Fingerprinting

Workflows are fingerprinted to avoid unnecessary DOM updates. Cards only re-render when their fingerprint changes. Stored in `state.workflowFingerprints[databaseId]`.

Formula: `{workflow.status}|{step1.status}:{step1.retryCount}:{step1.backoffUntil},...|{dependsOn statuses}|{dependents statuses}|{links statuses}`
Example: `"Processing|Completed:0:,Processing:0:,Enqueued:1:2024-01-15T10:30:45Z|Completed||"`
The trailing relation-status segments keep relation chip dot colors fresh when only a related
workflow's status changed.

### Animations

- **Enter**: New inbox cards slide in from top
- **Exit**: Removed cards fade out with `complete-exit` animation (0.5s)
- **Exit-fail**: Failed workflows use a red-tinted exit animation
- **Recent-enter**: New recent cards slide in with a brief glow highlight (`recent-glow` / `recent-glow-fail`)
- **Recent transition skip**: When a workflow moves from Inbox to Recent (detected by matching idempotency keys in the SSE `recentKeys` set), the exit animation is skipped — the card is removed instantly from Inbox to avoid the jarring overlap of exit + enter animations.
- **Pulse sync**: When a card is re-rendered, the CSS processing pulse animation phase is synchronized to `performance.now() % 2000` to avoid flicker.

### Timers

Active workflow cards have elapsed timers that tick via `requestAnimationFrame`. Timer state stored in `state.workflowTimers[databaseId]`. Timers freeze (`frozenAt`) when a workflow leaves active state but the card hasn't been removed yet (during exit animation).

### Late-Bound Callbacks

Circular dependencies between modules (e.g. filters ↔ query) are broken by:

1. Each module exports a `bind*Callbacks()` function
2. `app.js` wires everything at startup before `init()`
3. Callbacks stored as module-level variables, called indirectly

### Settings

Stored in localStorage:

- `showTimestamps` — Show/hide timestamp columns (default: true)
- `timestampUtc` — UTC vs local time display (default: false)
- `theme` — `dark` or `altinn` (default: altinn)
- `compact:{section}` — Compact mode per section

---

## BPMN Task Phase Grouping

Steps on a card are grouped into BPMN task phases using two mechanisms:

### `parseTransition(workflow)`

Extracts the BPMN transition from `workflow.operationId`. Expected format: `"Process next: TaskA → TaskB"` (or `"Process next: TaskA -> TaskB"`). Returns `{ from: "TaskA", to: "TaskB" }` or `null` if no transition found. Empty from/to default to "Start Event"/"End Event".

### `stepPhase(commandDetail)`

Maps step command names to phases:

- **`end`**: EndTask, CommonTaskFinalization, EndTaskLegacyHook, OnTaskEndingHook, LockTaskData, AbandonTask, OnTaskAbandonHook, AbandonTaskLegacyHook
- **`start`**: UnlockTaskData, StartTask, StartTaskLegacyHook, OnTaskStartingHook, CommonTaskInitialization
- **`process-end`**: OnProcessEndingHook
- **`null`**: Everything else (service tasks, webhooks)

Phases drive the bracket lines and task name labels shown on the pipeline. The `pipeline.js` renderer groups consecutive steps with the same phase and renders labels at the center of each group.

---

## Backend Mapping (DashboardMapper)

The C# `DashboardMapper` transforms domain models into dashboard DTOs. Key mappings:

- **`commandDetail`** — Set to `step.OperationId` (not a separate field; the operation ID doubles as the display label for the step).
- **`stateChanged`** — For each step (in processing order), compares `step.StateOut` against the previous step's `StateOut` (or `workflow.InitialState` for the first step). `true` if `StateOut` is non-null and differs from the previous state.
- **`hasState`** — `true` if `workflow.InitialState` is non-null OR any step has a non-null `StateOut`.
- **`traceId`** — Extracted from `EngineTraceContext` or `EngineActivity` on the workflow.
