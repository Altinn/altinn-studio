# Environments

Where Altinn Studio's services run, how a change gets there, and where the details are.

## Runtime clusters

A service owner has a runtime cluster in each environment it uses. Service owners with a cluster have one in tt02,
and most also in prod. A few also have yt01, and only `ttd` has at22, at23 and at24. The
[service owner registry](https://github.com/Altinn/altinn-cdn/blob/master/orgs/altinn-orgs.json) lists the
service owners and their environments, with prod listed as `production`. A cluster runs the service owner's apps
and the runtime services listed in the [runtime syncroot](../../infra/runtime/syncroot).

Flux in each cluster pulls the services from a container registry. A service's deploy workflow publishes it as an
artifact and tags it with rings, and each cluster follows one ring. The rings are listed in
[`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs).

- A merged change reaches the AT rings and `tt_ring1` on its own. `tt_ring2` and the production rings wait for a
  reviewer's approval. The approvals are set on the `runtime_<ring>` environments in the repository's GitHub
  settings, not in code.
- Which ring a cluster follows, its environment and its service owner are set outside this repository.

## DIS Core

DIS Core has one cluster in each environment except at24, shared by all service owners and run by Digdir's
platform team. pdf3 is moving there, and its manifests are in
[`src/Runtime/pdf3/infra/syncroot`](../../src/Runtime/pdf3/infra/syncroot). So far they set up only pdf3's
identity and Key Vault, and only in at22.

DIS Core has no rings: a change goes to all its clusters. yt01, tt02 and prod wait for a reviewer's approval,
set on the `dis_core_<env>` environments in the repository's GitHub settings.

## Studio clusters

Studio has three environments, dev, staging and prod, with one cluster each, at dev.altinn.studio,
staging.altinn.studio and altinn.studio. A cluster runs Designer, Gitea with the app repositories, and the other
Studio services listed in the [Studio syncroot](../../infra/studio/syncroot). prod also runs the services added in
its `prod` overlay. The clusters, and Flux's link to the syncroot, are set up in altinn-studio-infra, which is not
public.

Flux in each cluster pulls the syncroot tagged with the cluster's environment, and the services it lists, from a
container registry. A service's deploy workflow publishes it for each environment it deploys to. The environments
are listed in [`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs).

- A merged change goes to dev, staging and prod, except for the few services that only run in prod. prod waits for
  a reviewer's approval and accepts only deployments from `main`. Both are set on the `prod` environment in the
  repository's GitHub settings, not in code.
- Designer and Studio Assistant deploy to prod through the `preapproved-prod` environment instead, which needs no
  approval. A merged change to Designer goes to staging and prod on its own, and to dev only when its workflow is
  run by hand.

## Platform clusters

The old platform cluster runs Altinn platform services such as
[altinn-storage](https://github.com/Altinn/altinn-storage), [altinn-receipt](https://github.com/Altinn/altinn-receipt)
and [altinn-file-scan](https://github.com/Altinn/altinn-file-scan), and the platform cluster's pdf-generator. They
live in their own repositories, and nothing in this repository deploys them. Apps reach storage and the other platform
services through the endpoints in the runtime [apps-config](../../infra/runtime/apps-config). After pdf3, these
services move to [DIS Core](#dis-core).

## Adminservices

Adminservices is run by Digdir's platform team, in a test and a prod environment, for shared resources managed by the
DIS operators. Ours is the workflow engine's PostgreSQL server, in
[`infra/admin/workflow-engine-db`](../../infra/admin/workflow-engine-db) and listed in the
[admin syncroot](../../infra/admin/syncroot). A
[template](../../infra/admin/workflow-engine-tenant-db-template) for one database per runtime cluster on that server
is published but not listed in the syncroot. It is meant to be applied for each runtime cluster from outside this
repository ([#19150](https://github.com/Altinn/altinn-studio/pull/19150)).

Flux in the cluster pulls the admin syncroot, and the artifacts it lists, from a container registry. Which tag the
cluster follows is set up by the platform team, and the right to publish is granted in altinn-platform's
[`infrastructure/syncroots`](https://github.com/Altinn/altinn-platform/tree/main/infrastructure/syncroots).

- So far only test gets changes. A merged change is tagged `test` through the `adminservices_test` environment,
  which needs no approval. No workflow tags `prod`, so the `prod` folders are not deployed.
