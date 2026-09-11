/**
 * perpetual-mix.js — a load generator that never stops, whose job is to make every panel on the
 * Grafana dashboard show something true.
 *
 * This is not a benchmark. `stress-test.js` and `mailbox-storm.js` measure; this one *populates*.
 * It runs until Ctrl+C and produces a deliberately varied mix, so an engineer opening
 * http://localhost:7070 sees real curves rather than an hour of flat zeroes:
 *
 *   healthy      — webhooks that complete first time (the baseline the rest is read against)
 *   scheduled    — webhooks enqueued with a future `startAt`, so a population sits in `Scheduled`
 *                  until its start time comes round
 *   flaky        — webhooks against a downstream that fails two requests in three, so steps requeue
 *                  and then recover on their own
 *   doomed       — webhooks that fail permanently: half on a non-retryable 422, half by exhausting
 *                  a short retry budget against a downstream that is always down
 *   reaper       — abandons a share of those failures, the way an operator writes off work
 *   deferring    — durable yield: steps that park in `Waiting` and resume, plus a slice that keeps
 *                  deferring until their wait budget expires
 *   nudger       — clears the backoff on parked workflows, the engine's push channel
 *   dependencies — a failed workflow with a dependent, resumed so the dependent is recovered
 *   mailboxes    — full request–reply exchanges: mints, receivers born before and after their
 *                  message, duplicate deliveries, refusals, closes, and some mailboxes deliberately
 *                  left to hit their deadline
 *   storm        — one namespace per storm arm, each with its own switchable WireMock downstream:
 *                  break it and the breaker trips and extends, repair it and the breaker releases
 *                  cohorts and clears. The arms are phase-offset so `by (namespace)` shows two
 *                  breakers in different phases at once
 *
 * Four namespaces, on purpose: `playground` for work that should succeed, `playground-retries` for
 * work that fails, and one per storm arm. Keeping them apart is what stops a pile of retrying
 * workflows throttling the arms that feed the mailbox and durable-yield panels.
 *
 * Every arm is independently tunable, and setting a rate to 0 removes its scenario entirely.
 *
 * Requires the playground stack, because the throttle arm needs the namespace circuit breaker
 * switched on and it ships dark:
 *
 *   make playground          # from src/Runtime/workflow-engine
 *   k6 run .k6/perpetual-mix.js
 *
 * KNOWN LEAK: the `deferring` arm drives the TestApp's `test-defer` command, whose invocation
 * counter is a process-lifetime static dictionary keyed per workflow. At the default 2/s that is
 * roughly 17 MB of engine memory per day. Restarting the engine clears it; `DEFER_RATE=0` avoids it.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { buildRequestParams, pollHealthOnce, trackStatus } from './lib/helpers.js';

// --- Configuration -------------------------------------------------------------------------

const ENGINE_URL = __ENV.ENGINE_URL || 'http://localhost:9090';

/** Reachable from *inside* the engine container, which is what dials it. */
const WIREMOCK = __ENV.WIREMOCK_URL || 'http://wiremock:8080';
/** Reachable from wherever k6 runs, which is where the storm arm drives the admin API from. */
const WIREMOCK_ADMIN = __ENV.WIREMOCK_ADMIN_URL || 'http://localhost:6060';
const OK_URL = `${WIREMOCK}/webhook-callback`;
const FLAKY_URL = `${WIREMOCK}/flaky`;
const DOWN_URL = `${WIREMOCK}/error`;
const PERMANENT_URL = `${WIREMOCK}/permanent-error`;

/** WireMock's implicit initial scenario state, which the storm arm uses to mean "downstream broken". */
const STORM_DOWN_STATE = 'Started';
const STORM_UP_STATE = 'recovered';

function stormPath(namespace) {
    return `/storm/${namespace}`;
}

function stormScenario(namespace) {
    return `storm-${namespace}`;
}

function setStormState(namespace, state) {
    const res = http.put(
        `${WIREMOCK_ADMIN}/__admin/scenarios/${stormScenario(namespace)}/state`,
        JSON.stringify({ state }),
        { tags: { name: 'wiremock_scenario_state' } },
    );
    trackStatus(res.status);
    return res.status === 200;
}

