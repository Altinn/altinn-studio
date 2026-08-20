import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { BASE_URL, HEALTH_URL, buildRequestParams, buildPayload } from './lib/helpers.js';

// Mailbox load scenario. The question is narrow: does mailbox traffic cost the engine's ordinary
// enqueue/processing path anything, and what does one message cost? The measured enqueue workload is identical
// in every mode and only what runs beside it changes, making the runs an A/B:
//
//   MODE=baseline  measured enqueue workload alone                     → the reference
//   MODE=storm     the same, plus mailbox traffic                      → the comparison
//   MODE=control   the same, plus ORDINARY workflows at CONTROL_RATE   → what equivalent work costs
//   MODE=low       one exchange at a time, no other load               → per-hop latency at idle
//
// The storm arm is gated against the control, not the baseline: a storm run does strictly more engine work
// than a baseline run. The control's shape matches the storm's exactly — a receive workflow is an ordinary
// single-step webhook workflow plus a `mailbox` block, and the control's extras are the same thing without it.
//
// The three storm arms are `relay_exchanges` (receiver first, so it parks and the delivery wakes it — the Fiks
// Arkiv profile), `buffered_deliveries` (no receiver at all, into one mailbox until MaxMailboxLogLength
// refuses) and `early_deliveries` (message first, so the receiver is born runnable).
//
// `mailbox-storm-compare.sh` runs the modes repeatedly and interleaved and applies the gates. One run of this
// script by hand is one arm of a comparison, not a result.

const MODE = __ENV.MODE || 'storm';
const DURATION = __ENV.DURATION || '3m';
const RESULTS_DIR = __ENV.RESULTS_DIR || '.k6/results';

// Suffix for this run's summary file, so repeated runs of one arm do not overwrite each other:
// `-e RUN_TAG=-2` writes `storm-2.json`.
const RUN_TAG = __ENV.RUN_TAG || '';

// The non-mailbox hot path under test: single-step webhook workflows.
const BASELINE_RATE = parseInt(__ENV.BASELINE_RATE || '100', 10);

// Relay exchanges per second, each carrying MESSAGES_PER_EXCHANGE messages. Two is the profile the first real
// consumer (Fiks Arkiv) produces: an acknowledgement that keeps the exchange open, then a concluding receipt.
const EXCHANGE_RATE = parseInt(__ENV.EXCHANGE_RATE || '25', 10);
const MESSAGES_PER_EXCHANGE = parseInt(__ENV.MESSAGES_PER_EXCHANGE || '2', 10);

// Buffered deliveries per second, aimed at *one* mailbox with no receiver, so the log grows until
// MaxMailboxLogLength (100) refuses with 429 and the VU mints a replacement. Both halves are the point: the
// accepted rows, and the refusals, which still take the mailbox row lock. Rate-limited rather than unthrottled
// so it cannot swamp the other arms — the control arm can only stand in for workflows.
const BUFFER_RATE = parseInt(__ENV.BUFFER_RATE || '25', 10);

// Early-message arm: exchanges per second whose message is delivered *before* its receiver exists, so the
// receiver is born runnable. Deterministic by construction rather than a race won by luck.
const EARLY_RATE = parseInt(__ENV.EARLY_RATE || '5', 10);

// Control mode: ordinary workflows per second standing in for the receive workflows the storm creates. Every
// storm summary reports the right value for its configuration as `config.impliedControlRate`.
const CONTROL_RATE = parseInt(__ENV.CONTROL_RATE || '80', 10);

// What the control arm's extra workflows look like: `webhook` (the default and the one the gate uses,
// byte-identical to a receive workflow minus its `mailbox` block) or `inproc`. See `controlPayload`.
const CONTROL_SHAPE = __ENV.CONTROL_SHAPE === 'inproc' ? 'inproc' : 'webhook';

// Low-load mode: seconds of idle between measured requests. At this spacing every enqueue batch holds a single
// item, so each hop's own cost is visible instead of amortized, and the spacing is the same for every hop.
const LOW_GAP = parseFloat(__ENV.LOW_GAP || '0.2');

// The mailbox's declared timeout. Left above any sane run length: below it, mailboxes close mid-run and the
// deadline sweep's releases join the load — interesting, but not what the gates are set from.
const MAILBOX_TIMEOUT = __ENV.MAILBOX_TIMEOUT || '01:00:00';

