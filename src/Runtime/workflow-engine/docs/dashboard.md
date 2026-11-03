# Dashboard

The workflow engine serves a dashboard at its root. It shows workflows and their steps as they run, and lets an
operator retry or fail a step and override a namespace's failure throttling. This doc specifies how it behaves.

## How it is built

The dashboard is JavaScript modules in [`wwwroot`](../src/WorkflowEngine.Core/wwwroot), with no build step. VS Code
type-checks them from their JSDoc. `WorkflowEngine.Core` embeds the folder and serves all of it, so keep files that
are not part of the page, such as docs, out of it. In the Development and Docker environments the engine serves the
files from disk instead, and `/dashboard/hot-reload` reloads the page when a file changes. The compose stack mounts
the folder into the engine's container for this.

The modules are in three layers, and a module imports only from the layers before it: `core/`, then `shared/`, then
`features/`. Modules share state through the mutable objects that `core/state.js` exports. Where two modules call
each other, `app.js` wires them through [late-bound callbacks](#late-bound-callbacks).

### Escaping

Generated markup uses three escape helpers from `core/helpers.js`, and they are not interchangeable. `esc()` is for
element content only, since it leaves quotes intact. A value in an attribute needs `escAttr()`, and a value in a
single-quoted argument of an inline `onclick` needs `escJsArg()`. With `esc()` there, a quote in a value that a
caller supplied, such as a collection key or a label, closes the attribute, and the rest of the value becomes markup.
The engine stores such values and shows them to every operator.

These two searches, run in `wwwroot`, should find nothing. The first also matches an `esc()` later in an attribute
value, which is the same bug.

```sh
grep -rnE '[a-zA-Z-]+="[^"]*\$\{esc\(' modules/     # esc() anywhere inside an attribute
grep -rn "'\${esc(" modules/                        # esc() as an inline-handler argument
```

---

## Sections Overview

The dashboard has two tabs: **Live** and **Query**.

### Live Tab (default)

Three collapsible sections, top to bottom, with a **Throttled Namespaces** panel above them when a breaker exists:

0. **Throttled Namespaces**: the failure-storm circuit breakers, hidden while none exists, which is the common case.
   It polls the [throttle endpoints](#throttle-endpoints-shared-with-the-public-api) every 10 s rather than streaming,
   since breakers change on the sweep's cadence. Each row shows a state pill (Tripped red, Recovering orange, Clear
   green), the namespace, when it tripped (relative), the current window, the canary count and the last observed
   requeued and active counts. **Force trip** shows unless the breaker is Tripped, and **Force clear** unless it is
   Clear. Both need a **two-click confirm**: the first click arms the button as "Confirm?", which reverts after 3 s. A
   409 (throttling disabled) shows as the standard "Failed" button feedback.

1. **Scheduled**: workflows with a future `startAt`. Collapsed by default, and fetched from `GET /dashboard/scheduled`
   when expanded. The header badge shows the count from SSE. Cards are grouped by time to start: ≤10s, ≤1m, ≤5m and
   later.

2. **Inbox**: the workflows being processed, driven by SSE (`/dashboard/stream/live`). Cards animate in, update in
   place when their fingerprint changes, and animate out when they complete or fail, unless they move to Recent, which
   skips the animation. Elapsed timers tick on `requestAnimationFrame`.

3. **Recent**: the last 100 finished workflows, in the backend's order, also driven by SSE. A segmented control in
   the header switches the view (localStorage `recentView`, URL `rv`). **Chains**, the default, draws each collection
   as a dependency-ordered spine (see [Chains View](#chains-view)). **Compact** and **Full** list the cards newest
   first. New arrivals glow briefly, and the cards are static, with no timers.

### Query Tab

A paginated search of the database on demand. SSE does not drive it: the user clicks "Load" or sets an auto-refresh
interval. It has the same three views as Recent (**Chains | Compact | Full**, Compact by default, localStorage
`queryView`, URL `qv`). [Chains View](#chains-view) covers how chains differ here.

**Controls:**

- Status checkboxes: Enqueued, Processing, Requeued, Waiting, Held, Completed, Failed, Canceled, Dep. failed,
  Abandoned. The checked set is sent explicitly as the `status` param (all checked sends the full set); zero checked
  omits the param, which the backend defaults to Completed/Failed/Requeued.
- Time range: All time (default), 5m, 15m, 30m, 1h, 6h, 24h, 7d, or a custom range with datetime pickers
- "Has retries" checkbox
- Role checkboxes: "Primary" / "Auxiliary" (both checked by default = no filter; exactly one checked sends
  `role=Primary|Auxiliary`). Primary workflows are the ones the process waits on (`isHead` directive `true` or unset);
  auxiliary workflows run beside the process (`isHead=false`).
- Text search, which runs on Enter
- Auto-refresh interval: Off, 5s, 10s, 30s, 1m, 5m
- Pagination: 100 per page, with `updatedAt` as the cursor. `queryPageCursors[pageIndex]` keeps each page's boundary,
  so prev and next do not query every page again.

**Smart GUID fallback:** when a search for a GUID with status filters finds nothing, the dashboard searches again
without the filters, and sets the status checkboxes to the found workflow's status.

### Header

Always visible. It shows:

- The engine status icon and label (Running, Idle, Unhealthy, Disabled, Queue Full, Stopped)
- Capacity meters: Workers, DB connections and HTTP connections, each as used/total
- Meter colors: green below 50%, yellow from 50 to 80%, red above 80%

---

## SSE Streams

### Reconnection

Both SSE streams reconnect the same way. On an error or close, the dashboard destroys the `EventSource` and creates a
new one after a fixed 2 seconds, with no limit on attempts. While disconnected, the SSE dot has the `disconnected`
class instead of `connected`, and the engine status icon shows `stopped`.

### `/dashboard/stream` — Engine Metrics

Pushes the engine status and capacity, throttled to about 50 ms, and only when the fingerprint changes.

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

Pushes workflow arrays. PostgreSQL `NOTIFY` wakes it on changes, with a 2-second timeout as the fallback. A field
whose fingerprint has not changed is omitted, so the frontend receives `null` for an unchanged section.

```json
{
    "active": [/* Workflow[] or null */],
    "recent": [/* Workflow[] or null */]
}
```

---

## REST Endpoints

### `GET /dashboard/config`

The host's dashboard settings, which the page reads once at startup before it renders anything. Response:
`{ traceUrlTemplate? }`, a URL with `{traceId}` where the trace ID goes. The server resolves it from
`EngineSettings.Dashboard`: the host's `TraceUrlTemplate` when set, otherwise a Grafana Explore URL when both
`GrafanaUrl` and `GrafanaTracesDatasourceUid` are set, otherwise it is omitted. An empty or whitespace setting counts as
unset. The page draws [trace links](#trace-link) only while the template is present.

### `GET /dashboard/query`

Paginated workflow search.

| Parameter       | Type     | Description                                                                                |
| --------------- | -------- | ------------------------------------------------------------------------------------------ |
| `status`        | string   | Comma-separated: enqueued,processing,completed, etc.                                       |
| `search`        | string   | Text search (ID, idempotency key, namespace, labels)                                       |
| `limit`         | int      | Page size, max 200, default 100                                                            |
| `before`        | datetime | Pagination cursor (workflow updatedAt)                                                     |
| `since`         | datetime | Start of time range                                                                        |
| `retried`       | bool     | Only workflows with step retries                                                           |
| `labels`        | string   | Comma-separated key:value pairs                                                            |
| `collectionKey` | string   | Collection key filter                                                                      |
| `role`          | string   | `Primary` (directive true or unset) or `Auxiliary` (directive false); anything else is 400 |

Response: `{ totalCount: int, workflows: Workflow[] }`

The `status` parser recognizes every persistent status, including `DependencyFailed` and `Abandoned`.

**Default statuses**, when `status` is omitted: `Completed`, `Failed` and `Requeued`. The endpoint accepts `Waiting`
but leaves it out by default, since parked pollers would crowd out the terminal outcomes the Query view exists to show.

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
    "deferCount": 0,
    "firstDeferredAt": "ISO | null",
    "lastDeferredAt": "ISO | null",
    "lastDeferReason": "string | null",
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

The full state trail for the state evolution modal.

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

Relations on demand, for cards whose source query does not load them: the recent section and the query tab. Active
and scheduled cards get their relations inline. `isHead` is the workflow's directive. Like every null on the
dashboard endpoints, it is omitted when unset, and the card then keeps its own value.

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

The connected graph for the chain views: every workflow reachable from the given one through dependency or link
relations, in either direction, within the namespace (a recursive CTE). Nodes are full card DTOs with relations, and
typed edges let the frontend lay out the spine without deriving relations. 404 when the workflow does not exist in the
namespace. It returns at most the 200 most recently created nodes, capped before hydration, and `truncated: true`
draws an "earlier workflows not shown" divider at the top of the spine.

| Parameter | Type   | Description               |
| --------- | ------ | ------------------------- |
| `wf`      | guid   | Root workflow database ID |
| `ns`      | string | Workflow namespace        |

Response:

```json
{
    "root": "guid",
    "truncated": false,
    "workflows": ["Workflow, same shape as the SSE payload"],
    "edges": [{ "from": "guid", "to": "guid", "kind": "dependency | link" }]
}
```

### `GET /dashboard/mailboxes`

The mailboxes of the named collections, open and closed, each with its log laid out position by position. It is a
fetch rather than a field on the live stream. Mailboxes are not workflows, so they do not fit that payload or its
fingerprint loop, and a three-table read every two seconds would cost every engine for a feature most do not use.

The read is bounded before it runs: at most 100 collection keys per call, at most **10 mailboxes per collection**
(most recently minted first), and each log capped by `MaxMailboxLogLength`. With no collections named it returns an
empty array without querying. **The bound is per collection, not global.** A global newest-first limit would let one
busy collection starve the rest, and a group with its mailboxes cut would look like an exchange that never had one.
`truncatedCollections` names the keys whose window was full, so only those groups say they have an unshown tail, as
the `truncated` flag does for `/dashboard/graph`.

| Parameter        | Type   | Description                                              |
| ---------------- | ------ | -------------------------------------------------------- |
| `collectionKeys` | string | Comma-separated collection keys; max 100, extras ignored |
| `namespace`      | string | Optional namespace filter; omitted reads every namespace |

Response:

```json
{
    "truncatedCollections": ["collection keys with older mailboxes not shown"],
    "mailboxes": [
        {
            "id": "guid",
            "namespace": "ttd/app",
            "idempotencyKey": "Task_1:SendToArchive",
            "collectionKey": "instance-42",
            "status": "Open | Disposed",
            "disposedReason": "Request | Deadline",
            "deadline": "2026-08-19T14:00:00Z",
            "createdAt": "2026-08-19T12:00:00Z",
            "disposedAt": "2026-08-19T14:00:00Z",
            "nextIdx": 2,
            "nextSeq": 2,
            "unpairedDeliveries": 0,
            "positions": [
                {
                    "position": 0,
                    "state": "delivered | paired | waiting | closed",
                    "deliveryKey": "the forwarding source's own message id",
                    "acceptedAt": "2026-08-19T12:30:00Z",
                    "receiverWorkflowId": "guid",
                    "heldAt": "2026-08-19T12:00:01Z",
                    "releasedAt": "2026-08-19T12:30:00Z",
                    "claimedAt": "2026-08-19T12:30:00Z",
                    "parkedForSeconds": 1799
                }
            ]
        }
    ]
}
```

`positions` is empty for a minted mailbox with no delivery or receiver yet, a common and often long state. The four
`state` values:

| State       | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `delivered` | A message stands here and no receiver has been enqueued for it: an unpaired delivery |
| `paired`    | A receiver holds this position and its message is standing at it                     |
| `waiting`   | A receiver is parked here and its message has not arrived                            |
| `closed`    | A receiver holds this position, no message ever came, and the mailbox closed         |

`heldAt` separates a receiver that parked from one that ran at once, which the workflow status cannot tell once it has
settled. `parkedForSeconds` is absent while a receiver is still parked (count up from `heldAt`) and for one that never
parked.

### `GET /dashboard/scheduled`

All workflows with a future `startAt`. Response: `Workflow[]`

### `GET /dashboard/labels?key=<string>`

The distinct values of a label key. Response: `string[]`

### Workflow actions

The dashboard has no mutation endpoints of its own. The Retry, Retry now / Check now and Fail buttons call the
engine's public API, so the UI exercises the contract that external callers use:

| Button                        | Request                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| **Retry** (Failed step)       | `POST /api/v1/{namespace}/workflows/{id}/resume`                                          |
| **Retry now** / **Check now** | `POST /api/v1/{namespace}/workflows/{id}/nudge`                                           |
| **Fail** (parked step)        | `POST /api/v1/{namespace}/workflows/{id}/fail` with a fixed `reason` naming the dashboard |

The namespace and workflow id are URL-encoded route segments. Both 200 and 202 count as success. A refusal carries
problem details, and their `detail` becomes the button's tooltip. The technical guide's
[API reference](technical-guide.md#api-reference) documents the contracts. A nudge also clears `throttled_until`, so
**Retry now** / **Check now** works even while the namespace is throttled.

### Throttle endpoints (shared with the public API)

The Throttled Namespaces panel calls the engine's public throttle endpoints, not dashboard wrappers:

| Endpoint                      | Method | Used for                                                         |
| ----------------------------- | ------ | ---------------------------------------------------------------- |
| `/api/v1/throttles`           | GET    | Breaker list (200 array, or 204 when none and the panel hides)   |
| `/api/v1/{ns}/throttle/trip`  | POST   | Force-trip override (202; 409 when throttling disabled)          |
| `/api/v1/{ns}/throttle/clear` | POST   | Force-clear override (202; 200 already clear; 404; 409 disabled) |

Breaker shape: `{ namespace, state: "Tripped"|"Recovering"|"Clear", trippedAt, currentWindow, canaryCount, lastEvaluatedAt?, lastRequeuedCount, lastActiveCount, updatedAt? }`

---

## Workflow Card Anatomy

Each workflow is a card with a header row and a pipeline of step nodes.

### Header Row

Left to right:

1. **Label segments**: clickable spans for the namespace, the collectionKey and the labels. A click toggles a label
   filter. The namespace and collectionKey have the CSS class `seg key` (bold cyan), and label values `seg`.
2. **Workflow name**: the `operationId`. When it contains a BPMN transition, such as
   `"Process next: Form → Verify"`, the name shows `from → to`. That parsing gives different operationId prefixes the
   same text, so a primary workflow and its auxiliary sibling show the same name. The auxiliary badge and card chrome
   tell them apart, and the name's tooltip has the full operationId.
3. **Spacer**
4. **Retry badge**: the total retry count across all steps, as `↻N`, when above 0.
5. **Auxiliary badge**: a dashed violet "auxiliary" pill on a workflow enqueued with `isHead: false`
   (`isAuxiliaryWorkflow` in `core/helpers.js`), such as the post-commit work a process-next transition enqueues. The
   card also gets a dashed violet border and a violet inset left edge (`.workflow-card.auxiliary`).
   `setCardFilterData` toggles the class, and scheduled cards set it inline, so it survives re-renders in every
   section.
6. **Status pill**: the workflow status, with a color-coded CSS class. Do not confuse the status `Abandoned`, a
   failure a caller wrote off, with the step operation IDs `AbandonTask` and `OnTaskAbandonHook` from the app's
   task-abandon (reject) commands.
7. **Timestamps**: Created → Updated, with the elapsed duration. Timers tick for active workflows.
8. **Copy idempotency key button**
9. **Relation chips**: one per non-empty relation group (`↑` dependsOn, `↓` dependents, a chain icon for links),
   with a status-colored dot per related workflow, up to 5 and then `+N`, and `operationId (status)` pairs in the
   tooltip. A click scrolls to and flashes (`rel-flash`) the related card when exactly one is on screen, and otherwise
   toggles the collection filter, since connected workflows share a collection. Active and scheduled cards get their
   relations inline. On recent and query cards, a ghost `rel?` chip (full cards only) or expanding a compact card
   fetches them from `/dashboard/relations`. The live fingerprint includes relation statuses, so dot colors stay
   current.
10. **Action buttons**: collection filter funnel, chain modal (tree icon, on all cards), state modal, and the trace
    link where the host configures a trace viewer (see [Trace Link](#trace-link)).

### Pipeline

A horizontal row of step circles joined by SVG lines.

**Step circle icons by status:**

- Completed: ✓ (green)
- Processing: ◯ animated (blue pulse)
- Failed: ✗ (red)
- Requeued: ↻ (orange)
- Waiting: ⌛ (cyan, slow pulse), deferred while it waits for an external outcome
- Canceled: — (gray)
- Enqueued: ◯ outline (gray)

**Below each circle:**

- Command detail label (e.g. "StartTask", "WebhookCall")
- Sub-label: on a Waiting step, the reason its command gave for deferring (`lastDeferReason`), cut with an ellipsis to
  the node's width, with the full text in the tooltip
- Command type badge (`app`, `webhook`, etc.)
- Retry count, when above 0
- Backoff countdown, when requeued with a future backoffUntil
- Execution duration, when completed or failed

**Connector lines:**

- Solid colored: step completed
- Animated: processing in progress
- Gray or empty: not yet reached

**Vertical density:** live pipelines reserve the meta rows' height (`.step-meta` min-height), so cards do not jump as
retry, backoff and timing rows appear during processing. Static pipelines (`.pipeline-static`: recent, query,
scheduled and expanded chain rows) render their final content without the reservation. The phase-bracket headroom
(`.pipeline-grouped`) applies only when at least one step maps to a phase.

**Scroll-to-active:** when a card renders or updates, the pipeline scrolls horizontally to center the Processing,
Requeued or Waiting step. It scrolls only when the active step's index changes (tracked per workflow in
`_processingIdx`), so updates that change only the fingerprint do not scroll. With no active step, it scrolls to the
end. A rebuild that leaves the active step in place, such as a retry or deferral write-back of the same step or a
relation that lands, keeps the pipeline where the operator scrolled it: `setCardHTMLKeepingPipelineScroll` swaps the
card's HTML and carries the old `.pipeline` element's `scrollLeft` over to the new one.

**BPMN grouping:** brackets group the steps that run for one BPMN element, as
[BPMN Element Grouping](#bpmn-element-grouping) describes.

### Compact Mode

Each section switches between full and compact cards. A compact card is a single row with:

- Label segments (as on a full card)
- Workflow name
- Inline dot pipeline (colored dots instead of full step circles)
- Status pill and timestamps

localStorage keeps the compact choice per section. Each dot opens the step modal when clicked.

**Individual card expansion:** clicking a compact card outside its interactive elements toggles it to the full view
within the compact section. The dashboard tracks this per card, not per section. The `pendingExpand` set
(`state.pendingExpand`) forces cards to render expanded. URL restore (the `exp` param) uses it, and so does navigating
to a card from a modal.

### Card Data Attributes

Cards carry `data-*` attributes so the client can filter without parsing the cards again:

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

Clicking a step circle opens it. It fetches `/dashboard/step?wf=<id>&step=<key>`.

### DOM Structure

The modal has four DOM zones:

1. **Title bar** (`dom.modalTitle`): the step name, such as "StartTask". For an `ExecuteServiceTask` step it adds the
   `serviceTaskType` from the command data, as in "ExecuteServiceTask: SigningServiceTask".
2. **Tab bar** (`dom.modalTabs`): sticky top-level tab buttons, hidden when Details is the only tab.
3. **Sub-tab bar** (`dom.modalSubtabs`): sticky state sub-tab buttons, shown only while the State tab is active and
   both stateIn and stateOut exist.
4. **Body** (`dom.modalBody`): the scrollable panel with the active tab's content.

### Open Flow

1. Set the modal title, clear the tabs and body, and show a "Loading..." placeholder.
2. Fetch `/dashboard/step?wf=<id>&step=<key>`.
3. **Stale guard**: before and after the fetch, check that `_openWfId` and `_openStepKey` still match, and discard the
   response if the modal closed or switched to another step during the request.
4. Render the tabs and panels with `renderStepDetail(data)`.
5. If the caller asked for an `initialTab`, such as "state", click that tab.
6. On a fetch error, show the error message in the body.

### Tabs

1. **Details** (default). Rows, top to bottom:
    - **Status row**: the status pill, the backoff countdown (Requeued or Waiting) or the elapsed time (Processing),
      the retry count badge (above 0) and the [action buttons](#action-buttons), in one flex-aligned row.
    - Idempotency Key
    - Created (formatted time and relative age)
    - Execution Started (if set)
    - Last Updated (if set)
    - Backoff Until (if set)
    - Deferrals (above 0), First Deferred and Last Deferred (formatted time and relative age, if set)
    - Defer Reason: the step's `lastDeferReason`, the command's own words for what it is waiting for (if set)
    - Retry strategy block: Backoff Type, Base Interval, Max Retries, Max Delay and Max Duration, with durations
      formatted
    - Command Type
    - Max Execution Time (formatted duration, if set)
    - Webhook only: URI and Content-Type from `command.data`, in camelCase or PascalCase
    - Error History (a collapsible section, see below)
    - Trace link (when there is a traceId and the host configures a trace viewer)

2. **State**, shown only when the step has stateIn or stateOut.
    - **Both exist**: sub-tabs Diff, State In and State Out, with Diff as the default.
        - **Diff view**: two side-by-side columns headed "State In" and "State Out", with line numbers and per-line
          syntax highlighting. It uses the LCS-based `lineDiff()`, and puts a paired remove and add on the same row. It
          shows "No changes" when stateIn equals stateOut.
        - **State In / State Out views**: the full JSON, syntax-highlighted, with a copy button.
    - **Only one exists**: a single syntax-highlighted JSON view, with no sub-tabs and no diff.
    - `expandJsonStrings()` first parses nested JSON-encoded strings, recursively, in every value it shows.

3. **Data**, shown only when `command.data` is not null: the command payload as pretty-printed, syntax-highlighted
   JSON with a copy button.

### Action Buttons

- **Retry**: in the status row of a Failed step. Calls the public `resume` endpoint.
- **Retry now** (nudge): on a Requeued step with more than 5 s of backoff left. Calls the public `nudge` endpoint.
- **Check now** (nudge): the same control on a Waiting step, with another label. The step is polling, not retrying,
  and "retry" would misdescribe a step that never failed.
- **Fail**: in the status row of a Requeued or Waiting step, and as a `fail` button on parked pipeline steps, next to
  the nudge button when there is one. It calls the public `fail` endpoint with a fixed reason that names the dashboard.
  The step becomes Failed with that reason as its last error entry, and the Retry button then applies. It is red, to
  mark it as the give-up action.

**UI feedback:** the button shows "..." while it waits. On success its text becomes "Retried", "Skipped" or "Marked
failed", with the success CSS class, and it stays disabled. On failure its text becomes "Failed" ("Rejected" for the
Fail action, whose success _is_ a failed step), with the error CSS class and the problem details' `detail` as its
tooltip, and it resets after 3 seconds. A network error works the same way, with the text "Error". The dashboard does
not reload the query and relies on SSE for the update.

### SSE-Driven Refresh

While the modal is open and the workflow's fingerprint changes in the live SSE updates, `notifyStepChanged()` refreshes
the modal after a 300 ms debounce. It keeps the active tab, the state sub-tab and the error history's expand state.

### Trace Link

Opens the workflow's engine trace, the one its `WorkflowHandler.Handle` span roots, by the workflow's `traceId` in the
trace viewer the host configures. The link is the `traceUrlTemplate` from
[`GET /dashboard/config`](#get-dashboardconfig) with the URL-encoded trace ID in place of `{traceId}`. For a host that
sets the Grafana pair, the template opens Grafana Explore with a TraceQL query on its Tempo datasource. While the host
configures no viewer, the dashboard draws no trace link anywhere: no _Open trace_ here and no trace icon on the cards.
`buildTraceUrl()` in `modules/core/helpers.js` builds every trace link, and returns `null` while links are off. The
link text is "Open trace" and the cards' icon is a neutral waterfall glyph, whatever the viewer. The link opens in a
new tab.

### Error History

A collapsible section in the Details tab, expanded by default. It lists the entries **newest first**. Each entry
shows:

- A badge with the retryable or non-retryable label and the HTTP status code, if any
- The timestamp (formatted and relative age)
- The error message

`_errorExpanded` keeps the expand state across the re-renders of one modal session.

### Keyboard

Escape closes the modal (a document-level `keydown` listener).

---

## State Evolution Modal

Clicking the `{ }` button on a card opens it. It fetches `/dashboard/state?wf=<id>`.

Its title is "State Trail", and it shows "Loading..." while it fetches. It has the same stale guard as the step modal,
checking `_openWfId` before and after the fetch.

**Content:** a vertical list of state blocks:

1. **Initial State**, always shown ("No state" when null)
2. **Step N: {operationId}**, one block per step with a non-null `stateOut`, in processing order

Each block shows syntax-highlighted JSON, after `expandJsonStrings()`, with a copy button. With no initial state and
no step stateOut, the modal shows "No state data available".

**Auto-refresh:** SSE drives it through `notifyWorkflowChanged()`, with a 1 s debounce, longer than the step modal's
300 ms to reduce noise. **Keyboard:** Escape closes the modal. The `copyPre()` handler, shared with the step modal,
copies the block's text and briefly shows a "copied" indicator (1.2 s).

---

## Chain Rows (shared renderer)

`modules/shared/chain.js` renders a set of workflows as a dependency-ordered vertical spine, the "story of the
collection", rather than as a general graph. Process-next graphs are a nearly linear spine of primary workflows with
auxiliary leaves. The chain modal and the Recent section's Chains view share it.

**Spine layout, with two builders:**

1. `buildSpineFromEdges(nodes, edges)` sorts the primary workflows topologically over `dependency` edges (Kahn), with
   `createdAt` breaking ties, and a cycle guard appends what the sort missed. Each auxiliary workflow attaches under
   the primary workflow it shares an edge with, **preferring a `link` edge**, since a process-next auxiliary workflow
   links to the primary workflow that enqueued it. Unattached auxiliary workflows go at the bottom.
2. `buildSpineByCreation(nodes)` needs no edges: plain `createdAt` order, with auxiliary rows marked. That is correct
   for process-next collections, because the app enqueues an auxiliary workflow while its primary workflow runs,
   before the next primary workflow can exist.

**Row anatomy:** the parsed transition name (or the operationId, which the tooltip always shows in full), the
auxiliary badge, one status-colored dot per step (a click opens the step modal), the duration and the status pill. An
active row ticks on the shared `[data-timer]` loop while the live section holds the workflow. Auxiliary rows indent
under their primary workflow, with the violet auxiliary chrome and an elbow connector to the spine. A given root
workflow gets a cyan spine marker and a brighter name.

**Row expansion:** a click on a row outside its interactive elements swaps it in place for the full pipeline card
(`chainRowToggle`), and fetches the relations on the first expand, as compact-card expansion does. A click on the
expanded card collapses it. The expanded set survives re-renders.

**Gap dividers:** a wall-clock gap over 1 s between consecutive primary workflows draws a dim `+ 4.2s` divider before
the later one, to show where the time went between transitions, such as the user working in the task. It is hidden
while the preceding primary workflow still runs.

## Chain Modal

Clicking the tree button on a card opens it. It fetches `/dashboard/graph?wf=<id>&ns=<namespace>` and renders the
graph with the shared chain renderer (`buildSpineFromEdges`).

Its title is "Chain — {collectionKey}" when the opening card has a collection key, and "Workflow Chain" otherwise. It
has the same stale guard as the other modals (`_openWfId` before and after the fetch).

**Auto-refresh:** SSE drives it through `notifyChainChanged()`, with a 1 s debounce. It refreshes when a rendered
workflow's fingerprint changes, **or when a new live workflow joins the open root's collection**. A fresh
transition's primary and auxiliary workflows have new ids, so nothing already rendered changes when they land.
**Keyboard:** Escape closes the modal.

## Chains View

The default view in the Recent section, and available in the Query tab. It groups the current window or page by
`collectionKey` and renders each collection as a bordered group: newest collection first, in the source's own order,
and the story inside oldest first. Workflows without a collection render as plain compact cards in their original
place. `shared/chain-groups.js` holds the group chrome and the history control, and the surfaces share the history
cache.

**Group anatomy:** a header row above the shared chain rows, with the label segments of the oldest primary member,
the workflow count, the wall-clock span from first enqueue to last update, an aggregate status pill, the collection
filter funnel and the history control. The aggregate status is an in-flight status if any member has one
(Processing, Requeued, Waiting, Held or Enqueued), then the worst terminal outcome, then Completed.

**Spine source:** groups use `buildSpineByCreation` over the members in the window, with no fetch, since `isHead` is
on the card DTOs. The **history** control fetches the collection's whole graph from `/dashboard/graph`, beyond the
window, and re-renders the group with the edge-based spine. The graph is cached per collection and fetched again in
the background when unknown members appear.

**Live members:** in-flight workflows from the active section's SSE state that belong to a rendered collection join
their group, so the story includes the running transition, and its row ticks on the shared timer loop.
`notifyRecentChainsChanged()` re-renders the view, with a 300 ms debounce, when a live workflow that belongs to a
rendered group appears, changes or finishes.

**Filtering:** a group filters as one unit. Its `data-filter`, `data-status` and `data-labels` are the unions over its
members, so a group matches when any member matches, and the status chips count groups, not workflows. `applyFilter`
does not match the expanded cards inside a group on their own (`:scope >` selectors).

**Mailbox blocks:** a group that has mailboxes ends with one block per mailbox, oldest minted first, so the exchanges
read in the same direction as the spine above them. A group without mailboxes, which is nearly every group, renders
nothing. A collection with an unshown older tail (the endpoint's per-collection window was full) gets a
`⋯ older mailboxes not shown` line above its blocks, in that group only.

Each block is a header and a row of position chips:

- **Header**: the shortened mailbox id (full id and mint time in the tooltip), the mint idempotency key, an `open` /
  `closed · request` / `closed · deadline` pill, both log counters as `idx N · seq N`, an amber `N unpaired` badge
  when accepted messages never got a receiver, and the deadline. An open mailbox counts down to its deadline live
  (`closes in 20d 4h`), and past it turns red and counts up as `overdue …`. A closed one says when it closed. The
  absolute deadline always follows, honoring the UTC and show-timestamps settings, since closing _at_ the deadline
  means the exchange timed out.
- **Position chips**: one per position, numbered and colored by state: `delivered` amber, `paired` green, `waiting`
  dashed cyan (the `Held` pill's chrome, since that is the receiver's status) and `closed` dashed gray. The tooltip
  holds the source's message id, the accept, park, release and claim times, and the park duration. A `waiting` chip
  counts up live from `heldAt`, since the server sends no `parkedForSeconds` while the wait runs. A mailbox with no
  positions says `no messages and no receivers yet`.
- **The link into the spine**: a chip whose receive workflow is a row in this group reveals that row when clicked
  (scroll and `rel-flash`, as the relation chips do). Otherwise its tooltip says the receiver is outside the window,
  or, for `delivered`, that there is none.

**Freshness:** the dashboard fetches the blocks rather than streaming them. Each render pass asks for the mailboxes of
the collections it drew, in one batch per namespace, chunked to fit the server's request line. It re-renders only
when the answer differs, so the re-render cannot feed itself. A collection is asked again after **3 s** when it holds
mailboxes, has a receive workflow among its members (`mailboxId` on the card), or has never been read successfully.
It is asked after **60 s** when it answered "no mailboxes", which is nearly every collection, so the three-table read
stays off a loop. A failed request never counts as an empty answer.

Once the dashboard has seen any mailbox, a **5 s** timer also asks again about the collections on screen, under the
same TTLs. An exchange can advance without a workflow changing, since a message that arrives before its receiver is a
row, not a workflow, and no SSE-driven pass would come. The timer walks the last render pass's collections, not the
blocks in the DOM, because a collection whose blocks are missing is the one to ask. It never starts on a deployment
that has never minted a mailbox.

The cache is per namespace **and** collection key. The chains group by collection key alone, so a group can hold two
namespaces' workflows, and each namespace's mailboxes are asked for and drawn under the same group.

**Query-mode differences:** a query returns a filtered subset of each collection (status, time, search and page
boundaries), so group counts read "N matching" instead of "N workflows", and "N matching of M" once the history graph
has loaded. There is no live member merge, since SSE does not drive the tab. The main use: click a collection funnel,
and the query tab, filtered to that collection in chains mode, shows the instance's whole timeline from the database,
beyond the recent window.

---

## Filtering System

### Label Filters

A `Map<string, Set<string>>`: several keys, each with one or more selected values.

**Label discovery:** on SSE connect, the frontend fetches the distinct values of the hard-coded common label keys
`org`, `app`, `partyId` and `env` (`GET /dashboard/labels?key=<key>`), and stores them in `state.labelValues` for a
dropdown.

**Sources:**

- Clicking a label segment on any card calls `toggleLabelFilter(key, value)`
- Selecting from the label dropdown, when it is populated

**Behavior:**

- Toggling off a key's only selected value clears the key
- Filter chips appear in the filter bar below the header
- Clicking a chip removes its filter
- Label filters apply to all sections: live, recent and query
- The query tab sends label filters to the backend as `labels=key:value,key:value`
- Special keys: `namespace` matches `data-namespace`, `collectionKey` matches `data-collectionKey`, and other keys
  match `data-labels`

### Status Filters

Each section has a bar of chips, with one status active at a time. Chips show live counts, such as `"Failed (3)"`,
that update as cards come and go.

**Chip labels per section:**

- **Scheduled**: All, 10s, 1m, 5m, Later (time-to-start buckets)
- **Inbox**: All, Processing, Retrying
- **Recent**: All, Completed, Failed, Abandoned
- **Query**: checkboxes instead of chips: Enqueued, Processing, Requeued, Waiting, Held, Completed, Failed, Canceled,
  Dep. failed, Abandoned, plus the Primary / Auxiliary role pair

### Text Filter

- **Live filter** (Inbox only): filters as you type, matching the `data-filter` attribute.
- **Query search**: runs on Enter, and goes to the backend as the `search` parameter.

### Filter Interaction with Query Tab

When a label filter, status filter or search changes while the query tab is loaded, the tab fetches from the backend
again.

---

## URL State Sync

`syncUrl()` and `restoreUrl()` keep all dashboard state in the URL's query string, so a shared URL captures the whole
view.

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
| `qrole` | Role facet (`Primary` or `Auxiliary`; absent = both)     |
| `lf`    | Label filters (comma-separated key:value pairs)          |
| `c`     | Collapsed sections (comma-separated: sched,inbox,recent) |
| `e`     | Expanded sections (inverse of collapsed)                 |
| `cpt`   | Compact sections (comma-separated)                       |
| `exp`   | Expanded card IDs in compact mode (base64)               |
| `theme` | Theme: `dark` or `altinn`                                |

---

## Workflow Domain Model (Frontend)

The typedefs in `core/state.js`:

```typescript
type StepStatus =
    'Enqueued' | 'Processing' | 'Completed' | 'Failed' | 'Requeued' | 'Waiting' | 'Canceled';
type CommandType = 'app' | 'webhook' | 'Noop' | 'Throw' | 'Timeout' | 'Delegate';

interface Step {
    idempotencyKey: string;
    operationId: string;
    commandType: CommandType;
    commandDetail: string;
    status: StepStatus;
    processingOrder: number;
    retryCount: number;
    deferCount: number;
    firstDeferredAt: string | null;
    lastDeferReason: string | null;
    backoffUntil: string | null;
    createdAt: string;
    executionStartedAt: string | null;
    updatedAt: string | null;
    stateChanged: boolean;
    labels?: Record<string, string>;
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
    // Only on a receive workflow: the mailbox its first step reads from. The public workflow read omits
    // it, so an app-lib integration test reads it here
    // (Altinn.App.Integration.Tests/WorkflowEngine/WorkflowEngineMailboxMultiExchangeTests). Renaming or
    // dropping it breaks that test, in another tree.
    mailboxId: string | undefined;
    labels: Record<string, string> | null;
    backoffUntil: string | null;
    createdAt: string;
    updatedAt: string | null;
    executionStartedAt: string | null;
    removedAt: string | null;
    startAt: string | null;
    hasState: boolean;
    // The isHead directive: false is an auxiliary workflow, true or omitted a primary one. The
    // endpoints omit nulls, so an unset directive arrives as undefined, never null.
    isHead: boolean | undefined;
    // Tri-state: undefined = the source query did not load it (fetch from /dashboard/relations),
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

The dashboard fingerprints workflows and re-renders a card only when its fingerprint changes. The fingerprints are in
`state.workflowFingerprints[databaseId]`.

Formula: `{workflow.status}|{step1.status}:{step1.retryCount}:{step1.deferCount}:{step1.backoffUntil},...|{dependsOn statuses}|{dependents statuses}|{links statuses}`
Example: `"Processing|Completed:0:0:,Processing:0:0:,Enqueued:1:0:2024-01-15T10:30:45Z|Completed||"`

`deferCount` is in the formula so that a Waiting step's card re-renders on every deferral, which refreshes its reason
sub-label and backoff countdown. The relation-status segments keep the relation chips' dot colors current when only a
related workflow's status changed.

Timestamps are deliberately absent from this formula and from the server's change detection for the `active` array
(`{databaseId}|{status}|{backoffUntil}|{step status}:{retryCount}`). A new `executionStartedAt` arrives only with the
status change that comes with it. The elapsed counter reads its anchor from `state.previousWorkflows` on every frame,
so that costs nothing today. Anything that renders a timestamp _into_ card markup belongs in the formula, or it stays
stale until another field moves.

### Animations

- **Enter**: new inbox cards slide in from the top
- **Exit**: removed cards fade out with the `complete-exit` animation (0.5 s)
- **Recent-enter**: new recent cards slide in with a brief glow (`recent-glow` / `recent-glow-fail`)
- **Recent transition skip**: when a workflow moves from Inbox to Recent, the Inbox removes its card without the exit
  animation, so the exit and enter animations do not overlap. A move is a `databaseId` in the `recentKeys` set built
  from the same payload's `recent` array. It keys on `databaseId`, not on the idempotency key, which covers a whole
  batch: a sibling reaching Recent must not suppress a still-active workflow's animation.
- **Pulse sync**: when a card re-renders, the dashboard sets the CSS processing pulse's phase to
  `performance.now() % 2000`, to avoid a flicker.

### Timers

Active workflow cards have elapsed timers that tick on `requestAnimationFrame`. Each frame reads the anchor from the
live section's copy of the workflow (`state.previousWorkflows[databaseId]`), so a card follows a new attempt's
`executionStartedAt` at once, and its number matches the settled duration it shows in Recent. A workflow that leaves
the active set loses that copy, so the live section stamps its final elapsed time on the card on the way out, and
re-renders skip a card marked as exiting, so the frozen number lasts through the exit animation.

### Late-Bound Callbacks

Late-bound callbacks break circular dependencies between modules, such as filters and query:

1. Each module exports a `bind*Callbacks()` function.
2. `app.js` wires them all at startup, before `init()`.
3. Each module stores its callbacks in module-level variables and calls them indirectly.

### Settings

Stored in localStorage:

- `showTimestamps`: show or hide the timestamp columns (default: true)
- `timestampUtc`: UTC or local time (default: false)
- `theme`: `dark` or `altinn` (default: altinn)
- `compact:{section}`: compact mode per section

---

## BPMN Element Grouping

The pipeline draws consecutive steps that run for the same BPMN element under one bracket labeled with that element.
`stepGroup(step, tx)` decides the grouping. It returns `{ key, label }`, a key to group consecutive steps by and the
name drawn over the group, or `null` for a step that belongs to no element, which ends the group before it.
`pipeline.js` groups by `key` and draws each group's `label` at its center.

### `stepGroup` prefers the step's own label

The Altinn app library stamps each process-next lifecycle step with a **`processNextElement`** label that names its
element: the task being left on a task-end or abandon step, the task being entered on a task-start step, and the end
event on a process-end step. The dashboard uses the label as it is, so it groups a step by what the app said rather
than by the command's name, and groups a command it has never seen correctly on its first run. A process end also
gets its real end event id, where the fallback can only say "End Event".

Only the task-end, abandon and task-start lifecycle steps carry the label. The transition's own steps
(`AcquireProcessingStatus`, `CommitProcessState`, `EnqueueAuxiliaryWorkflows`) belong to neither element. The
post-commit steps and the auxiliary workflows' steps are deliberately unlabeled: a label would draw the entered
element's name a second time, after the task start, around work the first bracket already named.

### `stepPhase(commandDetail)` is the fallback

Without a label, `stepGroup` falls back to a map from command name to one end of the transition, which
`parseTransition` resolves against the operationId:

- **`end`** → the transition's `from`: EndTask, CommonTaskFinalization, OnTaskEndingHook, LockTaskData, AbandonTask,
  OnTaskAbandonHook
- **`start`** → the transition's `to`: UnlockTaskData, CleanupGeneratedFromTask, StartTask, OnTaskStartingHook,
  CommonTaskInitialization
- **`process-end`** → the literal "End Event": OnProcessEndingHook, EndProcessLegacyHook
- **`null`**: everything else (service tasks, webhooks)

The fallback covers workflows enqueued before the label existed, and apps on an older Altinn.App version. The engine
serves many apps at once, so the fallback stays, rather than lasting for a migration window. A command missing from
the map has no group, which ends the bracket before it and starts a new one after it, so the element name is drawn
twice around an ungrouped step. The keys from the two sources are deliberately distinct strings, so a labeled and an
unlabeled step never merge into one bracket by coincidence.

### `parseTransition(workflow)`

Extracts the BPMN transition from `workflow.operationId`. The expected format is `"Process next: TaskA → TaskB"` (or
`"Process next: TaskA -> TaskB"`). It returns `{ from: "TaskA", to: "TaskB" }`, or `null` when there is no transition.
An empty `from` or `to` defaults to "Start Event" or "End Event". Only the fallback needs it, since a labeled step
names its element outright.

---

## Backend Mapping (DashboardMapper)

The C# `DashboardMapper` turns domain models into dashboard DTOs. The main mappings:

- **`commandDetail`**: `step.OperationId`. The operation ID doubles as the step's display label, with no separate
  field.
- **`labels`**: the step's own labels, passed through as the caller enqueued them, and omitted from the JSON when the
  step has none. They carry `processNextElement` (see [BPMN Element Grouping](#bpmn-element-grouping)). The dashboard
  reads that one key and ignores the rest, so a caller can put anything else there without the UI reacting to it.
- **`deferCount` / `firstDeferredAt` / `lastDeferReason`**: passed through from the step's defer anchors
  (`Step.DeferCount`, `Step.FirstDeferredAt`, `Step.LastDeferReason`), so a card can say what a `Waiting` step is
  waiting for. Null anchors are omitted from the JSON.
- **`executionStartedAt`**: on the workflow and on each step, the start of the **most recent attempt**, as the
  technical guide's [get single workflow](technical-guide.md#get-single-workflow) describes.
    - Settled card and chain durations fall back to `createdAt` only for a workflow with no attempt to show. The step
      modal's Processing counter counts up from `executionStartedAt`.
    - The **live** counter falls back to `updatedAt` before `createdAt`. A live workflow without a stamp is `Enqueued`
      or `Held`, and for those `updatedAt` is when it entered the queue: the enqueue leaves it null, and every later
      path back into the queue sets it. So a workflow the operator has just resumed counts from the resume, not from
      its creation. A settled workflow must never take that fallback, since there `updatedAt` is when it finished.
    - The stored value trails the worker by up to one write-back, so a `Processing` step's counter is indicative until
      the step settles.
- **`stateChanged`**: for each step, in processing order, compares `step.StateOut` with the previous step's
  `StateOut`, or with `workflow.InitialState` for the first step. `true` when `StateOut` is non-null and differs.
- **`hasState`**: `true` when `workflow.InitialState` is non-null or any step has a non-null `StateOut`.
- **`traceId`**: taken from `EngineTraceContext` or `EngineActivity` on the workflow.
