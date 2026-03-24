import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, requestParams, buildPayload, pollHealthOnce } from './lib/helpers.js';

const RATE = parseInt(__ENV.RATE || '100', 10);
const MAX_VUS = parseInt(__ENV.MAX_VUS || '2000', 10);
const POLL_INTERVAL = parseFloat(__ENV.POLL_INTERVAL || '2');

const payloadTemplate = JSON.parse(open('./payloads/webhook.json'));

export const options = {
    scenarios: {
        constant_rate: {
            executor: 'constant-arrival-rate',
            rate: RATE,
            timeUnit: '1s',
            duration: '87600h',
            preAllocatedVUs: RATE,
            maxVUs: MAX_VUS,
            exec: 'enqueueWorkflow',
        },
        health_poll: {
            executor: 'constant-vus',
            vus: 1,
            duration: '87600h',
            exec: 'pollHealth',
        },
    },
    thresholds: {
        'http_req_failed{scenario:constant_rate}': ['rate<0.01'],
        'http_req_duration{scenario:constant_rate}': ['p(95)<5000'],
    },
};

export function enqueueWorkflow() {
    const body = buildPayload(payloadTemplate);
    const res = http.post(BASE_URL, body, requestParams);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'status is not 5xx': (r) => r.status < 500,
    });
}

export function pollHealth() {
    pollHealthOnce();
    sleep(POLL_INTERVAL);
}
