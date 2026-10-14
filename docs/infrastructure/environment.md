# Environments

Where Altinn Studio's services run, how a change gets there, and where the details are.

## Runtime clusters

Each service owner has a runtime cluster per environment (at22, at23, at24, yt01, tt02 and prod). It runs the
service owner's apps and the runtime services listed in the [runtime syncroot](../../infra/runtime/syncroot).

Flux in each cluster pulls the services from a container registry. A service's deploy workflow publishes it as an
artifact and tags it with rings, and each cluster follows one ring. The rings are listed in
[`construct-environments.mjs`](../../.github/scripts/construct-environments.mjs).

- A merged change reaches the AT rings and `tt_ring1` on its own. `tt_ring2` and the production rings wait for a
  reviewer's approval. The approvals are set on the `runtime_<ring>` environments in the repository's GitHub
  settings, not in code.
- Which ring a cluster follows, its environment and its service owner are set outside this repository.

## DIS Core

DIS Core has one cluster per environment, shared by all service owners and run by Digdir's platform team. pdf3 is
moving there, and its manifests are in [`src/Runtime/pdf3/infra/syncroot`](../../src/Runtime/pdf3/infra/syncroot).
So far they set up only pdf3's identity and Key Vault, and only in at22.

DIS Core has no rings: a change goes to every environment. yt01, tt02 and prod wait for a reviewer's approval,
set on the `dis_core_<env>` environments in the repository's GitHub settings.
