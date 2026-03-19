# Dashboard Functional Specification

Detailed behavioral spec for the workflow engine dashboard. For module structure and architecture patterns, see `src/WorkflowEngine.Core/wwwroot/AGENTS.md`.

---

## Sections Overview

The dashboard has two tabs: **Live** and **Query**.

### Live Tab (default)

Three collapsible sections, top to bottom:

1. **Scheduled** — Workflows with a future `startAt`. Collapsed by default, fetched lazily on expand via `GET /dashboard/scheduled`. Badge in section header shows count from SSE. Cards are categorized by time-to-start: ≤10s, ≤1m, ≤5m, later.

2. **Inbox** — Active workflows currently processing. Driven by SSE (`/dashboard/stream/live`). Cards appear with enter animation, update in-place when fingerprint changes, and exit with animation when completed/failed (unless moving to Recent, which skips animation). Elapsed timers tick via `requestAnimationFrame`.

3. **Recent** — Last 100 finished workflows. Also driven by SSE. New arrivals glow briefly. Cards are static (no timers). Backend controls ordering and the 100-item window.

### Query Tab

On-demand paginated search against the database. Not SSE-driven — user clicks "Load" or sets an auto-refresh interval.

**Controls:**
- Status checkboxes: Enqueued, Processing, Requeued, Completed, Failed, Canceled
- Time range dropdown: 5m, 15m, 1h, 6h, 24h, 7d, custom (datetime pickers)
- "Has retries" checkbox
- Text search (triggers on Enter)
- Auto-refresh interval: Off, 5s, 10s, 30s, 1m, 5m
- Pagination: 100 per page, cursor-based (uses `updatedAt` as cursor)

**Smart GUID fallback:** If searching for a GUID with status filters returns empty, automatically retries without filters and updates the status checkboxes to match the found workflow's actual status.

### Header

Always visible. Shows:
- Engine status icon + label (Running, Idle, Unhealthy, Disabled, Queue Full, Stopped)
- Capacity meters: Workers (used/total), DB connections (used/total), HTTP connections (used/total)
- Color thresholds: green (<50%), yellow (50-80%), red (>80%)

---

