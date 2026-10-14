# Gateway

The gateway is Altinn Studio's API in each [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

## How it fits with the rest

### Designer

Designer calls the gateway through
[`RuntimeGatewayClient`](../../Designer/backend/src/Designer/TypedHttpClients/RuntimeGateway/RuntimeGatewayClient.cs)
to list the apps it deployed, trigger Flux to reconcile them, and read metrics and alert rules.
Several Studio environments can deploy to the same cluster, so requests identify the calling Studio environment.

The gateway's public API uses Maskinporten authentication with the `altinn:studio/gateway` scope.
The [production configuration](src/Altinn.Studio.Gateway.Api/appsettings.prod.json) accepts only tokens from production
Maskinporten. The [authorization policy](src/Altinn.Studio.Gateway.Api/Authentication/MaskinportenAuthenticationExtensions.cs)
requires that scope.

### App releases

[`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) names each app's Flux `HelmRelease`
`{org}-{app}-{studio-env}` and sets its `altinn.studio/*` labels. The gateway uses those labels to identify the app
and the Studio environment that deployed it. After deletion, the gateway identifies the release from its name instead.
The pipeline and the gateway must use the same names and labels.

The [Flux configuration](../../../infra/runtime/flux-config/flux-config.yaml) directs release events to the gateway's
internal port. The [webhook handler](src/Altinn.Studio.Gateway.Api/Endpoints/Internal/FluxWebhookEndpoints.cs) uses the
release's Studio environment to send install, upgrade, and uninstall results to the Designer that deployed the app.

### Alerts and metrics

In `tt02` and `prod`, Grafana posts alerts through the
[gateway contact point](../../../infra/runtime/grafana-manifests/contact-points/altinn-studio-gateway.yaml).
The gateway forwards alerts to Designer with a link to the logs.
[`HandleAlerts`](src/Altinn.Studio.Gateway.Api/Application/Alerts/HandleAlerts.cs) selects the Studio environment from
the `DesignerEnvironment` label and defaults to `prod`. The
[alert rules](../../../infra/runtime/grafana-manifests/alert-rules/altinn-apps.yaml) do not set that label, so alerts from
these rules go to production Designer.

The gateway reads metrics from the service owner's Log Analytics workspace with its own workload identity.

### The operator

The [operator](../operator/README.md) copies the gateway's Maskinporten client credentials from the environment's
Key Vault. The gateway uses these credentials to call Designer. The operator also copies the Grafana token,
created by the Grafana operator, to the gateway.

Outside production, the operator's inactivity scaler can scale the gateway down.

## Deployment

The [gateway deployment workflow](../../../.github/workflows/deploy-runtime-gateway.yaml) builds the image and publishes
the deployment configuration as an OCI artifact. The
[runtime syncroot](../../../infra/runtime/syncroot/base/gateway.yaml) configures Flux to apply that artifact using the
cluster's release ring and environment. The shared [environment documentation](../../../docs/infrastructure/environments.md#deployment-configuration)
links to deployment targets and approval settings.

## Developing

The [Makefile](Makefile) defines the build and test commands. `make help` lists the targets.
`make test-e2e` runs the gateway's image in a Kind cluster with Flux and requires Docker or Podman.
The test leaves the cluster running, and `make stop` removes it.

The [Dockerfile](Dockerfile) builds the image with native AOT. Unit tests do not run that image, so the e2e tests are
needed to check behavior after AOT compilation.

## Constraints

- The internal port does not authenticate requests. Its
  [network policy](infra/kustomize/base/networkpolicy.yaml) admits traffic from `flux-system`.
  Endpoints that need authentication belong on the public port.
- In `tt02` and `prod`, [options validation](src/Altinn.Studio.Gateway.Api/Hosting/GatewayExtensions.cs) requires the Grafana
  token. The gateway cannot start until the operator supplies it.