/**
 * The namespace for work that is *supposed* to succeed. Deliberately not `default`, which the other
 * scripts share. Nothing here accumulates a `Requeued` population, so this namespace can never trip
 * its own circuit breaker — which is the point: on the throttle panels it is the namespace that
 * stays absent while the storm namespaces come and go, and that absence is the attribution story.
 */
const NS = __ENV.MAIN_NAMESPACE || 'playground';

/**
 * The namespace for work that fails on purpose. Kept apart from `NS` so a pile of retrying workflows
 * can never get the healthy arms throttled — throttling parks `Requeued` rows for a whole window,
 * and a mailbox or deferral arm parked behind an unrelated storm would quietly stop feeding its
 * panels.
 *
 * At the default rates its steady-state `Requeued` population is a couple of dozen, which is under
 * `MinRequeuedWorkflows` (50) with room to spare, so it does not normally trip a breaker of its own.
 * That margin is what the two retry budgets in this file are sized for — a failing workflow's dwell
 * in `Requeued` is rate × budget, so lengthening either budget raises the population directly. Push
 * `FLAKY_RATE` or `DOOMED_RATE` up far enough and this namespace will trip too, which is the breaker
 * working rather than the script misbehaving — but note the feedback loop when it does: throttling
 * parks `Requeued` rows for a whole window, which keeps the population high and the breaker tripped.
 */
const FAIL_NS = __ENV.FAILURE_NAMESPACE || 'playground-retries';

/** One breaker per entry. Their storm cycles are phase-offset so the panels show them separately. */
const STORM_NAMESPACES = (__ENV.STORM_NAMESPACES || 'storm-a,storm-b')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const HEALTHY_RATE = num('HEALTHY_RATE', 15);
const FLAKY_RATE = num('FLAKY_RATE', 3);
const DOOMED_RATE = num('DOOMED_RATE', 1);
const DEFER_RATE = num('DEFER_RATE', 2);
const MAILBOX_RATE = num('MAILBOX_RATE', 1);
const SCHEDULED_RATE = num('SCHEDULED_RATE', 1);

/**
 * How far ahead the `scheduled` arm sets `startAt`, in seconds. The gauge these feed is a *level*,
 * so what it settles at is arrival rate x mean horizon — at the defaults, 1/s over a mean 105 s,
 * which is a steady population of roughly a hundred. Raise either to move the tile; the horizon is
 * the cheaper of the two, because it costs no extra enqueues.
 *
 * The floor wants to stay comfortably above `MetricsCollectionInterval` (5 s): the count is sampled
 * on that tick, and anything scheduled inside one tick can be claimed before a sample ever sees it.
 */
const SCHEDULE_MIN_SECONDS = num('SCHEDULE_MIN_SECONDS', 30);
const SCHEDULE_MAX_SECONDS = num('SCHEDULE_MAX_SECONDS', 180);

const REAPER_PERIOD = num('REAPER_PERIOD', 10);
const NUDGE_PERIOD = num('NUDGE_PERIOD', 15);
const DEPENDENCY_PERIOD = num('DEPENDENCY_PERIOD', 45);
const HEALTH_PERIOD = num('HEALTH_PERIOD', 15);

/** Workflows per storm burst. Must clear ThrottlingSettings.MinRequeuedWorkflows with headroom. */
const STORM_BURST = num('STORM_BURST', 80);
/** Seconds from one storm burst to the next, in one namespace. */
const STORM_PERIOD = num('STORM_PERIOD', 300);
/**
 * How long the storm's downstream stays broken. Long enough for the breaker to trip and then extend
 * its window several times over, short enough that the recovery half of the arc is never far away.
 */
const STORM_DOWN_SECONDS = num('STORM_DOWN_SECONDS', 75);
/**
 * How long a storm workflow keeps retrying before the engine writes it off. Deliberately much longer
 * than `STORM_DOWN_SECONDS`: the parked population has to still be alive when recovery opens, or the
 * cohorts have nothing to release and the breaker jumps straight from Tripped to Clear with
 * `engine.throttle.released` never moving at all.
 */
