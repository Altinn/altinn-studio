import http from 'k6/http';
import { check } from 'k6';
import {
    BASE_URL,
    buildRequestParams,
    buildPayload,
    waitForQueueDrain,
    formatSummary,
    trackStatus,
} from './lib/helpers.js';

const VUS = parseInt(__ENV.VUS || '100', 10);
const ITERATIONS = parseInt(__ENV.ITERATIONS || '10000', 10);

const payloadTemplate = JSON.parse(open('./payloads/webhook.json'));

export const options = {
    teardownTimeout: '30m',
    scenarios: {
        stress: {
            executor: 'shared-iterations',
            vus: VUS,
            iterations: ITERATIONS,
            maxDuration: '15m',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<5000'],
    },
};

export default function () {
    const body = buildPayload(payloadTemplate);
    const res = http.post(BASE_URL, body, buildRequestParams());

    trackStatus(res.status);

    check(res, {
        'status is 2xx': (r) => r.status >= 200 && r.status < 300,
        'status is not 5xx': (r) => r.status < 500,
    });
}

export function teardown() {
    waitForQueueDrain();
}

export function handleSummary(data) {
    return formatSummary(data, { vus: VUS, target: BASE_URL });
}
