# Batch the mailbox hot paths (mint, close, delivery)

## Context

The workflow engine is optimized for concurrency on few DB connections: HTTP enqueues are batched
through `WorkflowWriteBuffer` → `BatchEnqueueWorkflows` (one connection + transaction per batch of ≤100,
`unnest` array statements, sorted `FOR UPDATE`). The new mailbox endpoints don't do this yet — every
mint / close / delivery takes its own DB slot, pooled connection, and transaction (mint: 1 statement;
close: 3–6 round-trips; delivery: 3–7 round-trips). Under storm (the k6 `buffered_deliveries` arm) that
is one connection per message. This change gives the three mailbox hot paths the same
channel-buffer → batch-repository treatment, with HTTP semantics byte-identical.

Decisions already made with the user:
- **Buffer shape**: extract a generic `BatchBuffer<TItem,TResult>` base; three thin subclasses.
  `WorkflowWriteBuffer`/`WorkflowUpdateBuffer` stay untouched (migration is a possible follow-up).
- **Old per-request repo methods**: reimplemented as singleton-array delegations into the batch cores
  (keeping their DB-slot + retry envelopes), so the existing repository test suite becomes a regression
  harness over the batch code. Bespoke single-row SQL (`MintMailboxSql` CTE, delivery `appendSql`,
  scalar close UPDATE) is deleted with its callers.

All paths below are relative to `src/Runtime/workflow-engine/`.

## Invariants that must survive (from `docs/technical-guide.md#mailboxes` + AGENTS.md)

1. **Lock discipline**: mutations of existing mailboxes lock the row(s) `FOR UPDATE` as the
   transaction's first act, **sorted by mailbox id** (same total order as `LockAndReadMailboxes`,
   `Data/Repository/EngineRepository.Writes.cs:730`), so enqueue/delivery/close flushes can't
   ABBA-deadlock. Compound order stays mailbox row → workflow row only. Mint stays lock-free
   (the unique index serializes).
2. **Delivery**: idempotency lookup runs *before* refusals (kept message replays `Duplicate` even on a
   closed/full mailbox); refusals write nothing (key stays free); the wake commits in the same
   transaction as the insert (pinned by `xmin` tests — they assert equality only, so a shared batch
   transaction satisfies them); `next_idx` stays gapless — consecutive idx per mailbox in
   batch-arrival order, counter bumped by exactly the rows inserted.
3. **Close**: first-writer-wins; `AlreadyClosed` echoes the row's original `disposed_at/reason`;
   releases in the same transaction; **one closure routine** shared with the sweep; the sweep keeps its
   per-mailbox transaction isolation and `FOR UPDATE SKIP LOCKED` claim — do not route it through the
   batch method.
4. **Mint**: collection cap stays best-effort per statement snapshot; replays answered even at the cap
   and consume no cap slot; `Minted` vs `Existing` decided by returned id == candidate id.
5. Intra-batch duplicates must be folded in C# (the per-request unique-index races collapse into
   batch-internal ordering): same mint `(ns, key)` → one row, second gets `Existing`; same delivery
   `(mailboxId, key)` → one row, second gets `Duplicate` with the first's idx; same close id → second
   gets `AlreadyClosed`. Mirror `RemoveDuplicates` + `(Index, PrimaryIndex)` verdict inheritance
   (`Writes.cs:481`, `WorkflowWriteBuffer.cs:207-215`).
6. `NOTIFY status_changed` inside the transaction (coalesce to one per flush); metrics only after
   commit; deliveries never get an admission refusal (bounded channel `FullMode.Wait`, no new 429s
   anywhere).
7. Like `BatchEnqueueWorkflows`: batch methods take **no** `AcquireDbSlot` (flush concurrency is the
   bound) and **no** `ExecuteWithRetry` (failure faults every TCS; callers' retries converge by
   idempotency — document that argument in the docstrings). The per-request delegations keep both.

## Part 1 — Data layer (`src/WorkflowEngine.Data/`)

### New buffered request records (beside `BufferedEnqueueRequest.cs`)

`internal interface IBufferedRequest<TResult> { TaskCompletionSource<TResult> Completion { get; } string? TraceContext { get; } }`
plus three records implementing it (caps do NOT ride on the records — they stay method parameters,
matching the per-request signatures):

- `BufferedMailboxMintRequest(Guid MailboxId, string Namespace, string IdempotencyKey, string? CollectionKey, TimeSpan Timeout, DateTimeOffset Now, string? TraceContext, TaskCompletionSource<MailboxMintResult> Completion)`
- `BufferedMailboxCloseRequest(Guid MailboxId, string Namespace, MailboxDisposedReason Reason, DateTimeOffset Now, string? TraceContext, TaskCompletionSource<MailboxCloseResult> Completion)`
- `BufferedMailboxDeliveryRequest(Guid MailboxId, string Namespace, string IdempotencyKey, string Payload, DateTimeOffset Now, string? TraceContext, TaskCompletionSource<MailboxDeliveryResult> Completion)`

Pre-DB verdicts (`Invalid`, `PayloadTooLarge`) never reach the repository — unchanged, they're decided
in `Engine` before the buffer.

### New batch methods on `IEngineRepository` (+ `EngineRepository.Mailboxes.cs`)

Positional result arrays, index-aligned with input; reuse the existing result unions:

```csharp
Task<MailboxMintResult[]>     BatchMintMailboxes(IReadOnlyList<BufferedMailboxMintRequest> requests, int maxOpenPerCollection, CancellationToken ct);
Task<MailboxCloseResult[]>    BatchCloseMailboxes(IReadOnlyList<BufferedMailboxCloseRequest> requests, CancellationToken ct);
Task<MailboxDeliveryResult[]> BatchDeliverToMailboxes(IReadOnlyList<BufferedMailboxDeliveryRequest> requests, int maxLogLength, CancellationToken ct);
```

Reuse: `TupleArrayExtensions.Unzip`, `MailboxColumns`/`MailboxDeliveryColumns`, `ReadMailbox`/
`ReadMailboxDelivery` mappers, `NotifyStatusChanged`, `MailboxStatusMap`. Per-item `Now` rides in
`timestamptz[]` arrays so `accepted_at`/`released_at`/`disposed_at` equalities pinned by tests hold.

**Shared lock statement** (hoisted `internal const LockMailboxesForMutationSql` for QueryPlanTests):
`SELECT {MailboxColumns} FROM engine.mailboxes m JOIN unnest(@ids, @namespaces) AS t(id, ns) ON m.id = t.id AND m.namespace = t.ns ORDER BY m.id FOR UPDATE`
over distinct `(id, ns)` pairs sorted by id.

**`BatchMintMailboxes`** — no lock, no explicit transaction; 1–2 statements:
1. Dedup on `(ns, key)`. One hoisted `BatchMintMailboxesSql` (replaces `MintMailboxSql`):
   `unnest(...) WITH ORDINALITY` input CTE → `fresh` CTE filtering out keys that already exist
   (`NOT EXISTS`) and ranking fresh mints per `(ns, collection_key)` (`row_number() - 1` as
   `peers_ahead`) → `open_counts` CTE (grouped count of open mailboxes for the distinct collection
   keys) → `INSERT ... SELECT` where `collection_key IS NULL OR COALESCE(oc.n,0) + peers_ahead < @cap`,
   `ORDER BY ns, key` — this table's unique index is `(namespace, idempotency_key)`, so the order
   is the index's own; `InsertIdempotencyKeys` (`Writes.cs:324`) is the same discipline spelled the
   other way round because *its* table's key is `(idempotency_key, namespace)`. What the clause buys
   is that every flush inserts contested keys in one agreed total order, `ON CONFLICT (namespace, idempotency_key) DO NOTHING RETURNING {MailboxColumns}`.
   Intra-batch cap counting works because only fresh rows rank; replays consume no slot.
