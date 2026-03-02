# Batch Workflow Enqueue

This document covers the design for the batch enqueue endpoint, which accepts a list of
workflow requests in a single call and supports expressing arbitrary dependency graphs
between them.

## The Problem: DAG serialisation in JSON

Individual workflows already support declaring dependencies on existing workflows via
`WorkflowEnqueueRequest.Dependencies` (a list of database IDs). When submitting multiple
related workflows in one request, however, the dependencies cannot refer to database IDs
that do not exist yet.

The dependency structure between workflows in a batch is a
**Directed Acyclic Graph (DAG)**, not a simple parent-child tree. A nested JSON tree
cannot represent a node with multiple parents without either duplicating it or introducing
references. Consider the diamond pattern:

```
A
├── B ─┐
└── C ─┴── D
```

Here D depends on both B and C. There is no way to represent this as nested JSON without
repeating D or adding an out-of-band reference mechanism.

## Solution: Flat list with `ref` + `dependsOn`

The approach used by GitHub Actions, GitLab CI, and Azure DevOps: each item in the batch
is given a **client-assigned, request-scoped reference name** (`ref`), and dependencies
are expressed as a list of those names (`dependsOn`). The `ref` value is never persisted
— it exists only to wire up the graph within the request. After insertion the server
returns the resolved database IDs.

### Why this approach

- Handles the full generality of a DAG without any schema changes.
- The `ref` is caller-controlled and can be anything meaningful (`"payment"`, `"step-1"`, `"0"`).
- Server-side processing is straightforward: topological sort (which also catches cycles),
  insert in order, resolve each `ref` to its newly-assigned database ID before writing
  `Dependencies`.
- Maps directly onto the existing `WorkflowEnqueueRequest.Dependencies` field — `ref`
  resolution is just a translation layer on top.

## Request format

```
POST /api/v1/workflows/batch
```

```json
{
  "workflows": [
    {
      "ref": "wf-a",
      "operationId": "process-a",
      "type": "AppProcessChange",
      "instanceInformation": {
        "org": "ttd",
        "app": "my-app",
        "instanceOwnerPartyId": 12345,
        "instanceGuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      },
      "actor": { "userIdOrOrgNumber": "user-123" },
      "createdAt": "2026-02-20T10:00:00Z",
      "startAt": null,
      "steps": [
        { "command": { "type": "app", "commandKey": "process-a" } }
      ]
    },
    {
      "ref": "wf-b",
      "operationId": "process-b",
      "dependsOn": ["wf-a"],
      "type": "AppProcessChange",
      "instanceInformation": { ... },
      "actor": { ... },
      "createdAt": "2026-02-20T10:00:00Z",
      "steps": [ ... ]
    },
    {
      "ref": "wf-c",
      "operationId": "process-c",
      "dependsOn": ["wf-a"],
      "type": "AppProcessChange",
      "instanceInformation": { ... },
      "actor": { ... },
      "createdAt": "2026-02-20T10:00:00Z",
      "steps": [ ... ]
    },
    {
      "ref": "wf-d",
      "operationId": "process-d",
      "dependsOn": ["wf-b", "wf-c"],
      "type": "AppProcessChange",
      "instanceInformation": { ... },
      "actor": { ... },
      "createdAt": "2026-02-20T10:00:00Z",
      "steps": [ ... ]
    }
  ]
}
```

The order of items in the array is **not significant** — the server sorts them topologically.

## Response format

The response maps each `ref` to its assigned database ID so callers can reference
these workflows in future requests.

```json
{
  "workflows": [
    { "ref": "wf-a", "databaseId": 101 },
    { "ref": "wf-b", "databaseId": 102 },
    { "ref": "wf-c", "databaseId": 103 },
    { "ref": "wf-d", "databaseId": 104 }
  ]
}
```

## Mapping to existing models

Each item in `workflows` corresponds to a `WorkflowEnqueueRequest`, with two additions:

| Batch field  | Maps to                                     |
|--------------|---------------------------------------------|
| `ref`        | Request-scoped alias — not persisted        |
| `dependsOn`  | Resolved to `WorkflowEnqueueRequest.Dependencies` (list of `long`) |

The `links` field (soft associations, no execution blocking) follows the same pattern if
needed: `"links": ["wf-a"]` resolves refs to database IDs and populates
`WorkflowEntity.Links`.

## Server-side processing

1. **Validate** that all `ref` values are unique within the batch, and that every ref
   listed in `dependsOn` or `links` exists within the batch or refers to a known database
   ID (see _Mixing new and existing workflows_ below).

2. **Cycle detection** — run a topological sort (Kahn's algorithm) over the `dependsOn`
   graph. If a cycle is detected, reject the entire request with a descriptive error
   identifying the cycle.

3. **Insert in topological order** — items with no dependencies first. As each workflow
   is inserted, record its `ref → databaseId` mapping.

4. **Resolve dependencies** — when inserting a workflow, translate each `dependsOn` ref
   to the database ID recorded in step 3.

5. **Atomicity** — the entire batch must succeed or be rolled back as a unit. A partial
   graph with unresolved dependencies must never be left in the database.

## Mixing new and existing workflows

A new batch may need to depend on a workflow that was submitted in a previous request
and already has a database ID. In this case `dependsOn` accepts both `ref` strings
(resolved within the batch) and numeric database IDs (resolved immediately):

```json
{
  "ref": "wf-b",
  "dependsOn": ["wf-a", 55]
}
```

The server resolves string entries via the batch's ref map and numeric entries directly.

## Validation errors

The following conditions should produce a `400 Bad Request` with a descriptive body:

- Duplicate `ref` values within the batch.
- A `dependsOn` entry references a `ref` that does not exist in the batch and is not a
  valid numeric database ID.
- A `dependsOn` entry references a database ID that does not exist.
- A cycle exists in the `dependsOn` graph (include the offending refs in the error).
- Any individual `WorkflowEnqueueRequest` fails its own `IsValid()` check.
