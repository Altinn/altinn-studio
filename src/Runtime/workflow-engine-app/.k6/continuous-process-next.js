import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, requestParams, buildPayload } from '../../workflow-engine/.k6/lib/helpers.js';

const INTERVAL = parseFloat(__ENV.INTERVAL || '2');

const payloadTemplate = JSON.parse(open('./payloads/process-next.json'));

export const options = {
    scenarios: {
        continuous: {
            executor: 'constant-vus',
            vus: 1,
            duration: '87600h',
        },
    },
};

export default function () {
    const body = buildPayload(payloadTemplate);
    const res = http.post(BASE_URL, body, requestParams);
    console.log(`HTTP ${res.status}`);
    sleep(INTERVAL);
}