2. For primaries not returned: classification SELECT joining `unnest(@nss, @keys)` to
   `engine.mailboxes` (the `ClassifyExistingIdempotencyKeys` pattern, `Writes.cs:356`). Row id ==
   candidate id → `Minted` (own insert seen on retry), else `Existing(row)`. Found nowhere →
   `AtCollectionCapacity`. Duplicates inherit: primary `Minted`/`Existing(m)` → `Existing(m)`;
   `AtCollectionCapacity` repeats.

**`BatchDeliverToMailboxes`** — one connection + transaction; 3–8 statements per batch:
1. Dedup on `(MailboxId, Namespace, IdempotencyKey)` — **not** `(MailboxId, IdempotencyKey)`: two
   requests naming one mailbox under different namespaces are different requests, at most one matches
   the row, and folding on the bare pair would answer the foreign-namespace request `Duplicate`,
   inventing a delivery for a mailbox the caller cannot see. BEGIN; sorted lock. Unmatched `(id, ns)`
   → `NotFound` (C#).
2. Idempotency lookup **before refusals**, one statement over distinct pairs (hoisted
   `SelectExistingMailboxDeliveriesSql`): `unnest(@mailbox_ids, @keys)` joined to
   `engine.mailbox_deliveries USING (mailbox_id, idempotency_key)` → `Duplicate(existing)`.
3. C# plan (the `PlanMailboxReceivers` accounting style, `Writes.cs:765`): walk remaining primaries in
   batch order with per-mailbox counter seeded from locked `NextIdx`; disposed → `Closed(locked)`;
   at `maxLogLength` → `LogFull`; else assign `idx = counter++`. Refusals are simply absent from every
   write array.
4. Bump (hoisted `AdvanceMailboxDeliveryCountersSql`):
   `UPDATE engine.mailboxes m SET next_idx = m.next_idx + v.n FROM unnest(@ids, @counts) v(id, n) WHERE m.id = v.id`
   — assert rows-affected. Gaplessness argument = same as `WriteMailboxReceivers`' `next_seq` bump
   (`Writes.cs:916`): both statements commit or neither does, under the held row lock.
5. Insert: plain `INSERT ... SELECT FROM unnest(@mailbox_ids, @idxs, @keys, @payloads, @accepted_ats)`
   (no ON CONFLICT — conflicts unreachable under the lock + step 2).
6. Wake via the generalized release statement (below) with `(mailbox_id, seq=idx, now)` triples,
   `RETURNING mr.mailbox_id, mr.seq` mapped back → `Accepted(..., ReleasedReceiver: true)`.
7. One `NOTIFY` if anything released; COMMIT; after commit
   `new MailboxReleaseCounts(Delivered: totalReleased, Closed: 0).Record()`. Duplicate inheritance:
   primary `Accepted(d,_)`/`Duplicate(d)` → `Duplicate(d)`; refusals repeat.

**`BatchCloseMailboxes`** — one connection + transaction; 3–7 statements:
1. BEGIN; sorted lock; sequential C# fold in batch order: unmatched → `NotFound`; disposed in DB →
   `AlreadyClosed(locked row)`; closed earlier in this batch → `AlreadyClosed(that closed row)`; else
   stage.
2. Set-based close (hoisted `CloseLockedMailboxesSql`):
   `UPDATE engine.mailboxes m SET status='disposed', disposed_reason=t.reason, disposed_at=t.now FROM unnest(@ids, @reasons, @nows) t(id, reason, now) WHERE m.id = t.id RETURNING {MailboxColumns}`
   — rows-affected mismatch throws loud (the "vanished while locked" guard).
3. Release all parked for closed ids (generalized release, `seq = NULL` per mailbox), counted per
   mailbox → `MailboxReleaseCounts(Closed: n)`; `NOTIFY` if any; COMMIT; per-item `result.Record()`
   after commit.
4. **Refactor**: `CloseLockedMailbox` (`Mailboxes.cs:573`) becomes the set-based core
   `CloseLockedMailboxes(conn, tx, lockedRows[], reasons[], nows[])` running steps 2–3. Per-request
   `CloseMailbox` and the sweep's `CloseOverdueMailbox` call it with singleton arrays under their own
   lock/claim — the sweep changes in **no other way**.

### Generalized release statement

Rewrite `ReleaseMailboxReceiversSql` (`Mailboxes.cs:24`) to array parameters — still the single
statement both the wake and the closure release run:
join through `unnest(@mailbox_ids, @seqs, @nows) t(mailbox_id, seq, now)` with
`(t.seq IS NULL OR mr.seq = t.seq)`, keeping guards `mr.released_at IS NULL` / `w.status = @held`,
final `RETURNING mr.mailbox_id, mr.seq`. `@seqs` = `bigint[]` with NULL elements (`long?[]`).
`ReleaseReceiverAt`/`ReleaseAllParkedReceivers` stay as singleton-array wrappers.

### Per-request delegations

`MintMailbox`/`CloseMailbox`/`DeliverToMailbox` keep signatures, activities, `AcquireDbSlot`,
`ExecuteWithRetry`, and logging envelopes, but internally call the batch cores with singleton arrays
and unwrap `results[0]`. Observable differences are nil (a refused singleton delivery commits an empty
tx instead of rolling back — same end state).

## Part 2 — Buffer/service layer (`src/WorkflowEngine.Core/`)

### `BatchBuffer.cs` — `internal abstract class BatchBuffer<TItem, TResult> : BackgroundService where TItem : class, IBufferedRequest<TResult>`

Extracted verbatim from `WorkflowWriteBuffer.cs` mechanics (carry the load-bearing comments over):
- Bounded channel: `FullMode.Wait`, `SingleReader = true`, `SingleWriter = false`.
- `protected Task<TResult> EnqueueItem(TItem, ct)`: `"{Name}.Enqueue"` activity; TCS created by the
  subclass with `RunContinuationsAsynchronously`; **cancellation registration before the channel
  write** (comment at `WorkflowWriteBuffer.cs:68-69`); `WriteAsync`; await TCS.
- `ExecuteAsync`: copy of `WorkflowWriteBuffer.cs:77-158` + the one-line `await Task.Yield()` linger
  from `WorkflowUpdateBuffer.cs:180` (with its comment); greedy drain bounded by `MaxBatchSize` and a
  `protected virtual bool CanAddToBatch(TItem, batch)` hook (default true); semaphore-bounded
  fire-and-forget `FlushAndRelease`; 30s shutdown drain (acquire all permits → drain channel → final
  flush → `TrySetCanceled` leftovers).
- `FlushBatch`: canceled-caller filtering; `"{Name}.FlushBatch"` activity with `batch.size` tag +
  `ActivityLink`s from each item's `TraceContext` (`WorkflowWriteBuffer.cs:179-190` pattern);
  `IServiceScopeFactory` scope → `IEngineRepository` → `await FlushCore(batch, repo, ct)`;
  `OperationCanceledException` → `TrySetCanceled` all; other exceptions → log + `activity?.Errored` +
  `TrySetException` all.
- `internal int QueueDepth => _channel.Reader.Count;` shared `LoggerMessage` partials with a
  `{Buffer}` parameter.

### `MailboxBuffers.cs` — three sealed subclasses

- `MailboxMintBuffer` / `MailboxCloseBuffer` / `MailboxDeliveryBuffer`, each: a public
  `Enqueue(...)` building its record (TraceContext = `Activity.Current?.Id`) and a `FlushCore` calling
  its batch repo method and fanning results out positionally with `TrySetResult` (all mailbox verdicts
  are ordinary results — no per-item exceptions). Caps (`MaxOpenMailboxesPerCollection`,
  `MaxMailboxLogLength`) come from injected `IOptions<EngineSettings>` and are passed to the repo call.
- `MailboxDeliveryBuffer` overrides `CanAddToBatch` with a cumulative payload-byte budget (const,
  e.g. 4 MB) so a batch of ≤100 × `MaxMailboxPayloadSize` payloads can't build one enormous command.

### `Engine.cs` (`MintMailbox:511`, `CloseMailbox:543`, `DeliverToMailbox:591`)

Constructor gains the three buffers (like the existing `WorkflowWriteBuffer` param). Each method keeps
its validation (`ValidateMailboxRequest:478`, `ValidateMailboxDeliveryRequest:565`), id/`now` minting,
and verdict-shaped metrics (`Metrics.MailboxesCreated` on `Minted`; `MailboxDeliveriesReceived` per
outcome incl. pre-DB refusals); only `repository.X(...)` becomes `buffer.Enqueue(...)`. Commit-gated
metrics stay in the repository (close `result.Record()`, release counts) — the buffer fan-out records
nothing. No new backpressure/429s on any of the three paths.

### Settings & DI

- `EngineSettings.cs` (Models): `BatchBufferSettings { MaxBatchSize, MaxQueueSize, FlushConcurrency }`
  + `MailboxBufferSettings { Mint, Close, Delivery }`; property `MailboxBuffers`
  (`[JsonPropertyName("mailboxBuffers")]`), after `UpdateBuffer`.
- `Constants/Defaults.cs`: Mint `{100, 5_000, 2}`, Close `{100, 5_000, 1}` (serial — closes lock
  mailbox *and* workflow rows), Delivery `{100, 10_000, 2}` (low concurrency: single-mailbox storms
  just convoy on the row lock). Worst case +5 connections; buffer total 16 of pool 90.
- `Extensions/ServiceCollectionExtensions.cs`: register the three as singleton + hosted service after
  the `WorkflowUpdateBuffer` block (line 71), before the load-bearing `HeartbeatService` ordering
  comment (73-76) — extend that comment; back-fill the nine `<= 0` defaults in
  `SetEngineSettingsDefaults()` (after line 263).

### Telemetry

`Telemetry/Metrics.cs`: `engine.mailbox_buffer.flushed` counter (tag `operation` = mint/close/delivery,
mirroring `engine.update_buffer.flushed`) + `engine.mailbox_buffer.depth` ObservableGauge fed by
`MetricsCollector` each tick from the three `QueueDepth`s.

## Part 3 — Tests

- **Unit** (`tests/WorkflowEngine.Core.Tests/`, `[Collection("BackgroundServiceTests")]`, gate-TCS
  trick + mocked `IEngineRepository` from `WorkflowWriteBufferTests.cs`):
  `MailboxDeliveryBufferTests` (full mirror: single flush, concurrent batching, batch split, mixed
  verdicts positional fan-out, repo throw faults all, pre-canceled token, canceled-while-waiting
  filtered, shutdown drain, payload-byte budget splits batch), `MailboxMintBufferTests` and
  `MailboxCloseBufferTests` (smaller: single flush, mixed verdicts, repo throw;
  `SerialFlushConcurrency_SecondBatchWaitsForFirst` for close).
- **Repository** (`tests/WorkflowEngine.Repository.Tests/`, new `MailboxBatchTests.cs`) — sentence
  style: consecutive positions in batch order; same key twice in one batch → one row + first's
  position; replayed key on closed mailbox → `Duplicate` not `Closed`; refused items write nothing
  while batch-mates commit; log filled mid-batch refuses overflow, keys stay free; counters advance by
  exactly the accepted count; batch + all its wakes share one `xmin`; concurrent batches assign every
  position exactly once (sorted-lock non-deadlock); close: closes every open + releases every parked,
  same-mailbox-twice replies original disposal, racing the sweep collapses to one disposal, batch +
  releases share one `xmin`; mint: same key twice mints once, fresh mints count each other against the
  cap (cap 2, three fresh → two `Minted` + one `AtCollectionCapacity`), replayed key answered at the
  cap consuming no slot, concurrent same-key batches create exactly one mailbox.
- **Existing suites stay green unchanged** (delegation preserves per-request semantics):
  `MailboxTests`, `MailboxDeliveryTests`, `MailboxRendezvousTests` (xmin tests assert equality only —
  verified), `MailboxReceiverTests`, `MailboxSweepTests`, `MailboxReceiptTests`. All
  `tests/WorkflowEngine.Integration.Tests/Mailbox*.cs` pass unchanged — they are the HTTP contract.
- **QueryPlanTests**: rewrite the mint plan test against `BatchMintMailboxesSql` (singleton arrays);
  new plans for the lock, existing-deliveries lookup, close UPDATE, and the array-join release
  statement (must probe the `(mailbox_id, seq)` PK); re-verify `.snapshots/`.

## Part 4 — Docs

- `docs/technical-guide.md` (normative mailbox spec): serialization-point section (~851-869) — the
  delivery/close transaction is now a batched flush locking every distinct mailbox in sorted order as
  its first act, same discipline, plural rows; config: new "Mailbox Buffers" table after "Write
  Buffer" (~1446); mailbox metrics table: the two new buffer metrics; limits section: the delivery
  buffer's bounded queue waits rather than refuses, preserving the no-admission-gate rule.
- Workflow-engine `AGENTS.md`: extend the write-buffer bullet and the mailbox invariants block (batched
  buffers, unchanged HTTP semantics, sorted-batch lock discipline).

## Suggested commit sequencing (jj, on top of feat/workflow-engine-mailbox)

1. Generalize the release statement + wrappers + its plan test (pure refactor, all green).
2. Extract set-based `CloseLockedMailboxes`; rewire per-request close + sweep (observably unchanged).
3. Buffered records + the three batch repo methods + singleton delegations + `MailboxBatchTests` +
   QueryPlanTests updates.

   **Split by the orchestrator** — one batch method per revision, since all three touch
   `EngineRepository.Mailboxes.cs` and `IEngineRepository` and cannot land in parallel:
   - **3a**: `IBufferedRequest<TResult>` + `BufferedMailboxCloseRequest` + the shared
     `LockMailboxesForMutationSql` + `BatchCloseMailboxes` (its core landed in step 2) +
     `CloseMailbox` singleton delegation + close batch tests.
   - **3b**: `BufferedMailboxMintRequest` + `BatchMintMailboxes` + `MintMailbox` delegation +
     mint batch tests + the mint plan-test rewrite.
   - **3c**: `BufferedMailboxDeliveryRequest` + `BatchDeliverToMailboxes` + `DeliverToMailbox`
     delegation + delivery batch tests + a plan test for the existing-deliveries lookup. (The
     shared lock's plan test landed in 3a, measured at a 100-wide batch — do not add a second.)

   Each sub-step adds only its own buffered record, so no type sits unused (the build treats
   analyzer warnings as errors under `CI=true`).

   **Naming convention settled in 3a** (apply in 3b/3c without re-litigating): a hoisted SQL
   const is named `<the method that runs it>Sql`; a lock-acquiring orchestrator says so
   (`LockAndCloseMailboxes`), which applies to delivery but **not** to mint (lock-free by
   invariant 4); the public `Batch…` entry point stays a thin envelope — activity, positional
   `Record()` after the core returns, `DbOperationsSucceeded`, `FailedToBatch…` log, no DB slot,
   no retry. Each positional result array carries the `BatchEnqueueWorkflows`-style
   `UnreachableException` completeness guard.

   **Hazards found in 3b, binding on 3c:** verify every array statement's plan at **width 100**,
   not only the pinned width — mint's `open_counts` written as a `GROUP BY` over a join planned
   as an index-only nested loop at width 1 and flipped to a `Hash Join` over a bitmap heap scan of
   *every open mailbox* at width 100. `AS MATERIALIZED` plus a correlated per-distinct-key probe
   is what pinned the shape at both widths; `SelectExistingMailboxDeliveriesSql` is exposed to the
   same flip. Also: `TupleArrayExtensions.Unzip` tops out at **7** arrays and mint uses all seven —
   extend `Unzip` rather than falling back to parallel arrays. Name delivery's inheritance helper
   `RepeatOfDelivery` (Sonar S4136 fires on a third `RepeatOf` overload). Plan tests are named
   after the statement or helper they explain.

   **Measuring array-statement plans (settled in 3b/3c):** array length must be **planner-visible**
   or the measurement is void — `unnest()` of an opaque array expression is estimated at a fixed 10
   rows regardless of length, so `array_agg`/`generate_series` scalar subqueries make every width the
   same query. Use `QueryPlanHelper` with bound `NpgsqlParameter<T[]>` values, or literal `ARRAY[…]`
   constants. Pin **both** width 1 and width 100 as snapshots (one `[Fact]`, two
   `VerifyJson(...).UseTextForParameters(...)`), since both run in production — per-request
   delegation and buffered flush respectively. The regression to look for is not a seq scan but an
   index scan that **loses its leading-column restriction**: `AssertUsesIndexScan` passes it,
   `AssertIndexCondContains` with alias-qualified fragments catches it.
4. Settings/defaults/back-fill + `BatchBuffer` base + three buffers + unit tests.
5. Engine + DI wiring (endpoints now batched) + metrics/MetricsCollector.
6. Docs; `/format` skill before each commit.

## Verification

1. `dotnet test` for Core.Tests, Repository.Tests (Testcontainers), Integration.Tests — the
   integration mailbox suites passing unchanged is the semantic gate.
2. QueryPlanTests snapshots re-verified (index probes, no seq scans under the new array shapes).
3. k6: `.k6/mailbox-storm-compare.sh` before/after (`/k6` skill). Gates: `buffered_deliveries` arm
   (single-mailbox contention) shows fewer connections/statements per delivery and no 429 regression at
   the log cap; `relay_exchanges` end-to-end not regressed; recorded baseline ≈0.205 ms server-side
   statement time per stored message.
4. `/format` (CSharpier + build) clean.

## Worker/reviewer protocol (orchestrated implementation)

This plan is executed by an orchestrator that spawns one worker agent per step and one reviewer agent
per step. Everyone follows the rules below.

### Version control

- **Use `jj`, not `git`.** Never run `git` mutating commands.
- Top-level folders may be separate jj repositories: run `jj root` from a path you are about to touch
  before assuming which repo you are in.
- Before writing any code: if the current jj revision is non-empty (`jj status` shows working-copy
  changes, or the revision has a description), create a new child revision (`jj new`) and work there.
- **Do not push.** **Do not move bookmarks.** **Do not revert or discard unrelated user changes**
  (e.g. pre-existing modifications outside this plan's scope).

### Reporting

Subagents cannot message the orchestrator mid-run. They report by **ending their run with a structured
final report**. A blocked worker ends the run with a `BLOCKED` report rather than waiting for an answer.

**Worker final report** must contain:

- step name
- `READY_FOR_REVIEW` or `BLOCKED` marker (`BLOCKED` includes the reason and what is needed)
- jj change ids / revision ids created
- changed files
- tests run (commands + pass/fail)
- notes for later steps

**Reviewer final report** must contain:

- `APPROVED` or `CHANGES_REQUESTED` as the verdict, with **findings first**
- residual non-blocking gaps, explicitly marked as non-blocking

### Scope

- Implement exactly the step's scope. Do **not** implement later-step behavior, even when it looks
  trivially adjacent.
- If a step is too broad to land coherently, update this plan with the smallest coherent split and end
  the run with `BLOCKED_FOR_SCOPE_SPLIT`.
- Reviewers review only: they must not modify files. Running tests, builds, and formatters that do not
  write source changes is fine.

### Step status

Steps are the "Suggested commit sequencing" list above. Status is maintained by the orchestrator:

| # | Step | Status |
| - | ---- | ------ |
| 1 | Generalize the release statement + wrappers + plan test | approved (rev `wklrlkux`) |
| 2 | Set-based `CloseLockedMailboxes`; rewire per-request close + sweep | approved (rev `vmkvkskm`) |
| 3a | `IBufferedRequest` + close record + `BatchCloseMailboxes` + delegation + tests | approved (rev `znmokzmk`) |
| 3b | Mint record + `BatchMintMailboxes` + delegation + tests + plan test | approved (rev `vrtlnnwu`) |
| 3c | Delivery record + `BatchDeliverToMailboxes` + delegation + tests + plan tests | approved (rev `vlwlmykw`) |
| 4a | Settings/defaults + `BatchBuffer` base + `MailboxDeliveryBuffer` + unit tests | approved (rev `zutkonsw`) |
| 4b | `MailboxMintBuffer` + `MailboxCloseBuffer` + unit tests | approved (rev `usmvpxmy`) |
| 5 | Engine + DI wiring + metrics/MetricsCollector | approved (rev `srmqmtkm`) |
| 6 | Docs | approved (rev `kwsxvlkn`) |
| 7 | k6 mailbox-storm-compare (plan Verification item 3) | approved (measurement; no revision) |
| 8 | Docs: name the load the win needs; fix the depth-gauge claim | approved (rev `zxtknsvk`) |
| 9 | Make batching observable in prod (flush counter) | approved (rev `kyunmrzs`) |

**All eight steps approved.** Final stack, tip first — no divergence, no conflicts, nothing pushed, no
bookmark moved:

| revision | contents |
| --- | --- |
| `zxtknsvk` | docs: name the load the batching win needs; correct the depth gauge |
| `kwsxvlkn` | docs: document the batched mailbox buffers |
| `srmqmtkm` | feat: serve the mailbox endpoints from the channel buffers |
| `usmvpxmy` | feat: batch mailbox mints and closures through channel buffers |
| `zutkonsw` | feat: batch mailbox deliveries through a channel buffer |
| `vlwlmykw` | feat: deliver a whole batch of mailbox messages in one transaction |
| `vrtlnnwu` | feat: mint a whole batch of mailboxes in one statement |
| `znmokzmk` | feat: close a whole batch of mailboxes in one transaction |
| `vmkvkskm` | refactor: close mailboxes through one set-based statement |
| `wklrlkux` | refactor: release mailbox receivers through one array statement |
| `suqxxmmp` | fix: drop a duplicated doc summary tag that breaks the CI build |
| `kywkwsww` | add mailbox batch plan (this file) |

**One claim in the stack is neither build-checked nor test-checked**: `Metrics.MailboxBufferDepth`'s
docstring states a 5 s collection interval and a 10 s export interval, but `WorkflowEngine.Telemetry`
has no project reference to `Models` or `Core` (seven `PackageReference`, zero `ProjectReference`), so
those numbers cannot be crefs — `MetricsCollectionInterval` lives in `Defaults.cs` and the export
interval in `Telemetry/Extensions/ServiceCollectionExtensions.cs:172`. Whoever changes either setting
must update that prose by hand. The mitigation in place is that the guide's copy of the same fact sits
beside the setting that owns it, so the two would have to drift independently.

**What the stack deliberately leaves open**: the batching win needs load the shipped k6 configuration
never produces, and **no engine metric can tell an operator whether batching is happening in
production**. The docs now say both honestly, which is the right end state for this plan — but it means
the feature ships with its central benefit unobservable from outside. Step 9 would close that; leaving
it unscheduled was a deliberate decision — **and the user has now scheduled it as step 9.**

## Step 9 — a flush counter (scheduled by the user)

One counter incremented by **1** per flush, tagged `operation`, emitted from
`BatchBuffer.FlushBatch` immediately after `await FlushCore(...)` returns inside the `try` — beside the
existing `Add(batch.Count)`, which is the only point where a batch is known to have been answered
without faulting. Mean batch size then becomes `flushed ÷ <new counter>`: two counters, same tag, both
already in the OTLP pipeline, no database access, per-path for mint/close/delivery.

**Naming hazard to settle deliberately.** `engine.mailbox_buffer.flushed` counts **requests**. A new
`…flushes` counting **flushes** would be one letter apart with different units — precisely the trap an
earlier review flagged when checking whether `flushed` matched `engine.update_buffer.flushed`'s units.
`engine.mailbox_buffer.batches` reads unambiguously against `flushed`; the worker should choose with
reasons rather than defaulting.

**Step 8's text becomes false and must be corrected in the same revision.** Two statements it added:
"No mean batch size can be derived from it: the engine emits no flush count", and "**Whether batching
is happening is not answerable from the metrics the engine emits**". Both were true when written and
are not after this step. The `pg_stat_statements` recipe should stay as the way to get the
accepted-per-*accepting*-flush figure and as a cross-check, but it is no longer the only answer. The
`AGENTS.md` clause about `depth` not showing whether batching is happening **stays true** — depth is
still a coarse sample; it is the *absence of any alternative* that changes.

**Note the asymmetry this introduces**: `WorkflowWriteBuffer`/`WorkflowUpdateBuffer` emit no flush count
either, and this plan leaves them untouched. Adding one only to the mailbox buffers is deliberate —
their crossover is the thing step 7 discovered — but it is worth a word in the metrics table so nobody
reads the omission elsewhere as an oversight.

**Naming settled: `engine.mailbox_buffer.batches`** (C# `MailboxBufferFlushedBatches`, pairing with the
existing `MailboxBufferFlushedItems` so the field names carry the units the metric names can't). The
decisive argument against `…flushes`: confusing a one-letter-apart pair that sorts adjacent in any
metric browser makes a dashboard divide a series by itself and yield **1.00** — precisely the reading
"batching is not happening", the one conclusion the counter exists to let an operator distinguish from
the truth. A wrong metric that looks broken is recoverable; one that reads as a plausible 1.0 is not.
`batches` is also already the domain's word (`BatchBuffer`, `MaxBatchSize`, the `batch.size` tag), so
`flushed ÷ batches` reads as "requests per batch" — the quantity's own name.

**Known limitation of the instrument, not a defect:** a mean hides bimodality. `flushed ÷ batches`
reads 5.0 both for ten flushes of 5 and for five flushes of 1 plus five of 9, and the second — a
saturating buffer — is the interesting case. A histogram of batch size would separate them; the
`pg_stat_statements` cross-check does not. **Two clauses left unwritten deliberately**, on the
reviewer's judgment that neither earns a revision of its own — fold them in if anything else ever
touches those bullets:

1. **The mean's blind spot is not in the guide.** It covers the two ends (a ratio of 1.0, and one near
   `maxBatchSize`) but not the middle that hides a bimodal distribution. The natural complement is
   already adjacent: a *sustained* depth reading, since bimodality means the queue is filling between
   flushes.
2. **A subtlety in the quantity-matching, recorded so nobody rediscovers it and mistakes it for an
   error.** Strictly the 1.25 crossover normalizes per *stored message* — five statements per accepting
   flush against four per accepted delivery — so the exact quantity is accepted-per-accepting-flush
   (which is why 5 ÷ 3.86 = 1.295 matched the measured 1.3), not requests-per-flush. `flushed ÷ batches`
   is therefore an approximation, but it **errs benignly**: refusals raise the observed ratio, and they
   also raised the *old* path's cost per stored message (it spent two statements rejecting every
   duplicate or refusal), so the true break-even moves down as the observed ratio moves up. Both shift
   the same way, and the guide already states the divergence, quantifies it at under 0.5 % in the
   measured storm, and points at `pg_stat_statements` for a heavily-refusing workload.

**The counter has never run at `FlushConcurrency > 1`.** No correctness concern — `Counter<long>.Add` is
lock-free and both increments happen on the same thread in adjacent statements, so the *ratio* is
immune to concurrency — but the absolute rate has no measured baseline, so the first production reading
will also be the first at real flush concurrency.

## Final state: nine steps, thirteen revisions, all approved

| revision | contents |
| --- | --- |
| `kyunmrzs` | feat: count mailbox buffer flushes so batching is observable |
| `zxtknsvk` | docs: name the load the batching win needs; correct the depth gauge |
| `kwsxvlkn` | docs: document the batched mailbox buffers |
| `srmqmtkm` | feat: serve the mailbox endpoints from the channel buffers |
| `usmvpxmy` | feat: batch mailbox mints and closures through channel buffers |
| `zutkonsw` | feat: batch mailbox deliveries through a channel buffer |
| `vlwlmykw` | feat: deliver a whole batch of mailbox messages in one transaction |
| `vrtlnnwu` | feat: mint a whole batch of mailboxes in one statement |
| `znmokzmk` | feat: close a whole batch of mailboxes in one transaction |
| `vmkvkskm` | refactor: close mailboxes through one set-based statement |
| `wklrlkux` | refactor: release mailbox receivers through one array statement |
| `suqxxmmp` | fix: drop a duplicated doc summary tag that breaks the CI build |
| `kywkwsww` | add mailbox batch plan (this file) |

991 tests pass. The 219 integration and 333 repository assertions passed **unmodified** through the
switch to the buffered path. Nothing pushed, no bookmark moved, no divergence, no conflicts.

## Comment reduction pass (`mwsvptvm`, on top of `kyunmrzs`)

Requested by the user: the stack drifted from this area's own `AGENTS.md` rule — *"Be extremely sparse
with inline comments. If a pattern is not self-describing, it likely needs refactoring."* Nine review
rounds in which four findings were false-or-misleading comments taught every worker that explaining the
*why* was how you passed review; nobody was measuring the total.

| | `///` | `//` | total | share of added lines |
| --- | --- | --- | --- | --- |
| before | 638 | 320 | 958 | 15.2 % |
| after pass 1 | 484 | 163 | 647 | 10.8 % |
| **after pass 2** | **482** | **159** | **641** | **10.7 %** |
| total cut | −156 (−24 %) | −161 (−50 %) | **−317 (−33 %)** | |

The second pass was the reviewer's own seven-item list: three narration comments cut, three repeated
comments deduplicated or halved (three copies of a rule is padding; one is documentation), seven
`Hoisted so QueryPlanTests can EXPLAIN …` tails shrunk to `Hoisted for QueryPlanTests.`, and the
metric-ownership rule restored as **one clause on the `BatchBuffer` class** — the right home, since the
person who would violate it is a subclass author adding a counter inside their own `FlushCore`, and they
read the class. `EngineRepository.Mailboxes.cs` now carries 49 inline comments across ~2 000 lines, down
from 90.

Of the 163 remaining inline comments, **101 are in tests and 76 of those are the bare
`// Arrange` / `// Act` / `// Assert` markers the `/test` skill mandates** — so ~62 in source and ~25
real ones in tests. All eleven load-bearing comments survive, compressed (the bounds-vs-nullable-position
note now carries the measurement: "a measured 100x the reads").

**Where a comment is compensating for code that is not self-describing** — reported, deliberately not
refactored, since the user asked for a comment pass:
1. `ReleaseMailboxReceivers`' non-overlap precondition is **prose only** — nothing checks it, and a
   violation silently stamps an arbitrary element's `Now`. The sibling precondition in
   `CloseLockedMailboxes` *is* enforced (it throws on a repeated id). A guard would let the comment go.
2. `_ = mint.Enqueue(...)` in `MetricsCollectorTests` needs prose to say the discard is deliberate and
   that `Enqueue` runs synchronously up to its await; a `QueueWithoutAwaiting(...)` helper would carry
   that in its name.
3. `MailboxDeliveryBuffer.CanAddToBatch` recomputes the batch's payload total per candidate, which is
   why the constant's docstring must explain the O(1) `string.Length` choice; a running total would make
   the unit choice uninteresting.
4. `BatchBuffer.FillBatch`'s peek-then-read needs a comment asserting single-reader-ness because the
   two-step is only safe under it; holding the peeked item in a field would not.
5. **`// Expected on shutdown` cannot be removed — it satisfies SonarAnalyzer S108, not the reader.**
   Deleting it makes the block `catch (OperationCanceledException) when (…) { }` and fails the build:
   `error S108: Either remove or fill this block of code`. S108's only exception for an otherwise-empty
   block is a comment inside it, and warnings are errors under `CI=true`. Both pre-existing sibling
   buffers carry the identical comment in the identical position for the identical reason
   (`WorkflowWriteBuffer.cs:118`, `WorkflowUpdateBuffer.cs:193`), so the house pattern was never
   narration. The honest fix is an analyzer suppression or a no-op statement — neither belongs in a
   comment pass. **Both the reviewer and the orchestrator were wrong to call this one narration; the
   compiler settled it.**

**On the unenforced non-overlap precondition (item 1 above): prose is the right level.** The asymmetry
with `CloseLockedMailboxes` is justified by consequence, not oversight — a duplicate close id produced a
*loud, misattributed* failure (the rows-affected guard blaming a mailbox that never vanished), which is
why it earned a throw. An overlapping release range produces a *quiet, cosmetic* one: the release is
still correct, only which element's `Now` lands in `released_at` is arbitrary, and the blast radius is a
slightly-wrong sample in the wake-latency histogram. Enforcement would cost an O(n) pass to prevent a
timestamp being one of two nearly-identical values. If anyone wants symmetry later, the honest version is
a cheap **assertion**, not a throw — and the docstring should then say the check is for developer error,
not a caller contract.

**Process note worth keeping.** The review process that produced 958 comments and the one that cut them
to 647 were both working correctly: the first optimised *truth per comment*, the second *volume across
the file*, and nobody was ever asked to optimise both at once. The cheap fix is not a stricter bar on
individual comments but one question asked once at the end of a stack: **"which of these sentences would
a reader have to delete before breaking something?"** That question produces the trim directly, in one
pass rather than nine.

**Step 4 split by the orchestrator** (Part 2 is too large for one reviewable revision):
- **4a**: `EngineSettings`/`Constants/Defaults.cs` + default back-fill, the `BatchBuffer<TItem,TResult>`
  base extracted from `WorkflowWriteBuffer`, and `MailboxDeliveryBuffer` — the hardest subclass
  (payload-byte budget via `CanAddToBatch`) — with the plan's full delivery-buffer test mirror. The
  base needs a concrete subclass to be testable, so it lands with one.
- **4b**: `MailboxMintBuffer` + `MailboxCloseBuffer` and their smaller test sets (single flush, mixed
  verdicts, repo throw; plus `SerialFlushConcurrency_SecondBatchWaitsForFirst` for close).

Engine/DI wiring stays in step 5, so no buffer is reachable from an endpoint until then.

**Where the extraction was *not* verbatim** (found in 4a; the plan assumed a clean copy of
`WorkflowWriteBuffer`'s mechanics):
1. **The shutdown drain is bounded.** The original appends every remaining channel item into one
   final batch, ignoring `MaxBatchSize` — which for deliveries would build one command out of up to
   `MaxQueueSize` × `MaxMailboxPayloadSize`, contradicting the payload budget this step adds. 4a's
   drain loops fill→flush under the same bounds, keeping the 30 s timeout and the timed-out
   cancellation path. `WorkflowWriteBuffer` keeps its unbounded drain either way.
2. **The greedy drain peeks before it reads**, because `CanAddToBatch` can only hold an item back
   while it is still in the channel: `TryPeek` → hook → `TryRead`. A held-back item leads the next
   batch.
3. **The payload budget counts UTF-16 code units, not bytes** (`MaxBatchPayloadUnits`), because
   `Encoding.UTF8.GetByteCount` at per-candidate frequency would rescan gigabytes per flush. UTF-8
   uses 1–3 bytes per code unit, so a 4 MiB unit budget bounds one command's payload under 12 MiB.
   The const is named "units" deliberately — calling a char count "bytes" would be a false comment.

**Step 5 must not configure `BackgroundServiceExceptionBehavior`.** `BatchBuffer`'s class remarks
record why: `FillBatch`'s assertion has no catch, so it escapes as an unhandled background-service
exception and stops the process under the framework default `StopHost` — the wanted direction, since
under `Ignore` the drain loop would be dead behind a channel that still accepts writes and waits when
full, leaving callers blocked forever with neither an error nor a refusal (a silent breach of
invariant 6). `CompleteInOrder`'s assertion, by contrast, sits inside `FlushBatch`'s `try` and faults
only its own batch.

**Step 5 telemetry threading** (from 4a): put `engine.mailbox_buffer.flushed` in
`BatchBuffer.FlushBatch` immediately after `await FlushCore(...)` returns inside the `try` — the only
point where a batch is known answered without faulting. Pass the `operation` tag as a ctor parameter
alongside the settings rather than deriving it from the buffer name. The depth gauge reads the
existing `internal int QueueDepth`. 4b confirms `BatchBuffer` needs exactly **one**
change for this: an `operation` tag ctor parameter alongside `BatchBufferSettings`, with each subclass
passing `"mint"`/`"close"`/`"delivery"` — nothing else in the subclasses is affected.

**Step 5 registration notes** (from 4b): all three buffers share the ctor shape
`(IServiceScopeFactory, ILogger<T>, IOptions<EngineSettings>)`, so each registers with the
`WorkflowWriteBuffer` pattern at `ServiceCollectionExtensions.cs:67-71` — `AddSingleton<X>()` plus
`AddHostedService(sp => sp.GetRequiredService<X>())`. They **must** stay singletons: each snapshots
its settings in the ctor and owns one bounded channel. Registering after the `WorkflowUpdateBuffer`
block and before the `HeartbeatService` comment puts them on the right side of the shutdown-order
rule — hosted services stop in reverse registration order, so the buffers stop *after* the processor,
and a buffer that stopped early would strand its 30 s drain. The nine `<= 0` back-fills already
landed in 4a, so step 5 adds registration only. `MailboxMintResult.Invalid` /
`MailboxDeliveryResult.Invalid` are produced only by `Engine`'s validation — no repository path
returns them — so the pre-DB refusals must stay in front of the buffer. Confirmed in 4b's review by grep
across all of `src`: `MailboxMintResult.Invalid` is constructed only in
`Engine.ValidateMailboxRequest`, `MailboxDeliveryResult.Invalid` only in
`Engine.ValidateMailboxDeliveryRequest`, and there are **zero** constructions in
`WorkflowEngine.Data`; every other reference is a consumer (the endpoint's Problem mapping, the
outcome metric tag). `MailboxCloseResult` has no `Invalid` case at all, which is why close's
`Enqueue` validates nothing.

**Test-helper duplication**: `WaitForQueueDepth` is now verbatim in two buffer test files. Leave it at
two; if step 5's wiring tests want a third copy, extract it then as
`WaitForQueueDepth<TItem, TResult>` (`QueueDepth` is declared on the generic base, so it lifts
cleanly). The other helpers differ in substance across files and sharing them would need generics plus
factory delegates — more machinery than the duplication removes.

**Observable changes step 5 introduces** (none an HTTP-contract change; step 6 should document 1-4):
1. **The three mailbox writes lose their per-request retry and DB-slot envelope.** Per invariant 7 the
   batch methods take neither, and the per-request methods that keep both are now **test-only**. A
   transient DB fault the repository used to retry internally now faults the whole batch, so up to 100
   callers get a 500 and convergence is by their own retry plus idempotency. This is the largest
   delta and **nothing exercises it** — no integration test injects a transient fault. It matches
   `WorkflowWriteBuffer`/`BatchEnqueueWorkflows`' existing precedent.
2. The three buffered endpoint writes no longer consume `IConcurrencyLimiter` DB slots; flush
   concurrency (2/1/2) is the bound. The sweep and the mailbox reads still take slots, so
   `engine.slots.db.used` still sees mailbox activity — just not those three write paths. Worst case
   +5 pooled connections, as costed.
3. `engine.db.operations.success` now counts once per flush on these three paths.
4. Trace shape: a mailbox request span no longer parents the repository span; it contains
   `{Buffer}.Enqueue`, and the DB work is a separate `{Buffer}.FlushBatch` trace tied back by
   `ActivityLink`.
5. Concurrently arriving mints/closes/deliveries share a transaction, so their `xmin` is shared. The
   repository xmin tests assert equality only and still hold. The sweep keeps its own per-mailbox
   transaction.
6. **Cancellation window widened**: a token firing before the flush drops the request from the batch
   (nothing written); firing after the flush started commits the write while the caller is answered
   canceled. Idempotency makes a client retry converge, but "client timed out" no longer implies
   "not written".

**Step 6 docs checklist** (the plan's Part 4 plus what step 5's review added):
- Serialization-point section (~851-869): the delivery/close transaction is now a batched flush locking
  every distinct mailbox in sorted order as its first act — same discipline, plural rows.
- New "Mailbox Buffers" config table after "Write Buffer" (~1446):
  `mailboxBuffers.{mint,close,delivery}.{maxBatchSize,maxQueueSize,flushConcurrency}` =
  {100, 5000, 2} / {100, 5000, 1} / {100, 10000, 2}.
- Mailbox metrics table: `engine.mailbox_buffer.flushed` (counts **items**, tagged `operation`) and
  `engine.mailbox_buffer.depth`.
- Limits section: the delivery buffer's bounded queue **waits rather than refuses**, preserving the
  no-admission-gate rule.
- **The three buffered endpoint writes no longer consume `IConcurrencyLimiter` DB slots**, so
  `engine.slots.db.used` under-reports *them* and `MaxDbOperations` no longer throttles them — the
  effective bound is `FlushConcurrency` (2 + 1 + 2). **Scope this precisely**: the deadline sweep still
  takes a slot (`EngineRepository.Mailboxes.cs:1183, 1221`) and so do the mailbox reads, including
  `ReadMailboxReceipt` (`:771`) on every rendezvous. "Mailbox writes are outside the DB pool" is false
  as written. Existing config/metrics tables mislead without the correction, and an operator sizing the
  pool or setting an alert threshold would act on the over-general version.
- `engine.db.operations.success` now counts once per flush on these three paths.
- Tracing section: a mailbox request span holds `{Buffer}.Enqueue`; the DB work is a separate
  `{Buffer}.FlushBatch` trace joined by `ActivityLink`. Concurrent requests share a transaction and
  therefore an `xmin`.
- The cancellation window: cancelling a caller does not cancel a flush already in progress, so a
  canceled call may still have committed, and replaying the same idempotency key is how a caller finds
  out. No documented contract is weakened by this (checked against the guide and AGENTS.md), but it is
  the assumption an integrator makes silently.
- AGENTS.md: extend the write-buffer bullet and the mailbox invariants block (batched buffers,
  unchanged HTTP semantics, sorted-batch lock discipline).

**Step 7 (k6) minimum useful measurement**, per step 5's review: two numbers from the
`buffered_deliveries` arm at one concurrency level — peak connections held (`pg_stat_activity`) and
server-side statements per stored message (`pg_stat_statements` delta ÷ messages). Those two *are* the
thesis. Plus one assertion rather than a comparison: no 429 regression at the log cap, since
`LogFull` → 429 is the only refusal on this path and the batch now decides it against a mid-batch
position rather than the pre-call counter — the one verdict whose *timing* changed.

**Numbers step 6's docs now commit to, which step 7 should keep honest**: "5 connections" as the whole
mailbox connection budget (the sum of the three flush concurrencies), and
`engine.db.operations.success` counting once per flush on these three paths. Note also that
`engine.mailbox_buffer.flushed` counts **requests, not flushes**, so it cannot give batch fill — the
engine emits no flush count today. The no-429 rule is now normative in two places in the guide
(Limits, Deliveries table), so a 429 regression at the log cap contradicts the documentation, not just
this plan.

**Orchestration lesson (recorded so it is not repeated):** two implementation workers must never share
one jj working copy. `jj new` adopts whatever is on disk regardless of which files each worker
"owns", so disjoint file sets do **not** protect against collision — a step-5 follow-up and step 6
overlapped this way and step 6's revision had to be repaired (`yzmomtlv` → `kwsxvlkn`). Worker plus
reviewer in parallel is safe, since reviewers only read; but a reviewer should not run `dotnet`
against a mid-edit tree.

**Snapshot drift is a real local hazard.** `VerifierSettings.AutoVerify(includeBuildServer: false)`
(`Repository.Tests/ModuleInitializer.cs:13`) silently rewrites a `.verified.txt` when a plan changes,
so a genuine regression is auto-accepted on a dev machine and only fails on the build server. One
drifted into a revision this way (planner nondeterminism on
`CountOverdueOpenMailboxes_UsesIndexScans`, not a real change) and had to be restored from the parent.
**After any local Repository/Integration run, check `jj status` for `.snapshots/` drift before
reporting.**

**Pre-existing gap found while documenting (not introduced by this stack, not fixed):** the deadline
sweep's *closes* are invisible in `engine.db.operations.success`. That counter is incremented by
`ExecuteWithRetry`'s success callback (`EngineRepository.Resilience.cs:20`) plus the three explicit
`Add(1)` calls in the batch methods, and `CloseOverdueMailbox` deliberately runs **outside**
`ExecuteWithRetry` — its docstring says "No `ExecuteWithRetry`: the sweep's cadence is its retry"
(`Mailboxes.cs:1211-1213`) — so an overdue close counts nothing. Only the sweep's candidate scan
counts, once per pass (`:1186`). Worth knowing before anyone reasons about mailbox write volume from
that counter. Reviewer's judgment: a plan note is proportionate — the sweep
has better instruments than a generic DB counter (`engine.mailboxes.closed{reason=deadline}`,
`engine.mailboxes.receivers.released{cause=closed}`, and the sweep result's own counts), so this is
metric completeness rather than correctness and does not warrant a step.

## Step 7 — the measurement brief (sharpened after step 6, because the docs now commit to numbers)

Five falsifiable checks rather than a trend comparison:

1. **Verify the documented "5 connections", don't just observe a peak.** From `pg_stat_activity`, the
   buffered-delivery arm must never show more than **2** concurrent backends doing delivery flush work,
   and the engine's total should sit at its `MaxDbOperations`-bound work **+ ≤5**.
2. **Compute mean batch size as the "did it actually batch?" falsifier.** ~~`flushed{operation="delivery"} ÷ Δ db.operations.success`~~ — **this formula was wrong**; step 7 measured it reading
   **0.12** where the true batch size was exactly 1.00, because `db.operations.success` counts *every*
   engine DB operation (fetch loop, enqueue flushes, reads, sweep), not just these flushes, so the
   ratio collapses whenever delivery flushes are not the dominant DB work. Use **`rows ÷ calls` of
   `InsertMailboxDeliveriesSql` from `pg_stat_statements`**: that statement runs exactly once per flush
   that accepted anything, and its `rows` is the accepted count — **confirmed** from source: the call
   sits inside a single `if (accepted.Count > 0)` block, called once with every accepted row, and the
   method asserts its returned count equals its input. Note the quantity it yields is **accepted per
   accepting flush**, not requests per flush; the two diverge exactly when refusals are present, so
   part of the 20–35 % gap against the wrong formula is definitional (11.43 accepted/flush vs 16.94
   requests/flush). Say which quantity you mean when naming a batch size — though step 7's artifacts
   show the two differ by **under 0.5 %** in practice, because `LogFull` was 6 000 of 721 387 requests
   (0.83 %), not the ~⅓ the review supposed. The 11.43-vs-16.94 gap was the denominator after all:
   Δ`db.operations.success` was 63 089 against 42 694 actual delivery flushes, the difference being mint
   flushes, closes, enqueue/update-buffer flushes, the fetch loop, reads and sweeps. **The cheapest
   correct form of check 2 is `flushed{operation="delivery"} ÷ calls(SelectExistingMailboxDeliveriesSql)`**
   — requests per flush, one existing counter over one statement's call count, since that statement runs
   once per flush with at least one primary. Original (wrong) reasoning kept for the record: `flushed` counts requests and
   `db.operations.success` increments once per flush on these paths, so the ratio is mean batch size. If
   it is ≈1, batching is not happening whatever the timings say; if it is ≈`MaxBatchSize`, the buffer is
   saturated and `MaxBatchSize` is the next thing to tune. More robust than statements-per-message,
   which depends on statement accounting.
3. **Cross-check `flushed` against the run's own accounting.** The identity is
   `flushed = accepted + duplicate + log_full + closed + not_found` — **all five** delivery verdicts are
   assigned inside `LockAndDeliverToMailboxes` (`Mailboxes.cs:1594` `NotFound`, `:1622` `Duplicate`,
   `:1628` `Closed`, `:1639` `LogFull`, `:1690` `Accepted`), so the flush answered and counted every one.
   My first version omitted `log_full`; the corrected three-term version was still incomplete. Step 7's
   four runs matched the three-term form only because the storm arm never closes a mailbox under load
   and never names a missing one — an arm that closes mailboxes mid-storm, or the relay arm, would show
   a shortfall and have it misread as faulted flushes. A shortfall means faulted flushes (which count nothing), i.e. 500s the arm should be
   reporting.
4. **Capture peak `engine.mailbox_buffer.depth`.** The guide now calls depth a latency signal; if it
   stays at zero through the storm the queue never filled, so the measured win is not the batching win
   and the arm needs more load before any number means anything.
5. **Pin the 429 assertion instead of asserting "no regression"**: `LogFull` is the only 429 on this
   path, so the 429 count must equal the deliveries beyond `MaxMailboxLogLength` exactly. That also
   exercises the one verdict whose timing changed — the cap now binds against a mid-batch position.

## Step 7 results (measured 2026-08-21, same machine, alternating runs minutes apart)

**The thesis holds under load.** At 3 000 deliveries/s (config M, a rate both builds served):

| | after | before |
| --- | --- | --- |
| delivery-path connections held | **2** | **65** |
| `slots.db.used` peak | 1 | 90 (pool pinned) |
| statements per stored message | **1.30** | 4.0 |
| mailbox statement ms per stored message | **0.209** | 0.484 |
| dropped k6 iterations | **0** | 1 747 |
| ordinary enqueue p95 | **6.21 ms** | 26.6 ms |

At 6 000/s the before build could not serve the load at all (2 756–4 512/s served, up to 390 k dropped
iterations, delivery median 2.5–4.3 s, 79–83 concurrent delivery backends against a 90-slot pool);
after served 5 961/s with **0** dropped iterations and 2 flush connections.

Correctness under storm: **1.8 M answered delivery requests, zero faulted flushes, zero 500s**; the 429
count equals the mailboxes that reached exactly `MaxMailboxLogLength` in every run with none exceeding
it; every mailbox's positions gapless `0..n-1` with `next_idx` matching. The `relay_exchanges` arm is
un-regressed on fidelity (all 9 002 workflows completed, 0 left `Held`, born-held ratio 1.000).

**Findings that need a decision** (reported by the worker, not fixed):
1. **Below saturation the change costs one more statement per delivery.** At batch size 1 the batched
   path issues **5** statements (lock → key lookup → counter bump → insert → release) where the
   per-request path issued **4** (lock → key lookup → append CTE → release), because the old `appendSql`
   did bump-and-insert in one statement and the batch splits them. This is **structural and
   machine-independent**, corroborated by the artifacts: 4.03 statements per stored message before,
   1.32 after at batch 3.86. The crossover on this machine is between 25/s (batch 1.00) and 3 000/s.
   **The guide commits to "fewer connections and statements per delivery" without naming a load** — an
   operator at 25 deliveries/s would not see it. → step 8.

   **Timing claims withdrawn.** The step-7 report also asserted +13 % mailbox statement time per
   message (0.241 vs 0.213 ms) and +0.6 ms on the relay wake hop. Step 7's review could **not
   reconstruct that pair from the artifacts** at any stated scope, and found the same runs show *total*
   mailbox statement time per message ~37 % **lower** on the after build — the opposite sign — because
   80–90 % of that total is the release statement, whose own mean spans 0.62–1.31 ms across four runs at
   one config (a spread larger than the claimed effect) while being **identical across builds at M**
   (0.1796 vs 0.1783), which marks the S spread as machine drift rather than a build difference. The
   wake-hop figure already read `inconclusive` under the suite's own n=2 gate arithmetic. **Do not
   document either number.** The claim this data carries is: *below saturation the batched path issues
   one more statement per delivery; the win arrives once batches form.*

   **Resolution of the withdrawn figure** (step 7 reconstructed it on request): 0.2413/0.2127 is
   `sum(total_exec_time)` over statements naming `engine.mailbox*`, minus the release statement **and**
   the executor's `claimed_at` update (one regex matched both — the published scope said "release" only),
   divided by stored deliveries, and it also included ~30 ms/run of un-marked inspection queries. So the
   reviewer's ≈0.128/≈0.101 and this 0.241/0.213 are **the same measurement at two scopes**: the entire
   delta sits in the delivery path (+0.0242, +24.6 %), the untouched remainder is flat (+0.0043, +3.9 %),
   and the wider scope is the delivery delta diluted by ~0.117 ms/message of relay work the change never
   touches. Absolute delta is +0.028 ms/message either way; only the percentage moves (25 % → 13 %) with
   the denominator. **Every scope reads `inconclusive` under the suite's own n=2 sensitivity arithmetic**,
   so the worker's own recommendation — which I accepted — is to document the structural count and no
   timing figure. The most defensible timing statement is "+0.028 ms of server-side statement time per
   stored message, sign consistent across two run pairs, size unresolved", and it does not earn a line in
   the guide.

   **Step 8 sharpened this into arithmetic.** The crossover is not merely "between 25/s and 3 000/s":
   a delivery flush issues a fixed **five** statements whatever its size, so a message costs 5 ÷ batch,
   and the replaced single-message path cost 4. **The crossover is therefore a mean batch of 1.25**,
   which is arithmetic on the statement counts and holds on any machine — the measured rates only
   illustrate where a particular machine sits relative to it. Step 8 also established that the guide
   never literally claimed a statement win: step 6's commitments were "one flush answers the whole batch
   over a single connection" (true at any load) and the 5-connection ceiling (structural), so the
   false-as-written part was the **absence of a regime**, making the fix an addition rather than a
   retraction. The connection ceiling is the one load-independent part: `FlushConcurrency` bounds it at
   every rate, and load only decides whether enough requests were concurrent for the bound to save
   anything.
2. **`engine.mailbox_buffer.depth` cannot serve as the latency signal the guide describes.** Written
   every 5 s by `MetricsCollector` and exported every 10 s, it read **0** through a storm that was
   demonstrably batching (M: batch 3.86, peak depth 6) and 0 throughout the documented k6
   configuration. An operator alerting on it will miss anything transient. → step 8.
3. **At the shipped k6 configuration the queue never fills** (peak depth 0, batch size 1.00): two flush
   workers serve ~2 000 deliveries/s on this machine, so at `BUFFER_RATE=25` there is nothing to batch.
   The batching numbers above required purpose-built configs at 3 000/s and 6 000/s. Not a defect of
   the arm, but `.k6/mailbox-storm-compare.sh` cannot demonstrate this change's thesis as configured.
4. **Unrelated, pre-existing, blocks local measurement:** a database migrated before
   `6cb5110203 chore: squash migrations` cannot start this tree
   (`column "mailbox_id" of relation "workflows" already exists`). Local databases need `make reset`.
   **Resolved as a non-issue by the user: this is not released yet**, so no deployed schema is affected.

**Not established:** the ≤2 connection bound *exactly* (the sampler can only falsify it — 10 211
samples with zero above 2, plus the `SemaphoreSlim(FlushConcurrency)` in code; a log-based instrument
was attempted and discarded as unsound). The recorded ≈0.205 ms baseline is **not reproducible on this
machine today** — the two statements that write `engine.workflows` are 45–49× dearer than recorded,
suspected `shared_buffers` pressure, unproven — so all before/after numbers above were measured today
rather than compared against the recorded session.
