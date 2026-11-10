# Runtime services

These services run Altinn apps, in the cloud and on developers' machines. Most of them run in each service owner's
[runtime cluster](../../docs/infrastructure/environments.md#runtime-clusters).

- [Workflow Engine](workflow-engine/README.md) is the library that processes app workflows asynchronously. It is not
  deployed on its own.
- [Workflow Engine App](workflow-engine-app/README.md) hosts the workflow engine for Altinn apps. It runs in the
  runtime clusters of some environments and in the local environment.
- [Gateway](gateway/README.md) connects Designer to each runtime cluster.
- [Operator](operator/README.md) does the cluster-side work for apps in each runtime cluster, such as Maskinporten
  clients, secrets, alert routing and databases.
- [pdf3](pdf3/README.md) generates PDFs for apps. It runs in DIS Core, and each runtime cluster forwards requests to
  it.
- [Kubernetes Wrapper](kubernetes-wrapper/README.md) reports the deployments in a cluster. It runs in each runtime
  cluster and each Studio cluster. Designer reads an app's deployments from it.
- [Localtest](localtest/README.md) emulates the Altinn platform services that apps need to run on a developer's
  machine. studioctl runs it.
- [devenv](devenv/README.md) runs a Kind cluster like a runtime cluster for development and tests, and provides the
  container packages that studioctl uses.
- [common](common/README.md) holds code that Localtest shares with studioctl.

## Images the local environment runs

`studioctl env up` runs the newest Localtest build, and the pdf3 worker and workflow engine builds deployed to tt02,
as [studioctl's README](../cli/README.md#which-images-the-environment-runs) describes. studioctl supplies these
containers' configuration, such as ports, mounts and environment variables, and the studioctl a developer has
installed is often older than the image it pulls.

So a change that is atomic in a cluster is not atomic locally. Renaming a setting, moving a port or a health route,
or requiring a new environment variable breaks `env up` for everyone who has not updated studioctl. Keep the previous
form working for at least one studioctl release, and change studioctl in the same pull request.
