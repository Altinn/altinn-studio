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

### Full profile and the alert check

The default monitoring profile is light: one storage instance per signal, written to by the proxy
directly. `--monitoring-profile full` (`make run-monitoring-full`, standard variant only) runs
production's backend instead, from `infra/observability/local/*-full`: the agents, both storage
copies and `vmagent-self`. The operator then also syncs Studio's alert rules and contact points,
and each contact point's webhook goes to an in-cluster recorder (`alert-recorder` in `grafana`)
instead of Slack.

```bash
make run-monitoring-full
make test-alerts-check   # a minute or two; fires nothing
```

The check reads everything from the running Grafana, so set `DEVENV_DASHBOARDS_REPOSITORY` (and
start the fixture again) to check the rules in your own checkout. It checks that grafana-operator
has synced every resource, that every rule evaluates healthy and notifies a contact point whose
template renders a firing and a resolved message for it, that every self-monitoring target is up,
and that each contact point delivers a test notification to the recorder. It saves a timeline, the
rendered templates and the notifications in `.cache/alert-evidence/<time>-check/`.