const STORM_RETRY_BUDGET = __ENV.STORM_RETRY_BUDGET || '00:06:00';

/** Share of terminal failures the reaper writes off, rather than leaving them to be looked at. */
const ABANDON_FRACTION = num('ABANDON_FRACTION', 0.5);
/** Share of mailboxes left open on purpose, so the deadline sweep has something to close. */
const MAILBOX_ORPHAN_FRACTION = num('MAILBOX_ORPHAN_FRACTION', 0.3);
/** One deferring workflow in this many is given a budget it cannot possibly meet. */
const WAIT_EXPIRE_EVERY = num('WAIT_EXPIRE_EVERY', 8);

const MAILBOX_TIMEOUT = __ENV.MAILBOX_TIMEOUT || '00:00:45';
const MAX_VUS = num('MAX_VUS', 400);

const FOREVER = '87600h';

/** Just over MaxMailboxPayloadSize (256 KiB), to draw the `too_large` delivery refusal. */
const OVERSIZED_PAYLOAD = 'x'.repeat(257 * 1024);

function num(name, fallback) {
    const raw = __ENV[name];
    return raw === undefined || raw === '' ? fallback : Number(raw);
}

// --- Scenarios -----------------------------------------------------------------------------

function arrivalRate(rate, exec) {
    return {
        executor: 'constant-arrival-rate',
        rate: Math.max(1, Math.round(rate)),
        timeUnit: rate < 1 ? `${Math.round(1 / rate)}s` : '1s',
        duration: FOREVER,
        preAllocatedVUs: Math.max(2, Math.round(rate * 2)),
        maxVUs: MAX_VUS,
        exec,
    };
}

function loop(exec) {
    return { executor: 'constant-vus', vus: 1, duration: FOREVER, exec };
}

const scenarios = {};
if (HEALTHY_RATE > 0) scenarios.healthy = arrivalRate(HEALTHY_RATE, 'enqueueHealthy');
if (SCHEDULED_RATE > 0) scenarios.scheduled = arrivalRate(SCHEDULED_RATE, 'enqueueScheduled');
if (FLAKY_RATE > 0) scenarios.flaky = arrivalRate(FLAKY_RATE, 'enqueueFlaky');
if (DOOMED_RATE > 0) scenarios.doomed = arrivalRate(DOOMED_RATE, 'enqueueDoomed');
if (DEFER_RATE > 0) scenarios.deferring = arrivalRate(DEFER_RATE, 'enqueueDeferring');
if (MAILBOX_RATE > 0) scenarios.mailboxes = arrivalRate(MAILBOX_RATE, 'runMailboxExchange');
scenarios.reaper = loop('runReaper');
scenarios.nudger = loop('runNudger');
scenarios.dependencies = loop('runDependencyRecovery');
scenarios.monitor = loop('pollHealth');

// One scenario per storm namespace, started a fraction of the period apart so the breakers are
// never in the same phase — which is the whole point of plotting the throttle counters by namespace.
STORM_NAMESPACES.forEach((namespace, i) => {
    scenarios[`storm_${namespace.replace(/[^a-zA-Z0-9_]/g, '_')}`] = {
        executor: 'constant-vus',
        vus: 1,
        duration: FOREVER,
        exec: 'runStorm',
        startTime: `${Math.round((i * STORM_PERIOD) / STORM_NAMESPACES.length)}s`,
        env: { STORM_NAMESPACE: namespace },
    };
});

export const options = {
    scenarios,
    // Several arms provoke 4xx on purpose, so a global failure rate would be meaningless. The
    // healthy arm is the one request in the mix that has no reason ever to be refused, which makes
    // it the only honest liveness gate for a run that is meant to last for days.
    thresholds: {
        'http_req_failed{name:enqueue_healthy}': ['rate<0.05'],
    },
};

// --- Request helpers -----------------------------------------------------------------------

function workflowsUrl(namespace) {
    return `${ENGINE_URL}/api/v1/${namespace}/workflows`;
}

function mailboxesUrl(namespace) {
    return `${ENGINE_URL}/api/v1/${namespace}/mailboxes`;
}