// Replay: every Nth relay exchange re-posts its first message's idempotency key, which is the at-least-once
// forwarding a production sender guarantees. The replay still takes the mailbox row lock and must answer 200
// with the original idx without appending a row. Set to 0 to disable.
const REPLAY_EVERY = parseInt(__ENV.REPLAY_EVERY || '10', 10);

// How often an arm reads back the birth state of the receiver it just enqueued. The enqueue response carries
// no status, so this is the only way to see it; sampled because a GET per receiver would be a third of the
// arm's request volume.
const BIRTH_SAMPLE_EVERY = parseInt(__ENV.BIRTH_SAMPLE_EVERY || '10', 10);

const DELIVERY_PAYLOAD_BYTES = parseInt(__ENV.DELIVERY_PAYLOAD_BYTES || '2048', 10);
const MONITOR_INTERVAL = parseFloat(__ENV.MONITOR_INTERVAL || '2');

const NAMESPACE = __ENV.NAMESPACE || 'default';
const MAILBOX_URL = __ENV.MAILBOX_URL || `http://localhost:9090/api/v1/${NAMESPACE}/mailboxes`;

/**
 * '90s' / '2m' / '1h30m' → seconds. Throughput is reported per scenario second, not per run second: k6's own
 * per-metric rate divides by the whole run, teardown drain included.
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

// Label values, so each workload can be counted separately on the list endpoint (`?label=k6:value`).
const BASELINE_LABEL = 'mailbox-storm-baseline';
const RELAY_LABEL = 'mailbox-storm-relay';
const EARLY_LABEL = 'mailbox-storm-early';
const CONTROL_LABEL = 'mailbox-storm-control';

// Per-hop latency. The design admits one extra app→engine call — the receiver enqueue — so keeping the hops
// apart is what turns "a message costs X" into an accounting rather than a single number.
const mintLatency = new Trend('mailbox_mint', true);
const closeLatency = new Trend('mailbox_close', true);
const receiverParkLatency = new Trend('receiver_enqueue_park', true);
const receiverRunnableLatency = new Trend('receiver_enqueue_runnable', true);
const deliveryWakeLatency = new Trend('delivery_wake', true);
const deliveryBufferLatency = new Trend('delivery_buffer', true);
const deliveryCappedLatency = new Trend('delivery_capped', true);
const deliveryReplayLatency = new Trend('delivery_replay', true);
const lowEnqueue = new Trend('enqueue_single_low', true);

// Outcomes, split where an outcome means different things in different arms: a 429 is the log cap working as
// designed in the buffered arm and a broken scenario anywhere else.
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

// Engine-side observation, sampled identically in every mode so the monitor is not an asymmetry between arms.
const baselineBacklog = new Trend('engine_backlog_baseline');
const engineWorkers = new Trend('engine_workers_active');
const engineActive = new Trend('engine_active_workflows');
const engineHeld = new Trend('engine_held_receivers');

// A baseline enqueue refused at capacity. Delivery ingestion skips the backpressure check an ordinary enqueue
// must pass, while a Held receiver counts in the same admission budget while unfetchable — so a storm can in
// principle raise the number of refused ordinary enqueues, and this counter is what would catch it.
const baselineAtCapacity = new Counter('baseline_enqueue_at_capacity_429');

// The processing half of "throughput and latency unchanged". Emitted as metrics because a value *returned*
// from teardown is discarded by k6 and never reaches the summary.
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
 * Scenario set. The measured enqueue workload and the monitor are identical in every mode that has them —
 * only what runs beside them changes.
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
        // Each iteration issues 2 + 2×MESSAGES_PER_EXCHANGE requests back to back with no sleep, so the pool only
        // has to cover the round trips.
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
        // A pool rather than one VU, so several deliveries to the same mailbox are in flight at once — that
        // concurrency on one mailbox row is half of what the arm is for. Headroom because the iteration that runs
        // into the cap does two requests instead of one.
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
        // One VU, one measured request per iteration, a fixed gap between them. Not an arrival-rate executor: the
        // phases have to run in order, and every hop must be measured in the same position relative to the idle
        // gap. Measuring a whole exchange inside one iteration produced a 5 ms spread between two calls that do
        // almost the same work, purely from where in the flush cycle each landed.
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
    // p99 is not in k6's default trend stats, and it is half the point of the comparison.
    summaryTrendStats: ['count', 'min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    scenarios,
    // The comparison that matters is cross-run (see mailbox-storm-compare.sh); these only catch a run broken on
    // its own terms. Declaring the sub-metrics is also what makes k6 compute them for the summary.
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

/** A message body of the configured size. */
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
        // 429 (the log cap) and 409 (too late) are outcomes the storm is designed to provoke, not transport
        // failures, so counting them as http_req_failed would make the error rate meaningless.
        responseCallback: http.expectedStatuses(...expected),
    };
}

