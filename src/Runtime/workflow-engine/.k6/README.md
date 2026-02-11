# k6 Scripts

Scripts for the Workflow Engine using [k6](https://k6.io/).

## Prerequisites

Install k6 via Homebrew:

```bash
brew install k6
```

The workflow engine must be running locally on `http://localhost:8080` (or configure via environment variables).

## Scripts

### stress-test.js

Stress test that fires a configurable number of requests with high concurrency, then waits for the queue to drain.

```bash
# Default: 5000 requests, 100 concurrent virtual users
k6 run .k6/stress-test.js

# Custom iteration count and concurrency
k6 run .k6/stress-test.js -e ITERATIONS=1000 -e VUS=25
```

**What it does:**

1. Fires `ITERATIONS` POST requests to `/next` with unique instance GUIDs, spread across `VUS` concurrent virtual users.
2. Polls the health endpoint until the engine's queue is fully drained, reporting the drain time.
3. Prints latency percentiles (p50/p95/p99), throughput, and error rates.

| Variable     | Default                                                        | Description                     |
|--------------|----------------------------------------------------------------|---------------------------------|
| `ITERATIONS` | `5000`                                                         | Total number of requests        |
| `VUS`        | `100`                                                          | Concurrent virtual users        |
| `BASE_URL`   | `http://localhost:8080/api/v1/workflow/test-org/test-app/12345`| Workflow engine base URL        |
| `HEALTH_URL` | `http://localhost:8080/api/v1/health`                          | Health endpoint for queue drain |
| `API_KEY`    | `0544ba8b-2d8a-4ec9-b93a-47cdbd220293`                        | API key for authentication      |

### continuous-process-next.js

Continuously sends POST requests to a fixed instance at a steady interval. Useful for generating telemetry while building Grafana dashboards or during manual testing. Runs until cancelled with Ctrl+C.

```bash
# Default: one request every 2 seconds
k6 run .k6/continuous-process-next.js

# Custom interval and instance
k6 run .k6/continuous-process-next.js -e INTERVAL=5 -e INSTANCE_GUID=some-guid
```

| Variable        | Default                                                        | Description                  |
|-----------------|----------------------------------------------------------------|------------------------------|
| `INTERVAL`      | `2`                                                            | Seconds between requests     |
| `INSTANCE_GUID` | `f13f515d-17b2-4f86-9c7a-a955583c4a1c`                        | Instance GUID to target      |
| `BASE_URL`      | `http://localhost:8080/api/v1/workflow/test-org/test-app/12345`| Workflow engine base URL     |
| `API_KEY`       | `0544ba8b-2d8a-4ec9-b93a-47cdbd220293`                        | API key for authentication   |

### constant-rate.js

Sends requests at a fixed rate (default 100 req/s) forever. Uses `constant-arrival-rate` so the rate holds steady regardless of response time. A second scenario polls the health endpoint every `POLL_INTERVAL` seconds and logs the engine queue size. Runs until cancelled with Ctrl+C.

```bash
# Default: 100 req/s, health poll every 2s
k6 run .k6/constant-rate.js

# Custom rate
k6 run .k6/constant-rate.js -e RATE=50

# Custom rate with higher VU ceiling and slower health polling
k6 run .k6/constant-rate.js -e RATE=500 -e MAX_VUS=1000 -e POLL_INTERVAL=5
```

| Variable        | Default                                                        | Description                                       |
|-----------------|----------------------------------------------------------------|---------------------------------------------------|
| `RATE`          | `100`                                                          | Requests per second                               |
| `MAX_VUS`       | `200`                                                          | Max virtual users (increase if VUs become scarce)  |
| `POLL_INTERVAL` | `2`                                                            | Seconds between health endpoint polls              |
| `BASE_URL`      | `http://localhost:8080/api/v1/workflow/test-org/test-app/12345`| Workflow engine base URL                          |
| `HEALTH_URL`    | `http://localhost:8080/api/v1/health`                          | Health endpoint for queue monitoring               |
| `API_KEY`       | `0544ba8b-2d8a-4ec9-b93a-47cdbd220293`                        | API key for authentication                        |

## Payload

All scripts use `process-next-payload.json` in this directory as the POST body.