function post(url, body, params, name) {
    const res = http.post(url, JSON.stringify(body), {
        ...params,
        tags: { ...(params?.tags ?? {}), name },
    });
    trackStatus(res.status);
    return res;
}

/** One single-step webhook workflow, as its own collection head. */
function webhookWorkflow(operationId, uri, { retryStrategy, labels, startAt } = {}) {
    return {
        labels,
        workflows: [
            {
                ref: 'wf-1',
                operationId,
                isHead: true,
                dependsOnHeads: false,
                startAt,
                steps: [
                    {
                        operationId: 'callback',
                        command: { type: 'webhook', data: { uri } },
                        retryStrategy,
                    },
                ],
            },
        ],
    };
}

/**
 * `backoffType` is the numeric enum (0 constant, 1 linear, 2 exponential) — the API registers no
 * string-enum converter, so a name would be rejected.
 */
function exponential(baseInterval, maxDelay, extra = {}) {
    return { backoffType: 2, baseInterval, maxDelay, ...extra };
}

function listWorkflows(namespace, query) {
    const res = http.get(`${workflowsUrl(namespace)}?${query}`, {
        tags: { name: 'list_workflows' },
    });
    if (res.status !== 200) return [];
    try {
        return JSON.parse(res.body).data ?? [];
    } catch {
        return [];
    }
}

/**
 * Enqueue answers `201 Created` for a fresh batch and `200 OK` for an idempotency-key replay, so a
 * bare `=== 200` reads a successful enqueue as a failure — and, where it gates a follow-up, skips it
 * silently.
 */
function accepted(res) {
    return res.status >= 200 && res.status < 300;
}

function pick(items) {
    return items.length === 0 ? null : items[Math.floor(Math.random() * items.length)];
}

// --- Arms ----------------------------------------------------------------------------------

/** Completes on the first attempt. The line every other arm is read against. */
export function enqueueHealthy() {
    const res = post(
        workflowsUrl(NS),
        webhookWorkflow('playground-healthy', OK_URL, { labels: { arm: 'healthy' } }),
        buildRequestParams(),
        'enqueue_healthy',
    );
    check(res, { 'healthy enqueued': accepted });
}

/**
 * Work booked for later. `startAt` parks a workflow in `Enqueued` with a start time in the future:
 * the fetch gate skips it until that time passes, and it then runs like any other webhook workflow.
 * It is the one engine feature nothing else in this mix touches, which is why the Scheduled tile and
 * the Scheduled series on Workflow Inventory read a flat zero without this arm.
 *
 * Both are levels, not rates — they count the rows *currently* waiting for their start time, not the
 * ones that have been scheduled — so the curve is a population that fills over the first horizon and
 * then holds. A line that keeps climbing past that means work is being booked faster than it comes
 * due, which in the playground means the horizon or the rate has been turned up, and in production
 * would mean the same thing.
 *
 * Deliberately pointed at the healthy downstream: what this arm is here to show is the wait, so it
 * has no business also producing failures.
 */
export function enqueueScheduled() {
    const horizon =
        SCHEDULE_MIN_SECONDS +
        Math.random() * Math.max(0, SCHEDULE_MAX_SECONDS - SCHEDULE_MIN_SECONDS);
    const startAt = new Date(Date.now() + horizon * 1000).toISOString();

    const res = post(
        workflowsUrl(NS),
        webhookWorkflow('playground-scheduled', OK_URL, { labels: { arm: 'scheduled' }, startAt }),
        buildRequestParams(),
        'enqueue_scheduled',
    );
    check(res, { 'scheduled enqueued': accepted });
}

/**
 * The downstream answers 500 to two requests in three and 200 to the third, cycling. Each attempt
 * draws independently, so a step requeues a geometric number of times and then recovers on its own —
 * which is what a genuinely flaky dependency looks like, and it needs no per-workflow state anywhere.
 */
