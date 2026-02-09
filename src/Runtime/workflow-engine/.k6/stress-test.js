import http from "k6/http";
import { check } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

// --- Configuration ---
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080/api/v1/workflow/test-org/test-app/12345";
const HEALTH_URL = __ENV.HEALTH_URL || "http://localhost:8080/api/v1/health";
const API_KEY = __ENV.API_KEY || "0544ba8b-2d8a-4ec9-b93a-47cdbd220293";
const ITERATIONS = parseInt(__ENV.ITERATIONS || "5000", 10);
const VUS = parseInt(__ENV.VUS || "100", 10);
const POLL_INTERVAL_MS = 500;

const payload = JSON.parse(open("../.tools/process-next-payload.json"));
const payloadString = JSON.stringify(payload);

const requestParams = {
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY,
  },
};

// --- Scenario ---
export const options = {
  teardownTimeout: "15m",
  scenarios: {
    stress: {
      executor: "shared-iterations",
      vus: VUS,
      iterations: ITERATIONS,
      maxDuration: "15m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(95)<5000"], // 95th percentile under 5s
  },
};

// --- Test function (runs once per iteration) ---
export default function () {
  const guid = uuidv4();
  const url = `${BASE_URL}/${guid}/next`;

  const res = http.post(url, payloadString, requestParams);

  check(res, {
    "status is 200 (accepted)": (r) => r.status === 200,
    "status is not 5xx": (r) => r.status < 500,
  });
}

// --- Queue drain polling (runs once after all iterations) ---
export function teardown() {
  console.log("\nWaiting for queue to drain...");

  let drained = false;
  const start = Date.now();

  while (!drained) {
    try {
      const res = http.get(HEALTH_URL);
      const body = JSON.parse(res.body);
      const engineCheck = body.checks?.find((c) => c.name === "Engine");
      const queueCount = engineCheck?.data?.queue;

      if (queueCount === undefined) {
        console.warn("  Warning: could not read queue count from health endpoint");
      } else if (queueCount === 0) {
        drained = true;
      } else {
        console.log(`  Queue: ${queueCount}`);
      }
    } catch (e) {
      console.warn(`  Warning: health check failed: ${e.message}`);
    }

    if (!drained) {
      sleep_ms(POLL_INTERVAL_MS);
    }
  }

  const elapsed = Date.now() - start;
  console.log(`  Queue drained in ${(elapsed / 1000).toFixed(1)}s`);
}

function sleep_ms(ms) {
  // k6 doesn't have a millisecond sleep, so we use a busy-wait on http
  // For short intervals this is acceptable in teardown
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // spin
  }
}

// --- Custom summary ---
export function handleSummary(data) {
  const iterations = data.metrics?.iterations?.values?.count || 0;
  const duration = data.metrics?.http_req_duration?.values || {};
  const failed = data.metrics?.http_req_failed?.values?.passes || 0;
  const totalTime = data.metrics?.iteration_duration?.values?.["p(95)"] || 0;

  const summary = `
=== Workflow Engine Stress Test (k6) ===
  Requests:    ${iterations}
  VUs:         ${VUS}
  Target:      ${BASE_URL}/<guid>/next

=== Latency ===
  Median:      ${duration.med?.toFixed(1) || "?"}ms
  p95:         ${duration["p(95)"]?.toFixed(1) || "?"}ms
  p99:         ${duration["p(99)"]?.toFixed(1) || "?"}ms
  Max:         ${duration.max?.toFixed(1) || "?"}ms

=== Throughput ===
  Failed:      ${failed}
  Avg rate:    ${data.metrics?.http_reqs?.values?.rate?.toFixed(1) || "?"} req/s
`;

  return {
    stdout: summary + "\n" + textSummary(data, { indent: "  ", enableColors: true }),
  };
}