## SSE Streams

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
    "db":      { "used": 12, "available": 83, "total": 95 },
    "http":    { "used": 3, "available": 297, "total": 300 }
  },
  "scheduledCount": 7
}
```

### `/dashboard/stream/live` — Active & Recent Workflows

Pushes workflow arrays. Uses PG NOTIFY to wake up on changes (2s timeout fallback). Each field is omitted if its fingerprint hasn't changed — frontend receives `null` for unchanged sections.

```json
{
  "active": [ /* Workflow[] or null */ ],
  "recent": [ /* Workflow[] or null */ ]
}
```

---

## REST Endpoints

### `GET /dashboard/query`

Paginated workflow search.

| Parameter       | Type     | Description                                           |
| --------------- | -------- | ----------------------------------------------------- |
| `status`        | string   | Comma-separated: enqueued,processing,completed, etc.  |
| `search`        | string   | Text search (ID, idempotency key, namespace, labels)  |
| `limit`         | int      | Page size, max 200, default 100                       |
| `before`        | datetime | Pagination cursor (workflow updatedAt)                |
| `since`         | datetime | Start of time range                                   |
| `retried`       | bool     | Only workflows with step retries                      |
| `labels`        | string   | Comma-separated key:value pairs                       |
| `correlationId` | string   | Correlation ID filter                                 |

Response: `{ totalCount: int, workflows: Workflow[] }`

### `GET /dashboard/step`

Step detail for the modal.

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| `wf`      | guid   | Workflow database ID   |
| `step`    | string | Step idempotency key   |

Response:
```json
{
  "idempotencyKey": "string",
  "operationId": "string",
  "status": "Completed",
  "processingOrder": 3,
  "retryCount": 0,
  "lastError": "string | null",
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
  "steps": [
    { "operationId": "string", "processingOrder": 1, "stateOut": {} }
  ],
  "updatedAt": "ISO"
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

Body: `{ "workflowId": "<guid>", "stepIdempotencyKey": "<string>" }`

---

## Workflow Card Anatomy

Each workflow renders as a card with a header row and a pipeline of step nodes.

### Header Row

Left to right:
1. **Label segments** — Clickable spans for namespace, correlationId, and labels. Clicking toggles a label filter. CSS class `seg key` for namespace/correlationId (bold cyan), `seg` for label values.
2. **Workflow name** — `operationId` text. If the operationId contains a BPMN transition (e.g. `"Process next: Form → Verify"`), shows `from → to`.
3. **Spacer**
4. **Retry badge** — Total retry count across all steps (if > 0). Shows `↻N`.
5. **Status pill** — Workflow-level status with color-coded CSS class.
6. **Timestamps** — Created → Updated, with elapsed duration. Timers tick for active workflows.
7. **Action buttons** — Copy idempotency key, open state modal, Grafana trace link.

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

**BPMN grouping:** Steps are grouped by task phase using `stepPhase()` which maps command detail names to `start`/`end`/`process-end` phases. Groups show bracket lines and task labels from `parseTransition()`. The transition is parsed from `operationId` (format: `"Process next: TaskA → TaskB"`).

### Compact Mode

Each section can toggle between full cards and compact cards. Compact cards show a single row with:
- Label segments (same as full)
- Workflow name
- Inline dot pipeline (colored dots instead of full step circles)
- Status pill + timestamps

Compact preference is stored in localStorage per section.

### Card Data Attributes

Cards carry `data-*` attributes for client-side filtering without re-parsing:

```
data-wfkey="{databaseId}"
data-filter="{searchable text: namespace, operationId, idempotencyKey, labels, step commands}"
data-status="{space-separated status tags}"
data-namespace="{namespace lowercase}"
data-correlationid="{correlationId lowercase}"
data-labels="{key:value,key:value lowercase}"
```

---

## Step Detail Modal

Opened by clicking a step circle. Fetches `/dashboard/step?wf=<id>&step=<key>`.

### Tabs

1. **Details** (default) — Status pill with inline action buttons, timing rows, error info, Grafana link
2. **State** (if step has stateIn or stateOut) — Sub-tabs: Diff, In, Out. Diff shows syntax-highlighted unified diff.
3. **Data** (if command has data) — Pretty-printed JSON of the command payload

### Action Buttons (inline with status)

- **Retry** — Shown for Failed steps. Calls `POST /dashboard/retry`. Reloads query after success.
- **Retry now** (skip backoff) — Shown for Requeued steps with future backoffUntil (>5s remaining). Calls `POST /dashboard/skip-backoff`. Reloads query after success.

### SSE-Driven Refresh

While the modal is open, if the workflow's fingerprint changes (from live SSE updates), the modal auto-refreshes after a 300ms debounce. This means the modal stays current for actively processing workflows.

### Grafana Link

Opens Grafana Tempo trace view using the workflow's `traceId`. Link text: "Open Grafana". Opens in new tab.

### Error History

Collapsible section showing all recorded errors for the step. Each entry shows:
- Timestamp + relative age
- HTTP status code badge (if applicable)
- Retryable/fatal indicator
- Error message text

---

## State Evolution Modal

Opened by clicking the `{ }` button on a card. Fetches `/dashboard/state?wf=<id>`.

Shows the initial workflow state followed by each step's state output in processing order. Each state is syntax-highlighted JSON. Auto-refreshes via SSE with 1s debounce.

---

## Filtering System

### Label Filters

`Map<string, Set<string>>` — multiple keys, each with one or more selected values.

**Sources:**
- Clicking a label segment on any card calls `toggleLabelFilter(key, value)`
- Selecting from label dropdown (if populated)

**Behavior:**
- Toggling the only selected value for a key clears that key entirely
- Filter chips appear in the filter bar below the header
- Clicking a chip removes that filter
- Active label filters apply to ALL sections (live, recent, query)
- For query tab: label filters are sent to backend as `labels=key:value,key:value` parameter
- Special keys: `namespace` matches `data-namespace`, `correlationId` matches `data-correlationid`, others match against `data-labels`

### Status Filters

Per-section chip bars. Each section has an "All" chip plus status-specific chips. Only one status active per section at a time.

Chips show dynamic counts: `"Failed (3)"` updates as cards are added/removed.

### Text Filter

- **Live filter** (Inbox only): Filters in real-time as you type. Matches against `data-filter` attribute.
- **Query search**: Triggers on Enter. Sent to backend as `search` parameter.

### Filter Interaction with Query Tab

When a label filter, status filter, or search changes while the query tab is loaded, it automatically re-fetches from the backend.

---

## URL State Sync

All dashboard state is encoded in the URL query string via `syncUrl()` / `restoreUrl()`. Shareable URLs capture the full dashboard state.

| Param  | Description                                          |
| ------ | ---------------------------------------------------- |
| `tab`  | Active tab: `live` or `query`                        |
| `q`    | Query search term                                    |
| `ss`   | Scheduled section status filter                      |
| `ls`   | Live section status filter                           |
| `rs`   | Recent section status filter                         |
| `qs`   | Query section status filter                          |
| `qt`   | Query time range in minutes (0 = all time)           |
| `qtf`  | Custom time range "from" (ISO)                       |
| `qtt`  | Custom time range "to" (ISO)                         |
| `qr`   | "Has retries" checkbox (1/0)                         |
| `lf`   | Label filters (base64-encoded key:value pairs)       |
| `c`    | Collapsed sections (comma-separated: sched,inbox,recent) |
| `e`    | Expanded sections (inverse of collapsed)             |
| `cpt`  | Compact sections (comma-separated)                   |
| `exp`  | Expanded card IDs in compact mode (base64)           |
| `theme`| Theme: `dark` or `altinn`                            |

---

## Workflow Domain Model (Frontend)

TypeDefs in `state.js`:

```typescript
type StepStatus = 'Enqueued' | 'Processing' | 'Completed' | 'Failed' | 'Requeued' | 'Canceled'
type CommandType = 'app' | 'webhook' | 'Noop' | 'Throw' | 'Timeout' | 'Delegate'

interface Step {
  idempotencyKey: string
  operationId:    string
  commandType:    CommandType
  commandDetail:  string
  status:         StepStatus
  processingOrder: number
  retryCount:     number
  backoffUntil:   string | null
  createdAt:      string
  executionStartedAt: string | null
  updatedAt:      string | null
  stateChanged:   boolean
}

interface Workflow {
  databaseId:     string
  idempotencyKey: string
  operationId:    string
  status:         string
  traceId:        string | null
  namespace:      string
  correlationId:  string | null
  labels:         Record<string, string> | null
  backoffUntil:   string | null
  createdAt:      string
  updatedAt:      string | null
  executionStartedAt: string | null
  removedAt:      string | null
  startAt:        string | null
  hasState:       boolean
  steps:          Step[]
}
```

---

## Key Frontend Patterns

### Fingerprinting

Workflows are fingerprinted (status + step statuses + retry counts hashed to a string). Cards only re-render when their fingerprint changes. Stored in `state.workflowFingerprints[databaseId]`.

### Animations

- **Enter**: New inbox cards slide in from top
- **Exit**: Removed cards fade out (unless moving to Recent — instant removal)
- **Exit-fail**: Failed workflows use a red-tinted exit animation
- **Recent-enter**: New recent cards slide in with a brief glow highlight

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
