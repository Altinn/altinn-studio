# Workflow Collections

## What It Is

A **Workflow Collection** is a persistent, growable DAG container that lets you chain batches of workflows over time. Each collection tracks its **heads** — the current frontier of workflows that haven't been superseded. When you enqueue new workflows into a collection, the engine automatically wires them to depend on the current heads, so each batch starts only after the previous batch finishes.

Think of it like a git branch: each enqueue appends to the tip, and the "heads" pointer advances forward.

---

## Enqueue Metadata

**`Collection-Key`** header or **`collectionKey`** query parameter (`string`, optional)
A client-chosen name for the collection, unique per namespace. Max 200 chars.

### On `WorkflowRequest` (individual workflow)

**`DependsOnHeads`** (`bool`, default: `true`)
If true and the workflow is a "root" (no intra-batch `DependsOn`), it automatically depends on all current collection heads.

**`IsHead`** (`bool?`, default: `null`)
Tri-state control over head membership and head consumption:

- **`true`** — Force-include: always a head, even if other batch workflows depend on it. Dependency edges consume heads normally.
- **`null`** (default) — Neutral: natural leaf detection — becomes a head if nothing in the batch depends on it. Dependency edges consume heads normally.
- **`false`** — Force-exclude: never a head, and dependency edges do NOT consume existing heads.

