# Runtime Fixture

A container runtime fixture meant for development and tests.
It should match the runtime environment for Studio apps and runtime services (pdf, operator, ...).

## Monitoring

With `IncludeMonitoring` (`--monitoring` on the fixture and on the pdf3, operator and gateway testers),
the fixture also deploys the platform observability pipeline from `infra/observability`: the runtime
collectors, the observability-proxy and a Victoria backend, with a Grafana and a Grafana MCP server
that load Studio's datasources and dashboards from `Altinn/altinn-dashboards-grafana`. See
[`infra/observability/local`](../../../infra/observability/local/README.md).

### Full profile and alert tests

The default monitoring profile is light: one storage instance per signal, written to by the
proxy directly. `--monitoring-profile full` (`make run-monitoring-full`, standard variant only)
runs production's backend instead, from `infra/observability/local/*-full`: the agents, both
storage copies and `vmagent-self`. Grafana then also loads Studio's alert rules, contact points
and notification templates from the dashboards repository, with each contact point's webhook
sent to an in-cluster recorder (`alert-recorder` in `grafana`) instead of Slack.

```bash
make test-alerts-check   # every rule's queries and message template, healthy state (a few minutes)
make test-alerts         # fire and resolve rules with real faults (about 15 minutes)
```

Both start or update the fixture first (`--skip-fixture` skips that) and save their evidence in
`.cache/alert-evidence/<time>-<command>/`: `timeline.log`, the raw notifications in
`notifications.json`, a readable preview of them in `notifications.html`, and the rule's state at
each step. They read the rules from the running Grafana, so set `DEVENV_DASHBOARDS_REPOSITORY`
to test rules from your own checkout. A run cleans up after itself; if it was interrupted,
`go run ./cmd/alerttest cleanup` removes what it left.

The `queue-drops` scenario fires `studio-obs-agent-queue-drops-prod` for real: vmagent's write to
storage copy b goes to a destination that answers 503, paced dummy telemetry fills vmagent's
persistent queue for that copy until it drops blocks, and `vmagent-self` scrapes the drop counter
into the metrics storage. The rule fires, the notification reaches the recorder with links to
the Observability dashboard's panel and the rule, the destination then accepts again, the queue
drains, and after the rule's five-minute window the resolved notification arrives. While it runs,
Flux reconciliation of `observability-victoria` is suspended and the agent's queue is cut to
vmagent's minimum (512MiB), its blocks to 1MiB, and the dummy metric kept out of copy a; all of
that is restored afterwards. To test another rule, add a `Scenario` in `pkg/alerttest`.

See the recorder's preview and Grafana with:

```bash
kubectl -n grafana port-forward svc/alert-recorder 8081:80   # http://localhost:8081
kubectl -n grafana port-forward svc/grafana 3000:80          # http://localhost:3000, as the links expect
```
