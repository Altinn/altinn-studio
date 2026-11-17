# Observability

How Team Studio's services report telemetry, and how we build dashboards and alerts on it.

It covers every service Team Studio owns and operates, in all three parts of Altinn Studio:

- Core, in the Studio clusters
- Runtime, in the service owners' runtime clusters
- Platform, in DIS Core and the platform cluster

[Environments](infrastructure/environments.md) describes the clusters. This guide doesn't cover telemetry from
browsers.

## How telemetry flows

- Services export traces, metrics and logs over OTLP to the router collector in their cluster.
- The router adds Kubernetes metadata and the environment, and passes everything to the gateway collector.
  Each cluster runs two of each collector, so one pod that is evicted or cannot be scheduled doesn't stop its
  telemetry.
- The gateway samples traces, filters metrics and sends all three signals through the
  [observability-proxy](../src/observability-proxy) to VictoriaMetrics, VictoriaTraces and VictoriaLogs.
- The shared Grafana reads them through four datasources: `altinn-studio-metrics`, `altinn-studio-traces`,
  `altinn-studio-logs` and `altinn-studio-traces-logsql`.
- In DIS Core, our services share the collectors in the namespace `product-studio-obs`. Services that reported to the
  platform's Azure Monitor before they moved there, such as Storage, also report to the platform's collector. The
  router sends it their telemetry unsampled. The platform's collector samples and filters it by its own rules, and
  stores it in the cluster's Application Insights and Azure Monitor Workspace. It finds each service's pod by
  `k8s.pod.uid`, so without it the telemetry looks like the router's.

