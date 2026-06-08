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
- **`false`** — Force-exclude: never a head. **Invisible** — dependency edges do NOT consume existing heads.

`IsHead = false` makes a workflow **invisible to collection head tracking**. It can still depend on heads for execution ordering (via `DependsOnHeads`), but from the collection's perspective the heads set is unchanged — as if this workflow was never part of the collection.

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

### Example 4: Fire-and-Forget Side Effects with `IsHead`

Use `IsHead = true` on a non-leaf combined with `IsHead = false` on its dependents to keep the collection frontier at a checkpoint while spawning auxiliary work.

```text
Batch:    POST /api/v1/{namespace}/workflows?collectionKey=build
          Workflows: [M, N]  where N depends on M
          M: IsHead=true
          N: IsHead=false (invisible)

          M is forced into heads despite N depending on it.
          N is invisible — excluded from heads, edges don't consume heads.

          Heads = [M]

              M  ← head (forced)
              |
              N  (invisible — fire-and-forget side effect)
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

This is useful when N is auxiliary work (e.g., notifications, cleanup) that should execute after M but shouldn't be part of the collection's frontier.

### Example 5: Invisible Side Chain with `IsHead = false`

You want to spawn work that depends on the current heads for execution ordering, but without disturbing the collection's frontier.

```text
Starting state: Collection "pipeline" has Heads = [X]

Batch:    Workflows: [S]  (DependsOnHeads=true, IsHead=false)

          S is a root → engine injects: S depends on [X]
          S is invisible (IsHead=false):
            - S is excluded from the heads set
            - S's dependency edges do NOT consume X

          Collection state after:
          Heads = [X]       ← completely unchanged

              X
              ●  ← head (preserved)
              |
              S
              (invisible — runs after X, but collection doesn't track it)
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
            (S and Y both depend on X, but S is invisible to the collection)
```

### Example 6: Mixed Visible and Invisible in One Batch

```text
Starting state: Collection "mixed" has Heads = [H]

Batch:    Workflows: [V (IsHead=null), I (IsHead=false)]
          Both have DependsOnHeads=true (default).

          Both are roots → both get dependency edges to H.
          V is visible: its edge on H consumes H.
          I is invisible: its edge on H does NOT consume H.

          H is consumed (by V's edge).
          V is a new leaf (visible). I is excluded (invisible).

          Heads = [V]

              H
             / \
            V   I
            ●   (invisible)
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

Note: If B joining the heads is not desired, it can be marked `IsHead = false` to keep the batch entirely invisible to the collection.

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
5. **Head consumption**: A head is removed from the heads set only if a **visible** workflow (`IsHead != false`) depends on it (via injected or explicit edge). Invisible workflows' edges are ignored for consumption.
6. **Invisibility**: `IsHead = false` means the workflow is invisible to collection head tracking — it participates in execution ordering but the collection state is unchanged by its presence.
7. **Same-batch merge**: If two requests in one write-buffer flush target the same collection, they're folded sequentially in arrival order.
