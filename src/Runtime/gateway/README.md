# Gateway

The gateway is Altinn Studio's API in each [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

## How it fits with the rest

### Designer

- Designer calls the gateway through
  [`RuntimeGatewayClient`](../../Designer/backend/src/Designer/TypedHttpClients/RuntimeGateway/RuntimeGatewayClient.cs)
  to list the apps it deployed, trigger Flux to reconcile them, and read metrics and alert rules.
- The gateway's routes are under `/runtime/gateway/api/v1` on the cluster's apps domain.
- Designer sends a Maskinporten token for the `altinn:studio/gateway` scope.
- Production clusters accept only production Maskinporten tokens, which limits their callers to altinn.studio.
- Several Studio environments can deploy to the same cluster. Deploy requests name the calling Studio environment in
  the path, and `metrics/report` names it in the `originEnvironment` query parameter.

### App releases

- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) names each app's Flux `HelmRelease`
  `{org}-{app}-{studio-env}` and sets its `altinn.studio/*` labels.
- The gateway finds the app and its Studio environment in those labels. Once a release is deleted, it uses the name
  instead.
- When you change the labels or the name, change `deploy-app.yaml` and the gateway together.
- [`flux-config`](../../../infra/runtime/flux-config/flux-config.yaml) makes Flux post release events to the gateway's
  internal port.
- The gateway sends install, upgrade and uninstall results to the Designer that deployed the app.

### Alerts and metrics

- In tt02 and prod, Grafana posts alerts to the gateway through the contact point in
  [`grafana-manifests`](../../../infra/runtime/grafana-manifests).
- The gateway forwards each alert to Designer with a link to the logs.
- [`HandleAlerts`](src/Altinn.Studio.Gateway.Api/Application/Alerts/HandleAlerts.cs) picks the Designer from the
  `DesignerEnvironment` label. Nothing sets that label, so alerts always go to production Designer.
- The gateway reads metrics from the service owner's Log Analytics workspace with its own workload identity.

### The operator

- The [operator](../operator/README.md) copies the gateway's Maskinporten client from the environment's Key Vault. The
  gateway uses this client to call Designer.
- The Grafana operator creates the gateway's Grafana token. The operator then copies it to the gateway.
- Outside production, the operator's inactivity scaler can scale the gateway down.

## Developing

- `make help` lists the targets.
- `make test-e2e` runs the gateway's image in a Kind cluster with Flux. It needs Docker or Podman.
- The e2e test leaves the cluster running, and `make stop` removes it.
- The image is built with native AOT, and the unit tests are not. Only `make test-e2e` catches AOT failures.

## Constraints

- The internal port does not authenticate requests. Its `NetworkPolicy` protects it by admitting traffic from
  `flux-system` alone.
- Put endpoints that need authentication on the public port.
- In tt02 and prod, options validation requires the Grafana token. The gateway crash-loops at start until the token
  exists.