export function enqueueFlaky() {
    const res = post(
        workflowsUrl(FAIL_NS),
        webhookWorkflow('playground-flaky', FLAKY_URL, {
            labels: { arm: 'flaky' },
            retryStrategy: exponential('00:00:01', '00:00:03', {
                maxRetries: 12,
                maxDuration: '00:02:00',
            }),
        }),
        buildRequestParams(),
        'enqueue_flaky',
    );
    check(res, { 'flaky enqueued': accepted });
}

/**
 * Two ways to lose a workflow for good, alternating: a 422 the engine refuses to retry at all, and a
 * 500 retried until a deliberately short budget runs out. They land on the same
 * `engine.workflows.execution.failed{reason="execution"}` series but reach it by different paths.
 */
export function enqueueDoomed() {
    const permanent = Math.random() < 0.5;
    const body = permanent
        ? webhookWorkflow('playground-permanent-failure', PERMANENT_URL, {
              labels: { arm: 'permanent' },
          })
        : webhookWorkflow('playground-exhausted-retries', DOWN_URL, {
              labels: { arm: 'exhausted' },
              retryStrategy: exponential('00:00:02', '00:00:06', { maxDuration: '00:00:15' }),
          });

    const res = post(workflowsUrl(FAIL_NS), body, buildRequestParams(), 'enqueue_doomed');
    check(res, { 'doomed enqueued': accepted });
}

/**
 * Durable yield. `test-defer` parks the step in `Waiting` until it has been invoked
 * `succeedOnAttempt` times, which is the stand-in for a real long-poll integration. One workflow in
 * `WAIT_EXPIRE_EVERY` is given a budget far below what it would need, so the wait budget expires and
 * the workflow fails with `reason="wait_expired"` — the tail this row exists to make visible.
 */
export function enqueueDeferring() {
    const expiring = Math.floor(Math.random() * WAIT_EXPIRE_EVERY) === 0;
    const key = `pg-defer-${uuidv4()}`;

    const body = {
        labels: { arm: expiring ? 'wait-expired' : 'deferring' },
        workflows: [
            {
                ref: 'wf-1',
                operationId: expiring ? 'playground-wait-expired' : 'playground-deferring',
                isHead: true,
                dependsOnHeads: false,
                steps: [
                    {
                        operationId: 'await-outcome',
                        command: {
                            type: 'test-defer',
                            waitBudget: expiring ? '00:00:20' : '00:03:00',
                            data: {
                                key,
                                succeedOnAttempt: expiring
                                    ? 9999
                                    : 2 + Math.floor(Math.random() * 4),
                                deferDelayMs: 1000 + Math.floor(Math.random() * 4000),
                            },
                        },
                    },
                ],
            },
        ],
    };

    const res = post(workflowsUrl(NS), body, buildRequestParams(), 'enqueue_deferring');
    check(res, { 'deferring enqueued': accepted });
}

/**
 * Writes off a share of the failures the doomed arm produces. Abandon is the caller saying "this one
 * is never going to work" — it stops the workflow condemning dependents evaluated afterwards and
 * releases its enqueue idempotency key.
 */
export function runReaper() {
    for (const namespace of [NS, FAIL_NS]) {
        for (const wf of listWorkflows(namespace, 'status=Failed&pageSize=25')) {
            // The dependency arm resumes its own upstream; writing it off first would strand the
            // dependent in DependencyFailed forever and cost the only source of dependency_recovered.
            if (wf.operationId?.startsWith('playground-dependency')) continue;
            if (Math.random() >= ABANDON_FRACTION) continue;
            const res = http.post(`${workflowsUrl(namespace)}/${wf.databaseId}/abandon`, null, {
                tags: { name: 'abandon' },
            });
            trackStatus(res.status);
        }
    }
    sleep(REAPER_PERIOD);
}

/**
 * Clears the pending backoff on parked workflows so they run on the next fetch cycle instead of when
 * their timer elapses. Both parked statuses are eligible: `Requeued` (waiting out a retry backoff)
 * and `Waiting` (a deferred step waiting out its poll interval).
 */
