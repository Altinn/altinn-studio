# Workflow-engine observability playground

A local stack plus a load generator that never stops, built so every panel on the workflow engine's
Grafana dashboard has real data on it. Branch: `feat/workflow-engine-dashboard-metrics`.

Everything below is run from `src/Runtime/workflow-engine`.

---

## TL;DR

```bash
cd src/Runtime/workflow-engine
make playground                 # stack up, throttling ON
k6 run .k6/perpetual-mix.js     # load generator, Ctrl+C to stop
open http://localhost:7070      # Grafana → dashboard "Workflow Engine"
make playground-stop            # stack down
```

Give it about eight minutes before judging the throttle panels. `storm-a` trips within a sweep of the
first burst and its full trip → extend → release → clear arc takes two to three minutes; `storm-b`
deliberately starts half a period later, so its first arc finishes around the seven-minute mark. That
offset is the point — it is what puts two breakers in different phases on the same panel.

---

## What changed, and why

### 1. Two histograms had no bucket view (a real measurement bug, not cosmetic)

`src/WorkflowEngine.Telemetry/Extensions/ServiceCollectionExtensions.cs`

Nine duration histograms share an explicit bucket view spanning 0.1 ms → 300 s. Two seconds-valued
histograms were added later and never joined it, so both fell back to the OpenTelemetry SDK's default
boundaries — `0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000` — which are
shaped for milliseconds while both instruments record **seconds**:

- **`engine.mailboxes.receivers.wake_latency`** is sub-second by construction. `NOTIFY` is issued
  inside the releasing transaction and the processor debounces it by 10 ms, with a 500 ms idle poll as
  the ceiling. Every healthy sample therefore landed in the single bucket `(0, 5]`, and
  `histogram_quantile` interpolating inside one bucket pins to a constant — P95 = 4.75 s for a
  population whose real P95 is about 20 ms. This is exactly the failure the comment above
  `durationBuckets` was written to warn about.
- **`engine.steps.wait.duration`** runs to `DefaultStepWaitBudget` (24 h) and the `MaxStepWaitBudget`
  cap (14 d). Both are far past the top boundary of 10000, so real samples landed in the `+Inf`
  overflow, where no percentile can be computed at all.

Each got its own boundaries rather than a share of `durationBuckets`, because they need resolution in
different places:

```
wake_latency:  0.0005 0.001 0.0025 0.005 0.01 0.02 0.05 0.1 0.2 0.5 1 2 5 10 30 60
wait budget:   1 2 5 10 30 60 300 900 1800 3600 10800 21600 43200 86400 259200 604800 1209600
```

Wake latency is dense below 0.5 s — the poll ceiling, where the whole healthy population lives — and
deliberately coarse above 1 s, because that tail is worker starvation rather than mailbox latency. The
wait budget is log-spaced from `MinStepDeferDelay` (1 s, the smallest value the instrument can record)
to `MaxStepWaitBudget` (14 d), with boundaries landing exactly on the two configured budgets — 86400
and 1209600 — so "approaching budget" is a bucket an operator can read straight off, and nothing
overflows.

Verified live: wake-latency samples now spread across the 0.005–0.05 s boundaries instead of piling
into one, and the wait-budget histogram resolves the playground's 1–30 s deferrals.

### 2. Nineteen new dashboard entries

`.docker/dashboards/workflow-engine.json` — 43 panels → 63 (17 new panels + 3 new rows).

**Hand-authored, not exported from Grafana.** The file was edited with a script that round-trips
`json.dumps(indent=2)` byte-identically against the original, which is also the exact format
`.docker/export-dashboard.sh` emits — so a later export will not churn the diff. Nothing was clicked
in the Grafana UI, and no panel was re-laid-out by Grafana's normalizer.

New rows, in reading order:

| Row (position)                                         | Panels                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Durable Yield & Waiting** (after Workflow Lifecycle) | Deferrals · Waiting Workflows · Wait Budget Consumed (per deferring step)                                                                                                                                                    |
| **Throttling (namespace circuit breaker)** (below it)  | Breakers Tripped · Breaker Transitions by Namespace · Workflows Released from Throttling by Namespace                                                                                                                        |
| **Mailboxes** (after Engine Internals)                 | Rendezvous Violations · Overdue Open Mailboxes · Unpaired Deliveries · Mailbox Lifecycle · Deliveries by Outcome · Receivers: Births & Releases · Receiver Wake Latency · Mean Batch Size (flushed ÷ batches) · Buffer Depth |

Plus two additions to existing rows:

- **Lease & Recovery Signals** gains **Operator Interventions** (`nudged`, `abandoned`) and
  **Dependency Recovery** (`dependency_recovered`) — the three newer lifecycle counters. The row
  already meant "things that move a workflow off the path the engine put it on", and
  `dependency_recovered` is literally a recovery signal. Two panels rather than one because
  abandonments outrun recoveries by two orders of magnitude and flatten them on a shared axis.
- **Main Loop Time (P95)** gains a third series, **Total (unstacked)**, from
  `engine.mainloop.time.total`. That panel's own description says its stacked queue+service P95 "won't
  reconcile with a hypothetical joint P95 because percentiles are not additive" — the joint P95 is not
  hypothetical, it is exported and was simply not plotted. Drawn dashed and outside the stack, so the
  gap between it and the stack height is visibly the cost of that non-additivity. This is the one
  panel change the brief left to my judgment; the Workflow and Step rows already plot both total and
  breakdown, so the main loop was the odd one out.

Conventions kept from the existing panels: `rate(...[5m])` with unit `ops` for throughput, stat panels
with absolute thresholds for alert conditions, `histogram_quantile` over `..._bucket` with
`sum(rate(...[5m])) by (le)`, table legends, `palette-classic` with per-series color overrides, and a
description on every panel saying what it means and how to misread it.

Three deliberate departures, each for a reason:

- **`increase(...[5m])` instead of `rate`** on the throttle transitions and the interventions panel.
  These are rare discrete events; a single breaker trip reads as `1` under `increase` and as `0.0033`
  under `rate`. The existing dashboard has no `increase()` anywhere, so this is new — but a rate is the
  wrong shape for an event that happens twice an hour.
- **`or vector(0)`** on the two zero-is-healthy stat panels and the breaker gauge. An OTel counter that
  has never incremented has no Prometheus series at all, so a healthy engine would render "No data"
  where the operator needs to see a green `0`. The contrast is visible on the live dashboard: the new
  Rendezvous Violations and Overdue Open Mailboxes stats read a green `0`, while the three existing
  stats on Lease & Recovery Signals — which have no such fallback — read "No data" for the same
  reason, on the same healthy engine.
- **`by (namespace)`** on every throttle panel. Throttle metrics are the only namespace-tagged family
  in the engine, and the cardinality is a documented decision in the failure-throttling ADR (bounded by
  incident count, not fleet size). **No dashboard-wide namespace variable was added** — the core
  lifecycle counters carry only `reason`/`operation`, so a global variable would silently do nothing on
  the other 46 panels.

The two alert-condition stats are styled to be legible at a glance, as the technical guide specifies:
**Rendezvous Violations** and **Overdue Open Mailboxes** both go red on any value above zero.
**Unpaired Deliveries** sits beside them in orange — it is a saga-hygiene signal, not an invariant
violation, and the guide does not make it a page.

**Mean Batch Size** plots `flushed ÷ batches` per operation, with a dashed threshold line at **1.25** —
the measured break-even for the delivery path, below which the batched flush costs _more_ statements
per delivery than the bespoke path it replaced. **Buffer Depth** is plotted too, but its description
says exactly what the guide says: read it as latency, not capacity, read only the sustained value, and
it cannot tell you whether batching is happening, because a storm accepting 3.86 messages per flush
held it at zero throughout.

