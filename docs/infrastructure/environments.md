# Environments

This page lists where our services run, how a change reaches them, and where to find the details.

## Runtime clusters

Each service owner has one cluster per environment it uses.

- The [service owner registry](https://github.com/Altinn/altinn-cdn/blob/master/orgs/altinn-orgs.json) lists the
  service owners and their environments. It calls prod `production`.
- Only `ttd` has the AT environments.
- A cluster runs the service owner's apps and the services in the [runtime syncroot](../../infra/runtime/syncroot).
- Designer deploys apps with [`deploy-app.yaml`](../../src/App/azure-pipelines/deploy-app.yaml) and the Helm chart
  from [altinn-studio-charts](https://github.com/Altinn/altinn-studio-charts).
- Other services are tagged per ring, and each cluster follows one ring.
- [`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs) lists the rings.
- By default, a merged change reaches the AT rings and `tt_ring1`. `tt_ring2` and the production rings need
  approval.
- A cluster's ring, environment and service owner are set outside this repository.

## DIS Core

DIS Core clusters are shared by Altinn's products. The platform team runs them.

- pdf3 is moving to DIS Core to serve all service owners.
- pdf3's manifests are in [`src/Runtime/pdf3/infra/syncroot`](../../src/Runtime/pdf3/infra/syncroot).
- A pdf3 change is deployed to the DIS Core environments listed in
  [`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs).
- yt01, tt02 and prod need approval.
- Runtime clusters reach DIS Core through DIS Edge.

## Studio clusters

Studio has one cluster each for dev, staging and prod. They are set up in altinn-studio-infra.

- A cluster runs Designer, Gitea with the app repositories, and the services in the
  [Studio syncroot](../../infra/studio/syncroot).
- dev, staging and prod share the runtime clusters they deploy apps to.
- Only prod deploys to the production runtime clusters.
- Deploys to prod need approval. Designer and Studio Assistant skip it by deploying to `preapproved-prod`.

## Platform cluster

The old platform cluster runs Altinn platform services such as
[altinn-storage](https://github.com/Altinn/altinn-storage), [altinn-receipt](https://github.com/Altinn/altinn-receipt)
and [altinn-file-scan](https://github.com/Altinn/altinn-file-scan).

- Each service has its own repository.
- Apps reach these services through the endpoints in the runtime [apps-config](../../infra/runtime/apps-config).
- They will move to [DIS Core](#dis-core) after pdf3.

## Adminservices

Adminservices holds shared resources that the platform team runs.

- Our resource there is the workflow engine's PostgreSQL server, in [`infra/admin`](../../infra/admin).
- A [template](../../infra/admin/workflow-engine-tenant-db-template) gives each runtime cluster its own database on
  that server.
- We deploy it only to test.

Our right to publish to DIS Core and adminservices is granted in altinn-platform's
[`infrastructure/syncroots`](https://github.com/Altinn/altinn-platform/tree/main/infrastructure/syncroots).
