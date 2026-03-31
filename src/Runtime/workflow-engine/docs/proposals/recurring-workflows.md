# Proposal: Recurring Workflows

## Summary

Add engine-level support for recurring workflows. On successful (or optionally failed) completion, the engine automatically creates a new workflow — a clone of the original — with a `StartAt` offset by the configured interval. Each occurrence is a normal, finite workflow linked to its predecessor via the existing `Links` relationship.

## Motivation

There are use cases where a webhook (or any command) needs to execute on a regular schedule. Today, callers would need to implement their own external scheduling and re-enqueue logic. By handling recurrence in the engine, callers get fire-and-forget scheduled execution with built-in history, cancellation, and failure handling.

## Design

### Caller interface

A new `Recurrence` field on `WorkflowRequest`:

```json
{
  "ref": "daily-sync",
  "operationId": "sync-data",
  "steps": [
    {
      "operationId": "call-api",
      "command": { "type": "webhook", "data": { "uri": "https://example.com/sync" } }
    }
  ],
  "recurrence": {
    "interval": "PT5M",
    "maxOccurrences": 100,
    "until": "2026-06-01T00:00:00Z",
    "onFailure": "Stop"
  }
}
```

### Recurrence spec

| Field | Type | Required | Description |
|---|---|---|---|
| `interval` | ISO 8601 duration | Yes | Time between the completion of one occurrence and the `StartAt` of the next |
| `maxOccurrences` | int? | No | Maximum number of occurrences (including the initial). `null` = unbounded (requires `until`) |
| `until` | DateTimeOffset? | No | Hard stop — no successor scheduled after this time. `null` = no time bound (requires `maxOccurrences`) |
| `onFailure` | enum | No | What to do when the retry strategy is exhausted. Default: `Stop` |

At least one of `maxOccurrences` or `until` must be specified. Unbounded recurrence with no kill switch is not allowed.

### Failure behaviour

"Failure" in this context means the workflow's retry strategy has been fully exhausted — not a transient blip, but a genuine failure.

| Value | Behaviour |
|---|---|
| **Stop** | Chain ends. No successor is scheduled. This is the default. |
| **Continue** | Schedule the next occurrence anyway. The failed workflow is recorded in the chain but does not block future executions. |

Note: there is no "Retry" option. By the time recurrence failure handling kicks in, the retry strategy has already made multiple attempts with backoff. If the caller wants more resilience, they should configure a more aggressive retry strategy.

### Engine behaviour

1. A workflow with a `Recurrence` spec is enqueued and processed normally.
2. On terminal status (Completed, or Failed if `onFailure: Continue`):
   - The engine checks the recurrence bounds (`maxOccurrences`, `until`).
   - If bounds permit, it creates a **new workflow** that is a clone of the original:
     - Same steps, same context, same namespace, same labels, same recurrence spec (with decremented `maxOccurrences` if set).
     - New ID, new idempotency key, new correlation ID.
     - `StartAt` = `now + interval`.
   - The new workflow is linked to the completed one via the `Links` relationship.
3. If bounds are exceeded (max reached or `until` has passed), the chain ends. No successor is created.

### Frozen spec

The recurrence spec is frozen from the initial request. The engine always uses the predecessor's spec to compute the successor. There is no mechanism to modify the interval, steps, or failure behaviour mid-chain. This keeps the engine logic simple (clone + decrement) and avoids race conditions around in-flight modifications.

### Cancellation

Cancel the latest pending/scheduled workflow in the chain. Since each occurrence is a standalone workflow, standard cancellation applies. No successor will be created for a cancelled workflow.

## What falls out naturally

- **History**: Follow the `Links` chain backwards to see every past execution.
- **Dashboard**: Scheduled successors appear in the "Scheduled" section with countdown timers, just like any deferred workflow.
- **Command-agnostic**: Works for webhooks, app commands, or any future command type. The recurrence logic is orthogonal to command execution.
- **Observability**: Each occurrence is a separate workflow with its own trace, so Grafana/Tempo traces are clean and per-execution.

## Open questions

- **Idempotency key generation**: How should the engine generate idempotency keys for successor workflows? Needs to be deterministic enough to prevent duplicates if the engine crashes mid-creation, but unique per occurrence.
- **Correlation ID**: Should the entire chain share a correlation ID (easier to query the full history) or should each occurrence get a new one (matches current "one correlation per enqueue" semantics)?
- **Interval semantics**: Is the interval measured from completion of the predecessor, or from its `StartAt` (fixed schedule)? Completion-relative is simpler but drifts over time. `StartAt`-relative keeps a fixed cadence but may cause overlap if execution exceeds the interval.
- **Schema changes**: `Recurrence` needs to be persisted on the workflow entity. JSONB column (like labels/context) is the most flexible approach.