### 3. A perpetual load generator

`.k6/perpetual-mix.js` (+ a section in `.k6/README.md`).

Ten arms, all independently tunable by env var, all running at once until Ctrl+C. Full table of arms
and variables is in the README; the shape is:

- `healthy` / `flaky` / `doomed` — work that succeeds, work that requeues and recovers, work that
  fails permanently (half on a non-retryable 422, half by exhausting a short retry budget)
- `reaper` — abandons a share of the failures
- `deferring` — durable yield, plus one workflow in eight given a wait budget it cannot meet
- `nudger` — clears the backoff on parked workflows
- `dependencies` — the only way to drive `dependency_recovered`, which nobody can trigger directly
- `mailboxes` — full exchanges hitting every delivery verdict the dashboard plots
- `storm` — one namespace per arm that trips a breaker and recovers, on a cycle
- `monitor` — the health-poll sidecar the other scripts use

**Four namespaces, on purpose.** `playground` holds work that should succeed and never accumulates a
`Requeued` population, so it can never trip its own breaker — on the throttle panels it is the
namespace that stays _absent_, which is the attribution story those panels exist to tell.
`playground-retries` holds the work that fails, kept apart so a pile of retrying workflows can never
get the mailbox and durable-yield arms throttled behind an unrelated storm. `storm-a` and `storm-b` get
one breaker each, phase-offset by half a period so `by (namespace)` shows two series in different
phases at the same time.

**How the storm recovers without the script intervening.** The burst goes in as one batch of
independent collection heads pointed at a downstream that is always down, which clears both trip
conditions within a sweep or two. Recovery is built into the retry budget: while the breaker is tripped
only the canaries keep retrying, and when their budget runs out they fail terminally — which takes them
out of `Requeued`, and a canary that is no longer requeuing is exactly what the sweep reads as
progress. It opens recovery, releases cohorts that double every sweep, and clears once a cohort comes
back empty.

### 4. Two WireMock stubs

`.docker/wiremock/mappings/flaky.json` — a three-state WireMock scenario answering 500, 500, 200 in a
cycle. That is the flaky-downstream lever, and it is why the flaky arm needs no per-workflow state
anywhere: every attempt draws independently from the cycle, so a step requeues a geometric number of
times and then recovers on its own.

`.docker/wiremock/mappings/permanent-error.json` — a 422, which is in
`RetryStrategy.DefaultNonRetryableHttpStatusCodes`, so the engine fails the step outright.

### 5. Playground stack overrides

`.k6/docker-compose.playground.yaml` plus `make playground` / `make playground-stop`.

Follows the precedent of `.k6/docker-compose.measure.yaml`: an override file layered on the shared
compose, never an edit to a shared default. See "Turning throttling on and off" below.

---

## Running it

### Bring the stack up

```bash
cd src/Runtime/workflow-engine
make playground
```

That is `docker compose -f docker-compose.yaml -f .k6/docker-compose.playground.yaml --profile core
up -d --build`. It brings up Postgres (9543), pgAdmin (5050), WireMock (6060), the LGTM stack
(Grafana 7070, OTLP 4317/4318), the exporters, and the engine testapp (9090).

**If port 7070, 4317 or 4318 is already taken** — another project's LGTM stack is the usual culprit —
the LGTM container fails to attach to the network at all and nothing reaches Grafana. The override file
spells those ports as variables:

```bash
PLAYGROUND_GRAFANA_PORT=7071 PLAYGROUND_OTLP_GRPC_PORT=4319 PLAYGROUND_OTLP_HTTP_PORT=4320 \
  make playground
```

The defaults are the documented ports, so leaving them unset changes nothing. This is not
hypothetical — `medlemspris-lgtm` held 7070 on this machine and the workflow-engine LGTM container
came up with **no network attachment at all**, which looks like "Grafana is empty" rather than like a
port clash. The final verification was done on the plain 7070 after that stack was stopped.

