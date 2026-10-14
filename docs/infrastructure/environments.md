# Environments

Altinn Studio hosts services and applications on Kubernetes clusters:

- Studio clusters, for control plane.
- Runtime clusters, for service owner apps and our runtime-services.
- DIS Core and platform clusters for shared platform-services.
- Admin services clusters for non-dataplane shared services.

## Studio clusters

Each Studio environment has its own cluster, configured in
[altinn-studio-infra](https://dev.azure.com/brreg/altinn-studio-ops/_git/altinn-studio-infra).

- A cluster runs Designer, Gitea with the app repositories, and other supporting
  services defined in the [Studio syncroot](../../infra/studio/syncroot).
- Studio environments share runtime clusters as app deployment targets.
  Only Studio `prod` offers deployment to production runtime clusters.
- The GitHub environments `prod` and `preapproved-prod` both target the Studio
  production cluster.

## Runtime clusters

Each service owner has one runtime cluster per environment it uses.

- A cluster runs the service owner's apps and the supporting services defined
  in the [runtime syncroot](../../infra/runtime/syncroot).
- The [service owner registry](https://github.com/Altinn/altinn-cdn/blob/master/orgs/altinn-orgs.json)
  lists each service owner's environments. It names the production environment
  `production`; runtime configuration uses `prod`.
- Designer deploys apps through
  [`deploy-app.yaml`](../../src/App/azure-pipelines/deploy-app.yaml). The pipeline
  publishes the app's deployment manifests as an OCI artifact. The manifests use
  the Helm chart in [altinn-studio-charts](https://github.com/Altinn/altinn-studio-charts).
- Designer maintains the apps syncroot in the Gitea repository `als/<service-owner>-gitops`.
  The deployment pipeline publishes the syncroot as a separate OCI artifact.
  [`apps-syncroot.yaml`](../../infra/runtime/syncroot/base/apps-syncroot.yaml)
  configures Flux to read that artifact from the service owner's container registry.
- Runtime services deploy using release rings per environment. `ring1` contains only `ttd`.
  `ring2` contains the other service owners.
- The platform team manages these clusters as deployments of the DIS container runtime.
  Cluster configuration lives outside this repository.

## DIS Core

The platform team runs DIS Core clusters for services shared by Altinn's products.

- Services in DIS Core can serve multiple service owners.
- Deployments use a separate artifact tag for each environment.
- Publishing permissions are configured in
  [altinn-platform's syncroot configuration](https://github.com/Altinn/altinn-platform/tree/main/infrastructure/syncroots).

## Platform cluster

The platform cluster runs shared Altinn services.

- Services include [altinn-storage](https://github.com/Altinn/altinn-storage),
  [altinn-receipt](https://github.com/Altinn/altinn-receipt), and
  [altinn-file-scan](https://github.com/Altinn/altinn-file-scan).
  Each service has its own repository.
- Apps connect to these services through the endpoints configured in
  [`infra/runtime/apps-config`](../../infra/runtime/apps-config).

## Adminservices

The platform team runs adminservices for shared resources.

- Altinn Studio's configuration in [`infra/admin`](../../infra/admin) defines
  the workflow engine's PostgreSQL server.
- The [database template](../../infra/admin/workflow-engine-tenant-db-template)
  defines a separate database for each runtime cluster on that server.
- Publishing permissions are configured in
  [altinn-platform's syncroot configuration](https://github.com/Altinn/altinn-platform/tree/main/infrastructure/syncroots).

## Deployment configuration

Deployment targets and approvals are defined in these sources:

- [`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs)
  defines the Studio environments, runtime release rings, and DIS Core
  environments used by the deployment workflows.
- The repository's
  [GitHub environment settings](https://github.com/Altinn/altinn-studio/settings/environments)
  define deployment approval requirements.
- The [deployment workflows](../../.github/workflows) define what triggers
  a deployment and which configuration it publishes.
