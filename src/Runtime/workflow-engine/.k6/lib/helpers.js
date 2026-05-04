import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// Per-status-code counters for granular reporting
export const STATUS_COUNTERS = {
    200: new Counter('status_200'),
    201: new Counter('status_201'),
    204: new Counter('status_204'),
    400: new Counter('status_400'),
    404: new Counter('status_404'),
    409: new Counter('status_409'),
    429: new Counter('status_429'),
    500: new Counter('status_500'),
    503: new Counter('status_503'),
};

const statusOther = new Counter('status_other');

/**
 * Increments the counter for a given HTTP status code.
 * Untracked codes go into 'status_other'.
 */
export function trackStatus(status) {
    const counter = STATUS_COUNTERS[status];
    if (counter) {
        counter.add(1);
    } else {
        statusOther.add(1);
    }
}

// --- Configuration ---
const NAMESPACE = __ENV.NAMESPACE || 'default';
export const BASE_URL = __ENV.BASE_URL || `http://localhost:8080/api/v1/${NAMESPACE}/workflows`;
export const HEALTH_URL = __ENV.HEALTH_URL || 'http://localhost:8080/api/v1/health';
/**
 * Builds request params with unique metadata headers for each request.
 * Returns a k6 params object with Content-Type, Idempotency-Key, and Collection-Key headers.
 */
export function buildRequestParams() {
    const guid = uuidv4();
    return {
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `k6-${guid}`,
            'Collection-Key': guid,
        },
    };
}

/**
 * Deep-clones the payload template.
 * Returns the serialized JSON string ready for POST.
 */
export function buildPayload(template) {
    return JSON.stringify(template);
}

/**
 * Extracts engine health data from the health endpoint response.
 * Shape: { status, workers: { active, max }, http_connections: { count, limit }, db_connections: { count, limit }, queue: { active_workflows, scheduled_workflows, failed_workflows } }
 */
function parseEngineHealth(res) {
    const body = JSON.parse(res.body);
    return body.checks?.find((c) => c.name === 'Engine')?.data;
}

/**
 * Polls the workflows list endpoint until it returns 204 No Content (no active workflows).
 * Uses pageSize=1 to minimise data transfer — only the totalCount matters.
 * @param {number} pollIntervalMs - milliseconds between polls
 */
export function waitForQueueDrain(pollIntervalMs = 500) {
    console.log('\nWaiting for queue to drain...');

    let drained = false;
    const start = Date.now();
    const pollUrl = `${BASE_URL}?pageSize=1`;

    while (!drained) {
        try {
            const res = http.get(pollUrl, { tags: { name: 'queue_drain' } });

            if (res.status === 204) {
                drained = true;
            } else if (res.status === 200) {
                const body = JSON.parse(res.body);
                console.log(`  Active workflows: ${body.totalCount ?? '?'}`);
            } else {
                console.warn(`  Unexpected status: ${res.status}`);
            }
        } catch (e) {
            console.warn(`  Warning: poll failed: ${e.message}`);
        }

        if (!drained) {
            sleepMs(pollIntervalMs);
        }
    }

    const elapsed = Date.now() - start;
    console.log(`  Queue drained in ${(elapsed / 1000).toFixed(1)}s`);
}

/**
 * Polls the health endpoint and logs the current engine status.
 */
export function pollHealthOnce() {
    try {
        const res = http.get(HEALTH_URL, { tags: { name: 'health_poll' } });
        const engine = parseEngineHealth(res);

        if (!engine) {
            console.warn('[health] Could not read engine data');
        } else {
            const q = engine.queue || {};
            console.log(
                `[health] Workers: ${engine.workers.active}/${engine.workers.max}  DB: ${engine.db_connections.count}/${engine.db_connections.limit}  HTTP: ${engine.http_connections.count}/${engine.http_connections.limit}  Queue: ${q.active_workflows ?? '?'} active, ${q.scheduled_workflows ?? '?'} scheduled, ${q.failed_workflows ?? '?'} failed`,
            );
        }
    } catch (e) {
        console.warn(`[health] Poll failed: ${e.message}`);
    }
}

/**
 * k6 handleSummary callback that prints a compact custom summary.
 */
export function formatSummary(data, { vus, target }) {
    const iterations = data.metrics?.iterations?.values?.count || 0;
    const duration = data.metrics?.http_req_duration?.values || {};
    const failed = data.metrics?.http_req_failed?.values?.passes || 0;

    // Build status code breakdown from counter metrics
    const statusLines = [];
    const allStatusKeys = Object.keys(STATUS_COUNTERS);
    for (const code of allStatusKeys) {
        const count = data.metrics?.[`status_${code}`]?.values?.count || 0;
        if (count > 0) {
            statusLines.push(`  ${code}:         ${count}`);
        }
    }
    const otherCount = data.metrics?.status_other?.values?.count || 0;
    if (otherCount > 0) {
        statusLines.push(`  other:       ${otherCount}`);
    }

    const summary = `
=== Workflow Engine Stress Test (k6) ===
  Requests:    ${iterations}
  VUs:         ${vus}
  Target:      ${target}

=== Latency ===
  Median:      ${duration.med?.toFixed(1) || '?'}ms
  p95:         ${duration['p(95)']?.toFixed(1) || '?'}ms
  p99:         ${duration['p(99)']?.toFixed(1) || '?'}ms
  Max:         ${duration.max?.toFixed(1) || '?'}ms

=== Throughput ===
  Failed:      ${failed}
  Avg rate:    ${data.metrics?.http_reqs?.values?.rate?.toFixed(1) || '?'} req/s

=== Status Codes ===
${statusLines.length > 0 ? statusLines.join('\n') : '  (no data)'}
`;

    return {
        stdout: summary + '\n' + textSummary(data, { indent: '  ', enableColors: true }),
    };
}

function sleepMs(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        // spin — k6 doesn't have a millisecond sleep
    }
}
