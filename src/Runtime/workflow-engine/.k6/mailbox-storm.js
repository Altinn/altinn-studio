import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { BASE_URL, HEALTH_URL, buildRequestParams, buildPayload } from './lib/helpers.js';

// Mailbox load scenario: does mailbox traffic cost the ordinary enqueue/processing path anything, and what
// does one message cost? The measured enqueue workload is identical in every mode; only what runs beside it
// changes:
//
//   MODE=baseline  measured enqueue workload alone                     → the reference
//   MODE=storm     the same, plus mailbox traffic                      → the comparison
//   MODE=control   the same, plus ORDINARY workflows at CONTROL_RATE   → what equivalent work costs
//   MODE=low       one exchange at a time, no other load               → per-hop latency at idle
//
// The storm arm is gated against the control (same extra work, minus the `mailbox` block), not the baseline.
// `mailbox-storm-compare.sh` runs the modes repeatedly and interleaved; one run by hand is not a result.

const MODE = __ENV.MODE || 'storm';
const DURATION = __ENV.DURATION || '3m';
const RESULTS_DIR = __ENV.RESULTS_DIR || '.k6/results';

// Summary-file suffix, so repeated runs of one arm do not overwrite each other.
const RUN_TAG = __ENV.RUN_TAG || '';

const BASELINE_RATE = parseInt(__ENV.BASELINE_RATE || '100', 10);

// Two messages per exchange is the Fiks Arkiv profile: an acknowledgement, then a concluding receipt.
const EXCHANGE_RATE = parseInt(__ENV.EXCHANGE_RATE || '25', 10);
const MESSAGES_PER_EXCHANGE = parseInt(__ENV.MESSAGES_PER_EXCHANGE || '2', 10);

// Deliveries into *one* receiverless mailbox until MaxMailboxLogLength refuses with 429, then a replacement
// mailbox. Rate-limited so it cannot swamp the other arms.
const BUFFER_RATE = parseInt(__ENV.BUFFER_RATE || '25', 10);

// Message delivered before its receiver exists, so the receiver is born runnable — deterministic, not a race.
const EARLY_RATE = parseInt(__ENV.EARLY_RATE || '5', 10);

// Ordinary workflows standing in for the storm's receivers; storm summaries report the right value as
// `config.impliedControlRate`.
const CONTROL_RATE = parseInt(__ENV.CONTROL_RATE || '80', 10);

// `webhook` (the gate's shape: a receive workflow minus its `mailbox` block) or `inproc`. See `controlPayload`.
const CONTROL_SHAPE = __ENV.CONTROL_SHAPE === 'inproc' ? 'inproc' : 'webhook';

// Idle between measured requests, so every enqueue batch holds a single item and hops are comparable.
const LOW_GAP = parseFloat(__ENV.LOW_GAP || '0.2');

// Kept above any sane run length: below it the deadline sweep's releases join the load.
const MAILBOX_TIMEOUT = __ENV.MAILBOX_TIMEOUT || '01:00:00';

// Every Nth relay exchange re-posts its first message's key — at-least-once forwarding. Expected: 200 with
// the original idx, no new row. 0 disables.
const REPLAY_EVERY = parseInt(__ENV.REPLAY_EVERY || '10', 10);

// Birth-state read-back sampling; a GET per receiver would be a third of the arm's request volume.
const BIRTH_SAMPLE_EVERY = parseInt(__ENV.BIRTH_SAMPLE_EVERY || '10', 10);

const DELIVERY_PAYLOAD_BYTES = parseInt(__ENV.DELIVERY_PAYLOAD_BYTES || '2048', 10);
const MONITOR_INTERVAL = parseFloat(__ENV.MONITOR_INTERVAL || '2');

const NAMESPACE = __ENV.NAMESPACE || 'default';
const MAILBOX_URL = __ENV.MAILBOX_URL || `http://localhost:9090/api/v1/${NAMESPACE}/mailboxes`;

/**
 * '90s' / '2m' / '1h30m' → seconds. Throughput is reported per scenario second: k6's own rate divides by
 * the whole run, teardown drain included.
 */
function durationSeconds(text) {
    let total = 0;
    for (const [, value, unit] of text.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)) {
        const factor = { ms: 0.001, s: 1, m: 60, h: 3600 }[unit];
        total += parseFloat(value) * factor;
    }
    return total || parseFloat(text) || 1;
}

const DURATION_SECONDS = durationSeconds(DURATION);

const webhookTemplate = JSON.parse(open('./payloads/webhook.json'));
const receiverTemplate = JSON.parse(open('./payloads/mailbox-receiver.json'));