export function runNudger() {
    for (const namespace of [NS, FAIL_NS]) {
        const target = pick([
            ...listWorkflows(namespace, 'status=Requeued&pageSize=10'),
            ...listWorkflows(namespace, 'status=Waiting&pageSize=10'),
        ]);
        if (!target) continue;

        const res = http.post(`${workflowsUrl(namespace)}/${target.databaseId}/nudge`, null, {
            tags: { name: 'nudge' },
        });
        trackStatus(res.status);
    }
    sleep(NUDGE_PERIOD);
}

/**
 * The only arm that drives `engine.workflows.execution.dependency_recovered`, which nobody can
 * trigger directly: it is the maintenance sweep noticing that a `DependencyFailed` workflow's
 * dependencies have all completed since. Built in three moves — fail a workflow that something else
 * depends on, let the dependent settle as `DependencyFailed`, then resume the upstream until it
 * completes.
 *
 * The upstream targets the flaky downstream with no room to retry, so its first attempt fails two
 * times in three; every resume is an independent draw, and it takes about three of them to land a
 * 200. When the first draw succeeds instead, the pair simply runs through cleanly and the next cycle
 * tries again — a deterministic upstream is not worth a second test command for.
 */
export function runDependencyRecovery() {
    const body = {
        labels: { arm: 'dependency-recovery' },
        workflows: [
            {
                ref: 'upstream',
                operationId: 'playground-dependency-upstream',
                isHead: true,
                dependsOnHeads: false,
                steps: [
                    {
                        operationId: 'callback',
                        command: { type: 'webhook', data: { uri: FLAKY_URL } },
                        retryStrategy: { backoffType: 0, baseInterval: '00:00:01', maxRetries: 0 },
                    },
                ],
            },
            {
                ref: 'dependent',
                operationId: 'playground-dependency-dependent',
                isHead: false,
                dependsOnHeads: false,
                dependsOn: ['upstream'],
                steps: [
                    {
                        operationId: 'callback',
                        command: { type: 'webhook', data: { uri: OK_URL } },
                    },
                ],
            },
        ],
    };

    const res = post(workflowsUrl(NS), body, buildRequestParams(), 'enqueue_dependency_pair');
    const upstreamId = accepted(res) ? readRef(res, 'upstream') : null;
    if (!upstreamId) {
        sleep(DEPENDENCY_PERIOD);
        return;
    }

    // Resume until the upstream lands a 200. Once it is Completed the maintenance sweep — which runs
    // once a minute — re-enqueues the dependent and counts it as dependency-recovered.
    let waited = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
        sleep(4);
        waited += 4;

        const status = workflowStatus(upstreamId);
        if (status === 'Completed') break;
        if (status !== 'Failed') continue;

        const resumed = http.post(`${workflowsUrl(NS)}/${upstreamId}/resume`, null, {
            tags: { name: 'resume_upstream' },
        });
        trackStatus(resumed.status);
    }

    sleep(Math.max(1, DEPENDENCY_PERIOD - waited));
}

function readRef(res, ref) {
    try {
        return JSON.parse(res.body).workflows.find((w) => w.ref === ref)?.databaseId ?? null;
    } catch {
        return null;
    }
}

function workflowStatus(id) {
    const res = http.get(`${workflowsUrl(NS)}/${id}`, { tags: { name: 'workflow_status' } });
    if (res.status !== 200) return null;
    try {
        return JSON.parse(res.body).overallStatus ?? null;
    } catch {
        return null;
    }
}

/**
 * One full request–reply exchange per iteration, shaped to hit every mailbox verdict the dashboard
 * plots. The order matters: a receiver enqueued before its message is born `held` and later released
 * by the delivery (which is what `wake_latency` measures), while one enqueued after its message is
 * born `delivered` and never parks at all.
 */
