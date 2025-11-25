# Frontend Performance Monitoring Strategy

- Status: Proposed
- Deciders: Task Force Frontend Next
- Date: 2025-11-25

## Result

1. **Initial load testing**

   We implement LHCI as synthetic testing in CI with a custom LHCI server for monitoring changes in the initial load performance metrics over time. We will set thresholds to fail builds, as we are not yet above those thresholds.

   See [synthetic data monitoring proposal](#synthetic-data-monitoring-proposal) further down.

2. **Load and performance testing**

   To begin with, we will implement load testing of a complex app through K6/Playwright.

   More research will be done into K6 vs Playwright and what it gives us in terms of performance testing support and data visualization. This testing will possibly include load testing with many users to assert that it also performs reasonably well under those conditions.

3. **RUM**

   We will not be implementing RUM yet, as it is not of high significance for the Frontend Next initiative since we will not have real users before the initiative is merged and rolled out to real users.

4. **OTel**

   The same goes for OTel in addition to OTel for browsers still being experimental.

## Problem context

As we implement Frontend Next, a major refactoring initiative, we need to define what performance data to collect, where to collect it, and how to monitor it. Currently, we lack systematic performance data collection, making it difficult to validate that our refactoring efforts deliver the expected performance gains and to prevent performance degradations from reaching production. Such data collection is also useful for detecting errors before deploy or in production without our users having to report them. This again facilitates quicker recovery and more thorough stability across our apps.

## Types of monitoring data

## 1. Initial load synthetic testing

Robots in a browser run your app from fixed locations.

### Why synthetic data?

Used for load time performance metrics like TTFB and LCP, but also accessibility and SEO.

### Limitations

Only synthetic data with a fixed set of devices, browsers and geolocations. Only data about the initial load, not the actual usage of an application.

### Initial Load Testing Tools

Lighthouse CI.

## 2. Load and performance testing

Still synthetic, but focused on pushing the system. Pushing the system in our case can be having many users, but maybe more relevant, testing very complex applications with lots of dynamics and repeating group. The purpose of this is to extract performance metrics of the use of an application, not only the initial load.

### Why load/performance testing?

Simulate many users loading and interacting in parallel. See that very complex applications still have acceptable performance.

### Limitations

Also synthetic. Only testing what we can think of.

### Load/Performance Testing Tools

Browser-based load tests (k6 browser, Playwright + k6) hit real frontend flows.

## 3. Real User Monitoring

Metrics from real users regardless of browser, network or geographic location, like: core Web Vitals, page loads, errors, device/geo, interactions.

### Why RUM?

Understanding long-term trends for real users. Can monitor errors and enable the team to fix them before users report them.

### Limitations

More setup. Not able to catch regressions before they reach users.

### RUM Tools

Grafana Faro Web SDK, basic RUM (Boomerang JS + ClickHouse + Grafana + Traefik), or Boomerang JS + Prometheus + Grafana

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

# Synthetic Data Monitoring Proposal

We have implemented LHCI to run in GitHub Actions on every change to app frontend. We now need a way to monitor the results of this service over time.
One way to do this is through our own [Lighthouse Server](https://googlechrome.github.io/lighthouse-ci/docs/server.html#deployment).

### Deployment

A server in the Studio cluster. This is going to be taken over by Platform in the future, but still far away.

### Domain

The LHCI server works best when it has full control over the host, but can also be configured to [run on a specific path](https://googlechrome.github.io/lighthouse-ci/docs/recipes/lhci-server-vpn-proxy/).

Suggestions:

- lhci.altinn.studio.no, or
- altinn.studio.no/lhci-reports

### DB

Works with sqlite, mysql and postgresql. Only requirement for us is that the storage is persistent (not lost on server failure/restart). This can be achieved in many different ways will all previously listed databases.

### Auth

Auth is implemented through build and admin tokens, in addition to support for basic auth and or firewall rules. See the [Lighthouse CI docs](https://googlechrome.github.io/lighthouse-ci/docs/server.html#build--admin-tokens) for more info.

Next steps:
When this LHCI server is implemented, we can run [LHCI Compare GH Action](https://github.com/adevinta/actions-lighthouseci-compare).