// Labels let each workload be counted separately on the list endpoint (`?label=k6:value`).
const BASELINE_LABEL = 'mailbox-storm-baseline';
const RELAY_LABEL = 'mailbox-storm-relay';
const EARLY_LABEL = 'mailbox-storm-early';
const CONTROL_LABEL = 'mailbox-storm-control';

// Per-hop latency, kept apart so "a message costs X" is an accounting rather than a single number.
const mintLatency = new Trend('mailbox_mint', true);
const closeLatency = new Trend('mailbox_close', true);
const receiverParkLatency = new Trend('receiver_enqueue_park', true);
const receiverRunnableLatency = new Trend('receiver_enqueue_runnable', true);
const deliveryWakeLatency = new Trend('delivery_wake', true);
const deliveryBufferLatency = new Trend('delivery_buffer', true);
const deliveryCappedLatency = new Trend('delivery_capped', true);
const deliveryReplayLatency = new Trend('delivery_replay', true);
const lowEnqueue = new Trend('enqueue_single_low', true);

// Outcomes, split per arm: a 429 is the log cap working in the buffered arm and a broken scenario elsewhere.
const mailboxesMinted = new Counter('mailboxes_minted');
const mailboxesClosed = new Counter('mailboxes_closed');
const mailboxesAtCapacity = new Counter('mailboxes_at_capacity_429');
const receiversEnqueued = new Counter('receivers_enqueued');
const deliveriesAccepted = new Counter('deliveries_accepted');
const deliveriesBuffered = new Counter('deliveries_buffered');
const deliveriesReplayed = new Counter('deliveries_replayed');
const deliveriesDuplicate = new Counter('deliveries_duplicate_200');
const deliveriesCapped = new Counter('deliveries_capped_429');
const deliveriesLate = new Counter('deliveries_late_409');
const deliveriesUnroutable = new Counter('deliveries_unroutable_404');
const deliveriesTooLarge = new Counter('deliveries_too_large_413');
const deliveriesOther = new Counter('deliveries_other_status');
const bornHeld = new Rate('receiver_born_held');
const bornRunnable = new Rate('receiver_born_runnable');
const birthSamples = new Counter('receiver_birth_samples');
const bufferedLogDepth = new Trend('buffered_log_depth');
const bufferedMailboxesSeeded = new Counter('buffered_mailboxes_seeded');
const relayExchangesStarted = new Counter('relay_exchanges_started');
const earlyExchangesStarted = new Counter('early_exchanges_started');

// Engine-side observation, sampled identically in every mode so the monitor is not an asymmetry.
const baselineBacklog = new Trend('engine_backlog_baseline');
const engineWorkers = new Trend('engine_workers_active');
const engineActive = new Trend('engine_active_workflows');
const engineHeld = new Trend('engine_held_receivers');

// Would catch a storm crowding ordinary enqueues out of the admission budget: Held receivers count toward
// it, while delivery ingestion is exempt.
const baselineAtCapacity = new Counter('baseline_enqueue_at_capacity_429');

// Metrics because a value *returned* from teardown is discarded by k6.
const drainSeconds = new Trend('baseline_drain_seconds');
const completedBaseline = new Counter('workflows_completed_baseline');
const failedBaseline = new Counter('workflows_failed_baseline');
const completedControl = new Counter('workflows_completed_control');
const completedRelay = new Counter('workflows_completed_relay');
const heldRelay = new Counter('workflows_held_relay');
const failedRelay = new Counter('workflows_failed_relay');
const completedEarly = new Counter('workflows_completed_early');
const failedEarly = new Counter('workflows_failed_early');

const stormOnly = MODE === 'storm';
const measuresEnqueue = MODE !== 'low';

/**
 * The measured enqueue workload and the monitor are identical in every mode that has them.
 */
const scenarios = {
    monitor: {
        executor: 'constant-vus',
        vus: 1,
        duration: DURATION,
        exec: 'monitor',
        gracefulStop: '5s',
    },
};

if (measuresEnqueue) {
    scenarios.enqueue_baseline = {
        executor: 'constant-arrival-rate',
        rate: BASELINE_RATE,
        timeUnit: '1s',
        duration: DURATION,
        preAllocatedVUs: Math.max(20, Math.ceil(BASELINE_RATE / 2)),
        maxVUs: Math.max(200, BASELINE_RATE * 4),
        exec: 'enqueueBaseline',
        gracefulStop: '10s',
    };
}

