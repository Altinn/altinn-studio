#!/usr/bin/env bash
# Measures what mailbox traffic costs the engine's ordinary enqueue/processing path, and what one
# message costs, by running the same measured workload with and without mailboxes and comparing the
# arms against each other.
#
#   ./.k6/mailbox-storm-compare.sh
#   REPEATS=7 DURATION=4m BASELINE_RATE=400 ./.k6/mailbox-storm-compare.sh
#   ./.k6/mailbox-storm-compare.sh -e DELIVERY_PAYLOAD_BYTES=8192    # extra args reach every k6 run
#
# The arms are **interleaved and repeated**, and their order rotates each repeat. One run per arm in
# a fixed order cannot be trusted here: successive runs in a session drift (JIT, page cache, table
# growth) by more than the effect being measured, and whichever arm always runs last inherits that
# drift. Repeating gives every metric a measured spread, and the gates are derived from it rather
# than from hard-coded budgets — see lib/compare-summaries.mjs.
#
# Repeats buy precision: the gate is the standard error of the reference arm's mean, so it tightens
# as √REPEATS. They do not buy resolution — a gate reported as coarser than the target sensitivity
# is short of *observations*, which is DURATION's job. The comparator names which of the two a given
# inconclusive verdict needs.
#
# The exit code follows the **control-vs-storm** comparison when a control arm ran: both arms give
# the engine the same number of extra workflows, so what separates them is what mailboxes cost as a
# mechanism. With SKIP_CONTROL=1 it follows baseline-vs-storm with **latency ungated** — that
# comparison's latency difference is the cost of the extra traffic, not of the feature, and gating it
# would be permanently red, which is how gates get muted or their budgets inflated. Its processing
# and fidelity assertions still gate.
#
# Exit codes: **1 for a measured difference; 0 otherwise, `inconclusive` included.** An unresolved
# comparison (an arm that did not reproduce, or a gate coarser than the target sensitivity) abstains
# rather than failing: reporting "I could not measure this" as "this regressed" is how a suite gets
# switched off, and it would take the metrics that CAN be measured down with it.
# `STRICT_INCONCLUSIVE=1` makes it exit 2 again, for pipelines that want it to block.
#
# Requires: k6, node, docker/podman, and the engine stack (`make run`). Every run starts from a
# truncated database so no arm walks a larger table than another.
#
# **Two setup traps, both of which silently invalidate a session.**
#
#   1. `docker compose up -d --build` rebuilds the image and then leaves the *existing* container
#      running on the old one, so the run measures whatever was deployed last. Use
#      `docker compose --profile core up -d --force-recreate`, and check the container's image id.
#   2. A database that has ever carried another feature's migrations still carries its columns, and a
#      wider `engine.workflows` is exactly the quantity the hot-path claim is about. The schema check
#      below fails the session rather than measuring a contaminated table; `POSTGRES_DB` points the
#      whole script at whichever database the engine is actually using.
set -uo pipefail

cd "$(dirname "$0")/.."

RESULTS_DIR=${RESULTS_DIR:-.k6/results}      # where per-run summaries are written
REPEATS=${REPEATS:-5}                        # runs per arm; 2 is the minimum that can gate, and the
                                             # gate tightens as √n, so 5 is the shipped default
DURATION=${DURATION:-3m}                     # per run. 3m rather than 2m because percentiles need
                                             # observations: at 200/s a 3-minute run leaves p99
                                             # resting on ~360 of them against a 2-minute run's ~240,
                                             # which is the difference between a p95 gate that
                                             # resolves and one that reports `inconclusive`
BASELINE_RATE=${BASELINE_RATE:-200}          # measured (non-mailbox) enqueues per second
EXCHANGE_RATE=${EXCHANGE_RATE:-25}           # relay exchanges started per second in the storm arm
BUFFER_RATE=${BUFFER_RATE:-25}               # deliveries/s into one mailbox, to the log-length cap
EARLY_RATE=${EARLY_RATE:-5}                  # message-before-receiver exchanges per second
CONTROL_RATE=${CONTROL_RATE:-55}             # ordinary workflows/s in the control arm. Only the
                                             # seed: once a storm run exists this is re-derived from
                                             # its measured impliedControlRate, and the comparator
                                             # fails the comparison if the two drift apart
CONTROL_SHAPE=${CONTROL_SHAPE:-webhook}      # what the gating control arm's extra workflows are:
                                             # `webhook` (a receive workflow minus its mailbox block —
                                             # an exact shape match) or `inproc` (an in-process step)
CONTROL_REQ_RATE=${CONTROL_REQ_RATE:-0}      # >0 adds a REQUEST-matched control arm at that rate, on top
                                             # of the workflow-matched one. A mailbox workload's
                                             # request-to-workflow ratio is ~3.5:1 and an ordinary
                                             # workload's is 1:1, so no single ordinary control matches
                                             # both: the workflow-matched arm leaves the storm serving
                                             # ~145 more requests/s (an UPPER bound on the mechanism's
                                             # cost), and this one leaves the control creating ~3.5x the
                                             # workflows (a LOWER bound). Together they bracket it.
                                             # Set it to the storm's total extra request rate; ~200 at
                                             # the shipped configuration
CONTROL_INPROC=${CONTROL_INPROC:-0}          # 1 adds a SECOND control arm at CONTROL_SHAPE=inproc,
                                             # compared for information only. Costs REPEATS more runs;
                                             # it is how much the work *shape* alone can move the
                                             # number, which is what bounds the shape's contribution
                                             # to any difference the gate reports
SKIP_CONTROL=${SKIP_CONTROL:-0}              # 1 drops the control arm (saves REPEATS runs)
SKIP_LOW=${SKIP_LOW:-0}                      # 1 drops the single low-load run at the end
WARMUP_DURATION=${WARMUP_DURATION:-30s}      # discarded first run; 0 to skip
SWEEP_SCALE=${SWEEP_SCALE:-0}                # >0 seeds that many closed mailboxes AFTER every arm has
                                             # run and prices the per-cadence scans against them, with
                                             # a counterfactual. 0 skips it. The storm arms only ever
                                             # leave ~5 000 mailboxes behind, which is far below the
                                             # crossover where an index earns its place, so the number
                                             # worth quoting cannot come from them. 200000 is what the
                                             # README's figures were measured at