### Start and stop the load generator

```bash
k6 run .k6/perpetual-mix.js        # start; Ctrl+C to stop
```

Quieter, for leaving on a laptop:

```bash
k6 run .k6/perpetual-mix.js -e HEALTHY_RATE=3 -e FLAKY_RATE=1 -e DEFER_RATE=1 \
  -e MAILBOX_RATE=1 -e STORM_PERIOD=600
```

One family at a time, for working on a specific row:

```bash
k6 run .k6/perpetual-mix.js -e HEALTHY_RATE=0 -e FLAKY_RATE=0 -e DOOMED_RATE=0 -e DEFER_RATE=0
```

### Tear down

```bash
make playground-stop                        # containers down, database kept
make reset                                  # containers down and database volume deleted
```

`make reset` targets the plain compose file, which is enough — the override adds no volumes.

---

## What to look at

Grafana: **<http://localhost:7070>** (or wherever you remapped it) → Dashboards → **Workflow
Engine**.
Default range is the last hour at a 10 s refresh. The engine's own dashboard is at
<http://localhost:9090/dashboard>, and pgAdmin at <http://localhost:5050>.

### Durable Yield & Waiting

- **Deferrals** — two purple lines that should track each other with step deferrals higher, because one
  workflow parks several times. The red **Wait budget expired** line is the `deferring` arm's
  one-in-eight slice; it is a `reason="wait_expired"` failure, deliberately kept out of the default ops
  alert, and this is the only place it surfaces as its own series.
- **Waiting Workflows** — a level, not a rate. Should oscillate around a steady value. A line that only
  climbs means deferring commands are never resolving.
- **Wait Budget Consumed** — P50/P95/P99 in seconds, one sample per deferring step. In the playground
  it sits in the 2–20 s range because the generator uses three-minute budgets; in production, compare
  P99 against the configured `command.waitBudget`. This is the panel the bucket fix above exists for.

### Throttling

- **Breakers Tripped** — green `0` most of the time, red `1` or `2` while a storm is running. `max()`
  over instances rather than `sum()`, because the gauge is per-process and every replica reports its own.
- **Breaker Transitions by Namespace** — bars, one color per transition, split by namespace. Over a
  four-minute window you should see, for each of `storm-a` and `storm-b` in turn: a red **Tripped**
  bar, several orange **Extended** bars while the canaries keep failing, yellow **Handler parked** bars
  from workflows the handler parked the instant they failed into an already-tripped namespace, and
  finally a green **Cleared**. `playground` never appears here — that absence is the point.
- **Workflows Released from Throttling by Namespace** — the recovery curve. Cohorts double every sweep,
  so it rises and then stops abruptly when the last cohort comes back empty and the breaker clears.

### Mailboxes

- **Rendezvous Violations** and **Overdue Open Mailboxes** — both must read green `0`. Anything above
  zero on the first is a page (the engine is violating its own rendezvous invariant, and a retry would
  launder it). Anything sustained above zero on the second means the deadline sweep is not draining.
- **Unpaired Deliveries** — non-zero by design here: the generator leaves 30% of its mailboxes open on
  purpose with an unread message in them, so the deadline sweep has something to close.
- **Mailbox Lifecycle** — minted against closed, closures split `request` (the saga finishing) and
  `deadline` (the sweep cleaning up). The `deadline` share tracks `MAILBOX_ORPHAN_FRACTION`.
- **Deliveries by Outcome** — `accepted` and `duplicate` dominate; `not_found`, `too_large`, `invalid`
  and `closed` appear as thin lines because the generator provokes each on a roll of an eight-sided die.
- **Receivers: Births & Releases** — `birth=held` (enqueued before its message) against
  `birth=delivered` (enqueued after), plus the releases that wake the held ones. `birth=closed` appears
  when the generator replays a receiver past the close.
