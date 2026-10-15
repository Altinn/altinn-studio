# Runtime services

These services support Altinn apps in the cloud and on developers' machines.

- [Workflow Engine](workflow-engine/README.md) processes app workflows asynchronously and runs each step through an
  HTTP callback to the app.
- [Workflow Engine App](workflow-engine-app/README.md) is the deployable host of the workflow engine for Altinn apps.
- [Gateway](gateway/README.md) connects Designer to each service owner's runtime cluster.
- [Operator](operator/README.md) manages Maskinporten clients, secrets and other resources for apps in each service
  owner's runtime cluster.
- [pdf3](pdf3/README.md) generates PDFs for Altinn apps.
- [Localtest](localtest/README.md) emulates the Altinn 3 platform services that apps need to run locally.
- [devenv](devenv/README.md) is a container runtime fixture for development and tests. It matches the runtime
  environment of apps and runtime services.
- [Kubernetes Wrapper](kubernetes-wrapper/README.md) exposes information about the deployments in a Kubernetes
  cluster. Designer uses it to list an app's deployments.
- [common](common/README.md) holds code that Localtest shares with studioctl.
