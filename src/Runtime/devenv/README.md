# Runtime Fixture

A container runtime fixture meant for development and tests.
It should match the runtime environment for Studio apps and runtime services (pdf, operator, ...).

## Monitoring

With `IncludeMonitoring` (`--monitoring` on the fixture and on the pdf3, operator and gateway testers),
the fixture also deploys the platform observability pipeline from `infra/observability`: the runtime
collectors, the observability-proxy and a Victoria backend, with a Grafana and a Grafana MCP server.
grafana-operator syncs Studio's datasources and dashboards from `Altinn/altinn-dashboards-grafana`
into that Grafana, as it does into the shared one. See
[`infra/observability/local`](../../../infra/observability/local/README.md).

### Full profile and the alert tests

The default monitoring profile is light: one storage instance per signal, written to by the proxy
directly. `--monitoring-profile full` (`make run-monitoring-full`, standard variant only) runs
production's backend instead, from `infra/observability/local/*-full`: the agents, both storage
copies and `vmagent-self`. The operator then also syncs Studio's alert rules and contact points,
and each contact point's webhook goes to an in-cluster recorder (`alert-recorder` in `grafana`)
instead of Slack.

```bash
make run-monitoring-full
make test-alerts-check   # a minute or two; fires nothing
make test-alerts         # fire and resolve every rule with a real fault (hours)
make test-alerts-quiet   # no rule fires while the proxy, scraper and agents restart (about 25 minutes)
```

The check reads everything from the running Grafana, so set `DEVENV_DASHBOARDS_REPOSITORY` (and
start the fixture again) to check the rules in your own checkout. It checks that grafana-operator
has synced every resource, that every rule evaluates healthy and notifies a contact point whose
template renders a firing and a resolved message for it, that every self-monitoring target is up,
and that each contact point delivers a test notification to the recorder. It saves a timeline, the
rendered templates and the notifications in `.cache/alert-evidence/<time>-check/`.

`go run ./cmd/alerttest run --scenario queue-drops,heartbeat` runs some scenarios, and
`go run ./cmd/alerttest` lists them. Each checks the healthy baseline, puts a real fault in place,
waits for the rule to fire and its notification to reach the recorder with working links to the
rule and its dashboard panel, removes the fault, and waits for the rule to resolve and the resolved
notification. A scenario takes the rule's pending period plus 10 to 20 minutes, so `copy-down`
(30 minutes) is the longest. Each saves its timeline, the rule's states and the notifications in a
directory of its own.

The rules' queries, thresholds and windows are the dashboards repository's own. A fault is test
resources, such as a pod sending OTLP requests to the proxy, and overrides of fields of the stack's
own objects, such as a replica count. Each override keeps the field's original value in an
annotation on the object, and the Flux Kustomization that owns it is suspended until cleanup
restores it, so `go run ./cmd/alerttest cleanup` undoes an interrupted run. The queue scenarios
point vmagent's write to storage copy b at a pod that answers 503 and fill its real persistent
queue with paced dummy telemetry until it drops blocks (`queue-drops`) or is 70% full
(`queue-half-full`); for that they cut the queue to vmagent's minimum (512MiB) and its blocks to
1MiB, and keep the dummy metric out of copy a. To test another rule, add a `Scenario` in
`pkg/alerttest`.