export function runMailboxExchange() {
    const collectionKey = `pg-mb-${uuidv4()}`;
    const roll = Math.floor(Math.random() * 8);

    const minted = post(
        mailboxesUrl(NS),
        { idempotencyKey: collectionKey, timeout: MAILBOX_TIMEOUT, collectionKey },
        buildRequestParams({ collectionKey }),
        'mailbox_mint',
    );
    if (!accepted(minted)) return;

    let mailboxId;
    try {
        mailboxId = JSON.parse(minted.body).id;
    } catch {
        return;
    }
    const deliveries = `${mailboxesUrl(NS)}/${mailboxId}/deliveries`;

    // Receiver first: born `held`, released by the delivery below.
    enqueueReceiver(mailboxId, collectionKey);
    const firstKey = `${collectionKey}-msg-1`;
    post(
        deliveries,
        { idempotencyKey: firstKey, payload: '{"reply":1}' },
        buildRequestParams(),
        'mailbox_deliver',
    );
    // A forwarder retrying a message it already handed over. Answered from the stored verdict.
    post(
        deliveries,
        { idempotencyKey: firstKey, payload: '{"reply":1}' },
        buildRequestParams(),
        'mailbox_duplicate',
    );

    // Message first: the next receiver is born `delivered` and runs without ever parking.
    post(
        deliveries,
        { idempotencyKey: `${collectionKey}-msg-2`, payload: '{"reply":2}' },
        buildRequestParams(),
        'mailbox_deliver',
    );
    enqueueReceiver(mailboxId, collectionKey);

    if (roll === 0) {
        // A mailbox that never existed — the `not_found` refusal.
        post(
            `${mailboxesUrl(NS)}/${uuidv4()}/deliveries`,
            { idempotencyKey: `${collectionKey}-ghost`, payload: '{}' },
            buildRequestParams(),
            'mailbox_not_found',
        );
    }

    if (roll === 4) {
        // A blank idempotency key — the `invalid` refusal, rejected before anything is stored.
        post(
            deliveries,
            { idempotencyKey: '', payload: '{}' },
            buildRequestParams(),
            'mailbox_invalid',
        );
    }

    if (roll === 1) {
        // Over MaxMailboxPayloadSize — the `too_large` refusal. Stores nothing, so the key stays free.
        post(
            deliveries,
            { idempotencyKey: `${collectionKey}-huge`, payload: OVERSIZED_PAYLOAD },
            buildRequestParams(),
            'mailbox_too_large',
        );
    }

    if (Math.random() < MAILBOX_ORPHAN_FRACTION) {
        // Left open on purpose. One more message goes in with nobody to read it, so when the deadline
        // sweep closes the mailbox it closes with reason=deadline and reports an unpaired delivery.
        post(
            deliveries,
            { idempotencyKey: `${collectionKey}-orphan`, payload: '{"reply":"unread"}' },
            buildRequestParams(),
            'mailbox_orphan_deliver',
        );
        return;
    }

    if (roll === 5) {
        // One more receiver than there are messages, so it is still parked when the close lands and
        // the closure releases it — the only way to produce `cause=closed`, since every other
        // receiver here is woken by a delivery long before the mailbox goes away.
        enqueueReceiver(mailboxId, collectionKey);
    }

    const closed = http.del(`${mailboxesUrl(NS)}/${mailboxId}`, null, {
        tags: { name: 'mailbox_close' },
    });
    trackStatus(closed.status);

    if (roll === 2) {
        // A saga replaying past the close: the receiver is still born, with `birth=closed`.
        enqueueReceiver(mailboxId, collectionKey);
    }

    if (roll === 3) {
        // Too late, and a key that was never kept — the `closed` refusal.
        post(
            deliveries,
            { idempotencyKey: `${collectionKey}-late`, payload: '{}' },
            buildRequestParams(),
            'mailbox_late_deliver',
        );
    }
}

/** A receive workflow: an ordinary single-step webhook workflow plus a `mailbox` block. */
function enqueueReceiver(mailboxId, collectionKey) {
    const body = {
        labels: { arm: 'mailbox' },
        workflows: [
            {
                ref: 'wf-1',
                operationId: 'playground-mailbox-receiver',
                isHead: true,
                dependsOnHeads: false,
                mailbox: { id: mailboxId },
                steps: [
                    {
                        operationId: 'handle-message',
                        command: { type: 'webhook', data: { uri: OK_URL } },
                    },
                ],
            },
        ],
    };
    return post(workflowsUrl(NS), body, buildRequestParams({ collectionKey }), 'mailbox_receiver');
}

