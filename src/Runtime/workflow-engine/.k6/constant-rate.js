import http from "k6/http";
import {check, sleep} from "k6";
import {uuidv4} from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

// --- Configuration ---
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080/api/v1/workflow/test-org/test-app/12345";
const HEALTH_URL = __ENV.HEALTH_URL || "http://localhost:8080/api/v1/health";
const API_KEY = __ENV.API_KEY || "0544ba8b-2d8a-4ec9-b93a-47cdbd220293";
const RATE = parseInt(__ENV.RATE || "100", 10);
const MAX_VUS = parseInt(__ENV.MAX_VUS || "2000", 10);
const POLL_INTERVAL = parseFloat(__ENV.POLL_INTERVAL || "2");

const payload = JSON.parse(open("./process-next-payload.json"));
const payloadString = JSON.stringify(payload);

const requestParams = {
    headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
    },
};

// --- Scenarios ---
export const options = {
    scenarios: {
        constant_rate: {
            executor: "constant-arrival-rate",
            rate: RATE,
            timeUnit: "1s",
            duration: "87600h", // ~10 years; cancel with Ctrl+C
            preAllocatedVUs: RATE,
            maxVUs: MAX_VUS,
            exec: "processNext",
        },
        health_poll: {
            executor: "constant-vus",
            vus: 1,
            duration: "87600h",
            exec: "pollHealth",
        },
    },
    thresholds: {
        "http_req_failed{scenario:constant_rate}": ["rate<0.01"],
        "http_req_duration{scenario:constant_rate}": ["p(95)<5000"],
    },
};

// --- Process next (runs once per arrival) ---
export function processNext() {
    const guid = uuidv4();
    const url = `${BASE_URL}/${guid}/next`;

    const res = http.post(url, payloadString, requestParams);

    check(res, {
        "status is 200": (r) => r.status === 200,
        "status is not 5xx": (r) => r.status < 500,
    });
}

// --- Health poll (single VU, steady interval) ---
export function pollHealth() {
    try {
        const res = http.get(HEALTH_URL, {tags: {name: "health_poll"}});
        const body = JSON.parse(res.body);
        const engineCheck = body.checks?.find((c) => c.name === "Engine");
        const queueCount = engineCheck?.data?.queue;

        if (queueCount === undefined) {
            console.warn("[health] Could not read queue count");
        } else {
            console.log(`[health] Queue: ${queueCount}`);
        }
    } catch (e) {
        console.warn(`[health] Poll failed: ${e.message}`);
    }

    sleep(POLL_INTERVAL);
}