A workflow with `IsHead` `true` or unset is a **primary workflow**; one with `IsHead = false` is an **auxiliary workflow** (see [primary and auxiliary workflows](technical-guide.md#primary-and-auxiliary-workflows) for the vocabulary). An auxiliary workflow can still depend on heads for execution ordering (via `DependsOnHeads`), but the collection's heads are unchanged by it, so no later enqueue waits on it through the heads.

The directive is persisted verbatim (the `is_head` column) and exposed on `WorkflowStatusResponse.isHead`,
so status consumers can identify auxiliary workflows without relying on naming conventions, and the
`altinn.workflow_engine.workflow.execution.failed` metric carries it as
`altinn.workflow_engine.workflow.is_head` (`true`/`false`/`unset`) whatever its
`altinn.workflow_engine.reason` (`execution`, `poisoned`, `dependency_failed`, `wait_expired`, `manual`).
Alert on the reasons `execution` and `poisoned` regardless of `is_head`, and use `is_head` as a
routing/severity dimension: `false` marks auxiliary workflows, whose terminal failures gate
nothing and are otherwise silent. Exclude `dependency_failed` — such an increment for an auxiliary
workflow just mirrors the failure of a dependency, which fires the alert in its own right, and a
cascade resume of that dependency revives the auxiliary dependent. `wait_expired` and `manual` stay out of
the alert as well; the [technical guide](technical-guide.md#alerting-on-terminal-failures) has the query.

---

## Examples

### Example 1: Simple Sequential Chaining

```text
Batch 1:  POST /api/v1/{namespace}/workflows?collectionKey=daily-sync
          Workflows: [A, B]    (no deps between them)

          Collection state after:
          Heads = [A, B]       (both are leaves — nothing depends on them)

              A       B
              ●       ●  ← heads
```

```text
Batch 2:  POST /api/v1/{namespace}/workflows?collectionKey=daily-sync
          Workflows: [C]

          C is a root (no intra-batch DependsOn) and DependsOnHeads=true (default),
          so the engine injects: C → depends on [A, B]

          Collection state after:
          Heads = [C]          (A and B are consumed, C is the new leaf)

              A       B
              ●       ●
               \     /
                 C
                 ●  ← head
```

```text
Batch 3:  POST /api/v1/{namespace}/workflows?collectionKey=daily-sync
          Workflows: [D, E]   where E depends on D (intra-batch)

          D is a root → injected deps on [C]
          E has intra-batch dep on D → NOT a root, no head deps injected

          Collection state after:
          Heads = [E]

              A       B
               \     /
                 C
                 ●
                 |
                 D
                 ●
                 |
                 E
                 ●  ← head
```

### Example 2: Opting Out with `DependsOnHeads = false`

```text
Starting state: Collection "pipeline" has Heads = [X]

Batch:    Workflows: [F (DependsOnHeads=false), G]

          F opts out → no dependency on X, runs immediately
          G is a root with DependsOnHeads=true → depends on [X]

          Head X is "consumed" by G but NOT by F.
          New leaves: F and G.

          Heads = [F, G]

              X
              ●
              |
          F   G
          ●   ●  ← heads
          (independent)
```

Note: F runs in parallel with X (no dependency), while G waits for X.

### Example 3: Head Preservation (Unconsumed Heads Survive)

```text
Starting state: Collection "multi" has Heads = [P, Q]

Batch:    Workflows: [R]  with explicit DependsOn = [P's database ID]
          (R does NOT depend on Q — only on P explicitly)

          R is a root but has an explicit dep on P.
          DependsOnHeads=true → head deps injected for Q as well.

          P is consumed (explicit dep). Q is consumed (injected head dep).
          R is the new leaf.

          Heads = [R]

              P       Q
               \     /
                 R
                 ●  ← head
```

But if R had `DependsOnHeads = false` and only explicitly depended on P:

```text
          P is consumed (explicit dep). Q is NOT consumed.
          R is a new leaf.

          Heads = [Q, R]

              P       Q
              |       ●  ← head (preserved)
              R
              ●  ← head
```

### Example 4: Auxiliary Workflows After a Checkpoint with `IsHead`

Use `IsHead = true` on a non-leaf combined with `IsHead = false` on its dependents to keep the collection frontier at a checkpoint while enqueuing auxiliary workflows after it.

```text
Batch:    POST /api/v1/{namespace}/workflows?collectionKey=build
          Workflows: [M, N]  where N depends on M
          M: IsHead=true
          N: IsHead=false (auxiliary)

          M is forced into heads despite N depending on it.
          N is auxiliary — excluded from heads, edges don't consume heads.

          Heads = [M]

              M  ← head (forced)
              |
              N  (auxiliary — nothing later waits on it)
```

The next batch depends on M. N runs after M but doesn't block the pipeline:

```text
Next batch:  Workflows: [P]

             P depends on M (the head). M is consumed.
             Heads = [P]

              M
             / \
            N   P
                ●  ← head
            (N and P both run after M, independently)
```

This is useful when N is an auxiliary workflow (e.g., notifications, cleanup) that should execute after M but shouldn't be part of the collection's frontier.

### Example 5: Auxiliary Workflow on the Current Heads with `IsHead = false`

You want to enqueue an auxiliary workflow that depends on the current heads for execution ordering, but without disturbing the collection's frontier.

```text
Starting state: Collection "pipeline" has Heads = [X]

Batch:    Workflows: [S]  (DependsOnHeads=true, IsHead=false)

          S is a root → engine injects: S depends on [X]
          S is auxiliary (IsHead=false):
            - S is excluded from the heads set
            - S's dependency edges do NOT consume X

          Collection state after:
          Heads = [X]       ← completely unchanged

              X
              ●  ← head (preserved)
              |
              S
              (auxiliary — runs after X, but collection doesn't track it)
```

The next batch still depends on X, not S:

```text
Next batch:  Workflows: [Y]  (default: DependsOnHeads=true, IsHead=null)

             Y is a root → depends on [X]
             X is consumed. Y is the new leaf.

             Heads = [Y]

              X
             / \
            S   Y
                ●  ← head
            (S and Y both depend on X, but only Y joins the heads)
```

### Example 6: Mixed Primary and Auxiliary in One Batch

```text
Starting state: Collection "mixed" has Heads = [H]

Batch:    Workflows: [V (IsHead=null), I (IsHead=false)]
          Both have DependsOnHeads=true (default).

          Both are roots → both get dependency edges to H.
          V is primary: its edge on H consumes H.
          I is auxiliary: its edge on H does NOT consume H.

          H is consumed (by V's edge).
          V is a new leaf (primary). I is excluded (auxiliary).

          Heads = [V]

              H
             / \
            V   I
            ●   (auxiliary)
            ↑ head
```

### Example 7: Independent Chain Grafted onto a Non-Head Workflow

When a root workflow uses `DependsOnHeads = false` and depends on a non-head workflow by database ID, the batch has no connection to the current heads. The existing heads are preserved, and the batch's leaf joins them — creating parallel branches.

```text
Starting state: Collection "example" has Heads = [H]
                There exists a non-head workflow W (previously enqueued, not in heads).

Batch:    Workflows: [A, B]  where B depends on A (intra-batch)
          A: DependsOnHeads=false, DependsOn=[W's database ID]
          B: default (DependsOnHeads=true, IsHead=null)

          A is a root (external DB ID deps don't count as intra-batch),
          but DependsOnHeads=false → no head dep edges injected for A.

          B has an intra-batch dep on A → not a root → no head deps injected.

          No workflow in this batch depends on H → H is not consumed.
          B is a natural leaf → becomes a head.

          Heads = [H, B]

              W       H
              |       ●  ← head (preserved — nothing consumed it)
              A
              |
              B
              ●  ← head (new leaf)
```

The next batch would depend on both H and B, merging the two branches:

```text
Next batch:  Workflows: [C]  (default: DependsOnHeads=true, IsHead=null)

             C is a root → depends on [H, B]
             Both consumed.

             Heads = [C]

              W       H
              |        \
              A         \
              |          \
              B --------- C
                          ●  ← head
```

Note: If B joining the heads is not desired, it can be marked `IsHead = false`, making the whole batch auxiliary and leaving the collection's heads unchanged.

---

## Query Endpoints

**`GET /api/v1/{namespace}/collections/{key}`**
Detail for one collection: key, heads (with workflow ID + current status), and timestamps. Returns 404 if not found.

---

## Key Rules Summary

1. **Implicit creation**: Collections are created automatically on first enqueue — no separate "create" call.
2. **Root detection**: A workflow is a "root" if it has no `DependsOn` refs to other workflows _within the same batch_.
3. **Head dep injection**: Roots with `DependsOnHeads = true` (the default) get dependency edges to all current heads.
4. **Leaf detection**: A workflow becomes a head if `IsHead = true`, or if `IsHead` is `null` and no other workflow in the batch depends on it. `IsHead = false` unconditionally excludes.
5. **Head consumption**: A head is removed from the heads set only if a **primary** workflow (`IsHead != false`) depends on it (via injected or explicit edge). Auxiliary workflows' edges are ignored for consumption.
6. **Auxiliary workflows**: `IsHead = false` makes the workflow auxiliary — it participates in execution ordering but the collection state is unchanged by its presence. See [primary and auxiliary workflows](technical-guide.md#primary-and-auxiliary-workflows).
7. **Same-batch merge**: If two requests in one write-buffer flush target the same collection, they're folded sequentially in arrival order.
