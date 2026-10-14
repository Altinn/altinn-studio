# Gateway

The gateway is Altinn Studio's API in each [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

## How it fits with the rest

- Designer calls the gateway from
  [`RuntimeGatewayClient`](../../Designer/backend/src/Designer/TypedHttpClients/RuntimeGateway/RuntimeGatewayClient.cs)
  to list the apps it deployed, trigger Flux to reconcile them, and read metrics and alert rules.
- The route is `/runtime/gateway/api/v1` on the cluster's apps domain, with a Maskinporten token for
  `altinn:studio/gateway`.
- Production clusters accept only production Maskinporten tokens, so only altinn.studio reaches them.
- Several Studio environments can deploy to one cluster. Deploy requests name theirs in the path, and
  `metrics/report` in `originEnvironment`.
- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) sets the `altinn.studio/*` labels and the
  `{org}-{app}-{studio-env}` name of each app's Flux `HelmRelease`.
- The gateway identifies an app and its Studio environment by those labels, or by the name once the release is
  deleted. Change both sides together.
- Flux posts release events to the gateway's internal port, set up in
  [`flux-config`](../../../infra/runtime/flux-config/flux-config.yaml). The gateway sends install, upgrade and
  uninstall results to the Designer that deployed the app.
- In tt02 and prod, Grafana posts alerts to the contact point in
  [`grafana-manifests`](../../../infra/runtime/grafana-manifests). The gateway forwards them to Designer with a link
  to the logs.
- Alerts always go to production Designer, since nothing sets the `DesignerEnvironment` label that
  [`HandleAlerts`](src/Altinn.Studio.Gateway.Api/Application/Alerts/HandleAlerts.cs) reads.
- Metrics come from the service owner's Log Analytics workspace, read with the gateway's own workload identity. Both
  are set up outside this repository.
- The [operator](../operator/README.md) copies the Maskinporten client the gateway calls Designer with from the
  environment's Key Vault.
- The Grafana operator creates the gateway's Grafana token, and our operator copies it to the gateway.
- Outside production, the operator's inactivity scaler can scale the gateway down; see its
  [README](../operator/README.md).

## Developing

- `make help` lists the targets.
- `make test-e2e` runs the gateway's image in a Kind cluster with Flux, and needs Docker or Podman. It leaves the
  cluster running; `make stop` removes it.
- The image is a native AOT build and the unit tests are not, so only `make test-e2e` catches AOT failures.

## Constraints

- The internal port has no authentication. Only its `NetworkPolicy`, admitting just `flux-system`, protects it, so
  endpoints that need authentication belong on the public port.
- In tt02 and prod, the gateway crash-loops at start until the Grafana token exists, since options validation
  requires it.
