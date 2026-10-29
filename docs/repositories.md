# Related repositories

New code goes in this repository. The repositories below are owned by other teams, are legacy, or are still moving
into it, so read a repository's own README and recent history before you change it.

## Studio and apps

| Repository                                                                                    | What it is                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [altinn-studio-docs](https://github.com/Altinn/altinn-studio-docs)                            | The source of [docs.altinn.studio](https://docs.altinn.studio), for service owners, app developers and other Altinn products                                |
| [altinn-studio-charts](https://github.com/Altinn/altinn-studio-charts)                        | The Helm chart that [`deploy-app.yaml`](../src/App/azure-pipelines/deploy-app.yaml) deploys apps with                                                       |
| [altinn-studio-infra](https://dev.azure.com/brreg/altinn-studio-ops/_git/altinn-studio-infra) | Infrastructure for the Studio clusters, in Azure DevOps                                                                                                     |
| [altinn-cdn](https://github.com/Altinn/altinn-cdn)                                            | Files on the Altinn CDN, such as the [service owner registry](https://github.com/Altinn/altinn-cdn/blob/master/orgs/altinn-orgs.json)                       |
| [app-lib-dotnet](https://github.com/Altinn/app-lib-dotnet)                                    | The app backend libraries for v8 apps. Fixes land there first and are merged into `src/App/backend` by an [upstream sync](../src/App/docs/upstream-sync.md) |
| [app-frontend-react](https://github.com/Altinn/app-frontend-react)                            | The app frontend for v8 apps                                                                                                                                |
| [app-localtest](https://github.com/Altinn/app-localtest)                                      | The old home of [localtest](../src/Runtime/localtest/README.md), soon archived                                                                              |
| [digdir-agents](https://github.com/digdir/digdir-agents)                                      | `agentctl` and the base image that the [Agents](../agents/README.md) build on                                                                               |

## Platform

[altinn-platform](https://github.com/Altinn/altinn-platform) belongs to the platform team, who run DIS Core, DIS Edge
and adminservices. It documents the DIS operators and their resources, and configures who may publish to those
clusters. [Environments](infrastructure/environments.md) describes how we use them.

The platform services that apps call each have their own repository:
[altinn-storage](https://github.com/Altinn/altinn-storage),
[altinn-file-scan](https://github.com/Altinn/altinn-file-scan),
[altinn-receipt](https://github.com/Altinn/altinn-receipt),
[altinn-auth](https://github.com/Altinn/altinn-auth) for authentication and authorization,
[altinn-register](https://github.com/Altinn/altinn-register),
[altinn-profile](https://github.com/Altinn/altinn-profile),
[altinn-notifications](https://github.com/Altinn/altinn-notifications),
[altinn-correspondence](https://github.com/Altinn/altinn-correspondence)
and [altinn-events](https://github.com/Altinn/altinn-events).

[altinn-decision-log](https://github.com/Altinn/altinn-decision-log) records architecture and design decisions
across Altinn's teams and products. Decisions for this repository are in [docs/adr/](adr/).
