import http from 'k6/http';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// --- Configuration ---
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1/workflows';
export const HEALTH_URL = __ENV.HEALTH_URL || 'http://localhost:8080/api/v1/health';
export const requestParams = {
    headers: {
        'Content-Type': 'application/json',
    },
};

/**
 * Deep-clones the payload template and replaces placeholder fields with unique values.
 * Returns the serialized JSON string ready for POST.
 */
export function buildPayload(template) {
    const guid = uuidv4();
    const payload = JSON.parse(JSON.stringify(template));
    payload.idempotencyKey = `k6-${guid}`;
    if (!payload.correlationId) {
        payload.correlationId = guid;
    }
    return JSON.stringify(payload);
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
 * Polls the health endpoint until there are no active workers (queue fully drained).
 * @param {number} pollIntervalMs - milliseconds between polls
 */
export function waitForQueueDrain(pollIntervalMs = 500) {
    console.log('\nWaiting for queue to drain...');

    let drained = false;
    const start = Date.now();

    while (!drained) {
        try {
            const res = http.get(HEALTH_URL);
            const engine = parseEngineHealth(res);

            if (!engine) {
                console.warn('  Warning: could not read engine data from health endpoint');
            } else if (engine.workers.active === 0) {
                drained = true;
            } else {
                const q = engine.queue || {};
                console.log(
                    `  Workers: ${engine.workers.active}/${engine.workers.max}  DB: ${engine.db_connections.count}/${engine.db_connections.limit}  HTTP: ${engine.http_connections.count}/${engine.http_connections.limit}  Queue: ${q.active_workflows ?? '?'} active, ${q.scheduled_workflows ?? '?'} scheduled, ${q.failed_workflows ?? '?'} failed`,
                );
            }
        } catch (e) {
            console.warn(`  Warning: health check failed: ${e.message}`);
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
