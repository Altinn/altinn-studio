# Frontend Performance Monitoring Strategy

- Status: Proposed
- Deciders: Task Force Frontend Next
- Date:

## Result

1. We implement LHCI as synthetic testing in CI with a custom LHCI server for monitoring changes over time. We will not use the GitHub App yet. This is because we don't have assertions as this does not make sense before our metrics are above a certain threshold.
   See [synthetic data monitoring proposal](#synthetic-data-monitoring-proposal) further down.
2. We will implement load testing through K6/Playwright.
3. We will not be implementing RUM yet, as it is not of high significance for the Frontend Next initiative since we will not have real users before the initiative is merged and rolled out to real users.
4. The same goes for OTel in addition to OTel for browsers still being experimental.

## Problem context

As we implement Frontend Next, a major refactoring initiative, we need to define what performance data to collect, where to collect it, and how to monitor it. Currently, we lack systematic performance data collection, making it difficult to validate that our refactoring efforts deliver the expected performance gains and to prevent performance degradations from reaching production. Such data collection is also useful for detecting errors before deploy or in production without our users having to report them. This again facilitates quicker recovery and more thorough stability across our apps.

# Context

## Types of monitoring data

## 1. Synthetic data

Robots in a browser run your app from fixed locations.

### Why synthetic data?

Used for uptime & basic perf: “Can I load / and click X without errors?” Test already in CI to mitigate changes of major performance regressions.

### Limitations

Only synthetic data with a fixed set of devices, browsers and geolocations.

### Synthetic Testing Tools

Lighthouse CI, k6 browser, Playwright synthetic tests, Grafana Synthetic Monitoring.

## 2. Real User Monitoring

Metrics from real users regardless of browser, network or geographic location, like: core Web Vitals, page loads, errors, device/geo, interactions.

- RUM with or without OTel.

- RUM vs. Synthetic data

### Why RUM?

Understanding long-term trends for real users. Can monitor errors and and enable the team to fix them before users report them.

### Limitations

More setup. Not able to catch regressions before they reach users.

### RUM Tools

Grafana Faro Web SDK, basic RUM (Boomerang JS + ClickHouse + Grafana + Traefik), or Boomerang JS + Prometheus + Grafana

## 3. Load testing

Still synthetic, but focused on pushing the system (many concurrent “users”).

### Why load testing?

Simulate many users loading and interacting in parallel, revealing issues with rendering performance, asset delivery, client–server coordination, and frontend bottlenecks that real-user traffic or single-user tests would never expose before production.

### Limitations

Also synthetic. Resource intensive, so cannot be run in every PR => regressions caught late.

### Load Testing Tools

Browser-based load tests (k6 browser, Playwright + k6, Lighthouse CI loops) hit real frontend flows.

## 4. Open Telemetry from the browser

Generate, collect, and export traces, metrics, and logs to understand how applications and services behave across a distributed system.

### Why?

See traces to find out _why_ there are performance issues across applications.

### Limitations

OTel is still experimental for browsers. Do we want to implement something that may change dramatically?

## Additional info

**Who is generating the data?**

- **Robots**

  - Synthetic monitoring
  - Load/perf tests (including Lighthouse/k6 browser)

- **Real users (in production)**
  - RUM (performance + Core Web Vitals)
  - Error/crash monitoring
  - Session replay
  - Product analytics / events
  - UX feedback widgets

## Synthetic Data Monitoring Proposal

We have implemented LHCI to run in GitHub Actions on every change to app frontend. We now need a way to monitor the results of this service over time.
One way to do this is through our own [Lighthouse Server](https://googlechrome.github.io/lighthouse-ci/docs/server.html#deployment).

### Deployment

A server in the Studio cluster. This is going to be taken over by Platform in the future, but still far away.

### Domain

The LHCI server works best when it has full control over the host, but can also be configured to run on a specific path.

Suggestions:

- lhci.altinn.studio.no, or
- altinn.studio.no/lhci-reports

### DB

Works with sqlite, mysql and postgresql. Only requirement for us is that the storage is persistent (not lost on server failure/restart). This can be achieved in many different ways will all previously listed databases.

### Auth

Auth is implemented through build and admin tokens, in addition to support for basic auth and or firewall rules. See the [Lighthouse CI docs](https://googlechrome.github.io/lighthouse-ci/docs/server.html#build--admin-tokens) for more info.

Next steps:
When this LHCI server is implemented, we can run [LHCI Compare GH Action](https://github.com/adevinta/actions-lighthouseci-compare).
