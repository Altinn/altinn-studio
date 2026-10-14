# Gateway

The gateway is Altinn Studio's API in each runtime cluster. Designer uses it to see and reconcile the apps it has
deployed there, and to read their metrics and alert rules. The gateway also reports back to Designer, with the
results of app deployments and with alerts from Grafana.

## How it fits with the rest

- Designer calls the gateway through Traefik at `/runtime/gateway/api/v1` on the cluster's apps domain, from
  [`RuntimeGatewayClient`](../../Designer/backend/src/Designer/TypedHttpClients/RuntimeGateway/RuntimeGatewayClient.cs),
  with a Maskinporten token for `altinn:studio/gateway`. More than one Studio environment (dev, staging and
  production) can deploy to the same cluster, so each request names the Studio environment it comes from.
  Production clusters accept only tokens from production Maskinporten, so only altinn.studio reaches them.
- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) deploys each app as a Flux `HelmRelease`. The
  gateway finds an app and the Studio environment that deployed it from the release's `altinn.studio/*` labels,
  or from its name, `{org}-{app}-{studio-env}`, after the release is deleted. Change both sides together.
- Flux posts the releases' events to the gateway's internal port, set up in
  [`infra/runtime/flux-config`](../../../infra/runtime/flux-config/flux-config.yaml). The gateway sends the
  results of installs, upgrades and uninstalls to the Designer that deployed the app.
- In tt02 and prod, Grafana posts alerts to the gateway through the contact point in
  [`infra/runtime/grafana-manifests`](../../../infra/runtime/grafana-manifests), which the operator routes the
  alerts for apps to. The gateway forwards them to Designer with a link to the logs.
- Metrics come from the service owner's Log Analytics workspace, read with the cluster's workload identity. The
  workspace and the identity are set up outside this repository.
- The [operator](../operator/README.md) writes the gateway's secrets: the Maskinporten client the gateway calls
  Designer with, from the environment's Key Vault, and the Grafana token. The gateway's manifests only create empty
  placeholders. Outside production, the operator can also scale the gateway down to one replica.
- The gateway is deployed to the runtime clusters like the other runtime services, see
  [Environments](../../../docs/infrastructure/environments.md#runtime-clusters).

## Developing

`make help` lists the targets. The end-to-end tests run the gateway's image in a Kind cluster with Flux, and need
Docker or Podman. The image is a native AOT build, while the unit tests run on the regular .NET runtime, so only
`make test-e2e` catches failures that occur only under AOT.

## Constraints

- The internal port has no authentication. Only its `NetworkPolicy` protects it, by admitting just the
  `flux-system` namespace, so endpoints that need authentication belong on the public port.
- In tt02 and prod, the gateway does not start until the operator has written the Grafana token.