/**
 * Mints one mailbox. `collectionKey` groups it the way the app groups an instance's workflows, and it is what
 * the open-mailboxes cap is scoped to — a fresh key per exchange keeps that cap far away, as in production.
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

/** Closes one mailbox — the app's own conclusion, and the only thing that ends an exchange early. */
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
 * Enqueues one receive workflow against a mailbox: an ordinary single-step webhook workflow plus the `mailbox`
 * block. `isHead` with `dependsOnHeads: false` is what the app-lib's relay does, and it also keeps the
 * measurement honest — a dependency edge is exactly what the design claims not to create.
 */
function enqueueReceiver(mailboxId, collectionKey, label, name, latency) {
    const template = JSON.parse(JSON.stringify(receiverTemplate));
    template.workflows[0].mailbox.id = mailboxId;

    const res = http.post(BASE_URL, buildPayload(template, { k6: label }), {
        ...buildRequestParams({ collectionKey }),
        tags: { name },
    });

    // The request's own timing, not a Date.now() delta: Date.now() quantizes to 1 ms, which is 25% of the
    // quantity being measured here.
    latency.add(res.timings.duration);

    if (res.status !== 201 && res.status !== 200) return null;
    receiversEnqueued.add(1);
    try {
        return JSON.parse(res.body).workflows[0].databaseId;
    } catch {
        return null;
    }
}

/** Posts one message into a mailbox. */
function deliver(mailboxId, idempotencyKey, sequence, name) {
    return http.post(
        `${MAILBOX_URL}/${mailboxId}/deliveries`,
        JSON.stringify({ idempotencyKey, payload: messagePayload(sequence) }),
        jsonParams(name, [200, 202, 404, 409, 413, 429]),
    );
}

/** Records one delivery outcome, and returns the parsed body of an accepted one. */
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
 * Reads back the birth state of a receiver, sampled rather than universal. The enqueue response carries no
 * status, so without this the two interleavings would be asserted rather than observed.
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
        // A receiver born runnable may already have run by the time this reads it, so the assertion is that it
        // never parked.
        bornRunnable.add(status !== 'Held');
    }
}

/**
 * The control arm's extra ordinary workflow, in the shape `CONTROL_SHAPE` asks for.
 *
 * `webhook` is a receive workflow with its `mailbox` block removed and nothing else changed, so the difference
 * between the two arms is the mailbox's own bookkeeping. The gate uses it.
 *
 * `inproc` swaps the webhook step for an in-process command and exists only to measure how much the shape of
 * the extra work can move the enqueue path's latency at all.
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

/** The non-mailbox workload: one single-step webhook workflow per iteration. */
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
 * The control workload: ordinary workflows at the rate the storm's receivers arrive. Labeled apart so it is
 * not counted as backlog for the measured workload.
 */
export function enqueueExtraOrdinary() {
    const res = http.post(BASE_URL, controlPayload(), {
        ...buildRequestParams(),
        tags: { name: 'enqueue_extra' },
    });

    check(res, { 'extra enqueued': (r) => r.status === 201 || r.status === 200 });
}

