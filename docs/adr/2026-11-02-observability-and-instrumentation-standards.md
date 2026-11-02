# Observability and instrumentation standards for Team Studio's services

- Status: Proposed
- Deciders: Team Studio
- Date: 02.11.2026

## Result

Every service Team Studio owns and operates reports telemetry to one standard, which
[docs/observability.md](../observability.md) describes. The decisions behind it:

1. **Signals.** Counts, rates and latencies come from metrics. Each unit of work has an entry span that is its wide
   event. Logs are for conditions someone may need to act on, at WARN and above (A1.1).
2. **Span events.** Our code adds no span events. A service marks a failure with the span status, `error.type` and
   one ERROR log linked to the trace.
3. **Trace boundaries.** A trace holds one unit of work, except for flows we choose to follow end to end as one
   trace, such as an app deploy. Work that outlives its request runs in its own trace and links back, with
   correlation keys on both sides (A2.1).
4. **Names.** Semantic convention attributes and metrics are used as they are. Our own are `altinn.<concept>` for the
   shared vocabulary and `altinn.<service>.…` for one service, without a `studio` segment (A3.1). Span names never
   contain IDs.
5. **Shared vocabulary.** One name per concept in every service and signal, such as `altinn.service_owner` and
   `altinn.app`. The same key is a resource attribute where its value is fixed for the process, and a span, metric or
   log attribute where it varies.
6. **Environments.** `deployment.environment.name` and `altinn.environment` use Altinn's environment names, such as
   `prod` and `tt02`, not the semantic conventions' tiers (A4.1). The router sets `deployment.environment.name`.
7. **Cardinality.** Metric attributes take bounded values. IDs never go on metrics, except `service.instance.id`.
   `altinn.service_owner` and `altinn.app` may go on metrics.
8. **Sensitive data.** Identifiers that our systems assign, such as party IDs, user IDs and GUIDs, may be on spans
   and logs. National identity numbers, contact details, secrets, payloads, text that users write and query strings
   never go in telemetry. The service that emits telemetry keeps them out.
9. **Setup.** Services use the shared setup in `src/common`. The deployment configures the SDK through `OTEL_*`
   variables, with metrics exported every 15 s. Every process sets `service.version` and a per-process
   `service.instance.id`, and exports `altinn.workload.start_time`.
10. **The pipeline's contract.** The guide lists what the collectors do to telemetry. A pull request that changes the
    collectors updates the guide. The metric allowlist stays, and covers our namespace and the semantic conventions'
    namespaces that our services emit, including the language runtimes' metrics (A5.1). The pipeline does not derive
    metrics from spans (A6.1).
11. **Sampling.** The gateway keeps errors, slow traces and marked traces. Services mark only rare units of work where
    each one matters.
12. **Dashboards and alerts.** They live as code in `Altinn/altinn-dashboards-grafana`, with pinned datasource UIDs.
    Each service has one dashboard. Alerts fire on metrics only, on symptoms rather than causes.
13. **Local work and review.** Before merging, developers check telemetry against a local copy of the production
    pipeline, and test the telemetry that dashboards and alerts use. The team decides exceptions in review and records
    them in the guide.

## Problem context

Team Studio owns and operates a growing number of services in the Studio cluster and the runtime clusters, and their
telemetry ends up in one backend: VictoriaMetrics, VictoriaTraces and VictoriaLogs, queried from a shared Grafana.
[Monitoring telemetry collection and distribution](2026-01-07-monitoring-telemetry-collection-distribution.md) decided
how telemetry gets there. Nothing decided what a service emits, how it names it, how it's configured, or how we turn
it into dashboards and alerts.