- **Receiver Wake Latency** — should sit in the tens of milliseconds. The other panel the bucket fix
  exists for: before it, this read a flat P95 of 4.75 s.
- **Mean Batch Size** — at the playground's ~1 exchange/s this sits flat at 1.00, below the dashed
  1.25 break-even line, and that is the honest reading: at this rate every request flushes alone and
  the batched delivery path is costing a statement per delivery rather than saving one. Do not expect
  this generator to move it. I pushed a separate 200 deliveries/s probe at it and the delivery ratio
  reached only **1.019** — the crossover is a genuine storm, and the 3.86-per-flush figure in the
  technical guide came from 3 000 deliveries/s. `mailbox-storm.js` is the script that gets there;
  this panel's job here is to show the ratio is being computed and to put the threshold on screen.
- **Buffer Depth** — expect zero. Read the panel description before concluding anything from that.

### Lease & Recovery Signals

- **Operator Interventions** — **Nudged** every 15 s from the nudger arm and **Abandoned** in bursts
  from the reaper.
- **Dependency Recovery** — roughly one bar a minute, lagging its cause because the maintenance sweep
  that does the recovering runs on a one-minute timer. On its own panel because abandonments outrun
  recoveries by two orders of magnitude and would flatten it to the baseline on a shared axis.

### Engine Internals

- **Main Loop Time (P95)** — the new dashed **Total** line sits above the queue+service stack. That gap
  is percentile non-additivity, and it is supposed to be there.

---

## Turning throttling on and off

The namespace circuit breaker **ships dark**: `ThrottlingSettings.Enabled` has no initialiser, and with
it false the sweep never runs and the fetch query ignores `throttled_until` entirely. Configuration is
**restart-only** — the value is read once at repository construction — so changing it means recreating
the container, not reloading config.

**On** — this is all `make playground` does that `make run` does not:

```yaml
# .k6/docker-compose.playground.yaml
EngineSettings__Throttling__Enabled: 'true'
```

**Off** — use the ordinary stack:

```bash
make stop && make run
```

The overrides also shrink the sweep cadence and the recovery windows so the whole arc fits in one
sitting. At the shipped 30 s sweep and 10 min first window the first `cleared` would land ten minutes
after the trip:

| Setting                | Default | Playground | Why                                                       |
| ---------------------- | ------- | ---------- | --------------------------------------------------------- |
| `Enabled`              | `false` | `true`     | the whole point                                           |
| `SweepInterval`        | `30s`   | `10s`      | the sweep is what emits every throttle metric             |
| `InitialWindow`        | `10m`   | `1m`       | the floor on how long a tripped breaker stays tripped     |
| `MaxWindow`            | `1h`    | `5m`       | keeps extensions from parking the storm past the next one |
| `MailboxSweepInterval` | `5m`    | `20s`      | how long a deadline-closed mailbox takes to show up       |

The two trip thresholds — `MinRequeuedWorkflows` (50) and `MinRequeuedRatio` (0.5) — are deliberately
**left alone**. The generator sizes its storm burst to clear them and its ordinary failure arms to
stay under them, so the playground does not need to weaken the condition it is demonstrating.

**None of this is in a shared default.** `Defaults.cs`, `appsettings.json` and the shared
`docker-compose.yaml` are untouched.

Confirming a trip outside Grafana:

```bash
docker exec workflow-engine-postgres psql -U postgres -d workflow_engine \
  -c "SELECT namespace, state, current_window, last_requeued_count, last_active_count FROM engine.namespace_throttles;"
docker logs workflow-engine-testapp 2>&1 | grep -i throttle | tail
```

`state` is `0` Tripped, `1` Recovering, `2` Clear.

---

## Things I deliberately did not do

- **No namespace template variable.** The brief asked for one to be considered and rejected; the
  reasoning holds — only the six throttle instruments carry a `namespace` tag, so a dashboard-wide
  variable would be a control that silently does nothing on every panel but the three new throttle
  ones.
