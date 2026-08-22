---
name: k6
description: Run k6 load tests against the workflow engine. Use when performance testing, stress testing, or benchmarking.
---

## Prerequisites

- k6 must be installed: `brew install k6`
- The workflow engine must be running (via Docker Compose or `dotnet run`)
- `node` and `docker`/`podman` as well, for `mailbox-storm-compare.sh`

## Available scripts

| Script                         | Purpose                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `.k6/stress-test.js`           | Fixed number of requests at high concurrency, then waits for the queue to drain |
| `.k6/constant-rate.js`         | Fixed request rate with a health-polling sidecar                                |
| `.k6/mailbox-storm.js`         | Mailbox load beside the ordinary enqueue workload; one arm of a comparison      |
| `.k6/mailbox-storm-compare.sh` | Runs every mailbox-storm arm interleaved and applies the acceptance gates       |

## Run a script

```bash
k6 run .k6/<script-name>.js
```

A single `k6 run .k6/mailbox-storm.js` produces **one arm** of a comparison, not a result. Use the
wrapper, which interleaves the arms, repeats them, and gates the difference:

```bash
./.k6/mailbox-storm-compare.sh
```

## Payload

Scripts use the payload templates in `.k6/payloads/` — `webhook.json` for the ordinary workload and
`mailbox-receiver.json` for a receive workflow. Modify these to change the workflow shape used in load
tests.

## Tips

- Start with `constant-rate.js` at low rates to establish a baseline, and size any comparison well below
  the ceiling it finds — above roughly three quarters of it, adding any workload stretches the tails and
  a comparison stops being about the feature under test.
- Use `stress-test.js` to find breaking points.
- Monitor results in Grafana at `http://localhost:7070` (requires `full` Docker profile).
- k6 outputs summary statistics on completion — review p95/p99 response times and error rates.
- **Redeploy the hard way before measuring.** `docker compose up -d --build` leaves the existing
  container running on the old image. Use `--force-recreate` and check the image id.
- **Read `.k6/README.md` before quoting a number from any of these scripts.** It carries the recorded
  measurements, how the gates are derived, and the caveats that decide whether a figure means anything.