if (stormOnly && EXCHANGE_RATE > 0) {
    scenarios.relay_exchanges = {
        executor: 'constant-arrival-rate',
        rate: EXCHANGE_RATE,
        timeUnit: '1s',
        duration: DURATION,
        preAllocatedVUs: Math.max(20, EXCHANGE_RATE),
        maxVUs: Math.max(200, EXCHANGE_RATE * 10),
        exec: 'relayExchange',
        gracefulStop: '30s',
    };
}

if (stormOnly && BUFFER_RATE > 0) {
    scenarios.buffered_deliveries = {
        executor: 'constant-arrival-rate',
        rate: BUFFER_RATE,
        timeUnit: '1s',
        duration: DURATION,
        // A pool, so several deliveries to one mailbox are in flight at once — contention on the mailbox row is
        // half of what this arm is for.
        preAllocatedVUs: Math.max(10, Math.ceil(BUFFER_RATE / 2)),
        maxVUs: Math.max(40, BUFFER_RATE * 2),
        exec: 'bufferedDelivery',
        gracefulStop: '10s',
    };
}

if (stormOnly && EARLY_RATE > 0) {
    scenarios.early_deliveries = {
        executor: 'constant-arrival-rate',
        rate: EARLY_RATE,
        timeUnit: '1s',
        duration: DURATION,
        preAllocatedVUs: Math.max(10, EARLY_RATE * 2),
        maxVUs: Math.max(100, EARLY_RATE * 10),
        exec: 'earlyDelivery',
        gracefulStop: '30s',
    };
}

if (MODE === 'control') {
    scenarios.extra_ordinary = {
        executor: 'constant-arrival-rate',
        rate: CONTROL_RATE,
        timeUnit: '1s',
        duration: DURATION,
        preAllocatedVUs: Math.max(20, Math.ceil(CONTROL_RATE / 2)),
        maxVUs: Math.max(200, CONTROL_RATE * 4),
        exec: 'enqueueExtraOrdinary',
        gracefulStop: '10s',
    };
}

if (MODE === 'low') {
    scenarios.low_load_exchange = {
        // One VU, fixed gap, phases in order: every hop must sit in the same position relative to the idle gap.
        // Measuring a whole exchange per iteration once produced a 5 ms spread purely from flush-cycle position.
        executor: 'constant-vus',
        vus: 1,
        duration: DURATION,
        exec: 'lowLoadExchange',
        gracefulStop: '30s',
    };
}