[altinn-studio#21073](https://github.com/Altinn/altinn-studio/issues/21073) analyzed the state in October 2026:

- Most services recorded outcomes and failure reasons only on spans, which are sampled. The one service with an
  extensive metric catalogue used names the pipeline's allowlist dropped.
- One concept went by several names, such as `app` and `repository`, or `env` and `environment`. In the runtime, the
  service owner was not on the telemetry at all.
- Span names embedded IDs. Some metrics carried per-operation attributes, against VictoriaMetrics' limits on new
  series.
- Usernames, raw query strings, full URLs and a build token reached telemetry.
- Export intervals ranged from 10 to 60 s, while Grafana's rate windows assumed 15 s.
- The rules the pipeline imposes on services, such as the metric allowlist and the WARN log filter, were documented
  only in collector comments.

The result was telemetry that was hard to rely on and hard to compare across services, and every new dashboard or
alert reopened the same questions. The issue's analysis also tested what our stack supports. The guide's
[Querying](../observability.md#querying) section lists the gaps that shape these decisions, such as no search on span
event attributes and no exemplars on metrics.

[altinn-studio#19775](https://github.com/Altinn/altinn-studio/issues/19775) covers telemetry from apps, which uses the
names decided here. This decision doesn't cover telemetry from browsers.

## Decision drivers

- B1: Dashboards and alerts give correct numbers, although traces are sampled and logs are filtered.
- B2: A question about one unit of work can be answered from one place, by any attribute.
- B3: The same concept has the same name in every service and signal, so queries work across services.
- B4: Telemetry fits OpenTelemetry's data model and semantic conventions, so instrumentation libraries and tools work
  without adaptation.
- B5: Telemetry stays within what VictoriaMetrics, VictoriaTraces and Grafana support, and within their limits on
  series and fields.
- B6: Telemetry carries no data that identifies a person beyond what we need to operate the services, and no
  secrets.
- B7: People and agents can follow the standard without asking, and a reviewer can check it.
- B8: Nice to have: a service gets most of the standard from shared code and configuration, not its own.

## Alternatives considered

Most decisions follow from the drivers and OpenTelemetry's guidance. These had real alternatives.

**Where the wide event lives**

- A1.1: The attributes of the entry span.
- A1.2: A log record per unit of work, a "canonical log line".
- A1.3: A span event on the entry span.

**How work that outlives its request is traced**

- A2.1: Its own trace, linked to where the work was created.
- A2.2: A child span in the request's trace.

**The namespace for our own names**

- A3.1: `altinn.<concept>` and `altinn.<service>.…`.
- A3.2: `altinn.studio.<service>.…`.
- A3.3: No namespace, as most services had.

**The values of `deployment.environment.name`**

- A4.1: Altinn's environment names, such as `prod`, `tt02` and `at22`.
- A4.2: The semantic conventions' tiers, such as `production` and `test`.

**Which metrics the pipeline keeps**

- A5.1: An allowlist of namespaces that follow the standard.
- A5.2: Every metric a service emits.

**Where counts of units of work come from**

- A6.1: Metrics that services emit.
- A6.2: Metrics the collector derives from spans before sampling.

## Pros and cons

### A1.1 The entry span

- Good, because TraceQL, Traces Drilldown and LogsQL on the trace store filter and break down on any span attribute
  (B2).
- Good, because sampling keeps every error and slow request, which are what the wide event is mostly read for.
- Bad, because the span is sampled, so counts still need metrics (B1). Decision 1 covers that.

### A1.2 A log record

- Bad, because a record per unit of work would be at INFO, and the pipeline drops everything below WARN.
- Bad, because it repeats what the entry span already holds, in a second store.

### A1.3 A span event

- Bad, because OpenTelemetry is deprecating the Span Events API in favor of logs (B4).
- Bad, because VictoriaTraces can't search event attributes (B2, B5).

### A2.1 Its own trace, linked

- Good, because it follows OpenTelemetry's guidance for queued and batched work (B4).
- Good, because a trace lasts as long as one unit of work, so latency-based sampling and trace views stay meaningful.
- Bad, because Grafana follows links only one way, and a link can point to a trace that sampling dropped. Correlation
  keys on both sides and marking the producer side make up for it.

### A2.2 A child span

- Good, because the whole story is in one trace.
- Bad, because the trace stays open for as long as the work runs, sometimes hours, and the sampler's latency policy
  keeps every such trace.

### A3.1 `altinn.<concept>` and `altinn.<service>.…`

- Good, because it follows the semantic conventions' advice to prefix custom names with the company, and stays out
  of their namespaces (B4).
- Good, because it matches the pipeline's allowlist and the existing `altinn_app_*` metrics.
- Good, because a service keeps its name when it moves between products.

### A3.2 `altinn.studio.<service>.…`

- Bad, because which product a service belongs to changes more often than its name, and every service here is the
  team's anyway.

### A3.3 No namespace

- Bad, because our names collide with the semantic conventions', as `process.*` and `user.*` did (B4).
- Bad, because the allowlist can't tell our metrics from others (B1).

### A4.1 Altinn's environment names

- Good, because a value in Grafana is the name used in the infrastructure, the Flux tags and the cluster names (B3,
  B7).
- Good, because each environment can be told apart. As tiers, tt02, at22 and yt01 would all be `test`.
- Bad, because the semantic conventions recommend the tier values where one applies. A tier can go in a separate
  attribute if it's ever needed.

### A4.2 Tiers

- Good, because it follows the semantic conventions' well-known values (B4).
- Bad, because it can't tell our test environments apart, and the names differ from everywhere else.

### A5.1 An allowlist

- Good, because metrics with unknown names and cardinality don't reach storage unreviewed (B5).
- Good, because adding a namespace is a deliberate change that states its cost.
- Bad, because a service that emits a new namespace sees nothing until the allowlist changes. The local stack has
  the same allowlist, so the missing metrics show before merge.

### A5.2 Every metric

- Good, because nothing a service emits is lost.
- Bad, because one library's metrics can add series across every process in every cluster, against limits we share
  (B5).

### A6.1 Metrics from services

- Good, because the service knows its units of work, their outcomes and their reasons, and names them (B1, B3).
- Bad, because each service must add metrics for its units of work beyond the HTTP ones.

### A6.2 Metrics derived from spans

- Good, because every span becomes countable without code in the service.
- Bad, because it duplicates the HTTP metrics, and its series grow with every span name and attribute it keeps (B5).
- Bad, because nobody owns the metrics' names and meaning.

## Not decided here

- Service level objectives. Alerts use thresholds until we define them.
- Telemetry from browsers, including Designer's frontend, beyond sending no trace context.
- Telemetry from apps, in [altinn-studio#19775](https://github.com/Altinn/altinn-studio/issues/19775).