[infra/observability](../infra/observability) configures the collectors.
[The pipeline's contract](#the-pipelines-contract) below lists what they do to a service's telemetry.

## Which signal for what

| Question                                                          | Signal                                 | Why                                                          |
| ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| How many, how fast, how often it fails                            | Metrics                                | The pipeline doesn't sample metrics, so counts are exact     |
| What happened in one unit of work, and why                        | The unit of work's entry span          | One searchable record with everything known about the work   |
| Something a person may need to act on, such as an exception       | A WARN or ERROR log, linked to a trace | Logs carry details, such as a stack trace, that spans do not |
| Which errors and slow requests share an attribute, such as an app | LogsQL on the trace store              | Any span attribute can be a column, and sampling keeps these |

- Anything a dashboard or an alert counts is a metric. The pipeline samples traces and drops logs below WARN, so a
  failure reason recorded only on a span or in an INFO log can't be counted.
- Every unit of work has an entry span that carries what is known about it.
- Logs are for conditions someone may need to act on. A unit of work does not log that it started or finished.

## Setting up a service

A Go or .NET service uses the shared setup, [src/common/go](../src/common/go/README.md) or
[src/common/dotnet/Altinn.Studio.Common.Telemetry](../src/common/dotnet/Altinn.Studio.Common.Telemetry). The shared
setup does what this guide asks of every service, so a service adds only its own instruments. A service in another
language follows this guide itself. When a second service in that language needs the same setup, we move it into
`src/common`.

The deployment configures the SDK through the standard `OTEL_*` variables, not the code, so one place shows how a
service reports:

- The service exports only when the deployment sets `OTEL_EXPORTER_OTLP_ENDPOINT`, so it runs without a collector
  locally.
- The deployment names the service in `OTEL_SERVICE_NAME`.
- The service exports metrics every 15 s (`OTEL_METRIC_EXPORT_INTERVAL=15000`), the interval Grafana's metrics
  datasource assumes. Code sets no interval, since an interval set in code can override the deployment's.
- The deployment adds the pod's UID to `OTEL_RESOURCE_ATTRIBUTES` as `k8s.pod.uid`. The router needs it to add the
  pod's Kubernetes metadata.

Keep metric temporality cumulative, the SDK default. VictoriaMetrics deduplicates the copies of each metric that the
pipeline writes, and that needs cumulative values.

### Resource attributes

| Attribute                     | Value                                                                                                                 | Set by                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `service.name`                | The service's short name in lowercase kebab-case, without a product prefix: `designer`, `gateway`, `pdf3-proxy`       | The deployment                          |
| `service.version`             | The build the image comes from, the same value as the image tag. `dev` for a local build                              | The build                               |
| `service.instance.id`         | A UUID the process generates when it starts, so a restart gets a new one even in the same pod. Not an Altinn instance | The shared setup                        |
| `deployment.environment.name` | Altinn's name for the environment the service runs in, such as `prod`, `tt02` or `local`                              | The router. Services don't set it       |
| `altinn.service_owner`        | The service owner's `org`, such as `ttd`, where a cluster serves one service owner                                    | The router in a service owner's cluster |

A service with more than one kind of process, such as pdf3's proxy and worker, gives each its own `service.name`.

### Every process reports when it started

Each process exports the gauge `altinn.workload.start_time`, unit `s`, whose value is the process start time in Unix
seconds. The process reports it at every collection, even when idle. Together with `service.instance.id` and
`service.version`, the gauge gives dashboards the number of running processes, a mark for each restart or scale-up, and
a mark for each deploy, without lookups in Kubernetes or the deploy pipeline.

### Probes

Health and readiness probes are not traffic. Services leave them out of traces and out of the request metrics, so
request rates and latencies show only real callers.

## Units of work and the entry span

A unit of work is one thing a service does for someone: a request, a message, an item from a work queue, a run of a
scheduled job or one reconcile. The entry span is the first span the service starts for it. Its kind is the one the
semantic conventions give: SERVER for a request, CONSUMER for a message or a work queue item, and INTERNAL for a
scheduled job.

The entry span is the unit of work's wide event. The service builds it up while the work runs, and code deep in the
work adds to it. It carries:

- the [shared attributes](#shared-vocabulary) that apply, such as the service owner and the app
- the outcome, and `error.type` when the work failed
- time spent in each expensive phase, and the time the work waited in a queue
- counts and summaries of downstream calls and retries
- sizes and other values that explain the outcome

Tens of attributes are fine. The SDKs keep 128 attributes per span by default, and that is the practical limit.
High-cardinality values, such as an instance GUID, belong on spans. A child span repeats a shared attribute only when
its value differs within the unit of work, such as one environment in a loop over several.

## Traces

### What a trace holds

A trace holds one unit of work. The exception is a flow we choose to follow end to end across our systems as one
trace, such as deploying an app through Designer, Azure DevOps, the gateway and Flux.

- Give synchronous work its own child span where it helps to see it in the trace view, such as outbound calls,
  database calls and expensive phases.
- A retried HTTP request is a sibling span with `http.request.resend_count`.
- Work that outlives the request that started it, such as a queued, scheduled or batched job, runs in its own trace
  and links back to where it was created. Add the link when the span starts, so the sampler sees it.
- Put the correlation keys, such as the instance GUID or the build ID, on both sides of a link. Grafana follows links
  only one way, and searching by the key finds either side.
- A long-lived connection, such as a WebSocket or a SignalR connection, is not a unit of work. Each message or call on
  it is. The connection stays out of traces, since its duration says nothing about latency.
- A service continues the trace context it receives, including at our edge, which can't tell our systems from other
  clients. A client must not join unrelated work into one trace. Browser clients send no trace context.

### Span names

A span name identifies a kind of operation, never one occurrence. VictoriaTraces uses it in its storage key, and
Grafana lists traces by their root span's name.

- Span names never contain IDs or other values from the request.
- Spans from instrumentation libraries keep the names the semantic conventions give, such as
  `GET /designer/api/{org}/{app}/validation`. `http.route` is the route template without its constraints.
- Our own spans are named `<area>.<operation>`, lowercase, with snake_case within a segment: `git.push`,
  `pdf.generate`, `maskinporten.reconcile`. Not class and method names, which change when the code is refactored.
- Where our load balancer sits in front of a service, as in Core, its span is the trace's root and
  names the trace. The service returns the route template it matched in a response header, and the load balancer
  names its span after it and removes the header. Without the header, the load balancer uses a fixed name for the
  location.

### Errors

When a unit of work fails, the service:

- sets the span status to error, with a message
- sets `error.type` to a low-cardinality value: the exception's type, or the failed step in snake_case
- logs one ERROR record with the exception and its stack trace, in the span's context

Our code adds no span events, and records no exception events. OpenTelemetry is deprecating the Span Events API, and
the trace store can't search event attributes. Events that an instrumentation library adds may stay until the SDKs
stop adding them.

An expected outcome is not an error. A 4xx response leaves a server span's status unset and gets no `error.type`, as
the semantic conventions say. When the reason matters, such as the error code a client gets, the service records it
in its own attribute on the entry span.

The caller's client span still marks every 4xx as an error, and can't tell a missing route from a valid request that
found nothing. So an API answers such a request with a 2xx and an empty result, and keeps 404 for missing routes or
other cases where the request really is an error.

### Sampling

The gateway keeps every trace that has an error span, takes longer than a second, or is marked to be kept. It keeps a
share of the rest. The [gateway's configuration](../infra/observability/base/gateway.yaml) has the numbers.

- A service marks a trace to be kept with `altinn.sampling=always` on any span. Mark only units of work that are
  rare and where each one matters, such as a deploy, an alert or a notification. Never mark a service's ordinary
  traffic.
- The sampler decides per trace, so a link can point to a trace it dropped. Mark the producer side when the linked
  trace matters.
- Counts, rates and latencies come from metrics, never from stored spans.

## Semantic conventions and names

Telemetry follows the [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/) wherever they
cover it. That includes span names and kinds, metrics and attributes, and telemetry we write ourselves as well as what
instrumentation libraries emit. Use the stable names where they exist. Where a convention is still in development, use
its current names. Our own `altinn.` names are only for what the conventions don't cover.

- Use a convention's attributes and metrics as they are. Never give one another meaning, and never add an `altinn.`
  copy of one.
- Our own attributes and metrics start with `altinn.`. Names are lowercase, with `.` between segments and snake_case
  within one: `altinn.designer.git.pull.merge_status`.
- A concept in the [shared vocabulary](#shared-vocabulary) is `altinn.<concept>`. Anything specific to one service is
  `altinn.<service>.…`, where `<service>` is the service's name in snake_case: `altinn.designer`, `altinn.pdf3`,
  `altinn.workflow_engine`. All the processes of a service share it.
- There is no `studio` segment. Every service here is the team's, and which product a service belongs to changes more
  often than its name.
- When a second service needs a concept with the same meaning, the concept moves to the shared vocabulary.
- No name is both a value and a prefix of another name. With `altinn.pdf3.panic` as a value,
  `altinn.pdf3.panic.stack` is not allowed.
- Values are the identifiers Altinn already uses, lowercase as in URLs and `applicationmetadata.json`: `ttd` and
  `my-app`, not `ttd/my-app`. A value from a fixed set is lowercase snake_case.
- Each service keeps its attribute names in one place in its code, as constants. Call sites don't use string
  literals for names.

### Shared vocabulary

| Concept                                    | Attribute                        | Where                                                                                                                   | On metrics                                       |
| ------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Service owner                              | `altinn.service_owner`           | Resource where the value is fixed for the process. Span, metric and log attribute in shared services                    | Yes                                              |
| App                                        | `altinn.app`                     | Resource in apps. Span, metric and log attribute in shared services. In Designer, only when `altinn.repo_type` is `app` | Yes. Shared services raise the cardinality limit |
| Environment the service runs in            | `deployment.environment.name`    | Resource, set by the router                                                                                             | Yes                                              |
| Runtime environment an operation targets   | `altinn.environment`             | Span, metric and log attribute in services outside the runtime, such as Designer deploying to `tt02`                    | Yes                                              |
| Repository type                            | `altinn.repo_type`               | Span, metric and log attribute wherever work concerns a Studio repository                                               | Yes                                              |
| App library version                        | `altinn.app_lib.version`         | Resource in v9 apps. Missing means v8                                                                                   | Yes                                              |
| Process task type                          | `altinn.process.task.type`       | Span, metric and log attribute                                                                                          | Yes                                              |
| Process task                               | `altinn.process.task.id`         | Span and log attribute. Metric attribute within an app                                                                  | Within an app only                               |
| Instance                                   | `altinn.instance.guid`           | Span and log attribute, on both sides of linked work                                                                    | No                                               |
| Instance owner                             | `altinn.instance.owner.party.id` | Span and log attribute                                                                                                  | No                                               |
| The user or system a unit of work acts for | `enduser.id`                     | Span and log attribute. The ID the system that authenticated them uses, such as a Studio username or an Altinn user ID  | No                                               |
| App deploy                                 | `altinn.app_deploy.build.id`     | Span and log attribute on every part of a deploy                                                                        | No                                               |

- The same key is a resource attribute where the value is fixed for the process, as in an app or in a service owner's
  own cluster, and a span, metric or log attribute where it varies per unit of work, as in a shared service.
  VictoriaMetrics turns resource attributes into labels, so a query finds the value either way.
- `altinn.service_owner` is the service owner's short name, `org` in Altinn, such as `ttd`.
- `altinn.app` is the app's name without the service owner, so it is always used with `altinn.service_owner`.
- `deployment.environment.name` and `altinn.environment` use Altinn's environment names, as in the infrastructure, and
  not the semantic conventions' tiers. tt02, at22 and yt01 would all be `test` as tiers. `altinn.environment` is always
  a runtime environment's name, such as `prod`, never `production` and never a Studio environment. Runtime services
  don't set it, since their own `deployment.environment.name` is the environment.
- `altinn.repo_type` is one of `app`, `datamodels`, `content` and `resources`.

### Cardinality

Every combination of metric attribute values is a series, in each process, for each histogram bucket. VictoriaMetrics
limits how many new series it accepts per hour and per day, and everything we store shares that limit.

- A metric attribute takes values from a small, bounded set. What counts is how many values an attribute has, not
  whether it is an ID.
  - An ID with few values may go on a metric, such as `service.instance.id`, which changes only when a process
    starts, or a process task ID within an app.
  - An ID whose values grow with traffic or data never does, such as an instance GUID, a party ID or a user ID.
  - Neither do URLs, paths, free text, error messages and usernames.
- Resource attributes become labels on every metric the process emits. Keep them to the ones listed here and the ones
  the pipeline adds.
- `altinn.service_owner` and `altinn.app` are allowed on metrics. There are 500 to 1000 apps, so a shared service that
  puts both on a metric raises the SDK's cardinality limit for it. By default the SDKs keep 2000 attribute sets per
  metric per process and merge the rest into one series marked `otel.metric.overflow`.
- Count the series before adding an attribute to a histogram: buckets × attribute sets × processes. A rollout creates
  that many new series again, since the new processes have new resource attributes.

## Metrics

- Add a metric for anything a dashboard counts or an alert fires on.
- Prefer adding a bounded attribute to a standard metric over a new metric for the same thing. For example, a service
  that needs requests per caller adds the caller to `http.server.request.duration` instead of counting requests in a
  metric of its own.
- Name a new metric `altinn.<service>.<thing>` and follow the
  [semantic conventions' metric naming](https://opentelemetry.io/docs/specs/semconv/general/metrics/): the unit goes
  in the unit field and not in the name, durations are histograms named `….duration` in seconds, and counters are
  named for what they count, without `_total`.
- `altinn.workload.start_time` is the one metric outside `altinn.<service>.…` that every service emits under the same
  name.
- Give a histogram explicit bucket boundaries when the default ones don't cover the latencies the service sees.
- When a gauge has one value for the whole cluster, such as which process is the leader, only one process reports
  it. A second process during a rollout then doesn't double it.
- Metrics resolve detail down to about a minute. Finer detail comes from traces.
- We don't use exemplars. VictoriaMetrics doesn't store them.

## Logs

- Logs are structured and go through the OpenTelemetry log bridge, so each record carries the trace and span ID of the
  work it belongs to.
- The message is a constant text. Values go in attributes, with the same names as on spans.
- ERROR means a unit of work failed, or something needs a person to act. WARN means the service handled something
  that someone should look at, such as a dependency that needed a retry. INFO and DEBUG are for the console and local
  work.
- Services export only WARN and above, and the router drops anything below WARN, including records without a
  severity. The console still gets every level.
- A unit of work that could log the same warning many times logs a limited number, then one record with the count of
  the rest.
- Components we don't write, such as Gitea and nginx, follow this guide as far as they can. When one can export over
  OTLP, we configure it to send its telemetry through the pipeline like our own services.

## Sensitive data

These never go in telemetry, whether in an attribute, a URL, a span name or a log message:

- national identity numbers, such as fødselsnummer and D-nummer
- names, email addresses, phone numbers and postal addresses
- secrets, such as tokens, passwords, API keys, cookie values, signed URLs and webhook URLs
- request and response bodies, form data, data elements, files, and text that users write, such as messages to the
  assistant
- query strings

Identifiers that our systems assign, such as party IDs, user IDs, instance GUIDs, organization numbers and Studio
usernames, may be on spans and logs. Their values grow with use, so they never go on metrics.

- Record a URL without its query string, fragment and user info. When a URL's path can carry a secret or a national
  identity number, record its route template instead, or redact it.
- To describe a payload, record its size, type or count, not its content.
- The service that emits telemetry is responsible for keeping these out of it. The pipeline doesn't redact.

## The pipeline's contract

This section lists what the collectors do to a service's telemetry. Services rely on it and don't repeat it. A pull
request that changes what the collectors do, in [infra/observability](../infra/observability), also updates this
section.

- The router sets `deployment.environment.name` from the cluster, overwriting any value a service sets.
- In a service owner's own cluster, the router sets `altinn.service_owner` on the resource, unless the service has set
  it.
- The router adds the pod's Kubernetes metadata to the resource. It finds the pod by `k8s.pod.uid`. In DIS Core,
  where the collectors may not read pods, the deployment sets the pod's metadata in `OTEL_RESOURCE_ATTRIBUTES`
  instead, as pdf3's does.
- The router drops logs below WARN.
- The router drops the `http.client.*` data points of a service's own exports to the router.
- The gateway keeps only the metrics in its allowlist: our own (`altinn.*`), and the semantic conventions'
  namespaces that our services emit, such as `http.*`, `signalr.server.*`, `cicd.*` and the language runtimes'
  `dotnet.*` and `go.*`. A service that needs another namespace adds it to the allowlist, with the number of series
  it adds per process.
- The gateway samples traces, as [Sampling](#sampling) describes. A service sets `altinn.sampling` only to mark a
  trace to be kept.

The pipeline doesn't derive metrics from spans. A service emits the metrics it needs itself.

## Querying

| Datasource                    | Use it for                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `altinn-studio-metrics`       | Counts, rates, latencies and anything an alert fires on                                                                      |
| `altinn-studio-traces`        | Finding and reading traces with TraceQL, and TraceQL metrics panels on errors and slow requests                              |
| `altinn-studio-traces-logsql` | Listing and breaking down errors and slow requests by any span attribute, such as the user or the app. Not counts of traffic |
| `altinn-studio-logs`          | WARN and ERROR records, and the logs of a trace                                                                              |

- VictoriaMetrics stores metrics under their dotted OpenTelemetry names, such as
  `{"http.server.request.duration_bucket"}`.
- Use `$__rate_interval` for rates. VictoriaMetrics returns 0, not a gap, for a window that holds no new sample, so a
  window shorter than the export interval gives wrong answers.
- Grafana links a trace to its logs, and a log to its trace.
- A query on the LogsQL datasource filters on a span field, such as the service or `name:*`, since the same data holds
  one index row per trace.

The stack can't do these, so don't design telemetry that needs them:

- search on span event attributes or link attributes
- structural TraceQL queries (`>`, `>>`, `~`), and the service structure tab in Traces Drilldown
- follow a link backwards, to the traces that link to a trace
- show a linked trace that sampling dropped. Grafana opens an empty pane
- exemplars on metrics, and a service map

## Dashboards

- Dashboards live in [Altinn/altinn-dashboards-grafana](https://github.com/Altinn/altinn-dashboards-grafana), under
  `products/studio/dashboards`. Edit them in Git. The next sync overwrites changes made in Grafana's UI.
- Each service has one dashboard, named after the service. Dashboards that span services, such as one for app
  deploys, are named for what they show.
- Panels use the shared datasources' UIDs, not a datasource variable.
- Variables use the shared names: `deployment.environment.name` for the environment, and `altinn.service_owner` and
  `altinn.app` where they apply.
- Panels set no minimum interval. The datasource's `timeInterval` is enough.
- A service's dashboard shows:
  - its processes, restarts and deploys, from `altinn.workload.start_time`
  - the traffic, errors and latency of each kind of unit of work it handles
  - the metrics of its own work, such as queues and retries
  - links to the traces and logs for the same selection and time range
- Build and check a dashboard against a local stack, which has the same datasource UIDs. It then works in the shared
  Grafana unchanged.

## Alerts

- Alerts fire on metrics only. Traces are sampled and logs are filtered, so neither gives a reliable count.
- Alert on what callers notice, or will soon: units of work that fail or are slow, work that has stopped happening,
  and limits that are close, such as a full queue or expiring credentials. Don't alert on a cause, such as CPU use,
  unless it predicts one of these.
- Each alert's summary says what is wrong. Its description says what it affects and where to look first, with a link
  to the dashboard.
- Alert rules live next to the dashboards, in `products/studio/alerting`, and follow that repository's conventions for
  labels and routing. `Severity: Critical` is for something that needs action now. Other alerts wait for working
  hours.
- We don't define SLOs yet.

## Working on telemetry

- Before you merge, look at the telemetry in a local stack.
  - For services in Core, Runtime and Platform, use the
    [devenv monitoring stack](../infra/observability/local/README.md). It runs the production pipeline, with its
    allowlist, log filter and sampling, and has Grafana and a Grafana MCP server.
  - For apps and the services that run with localtest, such as the workflow engine, use
    `studioctl env up --monitoring`. It keeps every signal and level, so it shows telemetry that production drops,
    such as INFO logs and metrics outside the allowlist.
- Test the telemetry that dashboards and alerts use, with in-memory exporters: the names, the attributes, and that the
  metric is emitted when it should be.
- A reviewer checks that:
  - every unit of work has an entry span with the shared attributes that apply
  - counts and rates that someone needs come from metrics
  - names follow this guide, and new metric attributes are bounded
  - no sensitive data reaches telemetry
  - failures set the status, `error.type` and one ERROR log
  - the change works through the pipeline, as the local stack shows

## Exceptions

When a service can't follow a rule, the pull request that needs the exception adds it to this table, with the reason.
The team decides in review.

| Service             | Rule                                          | Instead                                                                                             | Why                                                                                             |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| observability-proxy | Metrics over OTLP, named `altinn.<service>.…` | vmagent scrapes its metrics every 30 s, under Prometheus names, and writes them directly to storage | OTLP from the proxy goes through the proxy itself, so a broken proxy would hide its own metrics |