export const options = {
    setupTimeout: '1m',
    teardownTimeout: '10m',
    // p99 is not in k6's default trend stats.
    summaryTrendStats: ['count', 'min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    scenarios,
    // The real comparison is cross-run; these only catch a run broken on its own terms. Declaring sub-metrics
    // is also what makes k6 compute them for the summary.
    thresholds: measuresEnqueue
        ? {
              'http_req_failed{scenario:enqueue_baseline}': ['rate<0.01'],
              'http_req_duration{scenario:enqueue_baseline}': ['p(95)<5000'],
              'http_reqs{scenario:enqueue_baseline}': ['count>0'],
              dropped_iterations: ['count<1'],
          }
        : {
              'http_req_duration{scenario:low_load_exchange}': ['p(95)<5000'],
              dropped_iterations: ['count<1'],
          },
};

function messagePayload(sequence) {
    const head = `{"melding":"arkivkvittering","sequence":${sequence},"filler":"`;
    const tail = '"}';
    const padding = Math.max(0, DELIVERY_PAYLOAD_BYTES - head.length - tail.length);
    return head + 'x'.repeat(padding) + tail;
}

function jsonParams(name, expected) {
    return {
        headers: { 'Content-Type': 'application/json' },
        tags: { name },
        // 429 and 409 are outcomes the storm is designed to provoke, not transport failures.
        responseCallback: http.expectedStatuses(...expected),
    };
}

/**
 * Mints one mailbox. A fresh collectionKey per exchange keeps the open-mailboxes cap far away, as in
 * production.
 */
function mintMailbox(collectionKey, name) {
    const res = http.post(
        MAILBOX_URL,
        JSON.stringify({
            idempotencyKey: `k6-${collectionKey}`,
            timeout: MAILBOX_TIMEOUT,
            collectionKey,
        }),
        jsonParams(name, [200, 201, 429]),
    );

    mintLatency.add(res.timings.duration);

    if (res.status === 429) {
        mailboxesAtCapacity.add(1);
        return null;
    }
    if (res.status !== 201 && res.status !== 200) {
        return null;
    }

    mailboxesMinted.add(1);
    try {
        return JSON.parse(res.body).id;
    } catch {
        return null;
    }
}

function closeMailbox(mailboxId) {
    const res = http.del(
        `${MAILBOX_URL}/${mailboxId}`,
        null,
        jsonParams('close_mailbox', [200, 202, 404]),
    );
    closeLatency.add(res.timings.duration);
    if (res.status === 202 || res.status === 200) mailboxesClosed.add(1);
    return res;
}

/**
 * Enqueues one receive workflow: an ordinary single-step webhook workflow plus the `mailbox` block.
 * `isHead` + `dependsOnHeads: false` is what the app-lib's relay does — and no dependency edge is exactly
 * what the design claims.
 */
function enqueueReceiver(mailboxId, collectionKey, label, name, latency) {
    const template = JSON.parse(JSON.stringify(receiverTemplate));
    template.workflows[0].mailbox.id = mailboxId;

    const res = http.post(BASE_URL, buildPayload(template, { k6: label }), {
        ...buildRequestParams({ collectionKey }),
        tags: { name },
    });

    // The request's own timing: Date.now() quantizes to 1 ms, 25% of the quantity measured here.
    latency.add(res.timings.duration);

    if (res.status !== 201 && res.status !== 200) return null;
    receiversEnqueued.add(1);
    try {
        return JSON.parse(res.body).workflows[0].databaseId;
    } catch {
        return null;
    }
}

function deliver(mailboxId, idempotencyKey, sequence, name) {
    return http.post(
        `${MAILBOX_URL}/${mailboxId}/deliveries`,
        JSON.stringify({ idempotencyKey, payload: messagePayload(sequence) }),
        jsonParams(name, [200, 202, 404, 409, 413, 429]),
    );
}

function trackDelivery(res) {
    if (res.status === 202) {
        deliveriesAccepted.add(1);
        try {
            return JSON.parse(res.body);
        } catch {
            deliveriesOther.add(1);
            return null;
        }
    }

    if (res.status === 200) deliveriesDuplicate.add(1);
    else if (res.status === 429) deliveriesCapped.add(1);
    else if (res.status === 409) deliveriesLate.add(1);
    else if (res.status === 404) deliveriesUnroutable.add(1);
    else if (res.status === 413) deliveriesTooLarge.add(1);
    else deliveriesOther.add(1);

    return null;
}

/**
 * Reads back a receiver's birth state (the enqueue response carries no status), sampled.
 */
function sampleBirth(workflowId, expectHeld) {
    const res = http.get(`${BASE_URL}/${workflowId}`, { tags: { name: 'sample_birth' } });
    if (res.status !== 200) return;

    let status;
    try {
        status = JSON.parse(res.body).overallStatus;
    } catch {
        return;
    }

    birthSamples.add(1);
    if (expectHeld) {
        bornHeld.add(status === 'Held');
    } else {
        // It may already have run by the time this reads it, so the assertion is that it never parked.
        bornRunnable.add(status !== 'Held');
    }
}

/**
 * The control arm's extra workflow. `webhook` is a receive workflow minus its `mailbox` block — the gate's
 * shape. `inproc` exists only to bound how much the work's shape alone can move the number.
 */
function controlPayload() {
    const template = JSON.parse(JSON.stringify(receiverTemplate));
    delete template.workflows[0].mailbox;
    template.workflows[0].operationId = 'mailbox-shaped-control';

    if (CONTROL_SHAPE === 'inproc') {
        template.workflows[0].steps[0].command = {
            type: 'test-receive',
            data: { key: 'mailbox-storm-control' },
        };
    }

    return buildPayload(template, { k6: CONTROL_LABEL });
}

export function enqueueBaseline() {
    const body = buildPayload(webhookTemplate, { k6: BASELINE_LABEL });
    const res = http.post(BASE_URL, body, {
        ...buildRequestParams(),
        tags: { name: 'enqueue_baseline' },
    });

    if (res.status === 429) baselineAtCapacity.add(1);
    check(res, { 'baseline enqueued': (r) => r.status === 201 || r.status === 200 });
}

/**
 * The control workload, labeled apart so it is not counted as the measured workload's backlog.
 */
export function enqueueExtraOrdinary() {
    const res = http.post(BASE_URL, controlPayload(), {
        ...buildRequestParams(),
        tags: { name: 'enqueue_extra' },
    });

    check(res, { 'extra enqueued': (r) => r.status === 201 || r.status === 200 });
}

/**
 * The relay: mint, then per message enqueue the receiver and deliver, then close — every engine call the
 * design adds, in the order it mandates.
 */
export function relayExchange() {
    const collectionKey = uuidv4();
    const mailboxId = mintMailbox(collectionKey, 'mint_relay');
    if (!mailboxId) return;
    relayExchangesStarted.add(1);

    const sampling = BIRTH_SAMPLE_EVERY > 0 && __ITER % BIRTH_SAMPLE_EVERY === 0;

    for (let sequence = 0; sequence < MESSAGES_PER_EXCHANGE; sequence++) {
        const receiverId = enqueueReceiver(
            mailboxId,
            collectionKey,
            RELAY_LABEL,
            'enqueue_receiver',
            receiverParkLatency,
        );
        if (!receiverId) return;

        // Read before the delivery can change it: nothing else can wake this receiver.
        if (sampling && sequence === 0) sampleBirth(receiverId, true);

        const res = deliver(mailboxId, `${mailboxId}-${sequence}`, sequence, 'deliver_wake');
        deliveryWakeLatency.add(res.timings.duration);
        trackDelivery(res);
        check(res, { 'relay message accepted': (r) => r.status === 202 });
    }

    // The replay, posted after the exchange has run its course: the engine kept this message, so it answers
    // 200 even once the mailbox is closed.
    const replaying = REPLAY_EVERY > 0 && __ITER % REPLAY_EVERY === 0;

    closeMailbox(mailboxId);

    if (replaying) {
        const replay = deliver(mailboxId, `${mailboxId}-0`, 0, 'deliver_replay');
        deliveryReplayLatency.add(replay.timings.duration);
        deliveriesReplayed.add(1);
        trackDelivery(replay);
        check(replay, { 'replay deduplicated': (r) => r.status === 200 });
    }
}

// Per-VU (module state is per-VU in k6): a full log never accepts another message, so a VU that hits the
// cap mints its own replacement and keeps storming.
let ownMailbox = null;

/**
 * Buffered messages: no receiver is ever enqueued. Accepted rows and refusals are both measured.
 */
export function bufferedDelivery() {
    if (ownMailbox === null) {
        ownMailbox = mintMailbox(uuidv4(), 'mint_buffered');
        if (ownMailbox === null) {
            sleep(1);
            return;
        }
        bufferedMailboxesSeeded.add(1);
    }

    const res = deliver(ownMailbox, `${ownMailbox}-${__ITER}`, __ITER, 'deliver_buffered');
    const body = trackDelivery(res);

    if (body) {
        deliveryBufferLatency.add(res.timings.duration);
        deliveriesBuffered.add(1);
        bufferedLogDepth.add(body.idx + 1);
    } else if (res.status === 429) {
        deliveryCappedLatency.add(res.timings.duration);
        // Full for good; take a fresh mailbox. The arrival rate is the throttle.
        ownMailbox = null;
    } else if (res.status === 404 || res.status === 409) {
        ownMailbox = null;
        sleep(1);
    }
}

/**
 * The other interleaving: delivered before the receiver exists, so it is born runnable — no wake at all.
 */
export function earlyDelivery() {
    const collectionKey = uuidv4();
    const mailboxId = mintMailbox(collectionKey, 'mint_early');
    if (!mailboxId) return;
    earlyExchangesStarted.add(1);

    const res = deliver(mailboxId, `${mailboxId}-0`, 0, 'deliver_early');
    deliveryBufferLatency.add(res.timings.duration);
    trackDelivery(res);
    check(res, { 'early message accepted': (r) => r.status === 202 });

    const receiverId = enqueueReceiver(
        mailboxId,
        collectionKey,
        EARLY_LABEL,
        'enqueue_receiver_early',
        receiverRunnableLatency,
    );

    if (receiverId && BIRTH_SAMPLE_EVERY > 0 && __ITER % BIRTH_SAMPLE_EVERY === 0) {
        sampleBirth(receiverId, false);
    }

    closeMailbox(mailboxId);
}

/**
 * Per-hop latency at idle, one phase per iteration on one VU. Every hop is issued as the first request
 * after the same idle gap, so the numbers are comparable; the phases walk every state the rendezvous can
 * be in.
 */
let lowMailbox = null;
let lowCollection = null;

export function lowLoadExchange() {
    const phase = __ITER % 7;

    switch (phase) {
        case 0: {
            // The yardstick: one ordinary enqueue, in the same position as every hop below.
            const res = http.post(BASE_URL, buildPayload(webhookTemplate, { k6: BASELINE_LABEL }), {
                ...buildRequestParams(),
                tags: { name: 'enqueue_low' },
            });
            if (res.status === 201 || res.status === 200) lowEnqueue.add(res.timings.duration);
            break;
        }
        case 1: {
            lowCollection = uuidv4();
            lowMailbox = mintMailbox(lowCollection, 'mint_low');
            break;
        }
        case 2: {
            // seq 0, nothing at that position yet: the receiver parks.
            if (lowMailbox) {
                enqueueReceiver(
                    lowMailbox,
                    lowCollection,
                    RELAY_LABEL,
                    'enqueue_receiver_low',
                    receiverParkLatency,
                );
            }
            break;
        }
        case 3: {
            // idx 0 lands on the parked receiver: the wake.
            if (lowMailbox) {
                const res = deliver(lowMailbox, `${lowMailbox}-0`, 0, 'deliver_wake_low');
                deliveryWakeLatency.add(res.timings.duration);
                trackDelivery(res);
            }
            break;
        }
        case 4: {
            // idx 1 has no receiver: the message buffers.
            if (lowMailbox) {
                const res = deliver(lowMailbox, `${lowMailbox}-1`, 1, 'deliver_buffer_low');
                deliveryBufferLatency.add(res.timings.duration);
                if (trackDelivery(res)) deliveriesBuffered.add(1);
            }
            break;
        }
        case 5: {
            // seq 1 finds the buffered message: born runnable, no wake.
            if (lowMailbox) {
                enqueueReceiver(
                    lowMailbox,
                    lowCollection,
                    EARLY_LABEL,
                    'enqueue_receiver_low',
                    receiverRunnableLatency,
                );
            }
            break;
        }
        default: {
            if (lowMailbox) closeMailbox(lowMailbox);
            lowMailbox = null;
            break;
        }
    }

    sleep(LOW_GAP);
}

function countWorkflows(label, statuses) {
    const query = statuses.map((s) => `status=${s}`).join('&');
    const res = http.get(`${BASE_URL}?label=k6:${label}&${query}&pageSize=1`, {
        tags: { name: 'monitor_count' },
    });
    if (res.status === 204) return 0;
    if (res.status !== 200) return -1;
    return JSON.parse(res.body).totalCount ?? 0;
}

function countByStatus(statuses) {
    const query = statuses.map((s) => `status=${s}`).join('&');
    const res = http.get(`${BASE_URL}?${query}&pageSize=1`, { tags: { name: 'monitor_count' } });
    if (res.status === 204) return 0;
    if (res.status !== 200) return -1;
    return JSON.parse(res.body).totalCount ?? 0;
}

/**
 * Samples engine-side backlog and the mailbox's footprint, identically in every mode.
 */
export function monitor() {
    baselineBacklog.add(
        Math.max(0, countWorkflows(BASELINE_LABEL, ['Enqueued', 'Processing', 'Requeued'])),
    );

    // Unsettled rows a parked receiver holds against the admission budget deliveries are exempt from.
    engineHeld.add(Math.max(0, countByStatus(['Held'])));

    const health = http.get(HEALTH_URL, { tags: { name: 'monitor_health' } });
    if (health.status === 200) {
        const engine = JSON.parse(health.body).checks?.find((c) => c.name === 'Engine')?.data;
        if (engine) {
            engineWorkers.add(engine.workers.active);
            engineActive.add(engine.queue?.active_workflows ?? 0);
        }
    }

    sleep(MONITOR_INTERVAL);
}

/**
 * Drains the baseline workload and reports what each workload actually did — a run whose deliveries all
 * 404'd would otherwise produce a flattering latency table.
 */
export function teardown() {
    const active = ['Enqueued', 'Processing', 'Requeued'];
    const start = Date.now();
    let backlog = countWorkflows(BASELINE_LABEL, active);

    while (backlog > 0 && Date.now() - start < 300000) {
        sleep(1);
        backlog = countWorkflows(BASELINE_LABEL, active);
    }

    const elapsed = (Date.now() - start) / 1000;
    drainSeconds.add(elapsed);

    // Only after the drain measurement: the last exchanges are still mid-protocol when the scenario stops,
    // and would otherwise be reported as never woken.
    const settleStart = Date.now();
    while (Date.now() - settleStart < 60000) {
        const open =
            countWorkflows(RELAY_LABEL, ['Held', 'Enqueued', 'Processing', 'Requeued']) +
            countWorkflows(EARLY_LABEL, ['Held', 'Enqueued', 'Processing', 'Requeued']);
        if (open <= 0) break;
        sleep(1);
    }

    const report = {
        baseline_drain_seconds: elapsed,
        baseline_completed: countWorkflows(BASELINE_LABEL, ['Completed']),
        baseline_failed: countWorkflows(BASELINE_LABEL, ['Failed']),
        control_completed: countWorkflows(CONTROL_LABEL, ['Completed']),
        relay_completed: countWorkflows(RELAY_LABEL, ['Completed']),
        relay_held: countWorkflows(RELAY_LABEL, ['Held']),
        relay_failed: countWorkflows(RELAY_LABEL, ['Failed']),
        early_completed: countWorkflows(EARLY_LABEL, ['Completed']),
        early_failed: countWorkflows(EARLY_LABEL, ['Failed']),
    };

    completedBaseline.add(Math.max(0, report.baseline_completed));
    failedBaseline.add(Math.max(0, report.baseline_failed));
    completedControl.add(Math.max(0, report.control_completed));
    completedRelay.add(Math.max(0, report.relay_completed));
    heldRelay.add(Math.max(0, report.relay_held));
    failedRelay.add(Math.max(0, report.relay_failed));
    completedEarly.add(Math.max(0, report.early_completed));
    failedEarly.add(Math.max(0, report.early_failed));

    console.log(`[teardown] ${JSON.stringify(report)}`);
}

export function handleSummary(data) {
    const metric = (name) => data.metrics?.[name]?.values ?? {};
    const enqueue = metric('http_req_duration{scenario:enqueue_baseline}');
    const summary = {
        mode: MODE,
        config: {
            duration: DURATION,
            baselineRate: measuresEnqueue ? BASELINE_RATE : 0,
            exchangeRate: stormOnly ? EXCHANGE_RATE : 0,
            messagesPerExchange: MESSAGES_PER_EXCHANGE,
            bufferRate: stormOnly ? BUFFER_RATE : 0,
            earlyRate: stormOnly ? EARLY_RATE : 0,
            controlRate: MODE === 'control' ? CONTROL_RATE : 0,
            controlShape: MODE === 'control' ? CONTROL_SHAPE : undefined,
            lowGap: MODE === 'low' ? LOW_GAP : 0,
            replayEvery: REPLAY_EVERY,
            deliveryPayloadBytes: DELIVERY_PAYLOAD_BYTES,
            mailboxTimeout: MAILBOX_TIMEOUT,
        },
        enqueue: {
            requests: metric('http_reqs{scenario:enqueue_baseline}').count ?? 0,
            rate: (metric('http_reqs{scenario:enqueue_baseline}').count ?? 0) / DURATION_SECONDS,
            rateOverWholeRun: metric('http_reqs{scenario:enqueue_baseline}').rate ?? 0,
            failedRate: metric('http_req_failed{scenario:enqueue_baseline}').rate ?? 0,
            atCapacity: metric('baseline_enqueue_at_capacity_429').count ?? 0,
            med: enqueue.med,
            p90: enqueue['p(90)'],
            p95: enqueue['p(95)'],
            p99: enqueue['p(99)'],
            max: enqueue.max,
        },
        droppedIterations: metric('dropped_iterations').count ?? 0,
        backlog: {
            med: metric('engine_backlog_baseline').med,
            p95: metric('engine_backlog_baseline')['p(95)'],
            max: metric('engine_backlog_baseline').max,
        },
        processing: {
            drainSeconds: metric('baseline_drain_seconds').med,
            baselineCompleted: metric('workflows_completed_baseline').count ?? 0,
            baselineFailed: metric('workflows_failed_baseline').count ?? 0,
            controlCompleted: metric('workflows_completed_control').count ?? 0,
            relayCompleted: metric('workflows_completed_relay').count ?? 0,
            relayHeld: metric('workflows_held_relay').count ?? 0,
            relayFailed: metric('workflows_failed_relay').count ?? 0,
            earlyCompleted: metric('workflows_completed_early').count ?? 0,
            earlyFailed: metric('workflows_failed_early').count ?? 0,
        },
        engine: {
            workersMed: metric('engine_workers_active').med,
            workersMax: metric('engine_workers_active').max,
            activeMed: metric('engine_active_workflows').med,
            activeMax: metric('engine_active_workflows').max,
            heldMed: metric('engine_held_receivers').med,
            heldMax: metric('engine_held_receivers').max,
        },
        mailboxes: {
            minted: metric('mailboxes_minted').count ?? 0,
            closed: metric('mailboxes_closed').count ?? 0,
            atCapacity429: metric('mailboxes_at_capacity_429').count ?? 0,
            mintMed: metric('mailbox_mint').med,
            mintP95: metric('mailbox_mint')['p(95)'],
            closeMed: metric('mailbox_close').med,
            closeP95: metric('mailbox_close')['p(95)'],
        },
        receivers: {
            enqueued: metric('receivers_enqueued').count ?? 0,
            // Per scenario second: k6's own Counter rate divides by the whole run including the teardown drain.
            enqueuedRate: (metric('receivers_enqueued').count ?? 0) / DURATION_SECONDS,
            parkMed: metric('receiver_enqueue_park').med,
            parkP95: metric('receiver_enqueue_park')['p(95)'],
            runnableMed: metric('receiver_enqueue_runnable').med,
            runnableP95: metric('receiver_enqueue_runnable')['p(95)'],
            bornHeldRate: metric('receiver_born_held').rate,
            bornRunnableRate: metric('receiver_born_runnable').rate,
            birthSamples: metric('receiver_birth_samples').count ?? 0,
        },
        deliveries: {
            accepted: metric('deliveries_accepted').count ?? 0,
            buffered: metric('deliveries_buffered').count ?? 0,
            duplicate: metric('deliveries_duplicate_200').count ?? 0,
            replayed: metric('deliveries_replayed').count ?? 0,
            capped429: metric('deliveries_capped_429').count ?? 0,
            late409: metric('deliveries_late_409').count ?? 0,
            unroutable404: metric('deliveries_unroutable_404').count ?? 0,
            tooLarge413: metric('deliveries_too_large_413').count ?? 0,
            other: metric('deliveries_other_status').count ?? 0,
            acceptedRate: (metric('deliveries_accepted').count ?? 0) / DURATION_SECONDS,
            wakeMed: metric('delivery_wake').med,
            wakeP95: metric('delivery_wake')['p(95)'],
            wakeP99: metric('delivery_wake')['p(99)'],
            bufferMed: metric('delivery_buffer').med,
            bufferP95: metric('delivery_buffer')['p(95)'],
            cappedMed: metric('delivery_capped').med,
            cappedP95: metric('delivery_capped')['p(95)'],
            replayMed: metric('delivery_replay').med,
            replayP95: metric('delivery_replay')['p(95)'],
            logDepthMed: metric('buffered_log_depth').med,
            logDepthMax: metric('buffered_log_depth').max,
            bufferedMailboxes: metric('buffered_mailboxes_seeded').count ?? 0,
        },
        exchanges: {
            relayStarted: metric('relay_exchanges_started').count ?? 0,
            earlyStarted: metric('early_exchanges_started').count ?? 0,
        },
        // MODE=low only. Counts ride beside the medians: 20 samples and 120 are different claims.
        lowLoad: {
            enqueueSamples: metric('enqueue_single_low').count ?? 0,
            enqueueMed: metric('enqueue_single_low').med,
            enqueueP95: metric('enqueue_single_low')['p(95)'],
            enqueueMax: metric('enqueue_single_low').max,
            mintSamples: metric('mailbox_mint').count ?? 0,
            mintMed: metric('mailbox_mint').med,
            mintP95: metric('mailbox_mint')['p(95)'],
            closeSamples: metric('mailbox_close').count ?? 0,
            closeMed: metric('mailbox_close').med,
            closeP95: metric('mailbox_close')['p(95)'],
            parkSamples: metric('receiver_enqueue_park').count ?? 0,
            parkMed: metric('receiver_enqueue_park').med,
            parkP95: metric('receiver_enqueue_park')['p(95)'],
            runnableSamples: metric('receiver_enqueue_runnable').count ?? 0,
            runnableMed: metric('receiver_enqueue_runnable').med,
            runnableP95: metric('receiver_enqueue_runnable')['p(95)'],
            wakeSamples: metric('delivery_wake').count ?? 0,
            wakeMed: metric('delivery_wake').med,
            wakeP95: metric('delivery_wake')['p(95)'],
            bufferSamples: metric('delivery_buffer').count ?? 0,
            bufferMed: metric('delivery_buffer').med,
            bufferP95: metric('delivery_buffer')['p(95)'],
        },
    };

    // The storm's extra workflows are exactly its receive workflows; the buffered arm contributes none by
    // design (a message nobody receives creates no workflow).
    if (MODE === 'storm') {
        const workflows = summary.receivers.enqueued;
        summary.config.impliedControlRate = Math.round((workflows / DURATION_SECONDS) * 10) / 10;
    }

    const out = {};
    out[`${RESULTS_DIR}/${MODE}${RUN_TAG}.json`] = JSON.stringify(summary, null, 2);
    out.stdout = `\n=== mailbox-storm (${MODE}) ===\n${JSON.stringify(summary, null, 2)}\n\n${textSummary(
        data,
        {
            indent: '  ',
            enableColors: true,
        },
    )}`;

    return out;
}
