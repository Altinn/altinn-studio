# Environments

Where our services run, how a change gets there, and where the details are.

## Runtime clusters

Each service owner has one cluster per environment it uses.

- The [service owner registry](https://github.com/Altinn/altinn-cdn/blob/master/orgs/altinn-orgs.json) lists the
  service owners and their environments, with prod as `production`. Only `ttd` has the AT environments.
- A cluster runs the service owner's apps and the services in the [runtime syncroot](../../infra/runtime/syncroot).
- Designer deploys apps through [`deploy-app.yaml`](../../src/App/azure-pipelines/deploy-app.yaml), with the Helm
  chart from [altinn-studio-charts](https://github.com/Altinn/altinn-studio-charts).
- Other services are tagged with rings, and each cluster follows one. The rings are listed in
  [`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs).
- By default, a merged change reaches the AT rings and `tt_ring1`. `tt_ring2` and the production rings need
  approval.
- A cluster's ring, environment and service owner are set outside this repository.

## DIS Core

Clusters shared by Altinn's products, run by the platform team.

- pdf3 is moving there, to serve all service owners. Its manifests are in
  [`src/Runtime/pdf3/infra/syncroot`](../../src/Runtime/pdf3/infra/syncroot).
- The environments we deploy pdf3 to are listed in
  [`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs).
- Runtime clusters reach DIS Core through DIS Edge.
- No rings: a change goes to all environments. yt01, tt02 and prod need approval.

## Studio clusters

One cluster each for dev, staging and prod, set up in altinn-studio-infra.

- A cluster runs Designer, Gitea with the app repositories, and the services in the
  [Studio syncroot](../../infra/studio/syncroot).
- All three deploy apps to the same runtime clusters. Only prod reaches the production runtime clusters.
- prod needs approval. Designer and Studio Assistant use `preapproved-prod`, which needs none.

## Platform cluster

The old platform cluster runs Altinn platform services such as
[altinn-storage](https://github.com/Altinn/altinn-storage), [altinn-receipt](https://github.com/Altinn/altinn-receipt)
and [altinn-file-scan](https://github.com/Altinn/altinn-file-scan).

- They live in their own repositories. Nothing here deploys them.
- Apps reach them through the endpoints in the runtime [apps-config](../../infra/runtime/apps-config).
- They move to [DIS Core](#dis-core) after pdf3.

## Adminservices

Shared resources run by the platform team.

- Ours is the workflow engine's PostgreSQL server, in [`infra/admin`](../../infra/admin). A
  [template](../../infra/admin/workflow-engine-tenant-db-template) gives each runtime cluster its own database on
  that server.
- Only test is deployed.

The right to publish to DIS Core and adminservices is granted in altinn-platform's
[`infrastructure/syncroots`](https://github.com/Altinn/altinn-platform/tree/main/infrastructure/syncroots).
