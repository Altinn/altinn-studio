# k6 Scripts — Workflow Engine (Core)

Load tests for the core workflow engine using [k6](https://k6.io/). These tests use **webhook** commands targeting WireMock.

For app-specific load tests (AppCommand), see `workflow-engine-app/.k6/`.

## Prerequisites

```bash
brew install k6
```

The workflow engine must be running locally on `http://localhost:9090` with WireMock on `http://localhost:6060` (Docker Compose provides both).

## Scripts

### stress-test.js

Fires a configurable number of requests with high concurrency, then waits for the queue to drain.

```bash
# Default: 5000 requests, 100 concurrent virtual users
k6 run .k6/stress-test.js

# Custom iteration count and concurrency, for engine running in Docker
k6 run .k6/stress-test.js -e ITERATIONS=1000 -e VUS=25

# Engine running on the host with Docker Compose dependencies
k6 run .k6/stress-test.js -e ITERATIONS=1000 -e VUS=25 \
  -e WEBHOOK_URL=http://localhost:6060/webhook-callback
```

| Variable      | Default                                              | Description                        |
| ------------- | ---------------------------------------------------- | ---------------------------------- |
| `ITERATIONS`  | `5000`                                               | Total number of requests           |
| `VUS`         | `100`                                                | Concurrent virtual users           |
| `NAMESPACE`   | `default`                                            | Namespace path segment             |
| `BASE_URL`    | `http://localhost:9090/api/v1/{NAMESPACE}/workflows` | Workflow engine enqueue URL        |
| `HEALTH_URL`  | `http://localhost:9090/api/v1/health`                | Health endpoint for queue drain    |
| `WEBHOOK_URL` | `http://wiremock:8080/webhook-callback`              | Webhook URL executed by the engine |

### constant-rate.js

Fixed request rate with a health-polling sidecar. Uses `constant-arrival-rate` so throughput stays steady regardless of response time. Runs until Ctrl+C.

```bash
k6 run .k6/constant-rate.js
k6 run .k6/constant-rate.js -e RATE=50
k6 run .k6/constant-rate.js -e RATE=500 -e MAX_VUS=1000 -e POLL_INTERVAL=5
```

| Variable        | Default                                              | Description                        |
| --------------- | ---------------------------------------------------- | ---------------------------------- |
| `RATE`          | `100`                                                | Requests per second                |
| `MAX_VUS`       | `2000`                                               | Max virtual users                  |
| `POLL_INTERVAL` | `2`                                                  | Seconds between health polls       |
| `NAMESPACE`     | `default`                                            | Namespace path segment             |
| `BASE_URL`      | `http://localhost:9090/api/v1/{NAMESPACE}/workflows` | Workflow engine URL                |
| `HEALTH_URL`    | `http://localhost:9090/api/v1/health`                | Health endpoint                    |
| `WEBHOOK_URL`   | `http://wiremock:8080/webhook-callback`              | Webhook URL executed by the engine |

### mailbox-storm.js

Mailbox load: relay exchanges, buffered messages nobody receives, and messages that arrive before their
receiver — run **alongside the ordinary enqueue workload** so the two can be compared. The questions it
exists to answer are the ones the mailbox proposal says need measuring: what a message costs, and
whether mailbox traffic costs the engine's ordinary enqueue/processing path anything. So the measured
enqueue workload is identical in every mode and only what runs beside it changes:

| Mode            | Scenarios                                                                      | Purpose                                        |
| --------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `MODE=baseline` | `enqueue_baseline`, `monitor`                                                  | the reference                                  |
| `MODE=storm`    | the same, plus `relay_exchanges`, `buffered_deliveries` and `early_deliveries` | the comparison                                 |
| `MODE=control`  | the same, plus `extra_ordinary` at `CONTROL_RATE`                              | what equivalent ordinary work costs            |
| `MODE=low`      | `low_load_exchange`, `monitor`                                                 | per-hop latency at idle, one request per phase |

The control mode is what keeps a failing comparison interpretable: the storm run does strictly more
engine work than the baseline, so on its own it cannot separate "mailboxes are expensive" from "more
work is more work". Set `CONTROL_RATE` from the `impliedControlRate` the storm summary reports — the
workflows that configuration actually generated — rather than deriving it by hand.

**The control's shape matches the storm's exactly, which is the one place this suite has it easier than
the v2 chain-storm it is derived from.** A receive workflow here is an ordinary single-step webhook
workflow plus a `mailbox` block, so the control's extra workflows are the _same_ workflows with the
block removed — same command, same step data, same collection-head flags, same webhook target. v2 could
not do that: its reply links were engine-created workflows running an in-process step, so its control
had to choose between matching the execution shape (`link`) and matching the app-callback shape
(`webhook`), and it had to run both to establish that the choice accounted for only ~2% of the effect.
Here there is nothing to bracket, because the two arms' extra workflows are byte-identical apart from
the block. `CONTROL_INPROC=1` still runs a second, in-process-shaped control arm, for one narrow reason:
it measures how much the work shape can move the enqueue path **at all**, which is what bounds the
shape's possible contribution to any difference the gate reports.

**What a message _is_ here decides the whole shape**, and it is not what a reply was in v2. Ingestion is
not an enqueue: one message becomes one row in `engine.mailbox_deliveries`. Whether a workflow exists at
all depends on whether anybody receives it. Three consequences the arms are built around:

- **A processed message costs one delivery row plus one receive workflow the _app_ enqueues** — one
  extra app→engine HTTP call per hop that v2's engine-created links did not pay, against no dependency
  edge and no link edges, which were the two largest measured per-link statement costs in v2.
- **A buffered message costs one delivery row and nothing else.** No workflow, no admission budget, no
  edges. The buffered arm is what makes that claim falsifiable rather than merely plausible.
- **A mailbox is capped at `MaxMailboxLogLength` (100) positions for good.** `next_idx` never goes back,
  so a sustained delivery storm cannot be absorbed by one mailbox, only by new ones — which is the
  design working, not a limit of the test.

The three storm arms are those three consequences:

- `relay_exchanges` — `EXCHANGE_RATE` exchanges per second, `MESSAGES_PER_EXCHANGE` (2) messages each,
  the profile the first real consumer (Fiks Arkiv) produces. Each iteration runs the whole protocol an
  app-lib saga runs: mint, then per message enqueue the receiver (which parks `Held`) and deliver the
  message (which wakes it inside the delivery's own transaction), then `DELETE`. It is the
  park-and-wake path, which is what the rendezvous exists for.
- `buffered_deliveries` — messages aimed at **one** mailbox with no receiver behind it, until the log
  cap refuses them, then at a replacement. It is the unprocessed-message shape _and_ the contention
  shape: concurrent deliveries to one mailbox serialize on that mailbox's row, which every delivery
  locks. The 429s it collects are the cap doing its job.
- `early_deliveries` — the message posted **before** its receiver is enqueued, so the enqueue flush
  finds `seq < next_idx` under the mailbox row lock and the receiver is born runnable carrying its
  backlog delivery. No wake is involved at all. Together with the relay arm this covers both
  interleavings of the design's central race, of which there are exactly two.

Birth state is **sampled, not asserted**: the enqueue response carries no status, so every
`BIRTH_SAMPLE_EVERY`-th receiver is read back (before its message can change the answer, in the relay
arm's case) and the rates are reported as `receiver_born_held` / `receiver_born_runnable`. That is a
weaker instrument than v2's, which read the status straight off the ingestion response, and the
comparator's fidelity assertions say so by gating on the sampled rate rather than on a count.

Run every arm and apply the gates with the wrapper — a single `k6 run` produces one arm only:

```bash
./.k6/mailbox-storm-compare.sh
REPEATS=7 DURATION=4m BASELINE_RATE=400 ./.k6/mailbox-storm-compare.sh
./.k6/mailbox-storm-compare.sh -e DELIVERY_PAYLOAD_BYTES=8192    # extra args reach every k6 run
```

**Three setup traps, each of which silently invalidates a session, and each of which did.**

1. **Redeploy the engine the hard way.** `docker compose up -d --build` rebuilds the image and then
   leaves the existing container running on the _old_ one, so a session started right after a code
   change can silently measure the previous build. Use `make reset && make run`, or
   `docker compose --profile core up -d --force-recreate`, and check
   `docker inspect workflow-engine-testapp --format '{{.Image}}'` against the image you just built.
2. **A database that once ran a different design still carries its columns.** EF applies only the
   migrations a database is missing, so migrating this tree on top of such a database leaves
   `engine.workflows` wider than this tree defines — which is exactly the quantity the hot-path claim
   is about. The wrapper's **schema check runs first and fails the session** rather than measuring a
   contaminated table: it asserts `engine.workflows` carries exactly one nullable mailbox column and no
   columns this tree does not define. `make reset` is the clean fix; `.k6/docker-compose.measure.yaml`
   is the fix for when something else on the machine still needs the main database, and points the
   engine at a measurement database of its own (`POSTGRES_DB` points the wrapper at the same one).
3. **Summaries a previous session left in `results/` are read as this session's.** `CONTROL_RATE` is
   re-derived by averaging `impliedControlRate` over every `storm-*.json` in the directory, so five
   stale summaries from a different suite pushed a 55/s control arm to 103/s — the control arm then did
   nearly twice the storm arm's work, and the only thing standing between that and a published number
   was the comparator's provisioning check. The wrapper now clears the arm summaries it is about to
   write before the first run. Recorded here because it is the failure mode with the least visible
   symptom of the three: every run succeeds and every number looks ordinary.

The wrapper truncates the database before every run and **interleaves the arms, repeating each
`REPEATS` times with the order rotated**, then compares arm means. That structure is not ceremony: runs
in a session drift monotonically (JIT, page cache, table growth) by more than the effect being
measured, so an arm that always runs last inherits the drift, and one run per arm cannot tell that from
a result. The interleaving and rotation are what cancel the drift; the repeats are what turn the
leftover variation into a measured number the gate can be set from.

**How the gate is set.** There are no fixed millisecond budgets. For each metric the tolerance is
`TOLERANCE_K` (3) standard errors of the **reference** arm's mean — its σ estimated from the sample
range via the Shewhart `d₂` constant, divided by `√n` — floored at the metric's own measurement
resolution (0.05 ms for latency, one workflow for backlog, the 1 Hz poll for drain seconds). The arm
under test never widens its own gate: a rule that took the larger of the two spreads let one unstable
v2 run widen its gate 13× and report `pass` at 59% sensitivity — the measurement said "cannot tell" and
the gate said "no regression".

The standard error, rather than the raw range, is what makes repeating pay. Expected range _grows_ with
the number of runs (1.69σ at n=3, 2.33σ at n=5, 3.08σ at n=10), so a range-based tolerance got about
38% **coarser** going from 3 repeats to 5 — collecting more evidence loosened the gate. `k=3` reproduces
the old range-based tolerance to within 2.3% at `REPEATS=3` while making the gate tighten as `√n` from
there; `REPEATS=5`, the default, is about 20% finer than 3.

**The gates are two-sided, and that is not a bug.** A storm arm that comes out materially _faster_ than
the control arm fails as well. These two arms are constructed to give the engine the same amount of
work, so the comparison's premise is that they are equivalent; a difference in either direction says the
premise is broken — usually a badly provisioned control arm (check the `control arm provisioning` row and
the storm runs' `impliedControlRate`), or two arms that did not run against the same build or the same
database state. A faster storm arm is not evidence that mailboxes make the engine quicker. The verdict
line names the direction so it reads as a premise failure rather than a regression hunt.

**No price is recorded — a ceiling is.** The comparator supports gating on `|Δ − price|` for a metric
whose cost has been measured and written down; v2 recorded +5.7% on `enqueue.p95` that way. These
sessions measured a cost that is consistent in **sign** at every latency metric and a factor of two
apart in **size** (+10.7% and +5.0% at p95), which is not a price: v2 recorded its own only after four
pairings agreed to within 1.4 percentage points.

Gating those metrics against zero instead does not work either, and the reason is v2's own rule rather
than a preference. With a zero reference the verdict flips **by session**: the same artifacts read
`FAIL` when the bad control run is excluded and `pass` when it is not, and the second session reads
`pass` outright. A reference point that moves with the session and not with the engine is exactly what
v2 disqualified a p99 reference point for. The median case is worse still — its tolerance there is the
**resolution floor** (0.05 ms, k6's own timing jitter), so the FAIL was set by a constant rather than by
a measurement.

So `RECORDED_PRICE.costEstablishedUnresolved` records the **larger** of each pair as a ceiling, and a
listed metric reads:

- **`pass`** while `|Δ| ≤ tolerance`;
- **`inconclusive`** — exit-neutral, and never `pass` — while the difference is dearer than the
  tolerance but inside `ceiling + tolerance`, with the note naming both sessions and saying a third
  that agrees on a size turns the ceiling into a price;
- **`FAIL`**, flagged `PAST THE CEILING` the way the escalation path is flagged, beyond that.

**What the ceiling costs in absolute terms belongs here and not only in the run output.** It is a
fraction of the reference arm's own mean, so against the control arm measured below (p95 2.636 ms) it
is ≈0.28 ms, and the `PAST THE CEILING` line sits at that plus the run's own tolerance — on these
sessions, around a fifth of the control mean rather than a few percent of it. That is the size of p95
regression this gate stops short of failing: anything smaller reads `inconclusive`, which is never a
`pass` but is not a failure either. The comparator prints the exact figures for the run in front of it
in the same note; this is what they amount to. A recorded price would shrink the band back to the
tolerance, which is the other reason a third session is worth having.

The ceiling is **necessary rather than convenient**: an unconditional route to `inconclusive` would
recreate the unfalsifiable-metric hole the escalation rule exists to close. It is also **one-sided**,
covering only the dearer direction — a candidate arm coming out materially cheaper is a broken premise,
not the known cost, and the request-matched bracket below depends on that still reading `FAIL — storm
is BETTER`. Replace the ceiling with a `RECORDED_PRICE.fractions` entry, and update the measured section
below in the same change, the moment a third session pins a size. `EXPECTATIONS=off` gates everything
against zero explicitly.

**Verdicts are three-valued, and only one of them fails the suite.** `FAIL` (exit 1) is a difference
larger than the reference arm's own uncertainty, in either direction, and it should be believed.
`inconclusive` is **exit-neutral**: the candidate arm's spread exceeded `MAX_SPREAD_RATIO`× the
reference's (and twice the metric's resolution), or the gate came out coarser than `TARGET_SENSITIVITY`,
so the session could not resolve that metric.

Abstaining there is deliberate. Exiting non-zero on `inconclusive` reports _absence of measurement_ as
_presence of regression_ — a category error, not strictness: a suite that goes red when it cannot tell
gets switched off, and it takes the metrics that **can** tell down with it. `STRICT_INCONCLUSIVE=1`
restores the blocking behavior for a pipeline that wants it.

**But abstaining creates a hole, and the escalation rule is what closes it.** The reproducibility check
runs _before_ the tolerance check, so an arm whose spread exceeded the ceiling would otherwise be
**unfalsifiable**: any difference, of any size, would read `inconclusive` — and the disarming mechanism
would be precisely the one this suite warns about, since a regression that adds tail variance would
defeat its own gate. So an unresolved comparison has a floor it cannot hide under: it reads
`inconclusive` only while the difference is inside `TOLERANCE_K` standard errors of the difference
itself — **both** arms' uncertainty combined in quadrature — and fails, marked `ESCALATED`, when it is
not. Note what this is not: it is not the candidate's spread widening its own gate. The escalation
threshold is always ≥ the ordinary tolerance, so it can only ever turn a non-failure into a failure.

A metric that reads `inconclusive` can never read `pass`, so "I cannot tell" is not laundered into "no
regression" for a reader either. And a session where **no difference metric was gated at all** — every
comparison `ungated`, as at `REPEATS=1` — reports `RESULT: ungated` with the count of per-run assertions
that did pass, rather than `pass`.

The comparator always prints what the gate could have caught (`detects:`), and that figure is
load-bearing rather than advisory — but it is **a measurement, not a property of the suite**. A
range-derived tolerance carries its own spread of `d₃/d₂`: ±52% at `REPEATS=3`, ±37% at 5, ±26% at 10.
The comparator prints that uncertainty next to the figure for exactly this reason; quote the figure with
its repeat count or not at all.

The spread test is floored at twice the metric's resolution for the same reason the tolerance is floored
at one: backlog p95 is effectively integer-valued, so a reference arm landing on 3.0 every time has
spread 0, and without the floor a candidate straddling 3 → 4 would be reported as "did not reproduce" on
one workflow of quantization.

**What the exit code follows.** The control arm, not the baseline: `control` and `storm` give the engine
the same number of extra workflow executions, so a difference between them is what mailboxes cost _as a
mechanism_. Baseline-vs-storm is printed first with **latency ungated** — its latency difference is the
cost of the extra traffic, not of the feature — so gating it would be permanently red, and a
permanently red gate gets muted or its budget inflated. Its processing and fidelity assertions still
gate, and `SKIP_CONTROL=1` falls back to exactly that.

**Two asymmetries the control cannot remove, stated rather than hidden — and the second one is the
single most important caveat on any number this suite prints.**

The first is small: the buffered arm creates _no workflows_, so the control arm — which can only stand
in for workflows — does not match it. That is the design claim rather than an oversight (a message
nobody receives costs no workflow), but it means the gate's Δ is "mailbox bookkeeping including buffered
rows", not "per-receiver cost".

The second is structural. **A mailbox workload's request-to-workflow ratio is about 3.5 : 1, and an
ordinary workload's is 1 : 1, so no ordinary-workflow control can match both.** At the shipped
configuration the storm arm issues roughly 200 extra HTTP requests per second — mints, receiver
enqueues, deliveries, closes — that between them create only 55 workflows; the workflow-matched control
issues 55. So the gate's Δ is not "mailbox bookkeeping" alone: it is mailbox bookkeeping **plus the cost
of serving 145 more requests per second** on the same Kestrel and the same connection pool. That is a
real cost of the design rather than an artifact — the app has to make those calls, and the proposal says
so ("one extra app→engine HTTP call per hop that v2's engine-created links did not pay") — but
attributing all of it to the database work would be wrong.

v2's suite did not face this: its replies were ingested through one POST each and its links were created
by the engine inside that transaction, so its control arm matched request count and workflow count at
the same time. Here the two can only be **bracketed**, by running the comparison twice:

- against the **workflow-matched** control (`CONTROL_RATE` = the storm's `impliedControlRate`, the
  default): the storm arm also serves ~145 more requests per second, so its Δ is an **upper bound** on
  what the mailbox mechanism costs.
- against a **request-matched** control (`CONTROL_RATE` ≈ the storm's total extra request rate): that
  arm now creates ~3.5× the storm's workflows, so it does strictly more processing, and the Δ is a
  **lower bound**.

Run the second with **`CONTROL_REQ_RATE=200`**, which adds the request-matched arm to the same
interleaved rotation and prints its comparison after the gate. Do **not** try to do this by setting
`CONTROL_RATE`: `derive_control_rate()` overwrites that variable from the storm arm's own
`impliedControlRate` before every control run, so a hand-set value is silently replaced — an earlier
draft of this section documented exactly that, and it does not work. Read the `control arm
provisioning` row as the deliberate mismatch it then is. The per-hop accounting in `MODE=low` and the
statement-level accounting below are what decompose the bracket into its parts.

**Size `BASELINE_RATE` so the engine has headroom.** Above roughly three quarters of what the engine can
process, adding _any_ workload stretches the tails and the comparison stops being about this feature.
Find the ceiling with `constant-rate.js` first — on the machine this was written on (a 7-vCPU podman VM,
`MaxWorkers: 10`, engine and Postgres side by side) it was around 700/s — and stay well under it.
`BUFFER_RATE` deserves the same care: unthrottled, the buffered arm produces far more database work than
the other two arms together, and the control arm cannot match an arm that creates no workflows at all.

The wrapper also runs **statement-level and schema-level checks the load numbers cannot make**, each
aimed at one of the plan's claims:

- **The schema check**, before anything is measured: `engine.workflows` carries exactly one nullable
  mailbox column and nothing from another design. It fails the session rather than warning, because a
  contaminated table makes every later number wrong in the same direction.
- **The zero-statement check**, after a mailbox-free run: no statement _wrote or locked_ a mailbox. Two
  exceptions are allowed for. The first is the enqueue path's bulk `COPY engine.workflows`, which names
  every column of the table and therefore names `mailbox_id` — the one hot-path statement the feature
  genuinely changed, a one-column-wider row rather than an extra statement, printed with its cost. The
  second is the retention purge's mailbox candidate scan, which carries `FOR UPDATE SKIP LOCKED` and so
  is a lock rather than a read — but **it is an exception that does not fire at any ordinary run
  length**: `DbMaintenanceService` polls on `MaintenanceInterval` (1 minute) and gates this scan on
  `Retention.Interval`, which defaults to **2 hours**. A 3-minute run measures 0 calls, and the check
  prints a note saying the window was too short rather than a cost. It is allowed for so that a longer
  session does not read it as a violation. _Reads_ are exempt, but their **count** is pinned
  (`EXPECTED_EXEMPT_READS`), because a blanket "reads are exempt" rule would let a future unconditional
  mailbox _gauge_ through in silence.
- **The fetch-gate check**, after a storm run: the statement carrying `FOR UPDATE SKIP LOCKED` on
  `engine.workflows` must still mention no mailbox column with thousands of mailboxes in the table. Its
  `calls, mean_exec_time` is printed on **both** the mailbox-free and the storm run, because
  statement-name accounting cannot see a **shared** statement getting dearer — and in v2 one
  demonstrably did.
- **The edge check**, after a storm run: `COPY engine.workflow_dependency` and `COPY engine.workflow_link`
  must show **zero calls** and their tables **zero rows**. This is the design's headline per-message
  claim in its directly falsifiable form.
- **Per-message statement accounting**, after a storm run: every statement naming a mailbox, with its
  calls, mean execution time and total, and the sum divided by the messages stored. It carries the same
  limit v2's did, stated rather than implied: it can only see statements the feature _names_, so it
  bounds the feature's own statements and says nothing about a shared statement getting dearer.
- **The sweep's scan**, after a storm run: `EXPLAIN (ANALYZE, BUFFERS)` of both per-cadence candidate
  scans against the table the storm just filled, which is what prices "one indexed scan per cadence".

Variables of `mailbox-storm.js` (the wrapper passes the first eight through):

| Variable                 | Default       | Description                                                                                |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------ |
| `MODE`                   | `storm`       | `baseline`, `storm`, `control`, or `low`                                                   |
| `DURATION`               | `3m`          | Scenario duration                                                                          |
| `BASELINE_RATE`          | `100`         | Ordinary (non-mailbox) workflow enqueues per second (wrapper: 200)                         |
| `EXCHANGE_RATE`          | `25`          | Relay exchanges started per second                                                         |
| `BUFFER_RATE`            | `25`          | Deliveries per second into one mailbox with no receiver, to the log cap                    |
| `EARLY_RATE`             | `5`           | Message-before-receiver exchanges per second                                               |
| `CONTROL_RATE`           | `80`          | Extra ordinary workflows per second in `MODE=control`                                      |
| `CONTROL_SHAPE`          | `webhook`     | `webhook` (a receive workflow minus its mailbox block) or `inproc` (an in-process step)    |
| `RESULTS_DIR`            | `.k6/results` | Where the per-run JSON summary is written                                                  |
| `RUN_TAG`                | _(empty)_     | Suffix for the summary filename, so repeats do not overwrite                               |
| `MESSAGES_PER_EXCHANGE`  | `2`           | Messages per relay exchange; the last one is followed by the `DELETE`                      |
| `LOW_GAP`                | `0.2`         | Seconds of idle between one measured request and the next in `MODE=low`                    |
| `MAILBOX_TIMEOUT`        | `01:00:00`    | Declared mailbox timeout; below the run length the deadline sweep joins in                 |
| `REPLAY_EVERY`           | `10`          | Re-post message 0's `idempotencyKey` on every Nth exchange (`0` disables); asserts the 200 |
| `BIRTH_SAMPLE_EVERY`     | `10`          | Read back every Nth receiver's birth state (`0` disables)                                  |
| `DELIVERY_PAYLOAD_BYTES` | `2048`        | Message payload size, stored verbatim in `mailbox_deliveries.payload`                      |
| `MONITOR_INTERVAL`       | `2`           | Seconds between backlog/health samples                                                     |
| `MAILBOX_URL`            | derived       | Mailbox endpoint base, derived from `NAMESPACE`                                            |

Variables of `mailbox-storm-compare.sh`:

| Variable                | Default                    | Description                                                                              |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `REPEATS`               | `5`                        | Runs per arm; 2 is the minimum that can gate                                             |
| `CONTROL_SHAPE`         | `webhook`                  | Shape of the **gating** control arm's workflows                                          |
| `CONTROL_INPROC`        | `0`                        | `1` adds a second, in-process-shaped control arm (information only, `REPEATS` more runs) |
| `CONTROL_REQ_RATE`      | `0`                        | `>0` adds a **request-matched** control arm at that rate — the bracket's lower bound     |
| `SWEEP_SCALE`           | `0`                        | `>0` seeds that many closed mailboxes after every arm and prices the per-cadence scans   |
| `SKIP_CONTROL`          | `0`                        | `1` drops the control arm (saves `REPEATS` runs)                                         |
| `SKIP_LOW`              | `0`                        | `1` drops the single per-hop run at the end                                              |
| `WARMUP_DURATION`       | `30s`                      | Discarded first run; `0` to skip                                                         |
| `EXPECTED_EXEMPT_READS` | `5`                        | Read statements that may mention a mailbox on a mailbox-free run                         |
| `POSTGRES_CONTAINER`    | `workflow-engine-postgres` | Container the reset/inspection SQL runs in                                               |
| `POSTGRES_DB`           | `workflow_engine`          | Database the engine under test is pointed at                                             |
| `CONTAINER_CLI`         | `docker` or `podman`       | Resolved once, because `docker` is often a shell alias that scripts do not inherit       |

Verdict tuning, read by `lib/compare-summaries.mjs`:

| Variable              | Default | Description                                                                   |
| --------------------- | ------- | ----------------------------------------------------------------------------- |
| `MAX_SPREAD_RATIO`    | `2`     | How much wider the candidate arm's spread may be before `inconclusive`        |
| `TARGET_SENSITIVITY`  | `0.1`   | Sensitivity the latency gates must reach, as a fraction of the reference mean |
| `TOLERANCE_K`         | `3`     | Standard errors of the reference mean the tolerance allows                    |
| `EXPECTATIONS`        | `on`    | `off` gates every metric against zero, ignoring the recorded ceiling          |
| `STRICT_INCONCLUSIVE` | `0`     | `1` makes an unresolved comparison exit 2 instead of abstaining               |

### What this measured (2026-08-20)

Read these as two sessions on one machine, not as properties of the engine.

**The machine.** A 7-vCPU podman VM on a 14-core Mac, `EngineSettings.Concurrency.MaxWorkers` 10,
engine and Postgres side by side in the VM, k6 on the host — the same machine the v2 chain-storm
sessions used, which is what makes the absolute numbers below comparable in kind with that suite's.
It was **not** a quiet machine in v2's sense: three unrelated containers from another project ran
throughout. One control run shows it (below), and the p99 column shows it everywhere.

**The configuration.** `DURATION=3m`, `BASELINE_RATE=200`, `EXCHANGE_RATE=25` × 2 messages,
`BUFFER_RATE=25`, `EARLY_RATE=5`, `CONTROL_RATE` re-derived to **55/s** (0.0% off the implied rate),
2048 B payloads, a 1 h mailbox timeout. Every run held its offered rate exactly — 36 001 enqueues per
run, 0 dropped iterations — except one, below. Against a **clean measurement database**: this tree's
migrations applied to a database that had never carried another design, verified by the schema check
at the start of every session.

**Two sessions**, because one is not enough to record a price and the second is what proved it:

| Session | Arms                                                               | Repeats | Purpose                                                           |
| ------- | ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------- |
| A       | baseline, storm, control 55/s (webhook), control 55/s (inproc)     | 5       | the gate, and the two control shapes                              |
| B       | baseline, storm, control 55/s, **control 200/s (request-matched)** | 3       | replication, and the bracket the workflow-matched arm cannot give |

Per storm run the arms produced, reproducibly across all eight storm runs of both sessions: **5 454
mailboxes minted, 5 402
closed, 9 903 receivers (55.0/s), 14 364 accepted deliveries (79.8/s)** of which 4 461 buffered;
450 replays, every one answering `200`; 39 log-cap `429`s; **0** late `409`s and **0** unroutable
`404`s. Every relay receiver reached `Completed` and **none was left `Held`**; the sampled
`receiver_born_held` and `receiver_born_runnable` rates were **1.000** in every run.

**One run is excluded from the control arm's latency table. The suite identified it; a human excluded
it.** `control-5` took 48 dropped iterations against 0 in every other run of both sessions, and a 165 ms
p99 — it fails the `no dropped iterations` fidelity assertion, which means it did not hold its offered
rate, and the wrapper has **no exclusion mechanism**: `join_runs` always enumerates `arm-1..REPEATS`.
So the n=4 reading below is a hand-built invocation, not something the suite produces, and both
readings are given. With `control-5` in, the control arm reads med 1.923 ±0.060, p95 2.745 ±0.674, p99
**37.037 ±161.441**, backlog 3.2 ±1.0.

Note one asymmetry in how it is treated: `control-5` is excluded from the latency table and **included**
in the fetch-gate table below. That is deliberate — the fetch-gate sample is a `pg_stat_statements` mean
over the whole run, which a stalled generator perturbs far less than a latency percentile, and its
control arm's spread (0.0063 ms over 5 runs) shows no outlier — but it is an inconsistency a reader
should be told about rather than left to find.

**The artifacts are kept**, under `.k6/results/sessionA` and `.k6/results/sessionB`, so every figure
below can be re-derived. Use `RESULTS_DIR=.k6/results/sessionX` for future sessions: the wrapper clears
the arm summaries it is about to write, so two sessions sharing one directory lose the first one, which
is how session B's originals were nearly lost.

#### The ordinary enqueue path

| mean of n (±range)      | baseline (5) | control webhook (4) | control inproc (4) | storm (5)    |
| ----------------------- | ------------ | ------------------- | ------------------ | ------------ |
| enqueue med (ms)        | 1.909 ±0.017 | 1.917 ±0.060        | 1.907 ±0.008       | 1.970 ±0.051 |
| enqueue p95 (ms)        | 2.572 ±0.333 | 2.636 ±0.384        | 2.607 ±0.323       | 2.917 ±0.546 |
| enqueue p99 (ms)        | 3.927 ±1.102 | 4.946 ±2.364        | 4.393 ±0.851       | 5.067 ±1.637 |
| backlog p95 (workflows) | 3.000 ±0.000 | 3.000 ±0.000        | 3.000 ±0.000       | 3.000 ±0.000 |
| drain after load (s)    | 0.009 ±0.001 | 0.007 ±0.007        | 0.010 ±0.003       | 0.007 ±0.007 |

Session B, n=3 per arm, with the request-matched control beside the workflow-matched one:

| mean of 3 (±range) | baseline     | control 55/s | storm        | control 200/s (request-matched) |
| ------------------ | ------------ | ------------ | ------------ | ------------------------------- |
| enqueue med (ms)   | 1.904 ±0.033 | 1.933 ±0.057 | 1.957 ±0.017 | 2.020 ±0.047                    |
| enqueue p95 (ms)   | 2.594 ±0.191 | 2.672 ±0.463 | 2.805 ±0.027 | 3.046 ±0.388                    |
| enqueue p99 (ms)   | 3.949 ±0.472 | 4.240 ±1.273 | 4.841 ±0.609 | 5.354 ±0.446                    |
| backlog p95        | 3.00 ±0.00   | 3.00 ±0.00   | 3.00 ±0.00   | 3.33 ±1.00                      |

**The two control shapes came out 0.03 ms apart at p95** (2.636 against 2.607) and 0.01 ms apart at the
median — and **that comparison does not support the conclusion it looks like it supports.** Run through
this suite's own comparator it reads `inconclusive`, "gate resolves only 10.6% of control, target 10%",
on a 0.28 ms tolerance. The session could not have detected a shape contribution smaller than the whole
effect it is being used to explain, and 0.03 ms is about a twelfth of either arm's own spread — which
is the error this README attacks two sections later ("a difference smaller than the arms' own spreads
is not a measurement"). v2 published an almost identical 0.027 ms bracket; citing it as corroboration
compounds the error rather than fixing it.

What can honestly be said: **the shape bracket is `inconclusive`, and rules nothing out at the size of
the effect.** The reason to keep the arm is that it is the comparison that would catch a _large_ shape
contribution, and it found none.

**Differences, storm against the workflow-matched control, in both sessions:**

| metric      | session A (control n=4, storm n=5) | session B (n=3)   |
| ----------- | ---------------------------------- | ----------------- |
| enqueue med | +0.053 ms (+2.8%)                  | +0.024 ms (+1.2%) |
| enqueue p95 | +0.281 ms (+10.7%)                 | +0.133 ms (+5.0%) |
| enqueue p99 | +0.121 ms                          | +0.601 ms         |
| backlog p95 | +0.0                               | +0.0              |
| drain (s)   | −0.00                              | +0.01             |

**The cost is real and its size is not.** Two independent sessions put p95 at **+10.7% and +5.0%** — a
factor of two apart, where v2's four pairings landed within 1.4 percentage points of each other. The
sign is consistent: the storm arm is dearer in both sessions at every latency metric. **p99 is not
measurable here at all** — the gate resolved 34.8% and 30.7% of the control mean against a 10% target,
exactly as v2 found for its own p99 and for the same reason: the tail samples the neighbors. **Backlog
and drain did not move**, on instruments too coarse (one whole workflow, a 1 Hz poll) to see anything
smaller than a large change, which their `pass` says explicitly.

**For context, with the baseline as reference** (session A, ungated because the storm arm does
strictly more work): adding 55 ordinary workflows/s costs the p95 **+0.064 ms**; adding the mailbox
workload costs it **+0.345 ms**. The difference between those two is the +0.281 ms above.

**And here is what the shipped suite actually prints on these artifacts**, which is the only claim
about verdicts worth making. Reproduce it with the invocations recorded below; the artifacts are in
`.k6/results/sessionA` and `.k6/results/sessionB`:

| invocation                                              | med            | p95            | exit                                                    |
| ------------------------------------------------------- | -------------- | -------------- | ------------------------------------------------------- |
| session A, all 5 control runs — what `join_runs` builds | `pass`         | `inconclusive` | 1, from the dropped-iterations assertion on `control-5` |
| session A with `control-5` excluded by hand (n=4)       | `inconclusive` | `inconclusive` | 0                                                       |
| session B, exactly as the wrapper ran it                | `pass`         | `inconclusive` | 0                                                       |

```bash
cd src/Runtime/workflow-engine
A=.k6/results/sessionA; B=.k6/results/sessionB
# what the wrapper itself builds for session A
node .k6/lib/compare-summaries.mjs \
  "$A/control-1.json,$A/control-2.json,$A/control-3.json,$A/control-4.json,$A/control-5.json" \
  "$A/storm-1.json,$A/storm-2.json,$A/storm-3.json,$A/storm-4.json,$A/storm-5.json"
# the hand-built n=4 reading, with the run that failed the fidelity assertion dropped
node .k6/lib/compare-summaries.mjs \
  "$A/control-1.json,$A/control-2.json,$A/control-3.json,$A/control-4.json" \
  "$A/storm-1.json,$A/storm-2.json,$A/storm-3.json,$A/storm-4.json,$A/storm-5.json"
# session B, and its request-matched bracket
node .k6/lib/compare-summaries.mjs \
  "$B/control-1.json,$B/control-2.json,$B/control-3.json" \
  "$B/storm-1.json,$B/storm-2.json,$B/storm-3.json"
node .k6/lib/compare-summaries.mjs \
  "$B/control-req-1.json,$B/control-req-2.json,$B/control-req-3.json" \
  "$B/storm-1.json,$B/storm-2.json,$B/storm-3.json"
```

**No verdict reads `FAIL`, and none reads `pass` where a cost was resolved** — which is the ceiling
doing its job. An earlier draft of this document claimed the suite reports `FAIL` on med and p95 "by
design"; that was never true of the shipped invocation, and building it would have been the mistake
this README names twice: a gate that fires on an accepted cost cannot tell the next regression from
that cost, and one whose verdict flips with which runs you feed it is measuring the session. The med
case was worse — its tolerance is the resolution floor, so the FAIL was set by a documented constant
(k6's own jitter) rather than by anything measured.

`RECORDED_PRICE.costEstablishedUnresolved` therefore carries **2.8% on med and 10.7% on p95** — the
larger of each pair — as a ceiling rather than a price. Both sessions land inside it, so neither can
read `pass` on a metric where a cost was seen, and a change that pushes past `ceiling + tolerance`
still fails, flagged `PAST THE CEILING`. Record a real price, and rewrite this section with it, when a
third session pins a size.

#### The bracket: mailbox work is dearer per workflow and cheaper per request

Session B ran a **request-matched** control beside the workflow-matched one — 200 ordinary
enqueues/s, roughly the storm arm's own extra request rate, which then creates 3.6× the storm's
workflows. The two comparisons bracket the mechanism from both sides:

| comparison                                     | med        | p95        | p99        |
| ---------------------------------------------- | ---------- | ---------- | ---------- |
| storm − control 55/s (workflow-matched, upper) | **+0.024** | **+0.133** | **+0.601** |
| storm − control 200/s (request-matched, lower) | **−0.063** | **−0.241** | **−0.513** |

Read plainly: **at equal workflow rate, mailbox traffic costs the ordinary enqueue path more; at
equal request rate, it costs less.** Both are true and neither is the whole answer, because a mailbox
workload's request-to-workflow ratio is ~3.5 : 1 and an ordinary one's is 1 : 1. The suite's two-sided
gate reports the request-matched comparison as `FAIL — storm is BETTER`, with the provisioning row
naming the deliberate 263.6% mismatch beside it; that is the machinery working, not a defect.

What this rules out is the pessimistic reading of the +10.7%: the mailbox mechanism is **not** dearer
than ordinary engine work of comparable weight. What it does not rule out is that the design moves
cost from the engine's transaction into the app's request count, which is exactly what the proposal
says it does.

#### The fetch gate — the shared statement, and the one v2 found had moved

The statement that feeds every worker mentions no mailbox column in any arm, so the only way it can
get dearer is as a shared statement. v2 measured its own +58% from a **single matched pair** of runs,
and a single pair cannot carry a claim of that size here: the baseline arm's own spread over five runs
is **0.0058 ms on a 0.0774 ms mean**, so this statement's run-to-run variation is a recorded quantity
and it belongs under the difference before the difference is quoted. (Two mailbox-free runs during
development landed _at_ 0.063 ms and 0.150 ms — a 2.4× swing with no mailbox in the picture — which is
what prompted per-run sampling; it is an unrecorded observation and the recorded spread above is the
number to use.) Sampled once per run, across both sessions:

| arm                   | session | n   | mean of means | spread    |
| --------------------- | ------- | --- | ------------- | --------- |
| baseline              | A       | 5   | 0.0774 ms     | 0.0058 ms |
| control webhook 55/s  | A       | 5   | 0.0953 ms     | 0.0063 ms |
| control inproc 55/s   | A       | 4   | 0.0923 ms     | 0.0033 ms |
| storm                 | A       | 5   | 0.0985 ms     | 0.0044 ms |
| baseline              | B       | 3   | 0.0785 ms     | 0.0046 ms |
| control webhook 55/s  | B       | 3   | 0.0939 ms     | 0.0129 ms |
| storm                 | B       | 3   | 0.0983 ms     | 0.0042 ms |
| control webhook 200/s | B       | 3   | **0.1310 ms** | 0.0024 ms |

**The fetch gate does get dearer under load — and mailboxes are not why.** In session A, baseline →
storm is +0.0211 ms (+27%); baseline → **control** is +0.0179 ms (+23%) for the same number of extra
workflows and no mailbox anywhere. What is left, control → storm, is **+0.0032 ms (+3.4%)**, against a
3-standard-error tolerance of 0.0036 ms on the control arm's mean: **inside the noise, not resolvable.**
The two control shapes are 0.0030 ms apart, the same size, which is the bracket on that residue.
Session B reproduces every one of those figures to within 0.002 ms, and adds the term that settles the
attribution: the **request-matched control, which creates 3.6× the workflows, costs 0.1310 ms** — a
third dearer again. The statement's cost tracks the number of workflows the table holds, monotonically
(200/s → 0.078, +55/s → 0.094, +200/s → 0.131), and mailbox traffic adds nothing on top of its own
workflow count that this instrument can see.

This is where the design does what it claims. v2 measured **+58%** on this statement from a single
matched pair and attributed it to its readiness CTE's per-candidate dependency anti-join over thousands
of chain edges. This design creates **no dependency edges at all**.

Two things follow, and only one of them is about mailboxes. Here, mailbox traffic adds nothing to this
statement beyond its own workflow count. And v2's +58% **sits entirely inside what workflow count alone
produces on this machine** — +55 workflows/s buys +23%, +200/s buys +69% — so nothing measured here
establishes that v2's dependency anti-join contributed anything at all. It may well have; the point is
that v2 never ran a workflow-matched control on this statement, so its attribution was never separated
from the load, and this suite cannot separate it retrospectively either. What this session establishes
is about its own design, not about v2's mechanism.

#### What one message costs the database

One storm run (14 364 messages, 9 903 receivers, 5 454 mailboxes) charged **2 950 ms of server-side
statement time** to statements that name a mailbox table — **0.205 ms per stored message**. Three
independent runs produced 2 949.6 / 2 953.7 / 3 047.2 ms and 0.205 / 0.206 / 0.212 ms per message, a
3% spread: the steadiest figure in the suite, and the one to quote.

| statement                                          | calls  | mean     |
| -------------------------------------------------- | ------ | -------- |
| delivery append (`UPDATE next_idx` CTE + `INSERT`) | 14 365 | 0.065 ms |
| receiver registry insert                           | 9 903  | 0.044 ms |
| the release (the wake, and the closure release)    | 19 767 | 0.019 ms |
| mailbox mint (the one-statement CTE)               | 5 454  | 0.048 ms |
| `next_seq` bump in the enqueue flush               | 9 903  | 0.024 ms |
| mailbox row lock + read (`SELECT … FOR UPDATE`)    | 20 257 | 0.010 ms |
| close (`UPDATE … status`)                          | 5 402  | 0.036 ms |
| the executor's rendezvous read                     | 9 903  | 0.010 ms |
| the fetch's `claimed_at` stamp (once per batch)    | 5 368  | 0.017 ms |
| enqueue-flush mailbox read                         | 9 903  | 0.007 ms |
| delivery idempotency lookup                        | 14 855 | 0.005 ms |
| overdue-mailboxes gauge                            | 36     | 0.004 ms |
| deadline sweep candidate scan                      | 1      | 0.003 ms |

Attributed per unit by summing the statements each one issues — a derivation from the table above,
not a separate measurement, and it reconstructs the measured 2 950 ms total to within 3%:

- **a processed message: ~0.19 ms** — 0.099 per delivery (append 0.065 + idempotency lookup 0.005 +
  row lock and read 0.010 + the release attempt 0.019) and 0.094 per receiver (registry insert 0.044
    - `next_seq` 0.024 + enqueue-flush read 0.007 + rendezvous read 0.010 + a batch-amortized 0.009 of
      claim stamp) — plus ~0.035 ms of amortized mint-and-close at this session's 2.6 messages per
      mailbox → **~0.23 ms**;
- **a buffered message: ~0.099 ms**, and no workflow at all.

Against v2's **~0.4 ms of server-side statement time per reply**, whose two largest terms were
`COPY engine.workflow_link` (0.185 ms) and `COPY engine.workflow_dependency` (0.154 ms). Both are
**exactly zero here** — not "small", not "amortized": the edge check reports 0 calls to either
statement and 0 rows in either table after a storm that created 9 903 receive workflows.

**That zero is only worth something because the suite proves it could have been a one.** Nothing in the
storm arms creates an edge — the receiver payload sets `dependsOnHeads: false` with a fresh collection
key — so on its own the check would read zero just as happily if the statement had been renamed, the
table dropped or the filter mistyped. So before any arm runs, the wrapper enqueues one request that
deliberately creates both edge kinds (a second workflow with `dependsOn` and `links`) and asserts the
check sees them: 1 call and 1 row for each. If that positive control fails, the session stops rather
than publishing a vacuous pass.

Two honest qualifications, both v2's and both still true: this accounting only sees statements the
feature **names**, so it is a lower bound rather than a decomposition — the fetch-gate comparison above
is what covers the shared-statement half; and the receive workflow's own row and step inserts are
excluded on both sides of the v2 comparison, because a v2 link paid them too.

#### What one message costs the app, at idle

`MODE=low` walks the protocol one phase per iteration on a single VU, so **every hop is the first
request after the same idle gap** — which is the measurement, not a detail. An earlier version ran the
whole exchange inside one iteration and had two nearly identical enqueues come out 5 ms apart on
position alone. `n ≈ 122` per hop over a 3-minute run.

| hop at idle                  | med      | p95      | × the yardstick |
| ---------------------------- | -------- | -------- | --------------- |
| ordinary enqueue (yardstick) | 11.65 ms | 14.21 ms | 1.00×           |
| mailbox mint (`POST`)        | 5.91 ms  | 7.62 ms  | 0.51×           |
| receiver enqueue (parks)     | 13.59 ms | 15.96 ms | 1.17×           |
| receiver enqueue (runnable)  | 12.93 ms | 14.49 ms | 1.11×           |
| delivery that wakes          | 8.96 ms  | 11.89 ms | 0.77×           |
| delivery that buffers        | 8.30 ms  | 10.09 ms | 0.71×           |
| mailbox close (`DELETE`)     | 7.27 ms  | 8.64 ms  | 0.62×           |

So **one processed message costs 1.94× one ordinary enqueue** (the receiver enqueue plus the delivery,
two calls where v2 made one), plus 1.13× once per exchange for the mint and the close. **One buffered
message costs 0.71×** and creates nothing.

The absolute milliseconds are idle-latency figures — a request arriving after 200 ms of quiet pays for
a cold write-buffer flush window and a VM that has been idling, which is why every one of them is
several times its own server-side statement time. Only the ratios travel.

**A note on v2's comparable figure, because the difference matters.** v2 recorded "a single reply at
idle costs 2.4× a single ordinary enqueue". That was measured with all hops inside one iteration: the
exchange enqueue went first, then a 1-second sleep, then the reply — the first _measured_ hop — and the
ordinary enqueue came last, after three other requests had warmed the flush loop. That is exactly the
position effect this suite's phased structure was built to remove, and it biases in the direction that
inflates the ratio. **1.94× and 2.4× should therefore not be subtracted from each other**; what is
established here is 1.94× on an instrument where both halves were measured identically.

**What does bear on cost, said plainly:** on the cold instrument each suite used for its own first
measured hop, a processed message here is **13.59 + 8.96 = 22.55 ms** of client wall clock against v2's
single **11.63 ms** reply ingestion — roughly double, because the app makes two calls where v2's engine
made one inside its own transaction. The ratios above say the per-call work is cheaper; this says the
per-message round trips are not, and the bracket section says the same thing in the language of the
gate. All three are the same finding: this design moves cost out of the engine's transaction and into
the app's request count.

#### The sweep's per-cadence scan

**Reproduce with `SWEEP_SCALE=200000 ./.k6/mailbox-storm-compare.sh`.** The wrapper seeds the table
after every arm has run — so it cannot perturb a measured run — and prints each plan with its
counterfactual. The seeding is part of the suite rather than a note here because the storm arms only
ever leave ~5 400 mailboxes behind: both scans are `ORDER BY … LIMIT`, an index earns its place on
those by stopping early, and step 5a put the crossover near 5 000–10 000 rows. A scan measured against
what a storm leaves is measured below the point where the question becomes interesting.

Seeded table: **202 005 mailboxes** — 200 000 closed, 2 000 open, 5 of them overdue. The counterfactual
is taken by disabling index scans for the statement rather than by dropping an index: dropping one
needs DDL rights and changes the table for everything after it.

| scan                                                      | with its index  | index scans disabled |
| --------------------------------------------------------- | --------------- | -------------------- |
| deadline sweep, empty tick (what almost every cadence is) | **3 buffers**   | —                    |
| deadline sweep, tick with work (5 overdue)                | **3 buffers**   | 3 957 buffers        |
| retention, empty tick (nothing past the cutoff)           | **2 buffers**   | 3 884 buffers        |
| retention, tick with work (a full batch of 100)           | **104 buffers** | 4 084 buffers        |
| the overdue gauge (index-only scan, 5 rows)               | **4 buffers**   | 3 881 buffers        |

The empty and with-work cases are reported apart because they are different questions, and quoting the
empty one as "the scan's cost" would be quoting the cheap case. Retention makes that concrete: 2
buffers when it finds nothing and **104** when it locks a full batch of 100 — the index scan itself
still costs 4, and the other 100 are the rows.

"One indexed scan per cadence" is **confirmed and priced**: 2–4 shared-buffer hits at 200 000
mailboxes for a tick with no work, against a parallel sequential scan of the whole table plus a sort
without the index. The two partial indexes step 5a added beyond the letter of its step are what make
the sentence true, and this is the measurement that says by how much.

_Reconciling with step 5a's own figures_ (655 → 4 buffers for the deadline scan, 6 240 → 23 for
retention): the shapes agree, the numbers differ because the counterfactuals differ. Step 5a compared
against the schema **without the index** — a genuinely different table, whose deadline scan the planner
answers differently from a table that has the index and is merely forbidden to use it — and seeded a
different population. Both establish the same thing: without the partial indexes these scans read the
table, and with them they read a handful of pages.

**But the plan undercounts the scans, and this is the one place the measurement contradicts it.** The
mailbox subsystem adds **three** unconditional per-cadence statements, not one:

1. the deadline sweep's candidate scan, every `MailboxSweepInterval` (5 min) — a plain `SELECT`;
2. the **overdue-mailboxes gauge**, every `MetricsCollectionInterval` (**5 s**) — by far the most
   frequent, 36 calls in a 3-minute run at 0.004 ms, and the reason this suite pins the count of
   mailbox-mentioning reads rather than exempting reads wholesale;
3. the retention purge's mailbox candidate scan, on `Retention.Interval` (2 h) and once at startup —
   a `FOR UPDATE SKIP LOCKED`, so a lock rather than a read.

All three are individually negligible (≤ 3 buffers, ≤ 0.004 ms), so the plan's conclusion survives
intact; the sentence that states it does not.

#### The non-mailbox hot path, at statement level

On a run with no mailbox traffic at all: **no statement wrote or locked a mailbox** — the three
unconditional scans above are all that ran, at 1, 36 and 0 calls respectively — and the fetch gate
mentioned no mailbox column with 5 454 mailboxes and 9 903 receive workflows in the table. The one
hot-path statement the feature genuinely changed is the enqueue `COPY engine.workflows`, whose column
list is **one column wider**: 35 984 calls at 0.109 ms on a mailbox-free run, over 36 000 workflows —
a mean batch of 1.0, so nothing here is amortized by batching, ingestion and ordinary enqueues alike.

**The other half of the claim — "one null check per step execution" — was not measured, and cannot be
on this instrument.** A predicted branch on a field already loaded with the workflow row is on the
order of a nanosecond; this suite's finest instrument resolves 0.05 ms, five orders of magnitude
coarser. What is measurable is that the branch issues **zero statements**, which step 4 established by
deleting its short-circuit and watching one test go red, and which the zero-statement check
re-establishes end to end. Anyone quoting a number for the null check itself is quoting noise.

#### What these sessions could not measure

Listed because an omission that is not named reads as a result.

- **p99, at all.** Both sessions returned `inconclusive` at 30–35% sensitivity against a 10% target.
  v2 reached the same conclusion on the same machine and named the remedy: dedicated, quiet hardware,
  not more repeats. Three unrelated containers ran throughout these sessions, and one control run took
  a 165 ms p99 out of nowhere.
- **The size of the p95 cost.** Two sessions, +10.7% and +5.0%. The sign is established; the number is
  not, which is why a ceiling is recorded and a price is not.
- **The null check per step execution**, five orders of magnitude below the finest instrument here.
- **A large parked-receiver population.** The relay arm's wake is immediate, so at most a handful of
  receivers were ever `Held` at once (`parked receivers max = 1`), and this suite never built the
  pathological case of thousands of long-parked receivers. The structural argument is that it cannot
  matter to the fetch gate — `Held` (status 9) is absent from `FetchableSqlList`, and
  `ix_workflows_backoff_until_created_at` is partial on `status = ANY (ARRAY[0, 2, 8])`, so a parked
  receiver holds no entry in the fetch gate's index at all — but it is an argument from the schema,
  not a measurement. What such a population _would_ cost is admission budget, which is a documented
  exposure and not something a load test at this scale reaches.
- **The mailbox's own row under contention.** The buffered arm serializes ~2 deliveries/s on each of
  13 mailbox rows. A genuinely hot single mailbox (v2's deep arm ran unthrottled at ~430/s) was not
  attempted, because the control arm cannot match an arm that creates no workflows.
- **Anything at all about a second engine pod.** Single-pod throughout.

#### Follow-ups this measurement suggests

- **The overdue-mailboxes gauge is the most frequent unconditional mailbox statement in the engine**,
  at `MetricsCollectionInterval` (5 s) against the sweep's 5 minutes. It costs 3 buffers and 0.004 ms,
  so nothing needs doing — but the plan's "one indexed scan per cadence" describes one of three, and
  the sentence should say three.
- **Record a price after a third session, replacing the ceiling.** The suite is ready for it:
  `RECORDED_PRICE.fractions` supersedes `costEstablishedUnresolved` for any metric it lists, and the
  comparator prints this session's own derived fractions on every gating run.
- **A quiet machine would settle p99.** v2 measured a 3.75× improvement in tail spread from stopping
  26 idle containers; nothing else moved p99 for either suite.

## Payload

Scripts use `payloads/webhook.json` — a single webhook step targeting WireMock. `WEBHOOK_URL` defaults to `http://wiremock:8080/webhook-callback` for the Dockerized engine. Use `http://localhost:6060/webhook-callback` when the engine runs on the host and only dependencies run in Docker.

`mailbox-storm.js` additionally uses `payloads/mailbox-receiver.json` — the receive workflow: one webhook
step plus a `mailbox` block, enqueued as a collection head with no head dependency, which is what the
app-lib's relay does. The mailbox id and collection key are filled in per request by the script.

## Shared Library

`lib/helpers.js` contains reusable utilities (payload building, health polling, summary formatting) shared with `workflow-engine-app/.k6/` scripts.

`lib/compare-summaries.mjs` is the comparator the wrapper calls: it reads the per-run summaries of two
arms, applies the gates described above, and prints a three-valued verdict per metric with its reason
and its remedy.
