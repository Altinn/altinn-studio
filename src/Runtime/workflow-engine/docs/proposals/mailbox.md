# Proposal: Mailboxes — a durable FIFO rendezvous (draft)

Status: **draft, v1** — distilled from a design conversation (2026-08-18); revised the same day to
move the timeout from the receiver onto the mailbox. Decisions (repo owner, 2026-08-18): this design
**replaces** request–reply v2 ([request-reply.md](request-reply.md)) — the engine carries one
reply mechanism, not two — and the stack **branches from the pre-v2 base `trtzopwn`**, mining the
v2 revisions for kept pieces (see [Standing](#standing)); and the primitive is named **mailbox**
(open question 1 records the analysis — earlier drafts said "hook").

## Summary

Add a small, self-contained engine primitive: the **mailbox**, a durable FIFO inbox that external
messages can be delivered into and workflows can receive from, one message per workflow. A mailbox is
minted on demand by the app (idempotently, keyed by the step that creates it) and carries the
exchange's one absolute **deadline**, stamped at mint. Its id is embedded in an outbound message
as the reply address, and each incoming message becomes a **delivery** with a gapless position in
the mailbox's log. A **receive workflow** — an ordinary workflow whose first step is its only mailbox
step — is enqueued to consume exactly one position. If its delivery already exists it runs
immediately; if not, it parks in **`Held`** — v2's status, kept with its meaning intact:
unfetchable, unleased, no timer of its own — and exactly two things ever release it, each
transactional with its cause: the delivery's arrival (the wake), or the mailbox closing. A coarse
periodic sweep closes mailboxes past their deadline by running exactly what `DELETE` runs: refuse
further deliveries and release every parked receiver to run with no payload — the closing signal.

A released receiver's meaning is **frozen by construction**: it was released either because its
delivery exists or because the mailbox closed and its delivery can never exist, so every attempt and
retry reads the same truth. The design adds one workflow status (v2's `Held`, reused), one small
closure sweep, and no dependency edges. Its one invented mechanism is the rendezvous: two gapless
counters, a waiter registry, and one lock — the mailbox's own row — under which every mailbox mutation
happens.

Multi-message exchanges are relays: the app's handler, while processing message _n_, enqueues the
receive workflow for message _n+1_ (fresh callback token), or disposes the mailbox and enqueues
whatever comes next. Ordering toward the rest of the system rides collection heads.

## Motivation

Request–reply v2 solved asynchronous replies inside the workflow vocabulary: the wait is a
workflow status (`AwaitingReplies`), each reply is a chained link workflow, and the exchange's
bookkeeping lives as columns on `engine.workflows`. It works, it is tested, and it is measured.
Three of its structural costs motivate exploring this alternative shape:

1. **The callback-token ceiling, loosened.** v2's links all inherit the _original_ workflow's
   token, which never refreshes, capping `MaxExchangeTimeout` at 7 days once resumes and re-waits
   are counted (request-reply.md, open question 1). Here every receive workflow carries a fresh
   token minted at its own enqueue, which must cover at most the mailbox's remaining lifetime from
   that point. `MaxMailboxTimeout` needs the same derivation v2's step 2 performed, but against
   fewer compounding terms, and should land materially above 7 days.
2. **Hot-row and hot-path weight.** v2 added eleven nullable columns to `engine.workflows` (a
   measurably wider enqueue `COPY`), two statuses rippling through enum, API, dashboard and app
   DTOs, and two `workflow_link` edges per link — the largest single term in the measured per-link
   cost. Mailboxes keep their state in their own tables, reuse one of those statuses (`Held`) instead
   of adding two, and the workflows table gains one nullable column.
3. **Coupling of the reply channel to workflow identity.** v2's reply address _is_ the workflow id,
   which is elegant but means one exchange per workflow, engine-created links, and engine-owned
   conclusion. A mailbox is an address of its own: multiple mailboxes per task become expressible, and the
   continuation protocol belongs to the app.

The price is real and stated below: the exchange-level ordering guarantee and the conclusion's
atomicity move from engine-enforced invariants to app-library-enforced conventions.

## Design overview

```text
App (step callback)          Engine                              External system
───────────────────          ──────                              ───────────────
SendToArchive runs:
POST /{ns}/mailboxes
(idempotency key = step id,
 timeout)───────────────────► mailbox minted (uuidv7);
◄──────────────────────────── deadline = now + timeout
mailbox id → workflow state
app sends request ──────────────────────────────────────────────► receives request,
                                                                   echoes mailbox id
last stage's callback
enqueues RECEIVE WF 1 ──────► seq 0 assigned under mailbox lock;
(mailbox reference)           no delivery yet → born Held
                              (unfetchable, no timer of its own)

app forwards message ───────► POST /{ns}/mailboxes/{id}/deliveries
                              idx 0 assigned under mailbox lock;
                              waiter at seq 0 → released,
                              Held → Enqueued — the wake is
                              inside the delivery tx

                              receive wf 1 fetched; executor reads
                              delivery (mailbox_id, 0), attaches it
◄──────────────────────────── callback with delivery payload
handler: ack → enqueue
RECEIVE WF 2 (seq 1),  ─────► born Held awaiting idx 1,
return success                fresh token

app forwards message 2 ─────► idx 1 → wake → receive wf 2 runs
◄──────────────────────────── callback with delivery payload
handler: receipt → save;
DELETE /{ns}/mailboxes/{id}─► mailbox closed for deliveries
                              (idempotent; parked receivers
                              released with no payload)
enqueue after-workflow ─────► ordinary enqueue, collection head
return success

        (or: the mailbox's deadline passes → the closure sweep runs
         the same routine as DELETE → parked receivers released
         → same callback with no delivery → app concludes)
```

Design principles, in order:

1. **A step is a step, and its meaning never moves.** Each receive step consumes exactly one
   delivery — or the fact that none can come — and settles once. The truth a receiver runs on is
   frozen before it becomes runnable: its delivery exists, or the mailbox is closed and the delivery
   can never exist. An attempt that saw "no delivery" is never followed by an attempt that sees
   one.
2. **The database is the only source of truth.** Counters, deliveries, waiters and the mailbox's
   deadline are rows written in ordinary transactions. No in-memory queues, no caches.
3. **Arrival is the wake, transactionally; the deadline is the guarantee.** A `Held` receiver has
   no timer of its own — its only exits are the wake and the closure release, each transactional
   with its cause, so neither can be lost. The mailbox's deadline, enforced by a coarse sweep, bounds
   every wait. `NOTIFY` remains pure acceleration.
4. **Reuse the native mechanisms.** Parking is v2's `Held` status, kept with its meaning intact:
   born parked, unfetchable, released by an event. Deduplication is unique keys. Continuation is
   enqueue. Ordering toward dependents is collection heads. The one invented mechanism — the
   rendezvous — is deliberately small and fully specified here.

## Engine design

### The mailbox

`POST /api/v1/{namespace}/mailboxes` mints a mailbox: engine-generated uuidv7 id, caller-supplied
`idempotencyKey` (unique per namespace — replay returns the existing mailbox, `200`), a required
**`timeout`** (positive, capped by `EngineSettings.MaxMailboxTimeout`) from which the engine stamps
the exchange's one absolute **`deadline = now + timeout`**, an optional `collectionKey` reference
for dashboard grouping, and status `open`. `DELETE /api/v1/{namespace}/mailboxes/{id}` closes it —
idempotent, see [Disposal](#disposal-and-unconsumed-deliveries).
`GET /api/v1/{namespace}/mailboxes/{id}` reports status, deadline, both counters, and the
unconsumed-delivery count.

The mailbox id is the reply address the app embeds in its outbound message. It is an unguessable id
but not a secret — the same posture as v2's workflow-id address; integrity of forwarded payloads
is the app-side envelope's job, as today.

```sql
CREATE TABLE engine.mailboxes (
    id              uuid PRIMARY KEY,
    namespace       varchar(200) NOT NULL,
    idempotency_key varchar(200) NOT NULL,
    collection_key  varchar(200) NULL,
    timeout         interval NOT NULL,
    deadline        timestamptz NOT NULL,
    next_idx        bigint NOT NULL DEFAULT 0,  -- deliveries log
    next_seq        bigint NOT NULL DEFAULT 0,  -- receivers log
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'disposed')),
    disposed_reason text NULL CHECK (disposed_reason IN ('request', 'deadline')),
    created_at      timestamptz NOT NULL,
    disposed_at     timestamptz NULL,
    UNIQUE (namespace, idempotency_key)
);
```

**The mailbox row is its own serialization point.** Every operation that assigns a position or
changes what positions mean — delivery ingestion, receive-workflow enqueue, closure (by `DELETE`
or by the deadline sweep) — takes the mailbox's row lock as its first act. This is the analogue of
v2's "awaiting workflow's row lock first" discipline, and the lock guards the very row carrying
the counters, status and deadline it decides with. The one compound lock order in the design is
**mailbox row → workflow row** (the wake and the closure release); nothing takes them in the reverse
order, so the ordering is acyclic by inspection. (An earlier draft kept the counters in a
separate `mailbox_counters` table for churn isolation on very hot inboxes; folded because expected
delivery rates make the isolation moot — revisit only if a hot mailbox ever shows row contention.)

### Deliveries: gapless ingestion

`POST /api/v1/{namespace}/mailboxes/{id}/deliveries` with `{ "idempotencyKey": "…", "payload": "…" }`.
Inside one transaction, under the mailbox row lock: validate (mailbox exists in this namespace, is
`open`, payload within cap, log within cap), assign `idx = next_idx++`, insert, and perform the
wake (below).

```sql
CREATE TABLE engine.mailbox_deliveries (
    mailbox_id         uuid NOT NULL REFERENCES engine.mailboxes (id),
    idx             bigint NOT NULL,
    idempotency_key varchar(200) NOT NULL,
    payload         text NOT NULL,
    accepted_at     timestamptz NOT NULL,
    PRIMARY KEY (mailbox_id, idx),               -- the gapless position is the match address
    UNIQUE (mailbox_id, idempotency_key)
);
```

| Outcome                                     | Response                                     |
| ------------------------------------------- | -------------------------------------------- |
| Delivery accepted (waiter woken or not)     | `202 Accepted` (`idx` returned)              |
| Duplicate `idempotencyKey`                  | `200 OK` (idempotent replay, original `idx`) |
| Unknown mailbox in this namespace           | `404 Not Found`                              |
| Mailbox closed (by request or its deadline) | `409 Conflict` — "too late", dead-letterable |
| Payload over cap / log length over cap      | `413` / `429`                                |

A refused delivery inserts nothing, so there is no idempotency-key release choreography — simpler
than v2's ingestion, where a refused link had to release the key it had already inserted. The
_accepted versus kept_ rule carries over unchanged: the engine kept it → `200` on replay; the
engine refused it → the refusal repeats.

Acceptance is not consumption. A delivery with no receiver yet simply sits at its position; the
receiver that is eventually enqueued for that position finds it at birth. Early replies are
first-class, exactly as in v2 — there is no "too early" answer.

### The receive workflow

A workflow declares at enqueue that its **first step receives one delivery**:

```json
{
    "operationId": "Task_1 [archive reply 2]",
    "mailbox": { "id": "018f4e…" },
    "steps": [ { "command": { "type": "app-command", "data": { … } } }, … ]
}
```

Constraints, all validated at enqueue: the `mailbox` block puts the delivery in the **first** step's
callback and nowhere else (later steps are ordinary); a workflow carries at most one `mailbox` block;
a `mailbox` workflow cannot also carry `startAt` — a `Held` row has no schedule. There is no
per-receiver timeout: the mailbox's deadline bounds the whole exchange.

Inside the enqueue flush, under the mailbox row lock: assign `seq = next_seq++` and decide the
birth state.

- **A delivery exists at `seq`** (`seq < next_idx`) — born `Enqueued`, runnable now, with that
  delivery. This holds even on a closed mailbox: an accepted delivery outranks closure, so a saga
  that replays after the deadline drains the accepted backlog instead of dropping it.
- **The mailbox is `disposed` and no delivery exists** — born `Enqueued` with the closed signal.
- **Otherwise** — born **`Held`**, plus a waiter row.

```sql
CREATE TABLE engine.mailbox_waiters (
    mailbox_id     uuid NOT NULL REFERENCES engine.mailboxes (id),
    seq         bigint NOT NULL,
    workflow_id uuid NOT NULL,
    released_at timestamptz NULL,
    PRIMARY KEY (mailbox_id, seq),
    UNIQUE (workflow_id)
);
```

**One workflow status, and it is v2's, kept.** `Held` already means exactly this: born parked,
absent from the fetch gate's status list, no lease, no backoff, released by an event. v2 scoped it
to reply links awaiting their exchange's opening; this design generalizes the same meaning — held
until an external event releases it — and deletes `AwaitingReplies`, so the status ledger versus
v2 is net minus one. Under the build-atop-v2 stacking option, `Held`, its release statement, its
dashboard rendering and its app-DTO ripple are already in the tree.

`engine.workflows` gains exactly one nullable column, `mailbox_id uuid NULL` — the executor's
discriminator (the null check mirrors `ChainStateSource`) and the ops marker. The `seq` lives on
the waiter row, keyed by `UNIQUE (workflow_id)` for the executor's read and by `(mailbox_id, seq)`
for the wake's. _Recorded alternative:_ put `mailbox_id` and `mailbox_seq` on `engine.workflows` and
drop the waiter table — one less table, at the price of a second hot-row column and mailbox state
living on rows the mailbox subsystem does not otherwise own. The draft prefers the waiter table for
additivity; this is open question 3.

No new statuses beyond the reused `Held`. No fetch-gate changes: `Held` is not in the gate's
status list, exactly as in v2. No dependency edges: FIFO order is the gapless counters, and "one
at a time" is the app enqueueing receiver _n+1_ from inside receiver _n_'s callback.

### The receiver's meaning is frozen before it can run

The delivery payload is read at execution, not baked in at enqueue — the payload may not exist
when the receiver is created. Late binding creates a hazard v2 never had: a step's _input_ could
differ between attempts (attempt 1 runs with no delivery, a delivery lands, attempt 2 would see
a message). The design kills that hazard structurally rather than with a bookkeeping record: a
receiver becomes runnable in exactly three ways, each of which fixes the truth first —

1. **born with its delivery** (the enqueue flush found it, mailbox open or closed);
2. **released by the wake** — in the delivery's own transaction, so the delivery exists;
3. **released by closure** (`DELETE` or the deadline sweep) — the mailbox is closed, so its delivery
   can never exist.

Deliveries to a closed mailbox are refused, so from the moment a receiver is fetchable, **whether a
delivery exists at its position can never change again**. The executor infers the callback from
that frozen fact: read the receiver's `seq` (one unique-index probe on `workflow_id`, the analogue of v2's
`ReadInheritedChainState` hop), read `mailbox_deliveries (mailbox_id, seq)` — present → attach the
payload; absent → the no-delivery callback. There is no resolution column, no CAS, and nothing
for the executor to write; every attempt, retry, and resume re-derives the same answer.

**A callback with no delivery therefore means exactly one thing — the mailbox is closed and no
delivery will ever reach this step** — the property v2 gets from `isClosingSignal` plus dispatch
guards. The callback also carries the mailbox's `disposed_reason` (`deadline` or `request`),
explicitly rather than inferred (v2 step 6's lesson), purely for the conclusion's wording: "the
archive never confirmed before the deadline" reads differently than "the exchange was closed".
Both demand the same response — conclude; `AwaitNextReply` on a no-delivery callback is a
non-retryable contract violation, exactly v2's rule for the closing signal.

### The wake

Inside the delivery transaction, after `idx` is assigned — v2's `Held`-release statement, reused
nearly verbatim, joined through the waiter registry:

```sql
UPDATE engine.workflows AS w
   SET status = 'Enqueued'
  FROM engine.mailbox_waiters AS mw
 WHERE mw.mailbox_id = @mailboxId AND mw.seq = @idx
   AND w.id = mw.workflow_id AND w.status = 'Held';
-- and stamp mw.released_at
```

One `NOTIFY status_changed`, issued **inside the releasing transaction**; the processor picks the row
up on its next fetch cycle. (Corrected during step 4 — earlier drafts said "after commit". PostgreSQL
queues a `NOTIFY` to commit and drops it on rollback, so in-transaction preserves exactly the intended
semantics, while a post-`COMMIT` statement can fail on an already-committed transaction and send
`ExecuteWithRetry` back through a delegate whose re-run answers `Duplicate` for a delivery that _was_
accepted. The engine's write-back path takes the same position for the same reason.)
Two outcomes: a waiter exists at `seq = idx` → released, delivery consumed by its receiver; no
waiter yet → the delivery parks at its position and the enqueue-time `seq < next_idx` comparison
under the same mailbox lock catches it. Exactly two interleavings, serialized by the mailbox row lock;
no third.

The wake is **transactional with the delivery insert**, so "message durable but wake lost" is a
state the database cannot hold — and since a `Held` receiver has no timer, that property is
load-bearing: it is what lets the receiver park indefinitely with no polling and no lost-wake
latency, while the mailbox's deadline stands behind everything as the guarantee.

### The deadline: one sweep, the same routine as `DELETE`

The mailbox's deadline is enforced by a small periodic sweep on the `MaintenanceInterval` pattern —
a coarse cadence (five minutes is ample) for day-scale deadlines; v2's `ExchangeDeadlineService`
is the precedent to mine, though this sweep is far smaller. It claims `open` mailboxes past
`deadline` with `FOR UPDATE SKIP LOCKED` — the claim _is_ the mailbox's master lock, now that the
counters live on the row — and performs **exactly the `DELETE` routine**, with
`disposed_reason = 'deadline'`: close for deliveries, release every parked receiver.

One transaction per mailbox, and — unlike v2's deadline sweep — no second half, because there is
nothing to enqueue: the receiver that will conclude the exchange already exists, already carries
the app's own steps, and is _released_ rather than created. The backstop zoo v2's sweep needed
(undeclared closing-signal steps, unreadable declarations, a closing-signal link failing
terminally) has nothing to attach to. The one v2 lesson that carries over is per-mailbox isolation:
a throw leaves that one mailbox claimable next tick and never wedges the batch behind it.

The deadline is absolute and exchange-level — **v2's guarantee, restored**: no exchange outlives
its deadline by more than the sweep cadence plus the released receiver's own processing. An
idle-style variant (deadline re-armed by each accepted delivery) would be a one-statement
extension of the acceptance path; no current consumer needs it (open question 4).

### Disposal and unconsumed deliveries

`DELETE /api/v1/{namespace}/mailboxes/{id}` means one thing: **closed for deliveries** — and it is
the same routine the deadline sweep runs, with `disposed_reason = 'request'`. Under the mailbox row
lock: set `disposed`, refuse deliveries from then on (`409`), and release every parked
receiver (`Held` → `Enqueued`, stamping the waiters' `released_at`). A released receiver runs
promptly and its handler gets the no-delivery callback — the exchange concludes through the app's
own conclusion path, in its own words, never through an engine-written status. Idempotent — a
repeat `DELETE`, or a `DELETE` racing the sweep, returns `200` with the original `disposedAt`.

Receiver enqueues against a closed mailbox are **accepted**, not refused: born with their delivery
when one sits at their position (the accepted backlog drains even after closure), born with the
closed signal otherwise. This is what makes closure racing an in-flight receiver self-resolving:
the receiver finishes unaffected, and if its handler answered "await the next reply", the
successor it enqueues concludes through the normal path — the saga never needs a "mailbox was
closed" error branch. (A purged mailbox is a hard `404`; retention is far longer than any relay.)

One leftover class remains, handled rather than assumed away: **unconsumed deliveries** —
accepted positions whose receiver was never enqueued (they arrived while the app was concluding,
or beyond the relay's last hop) and that no replayed saga ever drained. `DELETE` counts and
reports them in its response; the sweep logs and counts them (`engine.mailboxes.deliveries.unconsumed`);
the rows stay readable until retention purges the mailbox — the operator can see what arrived too
late, and the forwarder's at-least-once source can redeliver to a future exchange if the feature
wants that.

### Races and locking

Two lock disciplines cover everything: the **mailbox row lock first** for any operation touching
mailbox state, and the compound order **mailbox row → workflow row** in the wake and the closure
release (the only compound acquisitions in the design).

| Race                                          | Resolution                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery vs. enqueue of its receiver          | Both take the mailbox lock; delivery-first → receiver born runnable with the delivery (`seq < next_idx`); enqueue-first → waiter exists, the wake releases it. No third interleaving.       |
| Two deliveries ingested concurrently          | Mailbox lock serializes `idx` assignment; gapless by construction.                                                                                                                          |
| Delivery vs. closure (`DELETE` or the sweep)  | Mailbox lock serializes: delivery-first → accepted, woken or parked, drained by the relay; closure-first → `409`, forwarder dead-letters. Never accepted and silently stranded.             |
| Closure vs. parked receiver                   | Closure releases it under the same lock; it runs the no-delivery path and the app concludes.                                                                                                |
| Closure vs. in-flight (`Processing`) receiver | Unaffected — its truth was frozen at release; a successor it enqueues is born with the backlog delivery or the closed signal. The protocol yields exactly one concluder (saga invariant 2). |
| `DELETE` vs. the deadline sweep               | The same idempotent routine under the same lock; first wins, the second no-ops.                                                                                                             |
| Delivery vs. retry of a failed receiver       | Delivery-existence is frozen from first fetchability (wake ⇒ exists; closure ⇒ can never exist); every retry re-derives the same callback.                                                  |
| Duplicate delivery `idempotencyKey`           | `UNIQUE (mailbox_id, idempotency_key)` → `200` replay with the original `idx`.                                                                                                              |
| Crash after wake commit, before `NOTIFY`      | The status transition is durable; the row is claimed on the next fetch cycle. `NOTIFY` is acceleration only.                                                                                |
| Crash inside the app's continuation sequence  | Every call is inside a step attempt and idempotent (create replays by key, enqueue replays by key, `DELETE` no-ops); the retry replays the sequence. See the saga invariants below.         |

### Retention and GC

Mailboxes, deliveries and waiters are not workflows, so the existing retention sweep never sees them —
and unlike v2, nothing here needs synthetic `workflow_link` edges to protect chain ends, because
receive workflows are ordinary rows protected by ordinary rules (an unsettled receiver is simply
not purgeable). One policy: a `disposed` mailbox older than the retention cutoff is purged with its
deliveries and waiters (FK order: children first). Receive workflows purge under the existing
workflow sweep, independently; a purged receiver leaves its released waiter behind until the mailbox
purges, which dangles nothing.

**No leak backstop is needed.** Every mailbox closes by its deadline — the sweep is the guarantee —
so an `open` mailbox materially older than `deadline` plus a sweep cadence is an invariant violation
worth an alert, not a GC policy. The `collectionKey` reference is dashboard grouping, nothing
more.

### Validation, limits, observability

- Caps: `MaxMailboxTimeout` caps the deadline at mint and is bounded by the callback-token lifetime —
  a receiver enqueued at minute one can park until the deadline on the one token minted at its
  enqueue, so redo v2 step 2's derivation with the receiver-enqueue anchor; it should land above
  v2's 7 days, and the tripwire-test pattern (`CallbackTokenLifetimeInvariantTests`) carries over.
  `MaxMailboxLogLength` bounds `next_idx` and `next_seq` (the analogue of `MaxRepliesPerChain` →
  `429`); `MaxMailboxPayloadSize` (→ `413`); an open-mailboxes-per-collection cap (→ `429` at mint, the
  aggregate bound v2 never had).
- Admission: `Held` receivers count in the `Incomplete`/active set and consume admission budget
  while unfetchable — the same known exposure as v2's `AwaitingReplies`/`Held` (request-reply.md
  step 5's admission-control note); the `Fetchable`-derived fix discussed there applies to both
  designs. Deliveries are rows, not workflows, and consume none.
- Metrics: `engine.mailboxes.created`, `engine.mailboxes.closed` tagged `reason` (`request`/`deadline`),
  `engine.mailboxes.deliveries.received` tagged with `outcome`, `.unconsumed`,
  `engine.mailboxes.receivers.released` tagged `delivered`/`closed`, and a wake-to-claim latency
  histogram (the number that proves the wake is doing its job).
- Dashboard: a mailbox renders under its collection with its deadline, both counters, per-position
  state (delivered/consumed/waiting), and its receivers linked. Receive workflows are ordinary
  workflows and cost the dashboard nothing new; a `Held` receiver renders as v2's `Held` does.

## App library design

### Pipeline contract

The shape from the design conversation, deliberately close to v1's surface — the declared timeout
now rides mailbox mint (it is the exchange's deadline, not a per-step budget):

```csharp
public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
    pipeline
        .Stage("SendToArchive", SendToArchive)
        .Finally(HandleArchiveReply)
        .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = ArchiveReplyTimeout });
```

- `WithReplyFrom("SendToArchive")` makes `context.Mailbox` available in exactly that stage — the
  app-lib mints it there via `POST /mailboxes` with the step id as idempotency key and the declared
  `Timeout` (replay-safe across retries), stores it in workflow state, and the stage embeds it in
  the outbound message as the reply address. Reading `context.Mailbox` in any other stage throws.
- The pipeline expansion appends one final Main-workflow step whose callback enqueues **receive
  workflow 1** (mailbox reference, fresh `Context`) — so the relay exists before the Main workflow
  settles. There is no `WaitingReason` to declare: the wait's user-facing wording is static per
  task and lives in the pipeline definition, and the app-lib owns the read path that would show
  it (see [Ordering](#ordering-toward-the-rest-of-the-system)), so nothing needs persisting.
- `HandleArchiveReply` runs as each receive workflow's first step: `context.Reply` carries the
  delivery, or `null` exactly when the mailbox closed (the callback says whether by deadline or by
  request, for the conclusion's wording). Result mapping is v2's vocabulary with an app-lib-owned
  saga underneath:
    - `AwaitNextReply()` → the app-lib enqueues receive workflow _n+1_ (enqueue idempotency key
      derived from the current step id), then completes the step. Rejected non-retryably on a
      no-delivery callback, as v2 rejects it on the closing signal.
    - `Success(action?)` → the app-lib `DELETE`s the mailbox, then enqueues the after-workflow
      (process-next / declared continuation, enqueue idempotency key derived from the current
      step id like every other saga enqueue), then completes the step.
    - `FailedPermanent` → `DELETE`, then the after-path's failure shape.
    - `FailedRetryable` → ordinary retry of the receive step; the saga has not started.

### The saga invariants

The continuation protocol is a sequence of idempotent calls inside one step attempt. It is
correct under at-least-once retries — every call replays by key — but only if the app-lib holds
three invariants, which belong in code, tests, and this document rather than in convention:

1. **Order: `DELETE` before the after-enqueue.** The reverse order opens a window where the
   continuation runs while the mailbox still accepts deliveries.
2. **At most one step concludes.** Structurally guaranteed by the relay: a handler that returned
   `AwaitNextReply()` has enqueued a successor and never also disposes; the concluding handler has
   enqueued none; handler decisions are deduplicated per step id, so retries replay the same
   choice. The property depends on the saga parking **at most one receiver at a time**, which the
   relay does by construction — closure releases _every_ parked receiver and each released
   handler must conclude, so a client of the primitive that parks several receivers manufactures
   several mandatory concluders and must referee its own conclusions. _Recorded alternative, not
   taken:_ deriving the after-workflow's enqueue key from the mailbox id instead of the step id
   would make even duplicate conclusions collapse onto one workflow (an enqueue-idempotency
   analogue of v2's conclusion CAS); rejected for key-discipline uniformity — one derivation rule
   everywhere — with this invariant's test as the guard instead.
3. **Every mid-callback engine call carries a deterministic idempotency key derived from the
   executing step id** — the mailbox mint, the continuation receiver, the after-workflow alike — so
   a crashed attempt's replay deduplicates instead of forking the relay.

This is the design's honest trade against v2, where the verdict rides one response field and the
engine applies it atomically with the link's settlement: here correctness is provable but proved
in app-lib code, and a wrong ordering compiles. The saga must live in exactly one place in the
app-lib, never in app-author code.

### Ordering toward the rest of the system

v2 gates dependents structurally: the awaiting workflow is non-terminal until the exchange
concludes. Here the Main workflow completes as soon as it has enqueued receiver 1, so ordering is
a convention the app-lib maintains through collection heads:

- Receive workflows and the after-workflow are enqueued into the instance's collection as heads
  (`IsHead = true`, `DependsOnHeads` for the after-workflow).
- **The frontier-never-empty invariant**: every enqueue in the relay happens inside a step of a
  workflow that is itself still unsettled — receiver 1 from the Main workflow's final step,
  receiver _n+1_ and the after-workflow from receiver _n_'s callback. At no instant between the
  exchange's start and its conclusion does the collection read all-settled, so anything gating on
  the collection frontier (process-next waits, `ResolveWorkflowTaskStatus`, auto-advance) keeps
  waiting without knowing mailboxes exist.

The failure mode of getting this wrong is silent early-execution of downstream work — the reason
v2 chose the structural answer. The invariant must be pinned by an app-lib test that walks a
multi-hop relay asserting the frontier at every step boundary. The wait's user-facing annotation
(v2's `awaitingRepliesReason`) needs no persisted counterpart: the read path that annotates the
wait already resolves the current task, whose pipeline declares the wording in code — a `Held`
mailbox-receiver in the frontier maps to that task's declared reason at read time. If per-instance
wording is ever wanted, a label on the receiver is the mechanism; the engine's dashboard shows
the receiver's `operationId` either way.

### Forwarding deliveries

`IServiceTaskReplyForwarder` keeps its surface: the subscriber hands it the correlation id (now a
mailbox id) and the raw payload; it wraps the payload in the HMAC envelope — purpose bound to the
**mailbox id**, service task type, and external id, the same binding v2 built for the workflow-id
address — and `POST`s the delivery with the source's message id as `idempotencyKey`. `202`/`200`
are success; `404` is unroutable; `409` always means too late — the mailbox closed, by request or by
its deadline (early is impossible — deliveries precede receivers happily); `413`/`429` are
dead-letter cases. One improvement over v2 falls out for free: the forwarder no longer needs the
awaiting-task-type derivation round trip (request-reply.md step 8's residual), because the
receive step's shape is declared by the app-lib at receiver-enqueue time, not rebuilt at forward
time.

## What this deletes, keeps, and re-adds versus v2

| v2 piece                                                       | Under mailboxes                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AwaitingReplies` + `Held` statuses and their ripple           | **Halved** — `AwaitingReplies` gone; `Held` kept with its meaning generalized                           |
| Eleven exchange columns on `engine.workflows`                  | **Gone** — one nullable `mailbox_id`; mailbox state in its own tables                                   |
| Chain dependency edges + both `workflow_link` directions       | **Gone** — order is the gapless counters; retention needs no synthetic edges                            |
| `ExchangeDeadlineService` + `closingSignalSteps` declaration   | **Simplified** — a closure sweep with no enqueue half: it releases the app's own receiver               |
| Conclusion CAS, leftover-link cancellation, `concludeExchange` | **Replaced** by app-driven disposal + the saga's one-concluder invariant                                |
| Inherited-token ceiling (`MaxExchangeTimeout` = 7d)            | **Loosened** — a fresh token per receiver, minted at its enqueue; `MaxMailboxTimeout` re-derives higher |
| Absolute exchange deadline                                     | **Kept** — the mailbox's `deadline`, stamped at mint and swept                                          |
| Engine-enforced dependent gating                               | **Replaced** by the collection-heads convention (frontier invariant, app-lib-owned)                     |
| Reply payload inside link step data                            | **Replaced** by `mailbox_deliveries` rows + a PK read at execution                                      |
| Enqueue-path ingestion (`PlanReplyLinks` etc.)                 | **Replaced** by the delivery endpoint + rendezvous (three tables, the wake, one lock)                   |
| HMAC envelope, forwarder surface, Fiks Arkiv decision logic    | **Kept** — re-plumbed to the mailbox-id address                                                         |

Cost accounting, honestly: a processed message still costs one workflow — the receiver — enqueued
by the app (one extra app→engine HTTP call per hop that v2's engine-created links did not pay),
but with no dependency edge and no link edges, which were the two largest measured per-link
statement costs in v2. An unprocessed (buffered) message costs one delivery row, cheaper than
v2's `Held` link workflow. The non-reply hot path pays one nullable column on the enqueue `COPY`
and one null check per step execution; the sweep adds one indexed scan per cadence. These claims
need their own chain-storm-style measurement before they are believed.

## Failure modes and operations

- **A receive step fails terminally**: the relay stalls exactly as a v2 chain stalls — a visible
  `Failed` workflow for ops to resume, and retries re-derive the same frozen truth. Meanwhile the
  mailbox keeps aging toward its deadline, which closes it; the resumed receiver still processes its
  own delivery (frozen), and its successor learns of the closure normally.
- **The app crashes mid-relay**: every gap sits inside a step attempt, so the engine's retry
  ladder replays the saga, and a replayed receiver enqueue is honest even after the deadline —
  born with the backlog delivery or the closed signal. The truly dead case (a `Failed` receiver
  nobody resumes) is visible on the dashboard, and the mailbox itself never outlives its deadline.
- **Ending an exchange from outside**: `DELETE` the mailbox. The parked receiver is released with
  the no-delivery callback and the app concludes in its own words — the graceful analogue of
  v2's closing signal, available to ops at any time. The hard stop (no conclusion at all) is an
  ordinary cancel of the receiver workflow plus the `DELETE`; whether that pairing deserves a
  compound endpoint is open question 7.
- **Late deliveries**: `409` after closure — by request or deadline — and the forwarder logs or
  dead-letters; redelivery to a future exchange stays possible because refusals never consumed
  the source's message id. Accepted-but-unconsumed deliveries are reported at `DELETE`, counted
  by the sweep, and readable until retention.

## Implementation plan

This section is working state for the implementation stack: a worker/reviewer protocol and a step
list with statuses. The orchestrator owns the statuses; workers touch the step list only when a
scope split is required (see protocol).

### Stack base and the out-of-tree v2 reference

The stack branches from **`trtzopwn`** (`b5de6b835410`, "set end_of_line to lf"), the revision
before "add request-reply plan", per the decision in [Standing](#standing). The base was verified
clean rather than assumed: no reply or exchange types in either engine folder, no `Held` in
`PersistentItemStatus`, no reply surface in `src/App/backend/src`, and `IFiksArkivResponseHandler`
present as the **v8 GA API it was before v2 retired it**. There is no strip step.

Two consequences every worker must know:

- **`request-reply.md` is not in this tree.** The links to it in this document point at a document
  that exists only in the v2 revisions; read it with
  `jj file show -r swtvoquy src/Runtime/workflow-engine/docs/proposals/request-reply.md`. Everything
  a step needs from it is reproduced below, so treat it as reference material to mine, never as an
  instruction source.
- **The v2 revisions are the mining ground**, reachable by change id from this base:

| v2 step      | jj change                            | What it holds for this stack                                                                                                           |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1a / 1b / 1c | `wmnowmxq` / `nqmqykqk` / `tmmzozyw` | The v1 strip. Nothing to mine — this base is already pre-feature.                                                                      |
| 2            | `xyttrsnr`                           | **`Held` and its whole ripple** (enum, fetch-gate exclusion via `PersistentItemStatusMap.Fetchable`, status API, dashboard, app DTOs). |
| 3            | `stonywuk`                           | Ingestion under a row lock taken as the transaction's first act; enqueue-flush integration; idempotency-key handling; caps matrix.     |
| 4            | `xvyzznsn`                           | State inheritance along a chain — mostly moot here; read for the executor's null-discriminator pattern (`ChainStateSource`).           |
| 5            | `wumzmozz`                           | `ExchangeDeadlineService` (the sweep to shrink), per-mailbox isolation, and the two defects its review found.                          |
| 6            | `nqtvqytw`                           | `AppCommand` / callback contract reshape and the wire-contract snapshot protocol.                                                      |
| 7            | `kotqmwtq`                           | Pipeline pairing (`WithReplyFrom`), `ServiceTaskExpansion`, `ServiceTaskContext` plumbing.                                             |
| 8            | `vonkpkpu`                           | The HMAC envelope with its known-answer vectors, the forwarder surface, and its status mapping.                                        |
| 9            | `kxtxqxuu`                           | Fiks Arkiv decision logic.                                                                                                             |
| 10 / 11      | `mmppzrvl` / `soouolvy`              | The k6 storm scenario and comparator machinery; the stack-hygiene checklist.                                                           |

### Orchestrator decisions taken to unblock implementation

Recorded here so a worker never re-opens them silently; each is reversible by the repo owner.

1. **Open question 3 — waiter table.** Take the draft's stated preference: one nullable
   `mailbox_id` on `engine.workflows` plus `engine.mailbox_waiters`. Step 3 owns it.
2. **Open question 6 — `collectionKey` stays optional.** It is dashboard grouping only now that the
   deadline sweep replaced the collection-anchored leak GC; the app-lib always passes it.
3. **Open question 7 — no compound hard-stop endpoint.** Cancel-plus-`DELETE` stays an ops recipe.
4. **Open question 8 — encryption at rest is out of scope**, exactly as in v2; it is one decision
   for both designs and does not belong to this stack.
5. **Open question 4's residual — no idle-deadline variant.** Absolute deadline only, until a
   consumer asks.
6. **Open question 9 — deliveries skip the admission gate**, inheriting v2's reasoning ("a refused
   delivery may never be sent again"); the caps in steps 1–2 are the bound.
7. **Fiks Arkiv's `IFiksArkivResponseHandler` is live v8 GA API at this base.** Step 10's default is
   to **re-plumb it**, not retire it — v2's "leave it retired" decision was an artifact of the v2
   stack having already retired it. A worker that concludes retirement is unavoidable ends the run
   `BLOCKED` with the argument rather than retiring public API on its own authority.

### Worker/reviewer protocol

- Use **jj, not git**, for all version-control operations. The whole monorepo is one jj repository
  (`jj root` from `src/App/backend`, `src/Runtime/workflow-engine` and `workflow-engine-app` all
  answer with the repo root) — but run `jj root` from the paths you touch rather than assuming it.
- Before coding, if the current jj revision (`@`) is non-empty, create a new child revision
  (`jj new`) and work there. One revision per step.
- Do not push. Do not move bookmarks. Do not revert unrelated user changes.
- Workers and reviewers report back to the orchestrator **only** by ending their run with a final
  report. Mid-run messaging is not possible; a blocked worker ends its run with a `BLOCKED` report
  stating the blocker rather than waiting.
- **Worker final reports** must include: step name, a `READY_FOR_REVIEW` or `BLOCKED` marker, jj
  change/revision ids, changed files, tests run with results, and notes for later steps.
- **Reviewer final reports** must include: `APPROVED` or `CHANGES_REQUESTED`, findings first.
  Residual non-blocking gaps are listed explicitly so the orchestrator can triage them.
- If a step is too broad to implement coherently, update this step list with the smallest coherent
  split and end the run with `BLOCKED_FOR_SCOPE_SPLIT`.
- Every revision must be **green on its own** — build and the suites the step touches — not merely
  green at the end of the stack. Green means green, not feature-complete: a documented gap that a
  later step closes is fine, unreachable scaffolding is not.

Repo traps, all learned the hard way in the v1/v2 stacks:

- **Build the way CI does:** `CI=true dotnet build … --no-incremental`.
  `src/App/backend/Directory.Build.props` sets `TreatWarningsAsErrors` only under `CI=true`, so a
  plain local build hides real CI failures (a `CS8604` survived nine steps this way).
- **Generated-file trap when building `src/App/backend` under jj.** `.gitattributes` declares
  `/src/App/backend/**/*.cs text eol=crlf`, but the `FormDataWrapperGenerator` outputs under
  `test/Altinn.App.SourceGenerator.Integration.Tests/gen/` are stored LF. The build rewrites them as
  CRLF: git normalizes on read and reports clean, **jj compares bytes and reports them modified**,
  so any `jj new`/`jj squash` after an app-backend build sweeps them into a revision silently. After
  building the app backend, check `jj st` and `jj restore` those paths before committing.
- **The working directory persists between tool calls**, and `npx prettier --check <repo-relative
path>` from a subdirectory matches **nothing** while reporting "All matched files use Prettier code
  style!". Check that the paths actually resolved.
- **Check markdown prettier-cleanliness in the repo, never on a copy elsewhere** — `.editorconfig`
  participates in `printWidth` resolution, so a file checked in `/tmp` reports clean when the hook
  would reject it. `prettier.config.js` sets `printWidth: 100`. Prettier wants `_italic_`, not
  `*italic*`: write new lines the prettier way and do not sweep existing ones.
- **The wire-contract guard lives in another folder.** Changing any type reachable from
  `EngineContractTypes` leaves `dotnet test` in `src/Runtime/workflow-engine` fully green while
  `src/Runtime/workflow-engine-app` goes red. Run both, and regenerate the snapshot as
  `WorkflowEngine.App.Tests/Contract/README.md` describes
  (`UPDATE_WIRE_CONTRACT=1 dotnet test --filter FullyQualifiedName~EngineWireContractTests`, then
  re-verify without the env var).
- **`AppWireContractTests` is directional** — established empirically in v2, not assumed: it
  iterates the _app's_ types, so a new engine-only type needs no app copy and a new **nullable**
  engine field may be omitted by the app, but **new enum members must be modeled**, because enum
  `Kind` is compared as an exact string. `Held` therefore ripples into the app-lib DTOs in the same
  step that adds it. Prove the case you are in by reverting and observing.
- Engine tests use Testcontainers (PostgreSQL, WireMock) — Docker must be running; no manual
  compose setup is needed.
- `typos` runs in CI (`typos.toml` in the engine folder), and this repo is **en-us**.

### Invariants this design trades for conventions, and where each is pinned

The proposal's closing paragraph names four; the step that must pin each with a named test:

| Invariant                                                         | Pinned in  |
| ----------------------------------------------------------------- | ---------- |
| Lock order **mailbox row → workflow row**, acyclic by inspection  | steps 3, 4 |
| **Delivery existence is frozen** from first fetchability          | steps 4, 6 |
| **Frontier never empty** across a multi-hop relay                 | step 8     |
| The **three saga invariants** (order, one concluder, keyed calls) | step 8     |

### Steps

Statuses: `todo` → `in progress` → `in review` → `done`.

Engine first (steps 1–6), then the app library (7–10), then measurement and hygiene (11–12). Each
engine step is independently green because the engine surfaces are additive: nothing existing
changes behavior until the app declares a mailbox.

#### Step 1 — Engine: the mailbox — schema, mint, read, close — `done`

Landed as jj change `vrymvwoqpmrn` — 30 files, +2776/−6, all under `src/Runtime/workflow-engine`.
Engine suite **705 → 709**; host 76 unchanged, and no wire-contract regeneration was needed (no
`EngineContractTypes`-reachable type moved — verified, not assumed). Three review rounds; the
migration is a single pair, regenerated in place rather than stacked, since nothing is released.

Four decisions worth knowing, each reached by argument rather than default:

- **`DELETE` answers `202` effecting / `200` replay / `404` missing.** The first draft answered
  `200` for both on the reasoning that a fully-applied close has nothing "accepted" to report;
  `abandon` disproves it — a synchronous compare-and-set that still answers `202`. The repo's rule
  is _`202` means this call effected the state change_, which the mint already encodes as `201`/`200`.
- **The mint is the one mutation that does not lock first**, because the row is what it creates; the
  unique index serializes it. It is one statement whose CTE order _is_ the semantics (`existing`
  consulted unconditionally, so a replay is answered even at the cap; `open_count` gating only new
  rows; `ON CONFLICT DO UPDATE` so a losing racer gets the winner's row), verified against a real
  Postgres in all three interleavings. The caller distinguishes mint from replay by whether the
  returned id is the one it generated — which survives `ExecuteWithRetry` re-execution after an
  unacknowledged commit, where a literal `minted` flag would not.
- **The open-mailboxes-per-collection cap is best-effort, not exact**, because `open_count` is
  evaluated in the mint's own snapshot: concurrent mints of different keys overshoot by up to the
  in-flight mint count, never runaway. Documented as best-effort in all four places and pinned
  _deterministically_ (an uncommitted hand-inserted mailbox forces the overshoot) rather than by
  racing — a test asserting that a race reproduces is flaky on a loaded box, and would fail the build
  if the cap were ever made exact, which would be an improvement.
- **`MaxMailboxTimeout = 21d`**, derived against the receiver-enqueue anchor:
  `21d (park) + 1min (sweep) + 14d (wait) + 60d (retention resume) + 14d (second wait) + 1d (retry
ladder) = 110d 1min`, against a ≥114d floor from the operator's rotation window — margin ≈4d, and
  3× v2's inherited-token ceiling, as the motivation predicted. Two terms v2 had to carry are gone,
  and v2's _uncounted_ link-wait term is inside the bound by construction.

What steps 2–6 inherit:

- **Validation belongs in `Engine`, before the database.** `varchar(200)` overflow raises SQLSTATE
  22001, which `EngineRepository.Resilience.cs` classifies as _transient_ — so an unvalidated
  over-long key retried for 30s and logged a false "Database down?" before answering `500`. Mint
  validation now lives in `Engine.ValidateMailboxRequest` behind `MailboxMintResult.Invalid`;
  step 2's delivery `idempotencyKey` needs the same treatment, reusing `MaxMailboxKeyLength`.
- **`ck_mailboxes_disposal_is_complete`** is biconditional: open ⇒ both disposal fields null,
  disposed ⇒ both non-null. Any future writer of `status` (steps 4 and 5) must write
  `disposed_reason` and `disposed_at` in the same statement.
- **`CloseMailbox` already takes a `MailboxDisposedReason`** and opens a transaction whose first
  statement is `SELECT … FOR UPDATE`. That is where step 4's waiter release goes, and step 5's sweep
  calls the same method with `Deadline`.
- **`unconsumedDeliveries` is derived** as `max(0, nextIdx − nextSeq)` — exact for the plan's
  definition given gapless logs. Step 2 should validate it against real delivery rows, not replace it.
- Both fixtures' `TRUNCATE` lists include `engine.mailboxes`; steps 2–3 must add
  `mailbox_deliveries` and `mailbox_waiters`.

Gaps left open deliberately, each pinned by a characterization test rather than a comment: `DELETE`
releases no receivers (step 4); the deadline is stamped but unenforced and mailboxes sit outside
retention (step 5, pinned by a test that runs all four existing sweeps against an overdue mailbox);
no dashboard rendering (step 5); a mailbox minted without a `collectionKey` is uncapped.

Residuals recorded and not actioned: one clause in the cap test's comment over-claims (an
advisory-lock exact cap would leave it green, though it could not slip past the four "best-effort"
doc sites); the CHECK test's second assertion checks `SqlState` but not the constraint name; the
`timeout` column is derivable from `deadline − created_at` (spec-mandated); `ReadMailbox`'s
positional offsets are coupled to `MailboxColumns` by convention with no test against a one-sided
reorder. **Unrelated pre-existing landmine found:** `DbMaintenanceService.PurgeExpiredWorkflows`
loops `while (deleted >= settings.BatchSize)`, which never terminates when `BatchSize == 0` — and
`PostgresFixture` ships exactly that, since it builds `EngineSettings` with no `Retention` block. It
hung a test run for ten minutes. Production is protected only indirectly, by `ValidateEngineSettings`.

Paths: `src/Runtime/workflow-engine` (`WorkflowEngine.Data` entities/migrations/repository/SQL,
`WorkflowEngine.Models`, `WorkflowEngine.Core/Endpoints`, `WorkflowEngine.Telemetry`, `tests/`).

`engine.mailboxes` exactly as specified in [The mailbox](#the-mailbox), with its EF entity, its
migration, and the repository writes. Three endpoints: `POST /api/v1/{namespace}/mailboxes`
(engine-generated uuidv7, `UNIQUE (namespace, idempotency_key)` replay → `200` with the existing
mailbox, otherwise `201`; required positive `timeout` capped by `EngineSettings.MaxMailboxTimeout`,
stamping `deadline = now + timeout`; optional `collectionKey`),
`GET /api/v1/{namespace}/mailboxes/{id}` (status, deadline, both counters, unconsumed count — the
count reads zero until step 2 gives it rows), and `DELETE /api/v1/{namespace}/mailboxes/{id}`
(idempotent close: `disposed`, `disposed_reason = 'request'`, `disposed_at`, repeat returns `200`
with the original `disposedAt`). Every mutation takes the mailbox row lock as its first act.

Settings and caps: `MaxMailboxTimeout` with **v2 step 2's derivation redone against the
receiver-enqueue anchor** (a receiver parks on the one token minted at its own enqueue, so the bound
is the remaining mailbox lifetime, not the whole exchange plus resumes) — carry over the
`CallbackTokenLifetimeInvariantTests` tripwire pattern from `xyttrsnr`, and write the derivation
down where the setting is defined; an open-mailboxes-per-collection cap (`429` at mint). Metrics:
`engine.mailboxes.created`, `engine.mailboxes.closed` tagged `reason`.

**Out of scope, and the step must not anticipate it:** deliveries, waiters, receive workflows, the
release half of closure (step 4), the deadline sweep (step 5), retention (step 5). `DELETE` in this
step closes for deliveries and nothing else — there are no receivers in the engine's model yet.
Record that gap with a characterization test rather than a comment, in v2's style.

#### Step 2 — Engine: delivery ingestion — `done`

Landed as jj change `porzwtus` — 25 files, +2151/−22, all under `src/Runtime/workflow-engine`.
Engine suite **709 → 758**; host 76 unchanged, no wire-contract regeneration. Two review rounds.

**The lock-first discipline was verified by experiment, not by reading** — the property this whole
design rests on, so it is worth recording how it was established. Against a real PostgreSQL: the
transaction's first statement is `SELECT … FOR UPDATE`, and it reads status, `next_idx` and the
disposal fields in that same statement, so there is no pre-lock read to decide on; EPQ re-read
returns the _updated_ row after a concurrent close commits, where a read-before-lock implementation
would have read `open`. Two further facts fell out, both useful to steps 3–5:

- **The counter does not need the explicit lock.** The append is one statement —
  `WITH bumped AS (UPDATE engine.mailboxes SET next_idx = next_idx + 1 … RETURNING next_idx - 1 AS idx)
INSERT … SELECT … FROM bumped` — and the `UPDATE`-inside-CTE serializes appends on its own, with a
  loser's rollback leaving no gap and no reused position. The row lock is what makes the **status and
  log-full decisions** safe, which is exactly the rationale the design states.
- **The idempotency lookup runs before the closed and log-full checks**, under the lock. That
  ordering _is_ the accepted-versus-kept rule: it changes only what an already-stored delivery is
  told, and the closed check still gates every append. Reordering it would make a forwarder
  dead-letter a message the engine holds.

What steps 3–6 inherit:

- **`MaxMailboxLogLength` (100) bounds both logs.** Step 2 applies it to `next_idx`; **step 3 applies
  the same number to `next_seq`.**
- **The FK is `RESTRICT`, not cascade** — the only non-cascade FK in the schema, where every purge in
  `DbMaintenanceService` otherwise relies on cascade. Deliberate: the proposal mandates children-first
  purge order, and an explicit order that fails loudly (SQLSTATE `23001`) beats a silent cascade.
  **Step 5's retention purge must delete children first.**
- **`PostgresFixture` now shares one `NpgsqlDataSource`.** Every `CreateRepository*` overload
  previously built a private pool retained until fixture disposal — 152 call sites against a
  `max_connections = 100` container, which surfaced as `53300: too many clients` failing ~18
  _unrelated_ tests. Fixed at the source with zero test edits; the Repository suite went from
  exhausting connections to 10s. Steps 3–5 add repository test classes freely; use
  `fixture.CreateRepository()`.
- `Engine.MailboxDeliveryOutcomeTag` is `internal` (on an already-internal class, so no public surface
  moved) and pinned by an exhaustive mapping test; follow that split — wiring proved once end to end,
  pure mappings proved exhaustively.

Deliberately left undone, pinned by `AcceptedDelivery_SitsAtItsPositionAndWakesNobody`: an accepted
delivery moves `nextIdx` and wakes nobody. **Step 4 must make the second half stop being true by
giving a receiver a position to be released at — not by making acceptance do more work.**

Residuals carried: the `429` test costs 100 real deliveries (accepted); `MailboxDeliveryColumns` keeps
the positional coupling step 1 recorded for `MailboxColumns`; `EveryDeliveryOutcome_IsCovered`'s
`IsSealed` filter would silently skip a future non-sealed variant (one-line fix for whoever is next
in that file).

Paths: as step 1.

`engine.mailbox_deliveries` + migration, and
`POST /api/v1/{namespace}/mailboxes/{id}/deliveries` with `{ idempotencyKey, payload }`: one
transaction, mailbox row lock first, validate (exists in this namespace, `open`, payload within
`MaxMailboxPayloadSize`, log within `MaxMailboxLogLength`), assign `idx = next_idx++`, insert. The
full response matrix from [Deliveries](#deliveries-gapless-ingestion) — `202` with `idx`, `200`
replay with the original `idx`, `404`, `409` too late, `413`, `429` — with the _accepted versus
kept_ rule pinned by tests: a refusal inserts nothing and repeats on replay, an acceptance replays
`200` even after the mailbox closes. Gapless `idx` under concurrency is a test, not an assertion.
`GET` now reports real counters and the unconsumed count. Metric:
`engine.mailboxes.deliveries.received` tagged `outcome`, counted for every outcome including
pre-lock rejections.

**Out of scope:** the wake (no waiters exist yet — step 4), admission/backpressure (decision 6
above).

#### Step 3 — Engine: receive workflows — `Held`, the declaration, and seq assignment — `done`

Landed as jj change `qpuyyswk` — 54 files, +2378/−75, the first step to reach outside the engine
folder. Engine suite **758 → 797**; host 76; `Altinn.App.Core.Tests --filter ~WorkflowEngine` 268.
Two review rounds.

**The hot-path claim was verified the way v2 verified its analogue, not asserted.**
`FetchAndLockWorkflows` is byte-identical to the pre-step base by method extraction (re-checked after
round 2 edited the same file), its plan snapshot is untouched and `QueryPlanTests` green, `mailbox_id`
reaches the enqueue `COPY` automatically through `SqlBulkInserter`'s reflection over the EF model, and
a non-mailbox batch issues **zero** extra statements — the lock helper returns before any SQL and the
three downstream helpers short-circuit. `Held` entering the `Incomplete` set is a real semantic change
to three existing consumers (backpressure via `MetricsCollector`, the active/scheduled queries, and
retention through `IncompleteSqlList`), each traced and each correct; the retention half is now pinned
by a test that goes red if `IncompleteSqlList` reverts.

Three decisions worth carrying forward:

- **The idempotency-key release choreography is necessary here**, unlike step 2's ingestion.
  `MailboxLogFull` cannot be decided before newness is known, and `InsertIdempotencyKeys` is the only
  non-racy way to learn newness; the shapes that avoid the release add statements and races instead.
  `ReleaseIdempotencyKeys` only ever deletes rows its own transaction inserted, and runs before the
  COPY. Intra-batch duplicates of a refused request inherit its verdict through `(Index, PrimaryIndex)`
  pairing.
- **The flush locks mailboxes only for requests that can consume a position** — `LockAndReadMailboxes`
  runs just after `InsertIdempotencyKeys`, scoped to `newRequestIndices`. The first draft locked
  earlier, over every valid request, which made a replay-only batch stall an entire shared flush behind
  a delivery or a close for a request that would consume nothing. The reversed order relative to
  `idempotency_keys` is cycle-free, established by enumerating every statement touching either table:
  no transaction anywhere holds a mailbox row while waiting on a key. A flush blocked on a concurrent
  same-key insert now holds no mailbox rows at all.
- **The repository layer holds one namespace contract.** Mailbox rows had been storing the raw route
  namespace while workflow rows stored the normalized form, compensated for at one reader. All four
  mailbox repository entry points now normalize on entry (outside `ExecuteWithRetry`, per step 1's
  SQLSTATE-22001 rule) and the compensation is gone.

The uniform lock order in the flush is **`idempotency_keys` → `mailboxes` (`ORDER BY m.id … FOR
UPDATE`) → `workflows` (COPY) → `workflow_collections` → `mailbox_waiters`**. `ProcessCollections` can
never hold a collection row while waiting on a mailbox row.

What steps 4–6 inherit:

- **A waiter row exists only for a receiver born parked.** One born runnable registers nothing, so the
  wake and the closure release walk exactly the set that needs releasing. `released_at` is written by
  nobody yet.
- `WriteMailboxReceivers` advances `next_seq` relatively (`next_seq + n`) and inserts waiters, after
  `ProcessCollections`, inside the transaction holding the mailbox row lock.
- **`mailbox_waiters` FK is `RESTRICT`** like deliveries; `workflow_id` deliberately carries no FK.
  **Step 5's purge must delete waiters and deliveries before the mailbox.**
- **Step 4's wake must emit the `NOTIFY status_changed` this step does not** — receivers born
  `Enqueued` are ordinary new workflows riding the existing in-process signal.
- `Fetchable` is now genuinely load-bearing: `FetchableSqlList` is shared with the
  `ix_workflows_backoff_until_created_at` filter and pinned to the set, so a set edit changes the index
  and CI catches it. The **fetch gate's own status list remains an unpinned restatement kept in step by
  review** — stated plainly in the code rather than claimed to be pinned.

Deliberately left undone, pinned by characterization tests: a `Held` receiver created here never wakes
(`Enqueue_EnqueueFirst_LeavesAWaiterForTheDeliveryToFind`, and a live-engine test asserting it stays
`Held`). **Step 4 must make both stop being true.**

Paths: `src/Runtime/workflow-engine`, `src/Runtime/workflow-engine-app` (wire contract), and the
app-lib DTO copies in `src/App/backend` that the directional guard forces (`Held` is a new enum
member).

Re-add **`Held`** from `xyttrsnr` with its meaning intact — born parked, absent from the fetch
gate's status list, no lease, no backoff, released by an event — and its ripple. Add
`engine.workflows.mailbox_id uuid NULL` and `engine.mailbox_waiters` with their migration. Add
`WorkflowRequest.mailbox { id }` and validate at enqueue: the block puts the delivery in the
**first** step and nowhere else, at most one block per workflow, and never together with `startAt`.
Inside the enqueue flush, under the mailbox row lock, assign `seq = next_seq++` and decide the birth
state — the three cases in [The receive workflow](#the-receive-workflow), including the one that
looks wrong and is not: **a delivery at `seq` outranks closure**, so a receiver enqueued against a
`disposed` mailbox is still born runnable with its backlog delivery.

Pin here: the lock-order half of the invariant table (mailbox row taken first, in the enqueue path),
gapless `seq` under concurrent enqueues, and the delivery-versus-enqueue race in both interleavings
with no third. Note that `seq` assignment happens inside the enqueue flush, which is a different
transaction shape from step 2's endpoint — the lock must still be that transaction's first act on
mailbox state.

**Out of scope:** the wake and the closure release (step 4), anything the executor does with the
delivery (step 6). A `Held` receiver in this step simply never wakes; say so in the step's notes.

#### Step 4 — Engine: the rendezvous — the wake and the closure release — `done`

Landed as jj change `kmmxpntq` — 17 files, +1726/−82, all under `src/Runtime/workflow-engine`.
Engine suite **797 → 827**; host 76, no wire-contract regeneration. Two rounds (approved on the first,
with four follow-ups applied and confirmed).

**The hot path survived the step that most threatened it.** The wake-to-claim histogram needed a
timestamp taken at claim time, so this step touches `FetchAndLockWorkflows` — one added call line, with
the claim CTE byte-identical to base. The zero-cost guarantee is now **pinned rather than incidental**:
`RecordWakeToClaimLatency` returns before any SQL when no claimed entity carries a `MailboxId`, and the
reviewer deleted that short-circuit in a throwaway copy to confirm
`FetchAndLock_OfOrdinaryWorkflows_IssuesNoMailboxStatementAtAll` goes red alone. The fetch's stamp and
the closure release touch disjoint waiter sets (`claimed_at IS NULL` versus `released_at IS NULL`), so
they cannot contend.

**Three properties established by mutation, not observation** — the standard this stack now holds:

- **Atomicity of wake-with-delivery.** `Delivery_AndTheWakeItPerforms_ShareOneTransactionId` compares
  `xmin` across the delivery row, the woken workflow and the waiter (v2's `wumzmozz` technique).
  Splitting the transaction turns that test and the lock-order test red while 21 others stay green —
  which is exactly why observation-based tests cannot establish this property.
- **The compound lock order mailbox → workflow.** A third session proves the blocked delivery still
  holds the mailbox row (`FOR UPDATE NOWAIT` → `55P03`) while it waits on the workflow row.
- **Step 1's close-lock test did not discriminate**, verified _both ways_: against a `FOR UPDATE`-
  dropping mutation the original test passes and the fixed one fails. Fixed here, in this revision,
  without amending step 1.

Every row of the races table now has a discriminating test, including the symmetric
delivery-versus-closure interleaving step 2 left half-covered and the crash-after-wake-before-`NOTIFY`
recovery. The table's remaining row — a crash inside the app's continuation sequence — is step 8's.

Two departures from the proposal as drafted, both endorsed:

- **`NOTIFY` is issued inside the releasing transaction**, not after commit. The plan text above is
  corrected rather than the code.
- **`engine.mailbox_waiters` gained `claimed_at`**, one nullable column beyond the drafted schema.
  Without it a receiver that fails and climbs its retry ladder re-reports the whole ladder as wake
  latency on every claim, so the histogram would measure the retry strategy rather than the wake. The
  alternatives were worked and are worse: `updated_at` is overwritten by the claim itself, and
  requeue/defer counters are fragile proxies.

What steps 5–6 inherit:

- **Telemetry is inherited, not re-derived.** `MailboxCloseResult` carries a virtual no-op `Record()`
  that `Closed` overrides to emit `MailboxesClosed{reason}` _and_ the released counts together, so the
  sweep calls `CloseLockedMailbox` and then `result.Record()` after its own commit and cannot get the
  tag set wrong. The `reason` tag reads from the row actually written, so it becomes correct by
  construction the moment the sweep passes `Deadline`.
- **Step 5's sweep calls
  `CloseLockedMailbox(conn, tx, locked, MailboxDisposedReason.Deadline, now, ct)`** — its
  `FOR UPDATE SKIP LOCKED` claim _is_ the lock and the read, so it claims, projects through
  `ReadMailbox`, and calls straight in. `Mailbox.UnconsumedDeliveries` is the number for
  `engine.mailboxes.deliveries.unconsumed`.
- **Step 6 should consider folding the wake-to-claim stamp into the executor's waiter read.** The
  executor must read the waiter row by primary key anyway; folding removes the one statement the fetch
  loop currently issues per claimed receiver (including a no-op `UPDATE` for receivers born runnable,
  which have no waiter row) — at the cost of changing the measurement from release→claim to
  release→first execution attempt.
- A released receiver today is an ordinary runnable workflow: its steps execute in order and
  `mailbox_id` is a column nothing consults at execution time. Pinned by
  `Delivery_WakesAHeldReceiver_WhichThenRunsItsStepsLikeAnyOtherWorkflow`. The database-level freeze
  step 6 re-derives from is already pinned here.

Residuals recorded, not actioned: `ReleaseMailboxWaitersSql` has no query-plan test (the best candidate
in the feature, along with the fetch stamp's `ANY(…)` update); the `@seq IS NULL` disjunction defeats
the PK's second column (harmless at ≤100 waiters); three hand-written copies of engine SQL live in the
tests, unavoidable for mid-flight-transaction and no-`NOTIFY` scenarios but able to drift silently.

Paths: `src/Runtime/workflow-engine`.

The wake, inside the delivery transaction, as the statement in [The wake](#the-wake) — release the
waiter at `seq = idx`, stamp `released_at`, one `NOTIFY status_changed` inside the releasing
transaction (see [The wake](#the-wake)). The closure
release inside `DELETE`, under the same lock: `Held` → `Enqueued` for every parked receiver, waiters
stamped, unconsumed deliveries counted and reported in the response. This is the step where
[Races and locking](#races-and-locking) becomes real: **every row of that table gets a test**, and
the compound lock order mailbox → workflow is asserted rather than described. Two items are carried
here from earlier reviews and belong to that sweep: the **symmetric delivery-versus-closure
interleaving** (a close blocking behind an in-flight delivery — step 2 pinned only closure-first under
contention), and step 1's `CloseMailbox_CannotEvenReadTheMailboxWhileItsRowLockIsHeldElsewhere`, which
does **not** discriminate — it holds no state that a read-before-lock implementation could answer from
without blocking, so it passes either way. Step 2's fix is the model: give the racing call a verdict
reachable from an _unlocked_ table (a replay decided entirely from `mailbox_deliveries`), so a
read-before-lock implementation answers immediately and the test goes red. Metrics:
`engine.mailboxes.receivers.released` tagged `delivered`/`closed`, and the wake-to-claim latency
histogram.

The transactionality claim is the point of the step and must be proved the way v2's step 5 proved
its analogue — a test that would stay green if the transaction were split proves nothing.

**Out of scope:** the sweep (step 5), the executor's read (step 6).

#### Step 5 — Engine: the deadline sweep, retention, and the dashboard — **split into 5a and 5b**

Split taken by the step-5 worker (2026-08-19) under the protocol's scope-split rule, on the sizing the
step itself anticipated. The dashboard is not a small addition to the sweep: it is the **first
non-workflow noun the dashboard renders**, so nothing composes — DTOs, `DashboardMapper`, the SSE
fingerprint loop and the chain spine all assume "a workflow" — and it needs a genuinely new
three-table repository read with no precedent among the four single-mailbox methods that exist. It
also carries a design question that is not the worker's to settle silently (recorded in 5b below).
The sweep and the retention purge, by contrast, are one coherent piece of lifecycle housekeeping, and
they carry the `MaxMailboxTimeout` repoint with them. Estimated ~900 hand-written lines for the
dashboard alone against ~1400 for the sweep half.

#### Step 5a — Engine: the deadline sweep and retention — `done`

Landed as jj change `tzlzmqyk` — 25 files, +2045/−64. Engine suite **827 → 850**; host 76 unchanged.
Two review rounds.

**The sweep got its own cadence, and that moved a safety bound.** `EngineSettings.MailboxSweepInterval`
is 5 minutes rather than reusing `MaintenanceInterval`, so the worst case in the `MaxMailboxTimeout`
derivation is now **110d 5min** against the ≥114d floor — margin ≈3d 23h. Both places step 1 named
were repointed, and a test pins that the service actually _runs_ on the setting it charges (the
arithmetic is only true if it does).

**Two defects were found in the safety bound itself, both by review, both now closed:**

1. **The bound and the batch size contradicted each other.** The sweep took one batch of 100 per tick,
   while three sites in the same revision claimed "deadline plus at most one cadence" — the real gap
   was `⌈overdue / 100⌉ × cadence`, or roughly four hours to drain a 5,000-mailbox mass timeout. The
   sweep now **drains within the tick**, using the retention loop's shape with its `Closed > 0` guard,
   so the claim is true rather than weakened. The guard's own test had to be rewritten before it
   tested anything: with one poisoned mailbox the pass returns short and the length condition exits
   the loop regardless, so it only reddened at a shrunk batch size. It now seeds a **full batch** and
   poisons all of it, and dropping the guard makes it spin for the full 30-second race timeout.
2. **The tripwire pinned `Defaults` while the property initializer was what actually ran.** Mutating
   the initializer to 15 minutes left the tripwire green while the effective cadence tripled — the
   exact failure mode step 1's carried note warned about, relocated rather than closed. The
   initializer is gone; the normalizer sources from `Defaults`, matching the two neighboring timer
   settings. The new guard holds the two derivation terms to **different, stated** standards:
   `MailboxSweepInterval` must carry no initializer at all, while `MaxMailboxTimeout` inherited one
   from step 1 and is held to the weaker rule that it agree with `Defaults` — which closes step 1's
   hole too.

**Two partial indexes were added beyond the letter of the step** (`ix_mailboxes_deadline_open`,
`ix_mailboxes_disposed_at`) and earned their place: measured on a seeded database, the retention scan
without its index degrades to a sequential scan of 200,000 rows with a 7.8 MB external merge sort
(6,240 buffers against 23), and the empty-tick deadline scan goes from 4 buffers to 655. The plan's
"one indexed scan per cadence" was false without them. Both are pinned by `QueryPlanTests`, whose seed
had to reach 40,000 rows because both queries are `ORDER BY … LIMIT` and an index only wins by
stopping early — the crossover sits near 5,000–10,000, so the margin runs in the safe direction.

Other decisions: `MailboxDeadlineService` lives in `Data/Services` beside `DbMaintenanceService`
rather than in Core, since with no enqueue half it needs nothing Core has; the per-mailbox close
deliberately does **not** use `ExecuteWithRetry`, because a re-run after an unacknowledged commit
returns nothing against a `status = 'open'` predicate and would lose that pass's counts — the cadence
is the retry; per-mailbox failures tag `operation="mailboxDeadlineClose"` distinctly from the
pass-level tag, so an operator can separate one poisoned mailbox from a dead sweep.

Worth knowing: the `23001` purge-order assertion is **PostgreSQL 18+ behavior** — PG 17 raises `23503`
for both `RESTRICT` and `NO ACTION` — so on this repo's pinned `postgres:18` it is a _stronger_
discriminator than intended, distinguishing `RESTRICT` from a `NO ACTION` regression. It is coupled to
that pin, and the test says so.

Residuals: two retention batch loops differ by one guard until step 12 unifies them (the mailbox one
is the shape that terminates); three tests carry wall-clock thresholds; the documented "an open
mailbox past its deadline is worth an alert" story still has no gauge to hang an alert on — carried to
5b.

Paths: `src/Runtime/workflow-engine` (background service, `DbMaintenanceService`, repository).

A small `BackgroundService` claiming `open` mailboxes past `deadline` with `FOR UPDATE SKIP LOCKED` —
the claim _is_ the master lock — running **exactly the `DELETE` routine** with
`disposed_reason = 'deadline'`, one transaction per mailbox, per-mailbox `try`/`catch` so one throw
leaves that mailbox claimable next tick and never wedges the batch. There is no second half: nothing
is enqueued. Mine `wumzmozz` for the isolation lesson and leave its backstop zoo behind — it has
nothing to attach to here. Retention: a `disposed` mailbox past the cutoff purges with its deliveries
and waiters, children first, in the existing maintenance sweep. Metric:
`engine.mailboxes.deliveries.unconsumed`.

#### Step 5b — Engine: the dashboard and the mailbox alerts — **split into 5b-i and 5b-ii**

Ran after step 6 rather than before it (step 6 was the last engine piece steps 7–10 waited on;
nothing waits on the dashboard). **Two observability gaps from earlier steps are folded in here**,
because they are the same kind of work and each is currently a documented promise with nothing to
hang on:

1. **No gauge of open mailboxes past their deadline.** 5a's docs say such a mailbox "is an invariant
   violation worth an alert, not a GC policy" — and nothing makes it observable. The sweep closes
   them, so a persistent one means the sweep is not running or not draining.
2. **No metric on step 6's two critical states.** `Unregistered` and `Undecided` log at `Error` and
   raise the ordinary execution-failed counter, so an operator alert on "the engine is violating its
   own rendezvous invariant" has only the log to hang on.

Paths: `src/Runtime/workflow-engine` (`DashboardEndpoints`, `DashboardMapper`, `wwwroot`, a new
repository read).

A mailbox renders under its collection with its deadline, both counters, per-position state
(delivered/consumed/waiting), and its receivers linked. A `Held` receiver renders as `Held` and
receive workflows are ordinary workflows, so those cost nothing new. `released_at` and `claimed_at`
are both written exactly once and are ready for this.

**The design question the split raised is ANSWERED — and it was not a dashboard question.** See
[step 5c](#step-5c--engine-register-every-receivers-position--in-progress), which closes it before
this step or step 6 builds on the gap.

Two further sizing facts the split turned up: the collection view is built entirely from the
`/dashboard/stream/live` SSE payload with no fetch, so a block that should always be visible needs
either a new endpoint or a new SSE fingerprint; and `modules/shared/chain-groups.js` is the module
that owns the collection level, with `mailboxCache` slotting beside its existing `historyCache` and
reusing its re-render hooks.

Split taken by the step-5b worker (2026-08-19) under the protocol's scope-split rule, on the shape the
orchestrator had pre-scoped. The server half turned out to be the larger and more decision-dense one — a
new three-table read, its own index with a migration, four DTO shapes, an endpoint, two metrics and their
tests — and it is established the way this stack establishes things: by mutation, against a real
database. The `wwwroot` half cannot be established that way at all, because the dashboard has no JS test
infrastructure, so proving it means driving the rendered page against a live engine holding a mailbox in
each state. Those are two different kinds of work with two different proof standards, and the second one
is where "dashboard code is where this discipline lapses" bites; keeping them in one revision would have
meant one of them getting the other's rigor.

#### Step 5b-i — Engine: the mailbox read, the endpoint, and the alerts

The server half: the repository read, the DTOs, the endpoint, and the two folded-in observability gaps.
Independently green — the endpoint is reachable and tested without a line of rendering.

Paths: `src/Runtime/workflow-engine` (`DashboardEndpoints`, `DashboardMapper`, `MetricsCollector`,
`WorkflowExecutor`, `EngineDbContext` + one migration, repository, `Metrics`, `AGENTS.md`,
`DASHBOARD_SPEC.md`, and the `wwwroot/modules/core/state.js` typedef).

`GET /dashboard/mailboxes?collectionKeys=a,b&namespace=…` returns the mailboxes of the named collections
with their logs laid out position by position, open and closed alike, bounded per collection rather than
globally. A gauge of mailboxes left open past `deadline` plus one sweep cadence, and a counter on step 6's
two critical states tagged apart from ordinary execution failures.

#### Step 5b-ii — Engine: rendering the mailbox under its collection

Paths: `src/Runtime/workflow-engine/src/WorkflowEngine.Core/wwwroot`.

The rendering half, against the endpoint 5b-i landed. A mailbox renders under its collection with its
deadline, both counters, per-position state and its receivers linked; a `Held` receiver renders as `Held`
and receive workflows are ordinary workflows, so those cost nothing new.

What 5b-i leaves ready, and what it deliberately did not do:

- The payload is documented in `DASHBOARD_SPEC.md` — the four `state` words, `parkedForSeconds`, `heldAt`
  for the live count-up on a receiver still parked, and `truncatedCollections` for a group whose window
  the per-collection limit cut.
- Every workflow card carries `mailboxId`, present only on a receive workflow, so a rendered row can be
  matched to the mailbox block above it with no second lookup. The `state.js` typedef is in place; no
  module reads it yet.
- `modules/shared/chain-groups.js` is still the module that owns the collection level, with `mailboxCache`
  slotting beside `historyCache` and reusing `rerenderHooks`. One fetch per render pass over the keys of
  the rendered groups, not one per group.
- **No CSS, no rendering, and no `wwwroot/AGENTS.md` "Endpoints Used" row** — that table describes what
  the frontend consumes, so it belongs to this step.

Two things to be honest about while writing it: the dashboard has no JS test infrastructure, so a
rendering claim is only established by driving the page against a live engine holding a mailbox in each of
the four position states — and an assertion that would pass against a mailbox rendering nothing does not
count. Several files under `wwwroot` (including `chain-groups.js` and `AGENTS.md`) are **prettier-dirty at
the base**: match surrounding style, sweep nothing, and check at line granularity.

#### Step 5c — Engine: register every receiver's position — `done`

Landed as jj change `pppxksoy` — 20 files, +906/−309. Engine suite **850 → 866**; host 76. Two review
rounds. The hole is closed: `SELECT seq FROM engine.mailbox_receivers WHERE workflow_id = @id` now
returns exactly one row for **any** receive workflow, so step 6's specified read works for a receiver
born runnable exactly as it does for a woken one, and `UNIQUE (workflow_id)` is a total index rather
than a partial one.

**The decision had a consequence the scoping missed, and the worker caught it.** Step 4's claim stamp
filters `released_at IS NOT NULL AND claimed_at IS NULL`; under the old shape a born-runnable receiver
had no row and was excluded _by accident_. Once every receiver registers, that filter would have begun
recording **birth → first claim** as wake latency — an ordinary fetch cycle, not a wake, and in the
common early-delivery case most of the samples. The histogram that exists to prove the wake works
would have been measuring the poll loop. Hence `held_at`: the projection returns
`CASE WHEN mr.held_at IS NOT NULL THEN mr.released_at END`, so `claimed_at` is still stamped for every
receiver (it means what it says) and only the _measurement_ is withheld.

**The table was renamed `engine.mailbox_waiters` → `engine.mailbox_receivers`**, at the last moment it
was cheap. "Waiter" is not a name a doc comment can repair once most rows describe receivers that never
waited — it sat in the primary key's meaning, the entity, the release SQL, six test files, both
fixtures, and this plan's own "read the waiter's `seq`", which would have kept steering step 6 wrong.
Exactly one "waiters" deliberately survives, in the sentence saying the registry is _not_ a queue of
waiters.

**The migration is hand-written, and it had to be.** EF's scaffolder emits `DropTable` + `CreateTable`
for a rename — it sees one entity vanish and another appear — which would take every in-flight
rendezvous with it (reproduced by re-scaffolding, so this is established, not feared). The replacement
is `RenameTable` + `RenameIndex` + three `RENAME CONSTRAINT` + `AddColumn` + a backfill, verified
against a real PostgreSQL 18 by `pg_class.oid` being identical before `Up`, after `Up`, and after
`Down`, with seeded rows — including an orphan whose receiver had been purged — surviving both
directions.

**Two lessons worth carrying to every later migration.** First: **a migration has two consumers.** The
five raw `Sql()` blocks omitted their statement terminators, which the `Migrator` path tolerates
(it batches per command) but `dotnet ef migrations script` does not — the generated script aborted at
the _second_ raw statement, after the table rename had already been issued. The runtime verification
was clean precisely because it exercised the wrong consumer. Second, the fix was generalized rather
than patched: `MigrationOperationTests` now asserts over **all** migrations, `Up` and `Down`, that
every `SqlOperation.Sql` ends with `;`, and that the rename migration contains no
`DropTable`/`CreateTable`. Verified auto-discovering: a new migration dropped into the tree was picked
up with no edit to the test, and an unterminated statement in an unrelated older migration failed that
migration's case alone.

What steps 5b and 6 inherit:

- **Step 6 must not read `held_at` to decide the callback.** It records how the receiver was born, not
  whether a delivery exists; delivery existence is re-derived from `mailbox_deliveries` at every
  attempt, which is what keeps the frozen-meaning rule structural. `held_at` is for the histogram and
  per-position state only.
- **Step 4's folding suggestion is cheaper now but carries a condition.** Its note said the fetch
  issues a no-op `UPDATE` for receivers born runnable "which have no waiter row" — no longer true; the
  statement now matches every claimed receiver. If step 6 folds the claim stamp into the executor's
  registry read, it **must carry the `held_at` projection guard with it**, or the histogram regresses
  silently.
- **Step 5b has per-position state from one table**: `held_at IS NOT NULL AND released_at IS NULL` is
  "waiting"; `held_at IS NULL` is "ran straight away", which the workflow status alone cannot say once
  the receiver has settled. `released_at - held_at` (park duration) is derivable and nothing exposes
  it — 5b's call.
- **5b should add `CHECK (held_at IS NOT NULL OR released_at IS NOT NULL)`** when it next touches the
  table. The invariant lives only in doc comments today; the constraint would have caught the
  test-fidelity defect review found here at insert time. It forces two schema tests to change, which is
  why it did not land in this revision.

Residuals: the release's two guards are asymmetric — the status guard alone covers every state the
suite can construct, `released_at IS NULL` alone does not — so the "untouched by the release" tests
redden only when both are removed; the docs' framing of them as independent peers is true for
born-runnable rows specifically. PostgreSQL's auto-generated `NOT NULL` constraint names keep the old
table's prefix after the rename; EF never models those names, so renaming them would mean betting on an
undocumented naming scheme for no functional gain — deliberately left.

Paths: `src/Runtime/workflow-engine`.

**A correctness hole, found while triaging 5b's design question and confirmed against the code.** The
enqueue flush writes a `mailbox_waiters` row **only for a receiver born parked** (`plan.Waiters`); a
receiver born runnable — with its delivery, or with the closed signal — gets no row, and
`engine.workflows` carries `mailbox_id` without a `seq`. So **its position is recorded nowhere in the
database.**

That breaks **step 6**, not merely the dashboard. The executor is specified to read the waiter's `seq`
by primary key and then `mailbox_deliveries (mailbox_id, seq)` — present → attach the payload, absent
→ the no-delivery callback. For a receiver born runnable there is no `seq` to read, so it would fall
through to _absent_ and hand the closing signal to a receiver whose message is sitting at its
position. That is precisely what
[the frozen-meaning rule](#the-receivers-meaning-is-frozen-before-it-can-run) forbids: an attempt that
sees "no delivery" where a delivery exists.

**Decision: register every receiver, stamping `released_at` at birth for the ones born runnable.**
The wake and the closure release already filter on `released_at IS NULL`, so those rows are skipped
untouched and **step 4's approved logic needs no change** — verify that rather than assume it. The
registry then holds `(mailbox_id, seq, workflow_id)` for every receiver, which is exactly what the
executor needs, what the dashboard needs for per-position state, and what makes `UNIQUE (workflow_id)`
a total index rather than a partial one.

_Why not the recorded alternative_ (open question 3: `mailbox_seq` on `engine.workflows`): it costs a
second nullable column on the hot enqueue `COPY` to store what a feature-local table already keys by,
and the registry row is bounded per mailbox by `MaxMailboxLogLength`. The one honest cost of the
chosen shape is that "waiter" becomes a misnomer for a row describing a receiver that never waited —
consider renaming the table to `engine.mailbox_receivers` while nothing is released, or say plainly in
the entity's docs that it is a positional registry whose unreleased rows are the waiters.

Pin: every birth state leaves exactly one registry row with the right `seq`; a receiver born runnable
is never touched by the wake or the closure release (mutation-test it, do not assert it); and the
counters still agree with the registry after mixed births.

#### Step 6 — Engine + host: the delivery callback contract — `done`

Landed as jj change `psytnsym` — 24 files, +1994/−19. Engine suite **866 → 892**; host **76 → 81**;
`Altinn.App.Core.Tests --filter ~WorkflowEngine` 268 with **no `src/App/backend` source change at all**.
No migration. Two review rounds. **The engine's contract is complete: an app can now receive.**

**The read is one statement, not the two this document described**, and the reason is better than the
one first offered. Joining `mailbox_receivers` (by `UNIQUE (workflow_id)`) to `mailboxes` and
`LEFT JOIN`ing `mailbox_deliveries (mailbox_id, seq)` costs one unique-index probe plus two
primary-key probes, three index scans and 13 buffers, verified on a seeded database. The obvious
argument — one snapshot, so the registry row and the delivery row cannot be read at different
instants — is true but **not load-bearing**, since the frozen rule already makes every legitimate
answer stable. The payoff is in the illegitimate case: split into two statements under
`READ COMMITTED`, a read could see "no delivery" (a genuine bug) and then a concurrent close one
statement later, and report the bug as an ordinary closing signal — **laundering an invariant
violation through traffic that happens constantly.** One snapshot is what keeps the new error state
from being silenceable by a race.

**Two states the rendezvous cannot produce are modeled rather than folded into "no delivery"** —
`Unregistered` (no registry row) and `Undecided` (open mailbox, nothing at this position) — and both
fail the step **critically**. Folding either is the one degradation the contract cannot survive,
because "no delivery" is not an absence of information: it is the instruction to conclude the
exchange. Returning null or throwing would be worse — the executor's generic catch maps exceptions to
`RetryableError`, so a purged log would climb a ladder that cannot help it. The severity is argued in
the code rather than assumed: retryable is defensible for `Undecided` (the handler is never called, so
the frozen-meaning hazard never materializes, and the deadline sweep would self-heal it) and loses
because a self-healing invariant violation is one nobody investigates, and healing would make the
retry ladder load-bearing in a rendezvous built so a parked receiver needs no timer.

**Step 4's suggested fold was declined, and the suggestion turned out to be wrong on its own terms.**
Folding the wake-to-claim stamp into this read would make the first attempt's statement differ from
every other — the exact asymmetry this step exists to remove. Two further grounds emerged in review:
`RecordWakeToClaimLatency` issues **one** `UPDATE … WHERE workflow_id = ANY(@ids)` per _batch_, not
per claimed receiver, so folding would move a once-per-batch write onto a once-per-attempt retry
ladder — a multiplication, not a saving; and after a pod crash between claim and execute, a fold would
record the _re_-claim, inflating the histogram by a whole lease timeout precisely in the incidents
worth measuring. The stamp stays in the fetch. `held_at`'s projection guard is untouched.

**`MailboxReceipt` applies the same principle to itself.** A private constructor and two factories —
`Delivered(mailboxId, seq, delivery)` and `Closed(mailboxId, seq, reason)` — make the third state
unconstructible; get-only properties (not `init`) close the `with`-expression path too, verified by
compiling probes for all three routes. A bonus fell out: folding `Undecided` into the closing signal
now requires _inventing_ a disposal reason to satisfy the factory, so the type erects a second barrier
in front of the degradation the step forbids. The refactor could not disturb the wire because the host
owns curated DTOs and `EngineContractTypes`' roots stop at them — the layering that makes steps 7–10
safe to build on.

**A third test was found green against a state the engine cannot reach.** Step 4's
`WakeThatCommittedWithoutItsNotify_…` released a receiver with no delivery on a still-open mailbox as
shorthand — which is exactly `Undecided`, so this step turned it red. Its helper now reproduces the
wake's whole transaction minus the notification, verified statement-for-statement against the real
one, and the test is stronger than before because it exercises the executor's read end to end.

What steps 7–10 inherit:

- The callback's `mailbox` block is **nullable**, present only on a receive workflow's **first** step;
  `delivery` and `disposedReason` are **exclusive** — exactly one is present. An absent `delivery`
  means _closed, conclude_; the reason is for wording only. It serializes as `"mailbox": null` on
  ordinary callbacks, consistent with every other optional field on that payload.
- `delivery.idempotencyKey` is the **forwarding source's own message id** (step 9's `POST` key), stable
  across every attempt — the natural dedup key for handler side effects.
- `seq` is on the wire for logging and tracing. It is **not** the enqueue key: saga invariant 3 (keys
  derived from the executing step id) stands unchanged.
- `disposedReason` serializes Pascal-cased (`"Request"`/`"Deadline"`), and `MailboxDisposedReason` is
  already in the committed snapshot — so when step 7 adds `MailboxResponse` to `EngineContractTypes`,
  its `disposedReason` will already agree.
- **`AwaitNextReply` on a no-delivery callback is not enforced by the engine.** The engine guarantees
  only the callback's meaning; that check is entirely step 8's.
- `WorkflowEngine.TestApp.ReceivingCommand` (`"test-receive"`) records the receipt per attempt and can
  fail retryably or terminally — reusable wherever a later step needs to see what a receive step was
  handed.

Residuals: no query-plan test for the per-attempt read (verified by hand — three index probes, no
`ORDER BY … LIMIT` crossover subtlety, so lower value than 5a's two); the reader's positional offsets
are coupled to its inline `SELECT` by convention, as steps 1–2 recorded for their column lists; the
executor's `ProcessingOrder == 0` gate relies on step 3's enqueue validation with nothing pinning the
two together; and one 10-second bounded token joins 5a's wall-clock thresholds.

Paths: `src/Runtime/workflow-engine` (executor), `src/Runtime/workflow-engine-app` (`AppCommand`
shapes, wire-contract snapshot), and the app-lib DTO copies the guard forces.

The executor's read, exactly as
[the frozen-meaning section](#the-receivers-meaning-is-frozen-before-it-can-run) specifies: waiter
`seq` by primary key, then `mailbox_deliveries (mailbox_id, seq)` — present → attach the payload,
absent → the no-delivery callback carrying `disposedReason` (`deadline` or `request`) **explicitly**,
v2 step 6's lesson. Nothing is written, no resolution column, no CAS. Pin the frozen-existence rule
with tests that re-derive the callback across attempt, retry and resume, and pin that a no-delivery
callback can only follow closure. Mine `nqtvqytw` for the contract reshape and follow its snapshot
protocol.

#### Step 7 — App-lib: pipeline contract and mailbox mint — `todo`

Paths: `src/App/backend`.

`WithReplyFrom("Stage", new MailboxOptions { Timeout = … })` as in
[Pipeline contract](#pipeline-contract): the app-lib mints the mailbox in that stage via
`POST /mailboxes` keyed by the step id, stores it in workflow state, exposes `context.Mailbox` in
exactly that stage and throws elsewhere, and the expansion appends one final Main-workflow step
whose callback enqueues receive workflow 1 as a collection head. No `WaitingReason` is persisted.
Mine `kotqmwtq` for the pairing and expansion mechanics; the address shape differs, so copy
structure, not semantics. The `ServiceTaskPipeline` mutability that existed only to serve
`WithReplyFrom` should not be re-created — build the immutable shape v2's residual asked for.

**Wire contract, carried from step 1:** the mailbox DTOs are deliberately outside the drift guard
until an app consumer exists. This step must add `MailboxCreateRequest`/`MailboxResponse` to
`EngineContractTypes` and regenerate the snapshot — and because `MailboxStatus` and
`MailboxDisposedReason` are **new enums**, `AppWireContractTests`' directionality rule forces the app
to model their members in this same step (enum `Kind` is compared as an exact string; a nullable
field may be omitted, an enum member may not).

#### Step 8 — App-lib: the receive handler and the relay saga — `todo`

Paths: `src/App/backend`.

`context.Reply` carrying the delivery or `null` exactly when the mailbox closed, plus the reason;
the result mapping (`AwaitNextReply`, `Success`, `FailedPermanent`, `FailedRetryable`) with the saga
underneath, in **exactly one place** in the app-lib. `AwaitNextReply` on a no-delivery callback is a
non-retryable contract violation. This step owns two of the four invariants: the
[three saga invariants](#the-saga-invariants) — `DELETE` before the after-enqueue, at most one
concluder, every mid-callback call keyed off the executing step id — and the
[frontier-never-empty](#ordering-toward-the-rest-of-the-system) invariant, pinned by a test that
walks a multi-hop relay asserting the frontier at every step boundary. These are the tests the whole
design's honesty rests on; write them first.

#### Step 9 — App-lib: forwarder rework — `todo`

Paths: `src/App/backend`.

`IServiceTaskReplyForwarder` re-plumbed to the mailbox-id address: the HMAC envelope's purpose bound
to mailbox id + service-task type + external id, the source's message id as the delivery
`idempotencyKey`, and the status mapping (`202`/`200` success, `404` unroutable, `409` always too
late, `413`/`429` dead-letter). Mine `vonkpkpu` including its known-answer vectors, and re-derive
them for the new binding rather than copying the old ones. The awaiting-task-type derivation round
trip is not needed here — do not port it.

#### Step 10 — Fiks Arkiv re-plumb — `todo`

Paths: `src/App/backend/src/Altinn.App.Clients.Fiks` and its tests.

Fiks Arkiv's archive-reply handling on top of the mailbox relay, mining `kxtxqxuu` for the decision
logic. Note decision 7 above: `IFiksArkivResponseHandler` is **live v8 GA API at this base** — the
default is to re-plumb it; retiring public API is an orchestrator decision, reached by ending the
run `BLOCKED` with the argument, never taken inside the step.

#### Step 11 — k6: mailbox-storm measurement — `todo`

Paths: `src/Runtime/workflow-engine/.k6`.

The cost claims in [What this deletes](#what-this-deletes-keeps-and-re-adds-versus-v2) are stated as
needing "chain-storm-style measurement before they are believed" — this step measures them against
this design's shape: per-delivery and per-receiver database cost, the non-reply hot path's price
(one nullable column on the enqueue `COPY`, one null check per step execution), and the sweep's
per-cadence scan. Mine `mmppzrvl` for the comparator machinery and its recorded fixes; the v2 prices
describe the v2 tree and are a comparator, not a baseline to reproduce.

#### Step 12 — Stack hygiene: green revision by revision — `todo`

**Two pre-existing engine defects were found during this stack and deliberately not fixed inside a
feature revision** — each deserves its own small revision, landed here or earlier:

1. `DbMaintenanceService.PurgeExpiredWorkflows` loops `while (deleted >= settings.BatchSize)` and
   **never terminates when `BatchSize == 0`** — which is exactly what `PostgresFixture` builds, since
   it constructs `EngineSettings` with no `Retention` block. It hung a test run for ten minutes in
   step 1. Production is protected only indirectly, by `ValidateEngineSettings`.
2. `ClassifyExistingIdempotencyKeys` builds its lookup with `ToDictionary` over an `unnest`-join whose
   key array can repeat, so a batch containing **three or more** requests sharing one
   `(namespace, key)` throws `ArgumentException`. v2 fixed it with `.Distinct()` plus an
   indexer-based dictionary. Step 3 made it strictly less reachable but did not fix it.

Rebuild each revision the way CI does, confirm the suites, confirm `typos`, CSharpier and prettier,
confirm no generated-file CRLF drift rode along, and update the engine `AGENTS.md`, the app-lib
`AGENTS.md`, and the CHANGELOG entries in the repo's user-facing language. Mine `soouolvy` for the
checklist.

## Open questions

1. **Naming — ANSWERED: mailbox** (repo owner, 2026-08-18; earlier drafts said "hook"). "Hook"
   works in isolation but collides twice: in-repo with `WebhookCommand` (an _outbound_ call the
   engine makes — same word family, opposite direction, and every grep for "hook" matches it),
   and industry-wide, where a hook is a callback point that _fires_ — the wrong intuition for a
   passive FIFO store. "Inbox" also collides twice: the engine's own `engine.slots.inbox.*`
   metrics already use the word for admission capacity, and the Altinn domain uses it for the
   citizen-facing message box (Dialogporten). "Mailbox" is the actor-model term for exactly this
   shape — an addressed, durable FIFO consumed sequentially by its owner — with zero prior hits
   in the engine, the app backend, or Altinn product vocabulary.
2. **Counter placement — ANSWERED in this revision: folded into `mailboxes`.** The separate
   `mailbox_counters` row bought churn isolation for very hot inboxes; at expected delivery rates it
   does not matter, and folding makes the master lock the row that also carries the status and
   deadline it guards — the sweep's `SKIP LOCKED` claim becomes the lock. Revisit only if a hot
   mailbox ever shows row contention.
3. **Waiter table versus workflow columns.** See the recorded alternative under
   [The receive workflow](#the-receive-workflow) — one nullable column + a small registry table,
   or two hot-row columns and no table. Additivity versus one less join.
4. **Absolute exchange deadline — ANSWERED in this revision.** The mailbox carries it, the sweep
   enforces it: v2's guarantee, restored. The residual question inverts: is an _idle_ variant
   (deadline re-armed by each accepted delivery) worth offering? One statement in the acceptance
   path; wait for a consumer that needs it.
5. **The dead-relay window — largely answered by the deadline.** Every crash between hops sits
   inside a step attempt, so saga replay re-enqueues the receiver, which is born honest even
   after closure; a receiver failed terminally is a visible `Failed` workflow for ops; and the
   mailbox never outlives `deadline` plus a sweep cadence. Residual: an exchange whose failed
   receiver is never resumed concludes nothing — the instance stalls visibly, ops territory
   exactly as v2's stalled chain.
6. **Mailboxes without a collection reference.** Now purely cosmetic (dashboard grouping) — the
   deadline sweep replaced the collection-anchored leak GC. Require the reference anyway for ops
   ergonomics, or leave it optional?
7. **A compound hard-stop operation.** `DELETE` alone ends an exchange gracefully (the released
   receiver concludes in app words); the hard stop — no conclusion at all — takes a receiver
   cancel plus the `DELETE`. Is that pairing rare enough to stay an ops recipe, or does the
   dashboard need it first-class?
8. **Encryption at rest.** Delivery payloads persist in `mailbox_deliveries` exactly as v2's replies
   persist in link step data — request-reply.md's open question 4 applies verbatim and should be
   decided once, for both.
9. **Backpressure for deliveries.** v2's ingestion deliberately skips the admission gate ("a
   refused reply may never be sent again"); deliveries should inherit that reasoning, but the cap
   story (`MaxMailboxLogLength`, open-mailboxes cap) needs the same scrutiny the chain cap got.
10. **Stacking strategy — ANSWERED: branch from `trtzopwn`** (see Standing). The v2 revisions
    remain the reference; the implementor copies files over where appropriate rather than keeping
    them in-tree.

## Standing

**Mailboxes replace request–reply v2** (decision by the repo owner, 2026-08-18) — the engine carries
one reply mechanism, not two. v2 is implemented, tested, and measured but unreleased, so this is
the same situation v2 itself faced with v1: a reuse map, not a migration. What v2 hands this
design is in the ledger above (the envelope, the forwarder surface, the Fiks Arkiv decision
logic, the `Held` status and its ripple, the chain-storm comparator and its learnings); what it
must not hand over is its exchange machinery, which this design exists to delete.

**Stacking decided (repo owner, 2026-08-18): branch from the pre-v2 base** — `trtzopwn`, the
revision before "add request-reply plan". The tree starts clean, there is no strip step, and the
implementor mines the v2 revisions as a reference, copying files over where appropriate rather
than reimplementing kept pieces (the envelope and its known-answer vectors, the forwarder
surface, the Fiks Arkiv decision logic, `Held` and its ripple, the k6 comparator machinery).
Three consequences are accepted with the choice: the app-side kept pieces are rebuilt against a
base that never carried them, `Held` is re-added from the v2 revisions rather than kept in-tree,
and the k6 comparator's recorded prices describe the v2 tree — the chain-storm discipline
re-records them against this design's own shape. _The alternative not taken:_ building on top of
the v2 stack and stripping it — either first (v2's step-1 shape, whose 1a/1b/1c split exists
because `AppWireContractTests` is directional: the app may never model a surface the engine has
dropped) or last (build beside, move the app in one hop, delete wholesale). A clean base was
preferred over in-tree reuse.

Whichever branch point is chosen, v2's carried learnings apply verbatim: CI-style builds per
revision (`CI=true`, `--no-incremental`), the `typos` and prettier traps, the wire-contract
snapshot protocol, and the retirement-policy distinction between preview-line surfaces (deletable
outright) and v8 GA surfaces (the two Fiks shims outlive this work either way).

What must be written down before implementation regardless: the mailbox-row → workflow-row lock
order, the frozen-delivery-existence rule, the frontier-never-empty invariant, and the three saga
invariants — the four places this design trades an engine-proved property for a proved-once
convention, each pinned by a test named in its section above.