ENGINE_URL=${ENGINE_URL:-http://localhost:9090/api/v1/default}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-workflow-engine-postgres}
POSTGRES_DB=${POSTGRES_DB:-workflow_engine}  # the database the engine under test is pointed at
# `docker` is an alias for `podman` in some shells, and an alias does not survive into a script. Resolve
# a real binary once, so a session does not fail thirty runs in on a command that was never callable.
CONTAINER_CLI=${CONTAINER_CLI:-$(command -v docker || command -v podman)}
EXPECTED_EXEMPT_READS=${EXPECTED_EXEMPT_READS:-5}  # distinct READ statements that may mention a mailbox
                                             # on a mailbox-free run. Five, and each one is known: the
                                             # deadline sweep's candidate scan (5m cadence), the
                                             # overdue-mailboxes gauge (metrics cadence), the two
                                             # per-workflow reads that merely project mailbox_id, and the
                                             # list-endpoint read this suite's own monitor issues. Pinned
                                             # rather than left open, because "reads are exempt" as a
                                             # blanket rule would let a *new* unconditional mailbox read
                                             # through in silence — which is not hypothetical here: the
                                             # gauge is exactly that shape, and this count is what keeps
                                             # it visible. Raise it deliberately if you add a read, never
                                             # to quiet the check

# Size the load so that BASELINE_RATE plus the storm's own work stays inside the engine's capacity.
# Above roughly three quarters of it, every added workload — mailbox traffic or plain workflows —
# stretches the tails, and the comparison stops being about this feature. The control arm is what
# tells the two apart.

mkdir -p "$RESULTS_DIR"

# The statement checks fail the session rather than printing and letting the exit code alone: a second
# unconditional mailbox statement is the thing they exist to catch, and a direct contradiction of the
# design's central claim, so it must not be a line of output nobody's pipeline reads.
statement_check_failed=0

psql_engine() {
    "$CONTAINER_CLI" exec "$POSTGRES_CONTAINER" psql -q -U postgres -d "$POSTGRES_DB" "$@"
}

# The same, with stdin forwarded — `exec` without -i drops a heredoc on the floor silently, which is a
# seeding step that appears to succeed and inserts nothing.
psql_engine_stdin() {
    "$CONTAINER_CLI" exec -i "$POSTGRES_CONTAINER" psql -q -U postgres -d "$POSTGRES_DB" "$@"
}

# This script's own inspection queries land in pg_stat_statements like any other, and several of them
# name a mailbox table — so without a marker the accounting below would bill the measurement to the
# feature. Every inspection query that touches an engine table carries this comment, and every
# accounting query excludes it.
INSPECT="/* k6-inspect */"   # placed AFTER the first keyword: a LEADING comment is stripped from
                             # the text pg_stat_statements records, so a prefix marker survives nowhere
NOT_INSPECT="query !~ 'k6-inspect'"

reset_db() {
    # The three mailbox tables are named explicitly rather than left to the cascade: their foreign keys
    # are ON DELETE RESTRICT — the only non-cascade FKs in the schema, and deliberately so — and a
    # TRUNCATE that relied on a cascade would be relying on the one property this schema does not have.
    psql_engine -c "SET lock_timeout='30s'; TRUNCATE engine.workflows, engine.steps, engine.workflow_dependency, engine.workflow_link, engine.workflow_collections, engine.idempotency_keys, engine.mailbox_deliveries, engine.mailbox_receivers, engine.mailboxes CASCADE" >/dev/null 2>&1
}

reset_statement_stats() {
    psql_engine -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements" >/dev/null 2>&1
    psql_engine -c "SELECT pg_stat_statements_reset()" >/dev/null 2>&1
}

# pg_stat_statements is cluster-wide, so every query below is scoped to the database under test. Without
# this a second engine sharing the container — or leftovers from a previous feature's session — would be
# counted as this run's traffic, which is exactly the kind of contamination this suite is checking for.
DB_SCOPE="dbid = (SELECT oid FROM pg_database WHERE datname = current_database())"

# What names a mailbox: the three tables, or the one column the feature added to engine.workflows.
MAILBOX_IDENTIFIERS="query ~* 'engine\.mailbox|mailbox_id'"

# --- The schema check ---------------------------------------------------------------------------
# The design's hot-path claim is "one nullable column on the enqueue COPY". That is a claim about the
# shape of engine.workflows, and it is cheap to check directly — so it is checked directly, before a
# single number is measured, because a database carrying another design's columns makes every row of
# every table below wrong in the same direction.
assert_schema_is_this_trees() {
    local mailbox_columns foreign_columns

    mailbox_columns=$(psql_engine -tAc "
        SELECT string_agg(column_name || ' (' || CASE WHEN is_nullable = 'YES' THEN 'nullable' ELSE 'NOT NULL' END || ')', ', ')
        FROM information_schema.columns
        WHERE table_schema = 'engine' AND table_name = 'workflows' AND column_name LIKE '%mailbox%';" 2>/dev/null)

    foreign_columns=$(psql_engine -tAc "
        SELECT string_agg(column_name, ', ')
        FROM information_schema.columns
        WHERE table_schema = 'engine' AND table_name = 'workflows'
          AND (column_name LIKE 'exchange_%' OR column_name LIKE 'chain_%' OR column_name LIKE '%_signal%'
               OR column_name IN ('reply_to_workflow_id', 'inherit_state_from_workflow_id'));" 2>/dev/null)

    echo
    echo "--- schema check (engine.workflows)"
    echo "    total columns: $(psql_engine -tAc "SELECT count(*) FROM information_schema.columns WHERE table_schema='engine' AND table_name='workflows';" 2>/dev/null)"
    echo "    mailbox columns: ${mailbox_columns:-none}"

    if [ "$mailbox_columns" != "mailbox_id (nullable)" ]; then
        echo "    FAIL: expected exactly 'mailbox_id (nullable)'."
        statement_check_failed=1
    else
        echo "    pass: exactly one nullable mailbox column, which is what the enqueue COPY widens by"
    fi

    if [ -n "$foreign_columns" ]; then
        echo "    FAIL: engine.workflows carries columns this tree's migrations do not define: $foreign_columns"
        echo "          A database that once ran another design still carries its columns, and a wider row is"
        echo "          precisely the quantity being measured. Point POSTGRES_DB at a database migrated only by"
        echo "          this tree, or reset the volume (\`make reset && make run\`)."
        statement_check_failed=1
    fi
}

# --- The edge check's positive control ------------------------------------------------------------
# The storm-side edge check asserts that COPY engine.workflow_dependency and COPY engine.workflow_link
# never run. That assertion is worth nothing on its own: NOTHING in this suite creates an edge, so the
# check would read zero just as happily if the statements had been renamed, the tables dropped, or the
# filter mistyped. A zero that could not have been a one is not evidence.
#
# So before any arm runs, enqueue one request that deliberately creates both edge kinds and confirm the
# check sees them. If this fails, the storm-side zero means nothing and the session stops rather than
# publishing a vacuous pass.
assert_edge_check_can_see_edges() {
    local dep_calls link_calls dep_rows link_rows status

    reset_db
    reset_statement_stats

    status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$ENGINE_URL/workflows" \
        -H 'Content-Type: application/json' \
        -H "Idempotency-Key: edge-probe-$$" \
        -H "Collection-Key: edge-probe-$$" \
        -d '{"labels":{"k6":"edge-probe"},"context":{},"workflows":[
              {"ref":"a","operationId":"edge-probe-a","steps":[{"operationId":"s","command":{"type":"webhook","data":{"uri":"http://wiremock:8080/webhook-callback"}}}]},
              {"ref":"b","operationId":"edge-probe-b","dependsOn":["a"],"links":["a"],"steps":[{"operationId":"s","command":{"type":"webhook","data":{"uri":"http://wiremock:8080/webhook-callback"}}}]}]}' \
        2>/dev/null)

    dep_calls=$(psql_engine -tAc "SELECT $INSPECT COALESCE(sum(calls), 0) FROM pg_stat_statements WHERE $DB_SCOPE AND query ~* 'COPY engine\.workflow_dependency';" 2>/dev/null)
    link_calls=$(psql_engine -tAc "SELECT $INSPECT COALESCE(sum(calls), 0) FROM pg_stat_statements WHERE $DB_SCOPE AND query ~* 'COPY engine\.workflow_link';" 2>/dev/null)
    dep_rows=$(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.workflow_dependency;" 2>/dev/null)
    link_rows=$(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.workflow_link;" 2>/dev/null)

    echo
    echo "--- edge check, positive control (before any arm runs)"
    echo "    one enqueue with a head dependency and a link, HTTP $status"
    echo "    COPY engine.workflow_dependency: ${dep_calls:-?} calls, ${dep_rows:-?} rows"
    echo "    COPY engine.workflow_link:       ${link_calls:-?} calls, ${link_rows:-?} rows"
    if [ "${dep_calls:-0}" -gt 0 ] && [ "${link_calls:-0}" -gt 0 ] && [ "${dep_rows:-0}" -gt 0 ] && [ "${link_rows:-0}" -gt 0 ]; then
        echo "    pass: the check can see both edge kinds, so a zero after the storm run is a finding rather than a tautology"
    else
        echo "    FAIL: the edge check could not see edges this session deliberately created — its storm-side"
        echo "          zero would be vacuous, so nothing below can be believed about edges."
        statement_check_failed=1
    fi

    reset_db
    reset_statement_stats
}

# --- The zero-statement check -------------------------------------------------------------------
# The design's headline hot-path requirement is statement-level: a deployment that never uses a mailbox
# should execute no additional statement anywhere. After a run with no mailbox traffic, no statement
# that *writes or locks* a mailbox should show a single call.
#
# Reads are deliberately exempt, and the rule says so rather than listing them — but the *count* of
# exempt reads is pinned (EXPECTED_EXEMPT_READS), because a blanket exemption would let a future
# unconditional mailbox gauge through in silence.
#
# Two exceptions are expected, and both are reported with their cost rather than hidden:
#
#   1. The retention purge's mailbox candidate scan, which DbMaintenanceService issues whether or not
#      the deployment has ever minted a mailbox. It carries FOR UPDATE SKIP LOCKED, so it is a lock
#      rather than a read and cannot ride the read exemption. The service polls on MaintenanceInterval
#      (1 minute) but GATES this scan on Retention.Interval, which defaults to **2 hours** — so at any
#      ordinary run length the exception is expected NOT to fire, and the check prints a note saying so
#      rather than a cost. A 3-minute run measured 0 calls, which is the correct answer, not a miss.
#   2. The enqueue path's bulk COPY engine.workflows, which names every column of the table and so now
#      names mailbox_id. It is the one hot-path statement the feature genuinely changed: not an extra
#      statement, but one column wider on every ordinary enqueue. Printed with its call count and mean
#      so the cost is visible instead of argued about.
#
# The deadline sweep's own candidate scan is a plain SELECT and lands in the exempt-read list, where it
# is printed with its cost — it is the "one indexed scan per cadence" the plan prices, and the point is
# to show the number rather than to wave the statement through.
assert_no_mailbox_writes() {
    local purge_filter gauge_filter copy_filter mutation known copied reads read_count read_list sweep gauge fetch unexpected

    # pg_stat_statements normalizes literals to $N, so these filters are written against column names
    # and clause structure rather than against the SQL's own 'open'/'disposed' strings. A filter written
    # the other way matches nothing and reports the statement as unexpected — or, worse, as absent.
    purge_filter="regexp_replace(query, '\s+', ' ', 'g') LIKE 'SELECT m.id FROM engine.mailboxes m WHERE m.status = % AND m.disposed_at < %'"
    gauge_filter="regexp_replace(query, '\s+', ' ', 'g') LIKE 'SELECT count(*) FROM ( SELECT % FROM engine.mailboxes m WHERE m.status = % AND m.deadline <= %'"
    copy_filter="query ~* '^\s*COPY engine\.'"
    mutation="(query !~* '^\s*(SELECT|WITH)' OR query ~* 'FOR UPDATE')"

    known=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean: '
               || left(regexp_replace(query, '\s+', ' ', 'g'), 100)
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $purge_filter;" 2>/dev/null)

    copied=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean: '
               || left(regexp_replace(query, '\s+', ' ', 'g'), 60) || '…'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $copy_filter AND $MAILBOX_IDENTIFIERS AND $NOT_INSPECT;" 2>/dev/null)

    unexpected=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls: ' || left(regexp_replace(query, '\s+', ' ', 'g'), 140)
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $MAILBOX_IDENTIFIERS AND $NOT_INSPECT AND $mutation
          AND NOT ($purge_filter) AND NOT ($copy_filter)
        ORDER BY calls DESC;" 2>/dev/null)

    reads=$(psql_engine -tAc "SELECT $INSPECT count(*)::text || ' read statement(s), ' || sum(calls)::text || ' calls total'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $MAILBOX_IDENTIFIERS AND $NOT_INSPECT AND NOT $mutation;" 2>/dev/null)

    read_count=$(psql_engine -tAc "SELECT $INSPECT count(*)::int
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $MAILBOX_IDENTIFIERS AND $NOT_INSPECT AND NOT $mutation;" 2>/dev/null)

    read_list=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean: '
               || left(regexp_replace(query, '\s+', ' ', 'g'), 110)
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $MAILBOX_IDENTIFIERS AND $NOT_INSPECT AND NOT $mutation
        ORDER BY calls DESC;" 2>/dev/null)

    sweep=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE
          AND regexp_replace(query, '\s+', ' ', 'g') LIKE 'SELECT m.id FROM engine.mailboxes m WHERE m.status = % AND m.deadline <= % ORDER BY m.deadline%';" 2>/dev/null)

    gauge=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $gauge_filter;" 2>/dev/null)

    # The fetch gate's own profile, printed here as well as after the storm run — because the
    # interesting question is not whether this statement mentions a mailbox column (it does not, either
    # way) but whether it gets *dearer* when mailboxes exist. Statement-name accounting cannot see a
    # shared statement getting slower, and in the v2 design one demonstrably did: its chain was made of
    # dependency edges, and the readiness CTE's per-candidate anti-join paid for them. This design
    # creates no edges, so the prediction here is that the two numbers agree — which is a prediction
    # that can fail, and is therefore worth printing on both sides.
    fetch=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE
          AND query ~* 'FOR UPDATE SKIP LOCKED'
          AND query ~* 'UPDATE engine.workflows'
        ORDER BY calls DESC LIMIT 1;" 2>/dev/null)

    echo
    echo "--- zero-statement check (run with no mailbox traffic)"
    if [ -n "$known" ]; then
        echo "    known exception — the retention purge's mailbox candidate scan (FOR UPDATE SKIP LOCKED, so a lock, not a read),"
        echo "    issued unconditionally by DbMaintenanceService on Retention.Interval:"
        echo "$known" | sed 's/^/      /'
    else
        echo "    note: the retention purge's mailbox scan did not run in this window — it fires on Retention.Interval"
        echo "    (2h by default) and once at startup, so a session of ordinary length will not normally see it"
    fi
    echo "    deadline sweep's candidate scan (the plan's 'one indexed scan per cadence', 5m cadence): ${sweep:-not observed in this run}"
    echo "    overdue-mailboxes gauge, on MetricsCollectionInterval (5s) — the THIRD unconditional mailbox"
    echo "    statement, by far the most frequent of them, and the one the pinned exempt-read count keeps"
    echo "    visible: ${gauge:-not observed in this run}"
    if [ -n "$copied" ]; then
        echo "    known exception — the enqueue COPY, whose column list the feature widened by one (a wider row, not an extra statement):"
        echo "$copied" | sed 's/^/      /'
    fi
    echo "    reads mentioning a mailbox (exempt — the sweep's scan, this suite's own monitor): ${reads:-none}"
    echo "    fetch-and-lock on this mailbox-free run: ${fetch:-not observed}  <- compare with the storm run's figure below"

    if [ -z "$unexpected" ]; then
        echo "    pass: no statement wrote or locked a mailbox"
    else
        echo "    FAIL: mailbox mutations ran in a run with no mailbox traffic:"
        echo "$unexpected" | sed 's/^/      /'
        statement_check_failed=1
    fi

    if [ -n "$read_count" ] && [ "$read_count" -gt "$EXPECTED_EXEMPT_READS" ]; then
        echo "    FAIL: $read_count exempt read statement(s) mention a mailbox, expected at most $EXPECTED_EXEMPT_READS."
        echo "          A new unconditional read is exactly what the blanket 'reads are exempt' rule would hide:"
        echo "$read_list" | sed 's/^/      /'
        statement_check_failed=1
    fi
}

# --- The storm-side checks ----------------------------------------------------------------------
# Three claims only a storm run can settle, in the order they appear in the plan.
assert_storm_side_claims() {
    local fetch contaminated dep_calls link_calls dep_rows link_rows per_message total_ms receivers deliveries

    fetch=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls, ' || round(mean_exec_time::numeric, 3) || ' ms mean'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE
          AND query ~* 'FOR UPDATE SKIP LOCKED'
          AND query ~* 'UPDATE engine.workflows'
        ORDER BY calls DESC LIMIT 1;" 2>/dev/null)

    contaminated=$(psql_engine -tAc "SELECT $INSPECT calls || ' calls: ' || left(regexp_replace(query, '\s+', ' ', 'g'), 140)
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND query ~* 'FOR UPDATE SKIP LOCKED' AND $MAILBOX_IDENTIFIERS AND $NOT_INSPECT
        ORDER BY calls DESC;" 2>/dev/null)

    echo
    echo "--- fetch-gate check (after a storm run)"
    echo "    fetch-and-lock: ${fetch:-not observed}"
    if [ -z "$contaminated" ]; then
        echo "    pass: no SKIP LOCKED fetch statement mentions a mailbox"
    else
        echo "    FAIL: the fetch path now reads mailbox state:"
        echo "$contaminated" | sed 's/^/      /'
        statement_check_failed=1
    fi

    # The design's headline per-message claim, in its directly falsifiable form: a processed message
    # costs one workflow with **no dependency edge and no link edges** — the two largest measured
    # per-link statement costs in v2. Both the statements and the rows are checked, because either one
    # alone could be explained away.
    dep_calls=$(psql_engine -tAc "SELECT COALESCE(sum(calls), 0) FROM pg_stat_statements WHERE $DB_SCOPE AND query ~* 'COPY engine\.workflow_dependency';" 2>/dev/null)
    link_calls=$(psql_engine -tAc "SELECT COALESCE(sum(calls), 0) FROM pg_stat_statements WHERE $DB_SCOPE AND query ~* 'COPY engine\.workflow_link';" 2>/dev/null)
    dep_rows=$(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.workflow_dependency;" 2>/dev/null)
    link_rows=$(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.workflow_link;" 2>/dev/null)

    echo
    echo "--- edge check (after a storm run) — 'no dependency edge and no link edges'"
    echo "    COPY engine.workflow_dependency: ${dep_calls:-?} calls, ${dep_rows:-?} rows in the table"
    echo "    COPY engine.workflow_link:       ${link_calls:-?} calls, ${link_rows:-?} rows in the table"
    if [ "${dep_calls:-1}" = "0" ] && [ "${link_calls:-1}" = "0" ] && [ "${dep_rows:-1}" = "0" ] && [ "${link_rows:-1}" = "0" ]; then
        echo "    pass: a storm of receive workflows created neither edge kind — neither statement was issued and neither table holds a row"
    else
        echo "    FAIL: the mailbox path created edges the design says it does not create."
        statement_check_failed=1
    fi

    # Per-message statement accounting. This is the analogue of v2's "~0.4 ms of server-side statement
    # time per reply", and it carries the same limit, stated rather than implied: it can only see
    # statements the feature *names*, so it bounds the feature's own statements and says nothing about a
    # shared statement getting dearer. The fetch-gate comparison above is what covers that half.
    #
    # The two lists are split because `mailbox_id` on engine.workflows makes the ordinary status and
    # enqueue reads *mention* a mailbox without being new statements. Summing them into a per-message
    # cost would bill the feature for reads that ran before it existed and run at the same rate whether
    # or not a mailbox is in play — so only statements naming a mailbox *table* are counted, and the
    # projection-only ones are listed separately with what they actually are.
    receivers=$(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.mailbox_receivers;" 2>/dev/null)
    deliveries=$(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.mailbox_deliveries;" 2>/dev/null)

    echo
    echo "--- per-message statement accounting (after a storm run)"
    echo "    receivers registered: ${receivers:-?}, deliveries stored: ${deliveries:-?}"
    echo "    statements naming a mailbox TABLE — these exist only because the feature does:"
    psql_engine -tAc "SELECT $INSPECT rpad(left(regexp_replace(query, '\s+', ' ', 'g'), 74), 76)
               || lpad(calls::text, 8) || ' calls  '
               || lpad(round(mean_exec_time::numeric, 3)::text, 8) || ' ms mean  '
               || lpad(round((calls * mean_exec_time)::numeric, 1)::text, 10) || ' ms total'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $NOT_INSPECT
          AND query ~* 'engine\.mailbox' AND query !~* '^\s*COPY engine\.'
        ORDER BY calls * mean_exec_time DESC
        LIMIT 20;" 2>/dev/null | sed 's/^/      /'

    per_message=$(psql_engine -tAc "SELECT $INSPECT round(COALESCE(sum(calls * mean_exec_time), 0)::numeric
                     / GREATEST((SELECT count(*) FROM engine.mailbox_deliveries), 1), 3)
        FROM pg_stat_statements
        WHERE $DB_SCOPE AND $NOT_INSPECT AND query ~* 'engine\.mailbox' AND query !~* '^\s*COPY engine\.';" 2>/dev/null)
    total_ms=$(psql_engine -tAc "SELECT $INSPECT round(COALESCE(sum(calls * mean_exec_time), 0)::numeric, 1)
        FROM pg_stat_statements
        WHERE $DB_SCOPE AND $NOT_INSPECT AND query ~* 'engine\.mailbox' AND query !~* '^\s*COPY engine\.';" 2>/dev/null)
    echo "    total mailbox-table statement time this run: ${total_ms:-?} ms"
    echo "    server-side statement time per stored message: ${per_message:-?} ms (lower bound — counts only statements the feature names)"

    echo "    statements that merely PROJECT mailbox_id — ordinary reads the feature widened, not new work:"
    psql_engine -tAc "SELECT $INSPECT rpad(left(regexp_replace(query, '\s+', ' ', 'g'), 74), 76)
               || lpad(calls::text, 8) || ' calls  '
               || lpad(round(mean_exec_time::numeric, 3)::text, 8) || ' ms mean'
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE AND $NOT_INSPECT
          AND query ~* 'mailbox_id' AND query !~* 'engine\.mailbox'
        ORDER BY calls * mean_exec_time DESC
        LIMIT 10;" 2>/dev/null | sed 's/^/      /'

    # The sweep's per-cadence scan, priced rather than asserted. EXPLAIN runs the statement the sweep
    # issues, against the table the storm just filled, so the buffer count is the one the sweep would
    # actually pay at this table size.
    echo
    echo "--- deadline sweep scan (after a storm run) — the plan's 'one indexed scan per cadence'"
    echo "    mailboxes in the table: $(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.mailboxes;" 2>/dev/null) ($(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.mailboxes WHERE status='open';" 2>/dev/null) open)"
    psql_engine -tAc "
        EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF)
        SELECT $INSPECT m.id FROM engine.mailboxes m
        WHERE m.status = 'open' AND m.deadline <= now()
        ORDER BY m.deadline LIMIT 100;" 2>/dev/null | sed 's/^/      /'
    psql_engine -tAc "
        EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF)
        SELECT $INSPECT m.id FROM engine.mailboxes m
        WHERE m.status = 'disposed' AND m.disposed_at < now() - interval '30 days'
        ORDER BY m.disposed_at LIMIT 100 FOR UPDATE SKIP LOCKED;" 2>/dev/null | sed 's/^/      /'
}

# --- The per-cadence scans, priced at a realistic table size ---------------------------------------
# The storm arms leave ~5 000 mailboxes behind. Both per-cadence scans are ORDER BY … LIMIT, and an
# index only earns its place on those by stopping early — step 5a put the crossover near 5 000–10 000
# rows — so a scan measured against what the storm left is measured below the point where the question
# becomes interesting. This seeds a realistic retained population and prices the scans against it, with
# the counterfactual taken by disabling index scans for the statement rather than by dropping an index:
# dropping one is destructive, needs DDL rights, and changes the table for everything that follows.
#
# It runs AFTER every arm, so it cannot perturb a measured run, and truncates when it is done.
measure_sweep_scans_at_scale() {
    [ "$SWEEP_SCALE" != "0" ] || return 0

    echo
    echo "=========== per-cadence scans at $SWEEP_SCALE mailboxes ==========="
    echo "the plan prices the sweep at 'one indexed scan per cadence'; this is what that costs, and what"
    echo "it would cost without the two partial indexes step 5a added."

    reset_db
    psql_engine_stdin <<SQL >/dev/null 2>&1
INSERT INTO engine.mailboxes
    (id, namespace, idempotency_key, collection_key, timeout, deadline, next_idx, next_seq,
     status, disposed_reason, created_at, disposed_at)
SELECT gen_random_uuid(), 'seed', 'closed-' || g, 'seed-col-' || (g % 1000),
       interval '1 hour', now() - interval '2 hours', 2, 2,
       'disposed', 'request', now() - interval '3 hours', now() - interval '2 hours'
FROM generate_series(1, $SWEEP_SCALE) g;
INSERT INTO engine.mailboxes
    (id, namespace, idempotency_key, collection_key, timeout, deadline, next_idx, next_seq,
     status, disposed_reason, created_at, disposed_at)
SELECT gen_random_uuid(), 'seed', 'open-' || g, 'seed-col-' || (g % 1000),
       interval '1 hour', now() + interval '1 hour', 0, 0, 'open', NULL, now(), NULL
FROM generate_series(1, 2000) g;
INSERT INTO engine.mailboxes
    (id, namespace, idempotency_key, collection_key, timeout, deadline, next_idx, next_seq,
     status, disposed_reason, created_at, disposed_at)
SELECT gen_random_uuid(), 'seed', 'overdue-' || g, 'seed-col-overdue',
       interval '1 hour', now() - interval '10 minutes', 0, 0, 'open', NULL,
       now() - interval '70 minutes', NULL
FROM generate_series(1, 5) g;
ANALYZE engine.mailboxes;
SQL

    echo "    seeded: $(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.mailboxes;" 2>/dev/null) mailboxes, $(psql_engine -tAc "SELECT $INSPECT count(*) FROM engine.mailboxes WHERE status = 'open';" 2>/dev/null) open, 5 of them overdue"

    explain_both() {
        local label=$1 query=$2
        echo
        echo "    --- $label, with its index"
        psql_engine -tAc "EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) $query" 2>/dev/null | sed 's/^/        /'
        echo "    --- the same, index scans disabled (the counterfactual)"
        psql_engine -tAc "BEGIN; SET LOCAL enable_indexscan = off; SET LOCAL enable_indexonlyscan = off; SET LOCAL enable_bitmapscan = off; EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) $query; ROLLBACK;" 2>/dev/null | sed 's/^/        /'
    }

    # The sweep's own two cases are reported apart, because they are different questions: an empty tick
    # is what the sweep does on essentially every cadence, and a tick with candidates is what it costs
    # when it has work. Quoting the empty one as "the sweep's cost" would be quoting the cheap case.
    explain_both "deadline sweep candidates — 5 overdue (a tick WITH work)" \
        "SELECT $INSPECT m.id FROM engine.mailboxes m WHERE m.status = 'open' AND m.deadline <= now() ORDER BY m.deadline LIMIT 100"

    echo
    echo "    --- deadline sweep candidates — an EMPTY tick, which is what almost every cadence is"
    psql_engine -tAc "BEGIN; UPDATE engine.mailboxes SET deadline = now() + interval '1 hour' WHERE status = 'open' AND deadline <= now(); EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT $INSPECT m.id FROM engine.mailboxes m WHERE m.status = 'open' AND m.deadline <= now() ORDER BY m.deadline LIMIT 100; ROLLBACK;" 2>/dev/null | sed 's/^/        /'

    # Retention, both ways round for the same reason.
    explain_both "retention candidates — nothing past the cutoff (an EMPTY tick)" \
        "SELECT $INSPECT m.id FROM engine.mailboxes m WHERE m.status = 'disposed' AND m.disposed_at < now() - interval '30 days' ORDER BY m.disposed_at LIMIT 100 FOR UPDATE SKIP LOCKED"
    explain_both "retention candidates — a full batch past the cutoff (a tick WITH work)" \
        "SELECT $INSPECT m.id FROM engine.mailboxes m WHERE m.status = 'disposed' AND m.disposed_at < now() - interval '1 hour' ORDER BY m.disposed_at LIMIT 100 FOR UPDATE SKIP LOCKED"

    explain_both "the overdue gauge, on MetricsCollectionInterval (5s)" \
        "SELECT $INSPECT count(*) FROM (SELECT 1 FROM engine.mailboxes m WHERE m.status = 'open' AND m.deadline <= now() - interval '5 minutes' LIMIT 10000) capped"

    reset_db
}

# --- The fetch gate, sampled every run rather than once ------------------------------------------
# The fetch gate is the statement that feeds every worker, and it mentions no mailbox column in any arm
# — so the only way it can get dearer is as a *shared* statement, which statement-name accounting cannot
# see. In v2 one demonstrably did (+58% under storm, from its chain's dependency edges), and that was
# recorded from a single matched pair of runs.
#
# A single pair is not enough here, and the reason is measured rather than assumed: two mailbox-free
# runs of this suite came out at 0.063 ms and 0.150 ms — a 2.4x swing with no mailbox anywhere in the
# picture. So the statement's mean is sampled after **every** run of every arm, and reported with the
# within-arm spread, which is what makes "the storm arm's fetch gate is / is not dearer" a claim with a
# noise floor under it instead of a difference of two numbers.
FETCH_CSV="$RESULTS_DIR/fetch-gate.csv"

sample_fetch_gate() {
    local arm=$1 row
    row=$(psql_engine -tAc "SELECT $INSPECT calls || ',' || round(mean_exec_time::numeric, 4)
        FROM pg_stat_statements
        WHERE calls > 0 AND $DB_SCOPE
          AND query ~* 'FOR UPDATE SKIP LOCKED' AND query ~* 'UPDATE engine.workflows'
        ORDER BY calls DESC LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
    [ -n "$row" ] && echo "$arm,$row" >> "$FETCH_CSV"
}

report_fetch_gate() {
    [ -s "$FETCH_CSV" ] || return 0
    echo
    echo "=========== fetch gate (shared statement) across the whole session ==========="
    echo "the statement that feeds every worker, sampled once per run. It mentions no mailbox column in"
    echo "any arm; what this asks is whether it gets DEARER when mailboxes exist — the half of the cost"
    echo "that statement-name accounting is blind to."
    awk -F, '
        { n[$1]++; sum[$1] += $3; calls[$1] += $2
          if (!($1 in lo) || $3 < lo[$1]) lo[$1] = $3
          if (!($1 in hi) || $3 > hi[$1]) hi[$1] = $3 }
        END {
            printf "  %-16s %5s  %14s  %14s  %12s\n", "arm", "n", "mean of means", "spread (max-min)", "calls/run"
            for (a in n)
                printf "  %-16s %5d  %11.4f ms  %11.4f ms  %12d\n", a, n[a], sum[a]/n[a], hi[a]-lo[a], calls[a]/n[a]
        }' "$FETCH_CSV" | sort
    echo "  Read the spread before the difference: a difference smaller than the arms' own spreads is not"
    echo "  a measurement. Raw samples are in $FETCH_CSV."
}

# The control arm has to add the same number of workflow executions the storm's receivers are, or the
# gating comparison is measuring provisioning rather than the feature. Every storm summary reports what
# its own configuration implied, so once one exists the rate comes from measurement instead of from a
# constant somebody has to remember to update. The comparator checks the result either way.
derive_control_rate() {
    local derived
    derived=$(node -e '
        const fs = require("fs");
        const files = fs.readdirSync(process.argv[1])
            .filter((f) => f.startsWith("storm-") && f.endsWith(".json"));
        const rates = files
            .map((f) => JSON.parse(fs.readFileSync(`${process.argv[1]}/${f}`, "utf8")).config?.impliedControlRate)
            .filter((r) => typeof r === "number" && r > 0);
        if (rates.length > 0) console.log(Math.round(rates.reduce((a, b) => a + b, 0) / rates.length));
    ' "$RESULTS_DIR" 2>/dev/null)

    if [ -n "$derived" ] && [ "$derived" != "$CONTROL_RATE" ]; then
        echo "--- control rate: $CONTROL_RATE/s -> $derived/s (measured from the storm arm)"
        CONTROL_RATE=$derived
    fi
}

run_mode() {
    local mode=$1
    local tag=$2
    local duration=$3
    shift 3
    echo "--- k6 run: mode=$mode$tag duration=$duration"
    # k6 exits 99 when an in-run threshold breaks, which is exactly the run whose numbers are worth
    # comparing. The comparator is the judge; a non-zero exit here must not abort the session.
    k6 run .k6/mailbox-storm.js \
        -e "MODE=$mode" \
        -e "RUN_TAG=$tag" \
        -e "DURATION=$duration" \
        -e "RESULTS_DIR=$RESULTS_DIR" \
        -e "BASELINE_RATE=$BASELINE_RATE" \
        -e "EXCHANGE_RATE=$EXCHANGE_RATE" \
        -e "BUFFER_RATE=$BUFFER_RATE" \
        -e "EARLY_RATE=$EARLY_RATE" \
        -e "CONTROL_RATE=$CONTROL_RATE" \
        "$@" || true
}

assert_schema_is_this_trees
if [ "$statement_check_failed" = "1" ]; then
    echo
    echo "exit 1: the schema check failed — measuring here would produce numbers about the wrong table."
    exit 1
fi

assert_edge_check_can_see_edges
if [ "$statement_check_failed" = "1" ]; then
    echo
    echo "exit 1: the edge check's positive control failed — its storm-side zero could not be believed."
    exit 1
fi

: > "$FETCH_CSV"

# Clear the arm summaries a previous session left behind, and not for tidiness: `derive_control_rate`
# averages `impliedControlRate` over every storm-*.json in this directory, so a stale summary from a
# different feature's suite silently pushed this one's control rate from 55/s to 103/s — the control arm
# then did nearly twice the storm arm's work, and the only thing standing between that and a published
# number was the comparator's provisioning check. A session owns its own summaries; anything older is a
# different measurement.
rm -f "$RESULTS_DIR"/baseline-*.json "$RESULTS_DIR"/storm-*.json "$RESULTS_DIR"/control-*.json \
      "$RESULTS_DIR"/low.json

arms=(baseline storm)
[ "$SKIP_CONTROL" != "1" ] && arms+=(control)
# The second control arm rides the same rotation rather than running as a block at the end: it is a
# fourth position in the session's drift, not an afterthought appended to it.
[ "$SKIP_CONTROL" != "1" ] && [ "$CONTROL_INPROC" = "1" ] && arms+=(control_inproc)
[ "$SKIP_CONTROL" != "1" ] && [ "$CONTROL_REQ_RATE" != "0" ] && arms+=(control_req)

# Discarded warm-up: a fresh stack pays for cold JIT, an empty query-plan cache and an unwarmed
# buffer pool, and that cost would otherwise land entirely on whichever arm runs first.
if [ "$WARMUP_DURATION" != "0" ]; then
    reset_db
    run_mode baseline -warmup "$WARMUP_DURATION" "$@" >/dev/null 2>&1
    rm -f "$RESULTS_DIR/baseline-warmup.json"
fi

for repeat in $(seq 1 "$REPEATS"); do
    # Rotate the arm order every repeat so no arm keeps the same position in the session's drift.
    count=${#arms[@]}
    for offset in $(seq 0 $((count - 1))); do
        arm=${arms[$(((offset + repeat - 1) % count))]}

        reset_db
        case "$arm" in
            control | control_inproc) derive_control_rate ;;
        esac
        # Reset before every run, not only the two that carry a statement check: the fetch-gate sample
        # below is per-run, and a statistic accumulated across several runs is not one.
        reset_statement_stats

        # Both control arms run MODE=control and differ only in CONTROL_SHAPE; the run tag is what
        # keeps their summaries apart (control-N.json against control-inproc-N.json).
        if [ "$arm" = "control_inproc" ]; then
            run_mode control "-inproc-$repeat" "$DURATION" -e CONTROL_SHAPE=inproc "$@"
            sample_fetch_gate control_inproc
            continue
        fi

        # The request-matched arm runs MODE=control like the others and differs only in its rate, which
        # is deliberately NOT the derived one — matching requests means not matching workflows, and the
        # comparator's provisioning row will say so.
        if [ "$arm" = "control_req" ]; then
            # Swap the rate around the call rather than passing a second -e CONTROL_RATE: k6's handling
            # of a repeated -e key is not something this suite should depend on.
            saved_control_rate=$CONTROL_RATE
            CONTROL_RATE=$CONTROL_REQ_RATE
            run_mode control "-req-$repeat" "$DURATION" -e "CONTROL_SHAPE=$CONTROL_SHAPE" "$@"
            CONTROL_RATE=$saved_control_rate
            sample_fetch_gate control_req
            continue
        fi

        run_mode "$arm" "-$repeat" "$DURATION" -e "CONTROL_SHAPE=$CONTROL_SHAPE" "$@"
        sample_fetch_gate "$arm"

        # One mailbox-free run settles the zero-statement claim and one storm run settles the rest; the
        # first of each is it. Both read the statement stats reset immediately before that run, so each
        # check sees exactly one run's traffic.
        if [ "$repeat" = "1" ] && [ "$arm" = "baseline" ]; then
            assert_no_mailbox_writes
        fi
        if [ "$repeat" = "1" ] && [ "$arm" = "storm" ]; then
            assert_storm_side_claims
        fi
    done
done

join_runs() {
    local arm=$1
    local list=""
    for repeat in $(seq 1 "$REPEATS"); do
        list="$list${list:+,}$RESULTS_DIR/$arm-$repeat.json"
    done
    echo "$list"
}

echo
echo "============== added load (baseline vs storm) =============="
echo "what the mailbox traffic costs the ordinary path, work and all."
echo "Latency here is ungated: the storm arm is doing strictly more work, so a difference is"
echo "expected and says nothing about the feature. Processing and fidelity are still gated."
node .k6/lib/compare-summaries.mjs --ungate-latency "$(join_runs baseline)" "$(join_runs storm)"
signal_exit=$?

if [ "$SKIP_CONTROL" != "1" ]; then
    echo
    echo "===== added load, for comparison (baseline vs equivalent ordinary work) ====="
    echo "the same number of extra workflows, as ordinary workflows ($CONTROL_SHAPE-shaped)"
    node .k6/lib/compare-summaries.mjs --ungate-latency "$(join_runs baseline)" "$(join_runs control)" || true

    if [ "$CONTROL_INPROC" = "1" ]; then
        # Information only, and its exit code is deliberately discarded: the in-process control exists to
        # bound how much the *shape* of the extra work can move the enqueue path at all. If it and the
        # webhook-shaped control land close together, the shape's contribution to any storm difference is
        # bounded by that gap — which is the bracketing argument, made from measurement rather than from
        # assertion.
        echo
        echo "===== secondary (NOT the gate) — how much the control's work SHAPE moves the number ====="
        echo "same workflow count, an in-process step instead of a webhook: the bracket on shape"
        node .k6/lib/compare-summaries.mjs "$(join_runs control)" "$(join_runs control-inproc)" || true
    fi

    # The gate, when a control arm exists: the two arms do the same amount of engine work, so what
    # separates them is what mailboxes cost *as a mechanism*. Baseline-vs-storm cannot be the gate on
    # its own — the storm genuinely adds work, so a difference there is expected and says nothing about
    # the feature.
    echo
    echo "=========== GATE — mailbox work vs equivalent ordinary work ($CONTROL_SHAPE-shaped control) ==========="
    echo "same engine work on both sides; a difference here is the feature's own cost"
    node .k6/lib/compare-summaries.mjs "$(join_runs control)" "$(join_runs storm)"
    signal_exit=$?
fi

if [ "$SKIP_CONTROL" != "1" ] && [ "$CONTROL_REQ_RATE" != "0" ]; then
    # Information only, and its provisioning row is expected to fail: this arm matches the storm's
    # REQUEST rate rather than its workflow count, so it creates several times the storm's workflows and
    # does strictly more processing. Its Δ is therefore a lower bound on what the mailbox mechanism
    # costs, where the gate above is an upper bound.
    echo
    echo "===== bracket (NOT the gate) — mailbox work vs REQUEST-matched ordinary work ====="
    echo "same requests/s on both sides, but ~3.5x the workflows on the control side: a LOWER bound"
    node .k6/lib/compare-summaries.mjs "$(join_runs control-req)" "$(join_runs storm)" || true
fi

measure_sweep_scans_at_scale

report_fetch_gate

# Per-hop latency at batch size 1, with a single ordinary enqueue beside it as the yardstick. This is
# the accounting the gate cannot give: the gate reports what the whole mechanism costs the ordinary
# path, and this reports what each of the app's own calls costs the app.
if [ "$SKIP_LOW" != "1" ]; then
    echo
    echo "===================== per-hop latency at idle ====================="
    reset_db
    run_mode low "" "$DURATION" "$@" >/dev/null 2>&1
    node -e '
        const summary = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
        const l = summary.lowLoad;
        const f = (v) => (v == null ? "—" : Number(v).toFixed(2));
        const ratio = (v) => (v && l.enqueueMed ? `${f(v / l.enqueueMed)}×` : "—");
        const row = (label, med, p95, n, extra) =>
            console.log(`  ${label.padEnd(30)} med=${f(med).padStart(6)}ms  p95=${f(p95).padStart(6)}ms  n=${String(n).padStart(4)}  ${extra}`);
        console.log("  Every hop below is the first request after the same idle gap, so the write buffer is in");
        console.log("  the same state for all of them — including the yardstick, which is one of the phases.");
        console.log("");
        row("ordinary enqueue (yardstick)", l.enqueueMed, l.enqueueP95, l.enqueueSamples, "1.00× (this is the yardstick)");
        row("mailbox mint (POST)", l.mintMed, l.mintP95, l.mintSamples, ratio(l.mintMed));
        row("receiver enqueue (parks)", l.parkMed, l.parkP95, l.parkSamples, ratio(l.parkMed));
        row("receiver enqueue (runnable)", l.runnableMed, l.runnableP95, l.runnableSamples, ratio(l.runnableMed));
        row("delivery that wakes", l.wakeMed, l.wakeP95, l.wakeSamples, ratio(l.wakeMed));
        row("delivery that buffers", l.bufferMed, l.bufferP95, l.bufferSamples, ratio(l.bufferMed));
        row("mailbox close (DELETE)", l.closeMed, l.closeP95, l.closeSamples, ratio(l.closeMed));
        console.log("");
        console.log(`  one PROCESSED message, at the median: ${f(l.parkMed + l.wakeMed)}ms of engine calls (receiver enqueue + delivery),`);
        console.log(`  plus ${f(l.mintMed)}ms mint and ${f(l.closeMed)}ms close once per exchange, against ${f(l.enqueueMed)}ms for one ordinary enqueue.`);
        console.log(`  one BUFFERED message: ${f(l.bufferMed)}ms and no workflow at all.`);
    ' "$RESULTS_DIR/low.json" || true
fi

if [ "$statement_check_failed" = "1" ] && [ "$signal_exit" = "0" ]; then
    echo
    echo "exit 1: the load comparison passed, but a statement-level check above failed — see its FAIL lines."
    signal_exit=1
fi

exit $signal_exit
