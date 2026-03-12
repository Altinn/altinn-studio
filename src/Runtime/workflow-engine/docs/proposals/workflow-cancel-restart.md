# Proposal: Workflow Cancellation and Retry

## Summary

Add the ability to cancel in-progress workflows and retry failed/cancelled workflows. These operations can be triggered via API endpoints (consumed by the dashboard or any other client).

## Motivation

Two distinct operational needs:

1. **Cancel** — A workflow is stuck in a hopeless retry loop, taking too long, or was submitted by mistake. Operators need to kill it without waiting for the retry strategy to exhaust.
2. **Retry** — A workflow failed due to a transient external issue (auth misconfiguration, downstream outage, bad data that has since been fixed). Rather than re-submitting from the original caller, operators want to put the workflow back in the queue and resume from where it left off.

## Cancel

### Semantics

Cancellation is a request to terminate a workflow that is currently active (Enqueued, Processing, or Retrying). The engine should:

1. Mark the workflow status as `Cancelled`.
2. Mark any incomplete steps as `Cancelled`.
3. If a step is currently executing, let it finish the current step, then stop. The worker detects the status change on the next loop iteration and does not advance to the next step. More responsive mid-step cancellation (via in-memory `CancellationToken` signalling) can be layered on later.
4. No successor is created if the workflow has a recurrence spec.

### Scope

- **Single workflow**: Cancel one workflow by ID.
- **Batch**: Cancel all workflows matching a filter (e.g. by namespace, by correlation ID). Useful for "cancel everything related to this instance."

### Edge cases

- Cancelling a workflow that is a dependency of other workflows: dependent workflows remain in `Enqueued` state, waiting for a dependency that will never complete. Options:
  - **Cascade** — automatically cancel dependents (could be surprising).
  - **Leave** — dependents stay enqueued; they'll need manual cancellation too (explicit but tedious).
  - **Configurable** — `cascade` query parameter, default false.
- Cancelling a workflow that has already completed or failed: no-op, return the current status.

### API

```
POST /api/v1/workflows/{workflowId}/cancel
POST /api/v1/workflows/cancel?namespace=&correlationId=
```

### Dashboard integration

- A "Cancel" button on workflow cards (active workflows only).
- Confirmation dialog before executing.
- The SSE stream picks up the status change naturally — the card moves to a "Cancelled" state with appropriate styling.

## Retry

### Semantics

Retry puts a failed or cancelled workflow back in the processing queue. No new workflow is created — the existing workflow is re-activated in place.

The engine should:

1. Set the workflow status back to `Enqueued`.
2. Reset failed/cancelled steps to `Enqueued`.
3. Reset retry counters and clear `BackoffUntil` on affected steps, so the retry strategy starts fresh.
4. Leave completed steps untouched — they are done.
5. Preserve completed steps' `stateOut` so that the next step in line receives it as `stateIn`. This is the key value of retry over re-submission: step 1 succeeded and produced state, step 2 failed, retry picks up step 2 with step 1's output intact.

The processor's next polling cycle picks up the workflow naturally via `FOR UPDATE SKIP LOCKED`. No special handling required — the workflow looks like any other enqueued workflow.

### What changes

| Field | Change |
|---|---|
| Workflow status | `Failed`/`Cancelled` → `Enqueued` |
| Workflow `BackoffUntil` | Cleared |
| Workflow `UpdatedAt` | Set to now |
| Failed/cancelled step status | → `Enqueued` |
| Failed/cancelled step retry counters | Reset to 0 |
| Failed/cancelled step `BackoffUntil` | Cleared |

### What stays the same

| Field | Reason |
|---|---|
| Workflow ID | Same workflow, not a clone |
| Idempotency key | Same workflow |
| Completed steps | Already done, not re-executed |
| Completed steps' `stateOut` | Feeds into retried steps as `stateIn` |
| Context, namespace, labels | Unchanged |
| Step processing order | Unchanged — retried steps execute in their original order |

### API

```
POST /api/v1/workflows/{workflowId}/retry
```

Only valid for workflows in terminal states (Failed, Cancelled). Returns the workflow ID and new status. Retrying a workflow that is already active or completed is a no-op / error.

### Dashboard integration

- A "Retry" button on workflow cards (Failed and Cancelled workflows only).
- Confirmation dialog before executing.
- The workflow reappears in the Inbox section naturally via SSE as it transitions back to active processing.

## Implementation considerations

### Processing loop interaction

For **cancellation**, the worker may currently hold a `FOR UPDATE` lock on the workflow. Three options:

- **Option A**: Set a `CancellationRequested` flag. The worker checks this between steps and aborts.
- **Option B**: Per-workflow `CancellationToken` linked to the engine's stopping token, signalled externally via an in-memory lookup.
- **Option C**: Mark as `Cancelled` in the database. The worker finishes the current step, sees the status change, and stops. No mid-step abort.

Option C is the pragmatic starting point. Option B can be layered on later for responsive mid-step cancellation.

For **retry**, there is no interaction with the processing loop — the workflow is in a terminal state and not locked. The status flip is a simple UPDATE.

### Audit trail

Both cancel and retry are operator-initiated actions. Worth logging:
- Who triggered the action (API key or future user identity).
- Timestamp.
- The number of times a workflow has been retried (a `requeueCount` on the workflow entity, or a note in metadata).

This could live in the workflow's `Metadata` (JSONB) or as a dedicated audit log. Metadata is simpler for now.

## Open questions

- **Permissions**: Should cancel/retry require a different auth scope than enqueue? In a multi-tenant setup, you'd want namespace-scoped rights.
- **Retry limits**: Should there be a maximum number of retries per workflow to prevent infinite manual retry loops? Or is that the operator's responsibility?
- **Recurrence interaction**: If a recurring workflow is manually retried and succeeds, should the recurrence chain resume (spawn the next successor)? Leaning toward yes — the retry fixed the issue, the schedule should continue.
- **Dependent workflow cascading on retry**: If a workflow that has dependents is retried and succeeds, should the engine automatically un-block the dependents? This should happen naturally if the dependency check looks at the current status rather than a cached snapshot.