- **No alert rules.** The technical guide names `rendezvous.violations` and `open.overdue` as alert
  conditions and I made both legible at a glance, but provisioning Grafana alerting is a separate
  decision with a separate blast radius.
- **No `log_full` delivery refusal in the generator.** It needs `MaxMailboxLogLength` (100) positions
  burnt in a single mailbox and `next_idx` never goes back, so provoking it deliberately means a
  hundred-plus deliveries per exchange, which would dominate the mailbox arm's traffic to light up one
  thin line. The other six outcomes are all covered. The panel needs no change to show it if it ever
  does occur — `sum by (outcome)` picks up the series on its own, which I confirmed by accident while
  probing the batch ratio.
- **No dashboard alert on `engine.errors{operation="throttleSweep"}`.** Sweep-cycle failures are worth
  a panel eventually, but that instrument is already on the existing Failures panel via
  `engine.errors`, and splitting it out is a change to a panel I was not asked to touch.
- **Did not fix the two pre-existing dead color overrides.** Grafana anchors a bare `byRegexp`
  matcher (`stringToJsRegex` wraps it as `^pattern$`), so the existing `"^Failed"` override on
  Workflow Outcomes and `"^Errors"` on Errors & Recovery match nothing and those series fall through
  to the palette. My own regexp overrides hit the same trap and are fixed — I left the two existing
  ones alone because making them work changes the colors on panels I was not asked to touch, and the
  human should decide that. It is a one-word fix each (`^Failed` → `Failed .*`).
- **Nothing pushed.** Local commits only, as instructed. No branch named `feat/workflow-engine-throttle-*`
  or `cr/throttle-*` was touched, rebased or pushed.
- **The generator is not a benchmark.** It has no thresholds worth gating on beyond a liveness check on
  the healthy arm, and its numbers should not be quoted as performance results — `stress-test.js` and
  `mailbox-storm.js` are the scripts for that.

### One known leak

The `deferring` arm drives the TestApp's `test-defer` command, whose invocation counter is a
process-lifetime `static ConcurrentDictionary` keyed per workflow. At the default 2/s that is roughly
17 MB of engine memory per day. It is a property of the pre-existing test command, not of anything
added here, and it is bounded and slow — but a generator that is meant to run for days should not be
left running for weeks. Restarting the engine clears it; `DEFER_RATE=0` avoids it entirely. No other
arm holds per-workflow state anywhere.

---

## Two other things worth knowing

**Enqueue answers `201 Created` for a fresh batch and `200 OK` for an idempotency-key replay.** Both
`constant-rate.js` and the first draft of `perpetual-mix.js` check `status === 200`, which reports a
perfectly good enqueue as a failed check. In my draft it was worse than cosmetic: the check gated the
dependency arm's follow-up, so that arm silently did nothing for an hour and
`engine.workflows.execution.dependency_recovered` never appeared. Fixed here;
`constant-rate.js` still has the cosmetic version and I left it alone.

**`byRegexp` series overrides are anchored.** Covered under "deliberately did not do" below — the
short version is that `^Failed` matches nothing and two existing panels are quietly running on palette
colors because of it.

---

## One correction to the audit this work was based on

The brief said this branch's `HEAD` already contained all four layers of the throttling stack. It did
not: `HEAD` was one commit behind `origin/main`, and the missing commit was
`bbe580370b` — _"park failing workflows immediately when their namespace breaker is open (#19966)"_ —
the layer that adds `engine.throttle.handler_parked`. Without it that instrument does not exist, and a
panel referencing it would have been the dashboard's first query against a non-existent metric.

I rebased this branch onto `origin/main` to pick it up, which is why the branch carries that commit as
its parent. The ops layer (#19971) is still an open PR and adds no metrics, so nothing here depends on
it. The audit's count of the throttling family — six instruments — is right for `origin/main`; it was
five in the tree I started from.