/**
 * The relay: mint, then for each message enqueue the receiver (which parks) and deliver the message (which
 * wakes it), then close — every engine call the design adds, in the order it mandates.
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

        // Read the birth state before the delivery can change it: nothing else can wake this receiver.
        if (sampling && sequence === 0) sampleBirth(receiverId, true);

        const res = deliver(mailboxId, `${mailboxId}-${sequence}`, sequence, 'deliver_wake');
        deliveryWakeLatency.add(res.timings.duration);
        trackDelivery(res);
        check(res, { 'relay message accepted': (r) => r.status === 202 });
    }

    // The replay, on every REPLAY_EVERYth exchange: message 0's key again, posted after the exchange has run its
    // course. It is the case the accepted-versus-kept rule exists for — the engine kept this message, so a replay
    // answers 200 even once the mailbox is closed, which is why it is posted last.
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

// Per-VU buffered target. Module state is per-VU in k6, which is the mechanism here: a full log can never
// accept another message, so a VU that runs into the cap mints a mailbox of its own and keeps storming. That
// is the finding rather than a workaround — a sustained delivery storm cannot be absorbed by one mailbox.
let ownMailbox = null;

/**
 * Buffered messages: no receiver is ever enqueued, so every accepted delivery sits at its position and wakes
 * nobody. Both the accepted rows (`buffered_log_depth`) and the refusals (`delivery_capped`) are measured.
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
        // The log is full for good; take a fresh mailbox and keep going. The arrival rate is the throttle.
        ownMailbox = null;
    } else if (res.status === 404 || res.status === 409) {
        ownMailbox = null;
        sleep(1);
    }
}

/**
 * The other interleaving: the message is delivered before its receiver exists, so the enqueue flush finds
 * `seq < next_idx` under the mailbox row lock and the receiver is born runnable. No wake is involved at all.
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
 * Per-hop latency at idle: one measured request per iteration, walking the protocol one phase at a time on a
 * single VU with a fixed gap between phases.
 *
 * The structure is the measurement. Every hop is issued as the first request after the same idle gap, so the
 * write buffer is in the same state for all of them and the numbers can be compared with each other. The
 * phases walk every state the rendezvous can be in — park, wake, buffer, born-runnable, close.
 */
let lowMailbox = null;
let lowCollection = null;

export function lowLoadExchange() {
    const phase = __ITER % 7;

    switch (phase) {
        case 0: {
            // The yardstick: one ordinary single-step enqueue, in the same position as every hop below.
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
            // seq 0, with nothing at that position yet: the receiver parks.
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
            // idx 0 lands on the parked receiver: the wake, inside the delivery's own transaction.
            if (lowMailbox) {
                const res = deliver(lowMailbox, `${lowMailbox}-0`, 0, 'deliver_wake_low');
                deliveryWakeLatency.add(res.timings.duration);
                trackDelivery(res);
            }
            break;
        }
        case 4: {
            // idx 1 has no receiver: the message buffers at its position and wakes nobody.
            if (lowMailbox) {
                const res = deliver(lowMailbox, `${lowMailbox}-1`, 1, 'deliver_buffer_low');
                deliveryBufferLatency.add(res.timings.duration);
                if (trackDelivery(res)) deliveriesBuffered.add(1);
            }
            break;
        }
        case 5: {
            // seq 1 finds the buffered message already there: born runnable, no wake involved.
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
 * Samples engine-side backlog for the baseline workload plus the mailbox's footprint. Every sample is taken in
 * every mode, including the ones that read zero outside a storm: the monitor must not be an asymmetry.
 */
export function monitor() {
    baselineBacklog.add(
        Math.max(0, countWorkflows(BASELINE_LABEL, ['Enqueued', 'Processing', 'Requeued'])),
    );

    // Unsettled rows a parked receiver holds. Ordinary enqueues are refused at Concurrency.BackpressureThreshold
    // on exactly this number, and delivery ingestion is exempt from that check.
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
 * Drains the baseline workload and reports what each workload actually did. A run whose deliveries all 404'd
 * would otherwise produce a flattering latency table.
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

    // Only after the gate's drain measurement, wait for the relay's own workflows: the last exchanges are still
    // mid-protocol when the scenario stops, so otherwise the fidelity counts report them as never woken.
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
        // The processing half of the requirement: how much work was left when the load stopped, how long it took to
        // clear, and whether it all completed.
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
            // Rows a parked receiver holds against the admission budget ordinary enqueues respect.
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
            // Per scenario second, not per run second: k6's own Counter rate divides by the whole run including the
            // teardown drain, which understates throughput worst at the loaded operating points this measures.
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
        // MODE=low only, and every field is measured in the same position relative to the idle gap. Counts are
        // carried beside the medians because a hop measured on 20 samples and one measured on 120 differ.
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

    // What CONTROL_RATE should be for this configuration: the storm's extra workflows are exactly its receive
    // workflows. The buffered arm contributes nothing, which is the design claim rather than an omission — a
    // message nobody receives creates no workflow — so the gate's Δ is "mailbox bookkeeping including buffered
    // rows" rather than a per-receiver cost. MODE=low's per-hop accounting is what separates them.
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