/**
 * Trips a namespace circuit breaker, lets it extend, then repairs the downstream and watches it
 * recover — on a cycle, forever.
 *
 * The burst goes in as one batch of independent collection heads pointed at this namespace's own
 * WireMock target, which `setup` registered and this function has just switched to failing. Within a
 * sweep or two the namespace clears both trip conditions at once: the absolute floor
 * (`MinRequeuedWorkflows`) and the ratio against the namespace's active population
 * (`MinRequeuedRatio`). Because the namespace is dedicated, nothing else dilutes that denominator.
 * While it stays broken the canaries keep failing their probes and the window doubles on every sweep.
 *
 * Repairing the target is what starts the second half. The next canary attempt succeeds, the sweep
 * reads that as progress, and recovery releases cohorts that double every sweep until one comes back
 * empty and the breaker clears.
 *
 * The retry budget has to outlast the broken window by a wide margin, and that is the one part of
 * this easy to get wrong: if the parked workflows die of exhausted retries before the downstream
 * comes back, recovery opens onto an empty parked population, releases nothing, and goes straight to
 * Clear — leaving `engine.throttle.released` flat and the recovery panel empty.
 */
export function runStorm() {
    const namespace = __ENV.STORM_NAMESPACE || STORM_NAMESPACES[0];
    const collectionKey = `pg-storm-${uuidv4()}`;

    setStormState(namespace, STORM_DOWN_STATE);

    const workflows = [];
    for (let i = 0; i < STORM_BURST; i++) {
        workflows.push({
            ref: `storm-${i}`,
            operationId: 'playground-storm',
            isHead: true,
            dependsOnHeads: false,
            steps: [
                {
                    operationId: 'callback',
                    command: {
                        type: 'webhook',
                        data: { uri: `${WIREMOCK}${stormPath(namespace)}` },
                    },
                    retryStrategy: exponential('00:00:02', '00:00:10', {
                        maxDuration: STORM_RETRY_BUDGET,
                    }),
                },
            ],
        });
    }

    const res = post(
        workflowsUrl(namespace),
        { labels: { arm: 'storm' }, workflows },
        buildRequestParams({ collectionKey }),
        'enqueue_storm',
    );
    check(res, { 'storm burst enqueued': accepted });

    sleep(STORM_DOWN_SECONDS);
    setStormState(namespace, STORM_UP_STATE);
    sleep(Math.max(1, STORM_PERIOD - STORM_DOWN_SECONDS));
}

export function pollHealth() {
    pollHealthOnce();
    sleep(HEALTH_PERIOD);
}

/**
 * Gives every storm namespace its own switchable downstream: one WireMock stub per scenario state, so
 * the storm arm can break and repair that namespace's target without touching anyone else's.
 *
 * These cannot be committed as mapping files the way `/flaky` and `/permanent-error` are, because
 * there is one per entry in `STORM_NAMESPACES` and that list is configuration. Resetting first
 * reloads the file-backed mappings and discards anything a previous run registered, which is what
 * keeps re-running the script from stacking duplicates.
 */
export function setup() {
    const reset = http.post(`${WIREMOCK_ADMIN}/__admin/mappings/reset`);
    if (reset.status !== 200) {
        throw new Error(
            `Could not reach the WireMock admin API at ${WIREMOCK_ADMIN} (${reset.status}). ` +
                'The storm arm needs it to break and repair its downstream; is the playground stack up?',
        );
    }

    for (const namespace of STORM_NAMESPACES) {
        for (const [state, status] of [
            [STORM_DOWN_STATE, 500],
            [STORM_UP_STATE, 200],
        ]) {
            const res = http.post(
                `${WIREMOCK_ADMIN}/__admin/mappings`,
                JSON.stringify({
                    priority: 4,
                    name: `Storm downstream for ${namespace} (${state})`,
                    scenarioName: stormScenario(namespace),
                    requiredScenarioState: state,
                    request: { urlPath: stormPath(namespace), method: 'ANY' },
                    response: { status, jsonBody: { namespace, state } },
                }),
                { tags: { name: 'wiremock_register' } },
            );
            check(res, { 'storm stub registered': (r) => r.status === 201 });
        }
    }

    return { registered: STORM_NAMESPACES.length };
}
