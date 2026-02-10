import http from "k6/http";
import {sleep} from "k6";

// --- Configuration ---
const BASE_URL =
    __ENV.BASE_URL ||
    "http://localhost:8080/api/v1/workflow/test-org/test-app/12345";
const INSTANCE_GUID =
    __ENV.INSTANCE_GUID || "f13f515d-17b2-4f86-9c7a-a955583c4a1c";
const API_KEY = __ENV.API_KEY || "0544ba8b-2d8a-4ec9-b93a-47cdbd220293";
const INTERVAL = parseFloat(__ENV.INTERVAL || "2");

const payload = JSON.parse(open("./process-next-payload.json"));
const payloadString = JSON.stringify(payload);

const requestParams = {
    headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
    },
};

// --- Scenario: single VU looping forever ---
export const options = {
    scenarios: {
        continuous: {
            executor: "constant-vus",
            vus: 1,
            duration: "87600h", // ~10 years; cancel with Ctrl+C
        },
    },
    // No thresholds — this isn't a test
};

// --- Main loop ---
export default function () {
    const url = `${BASE_URL}/${INSTANCE_GUID}/next`;
    const res = http.post(url, payloadString, requestParams);
    console.log(`HTTP ${res.status}`);
    sleep(INTERVAL);
}
