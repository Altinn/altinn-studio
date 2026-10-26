# Altinn Studio

[![DPG Badge](https://img.shields.io/badge/Verified-DPG%20-3333AB?logo=data:image/svg%2bxml;base64,PHN2ZyB3aWR0aD0iMzEiIGhlaWdodD0iMzMiIHZpZXdCb3g9IjAgMCAzMSAzMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0LjIwMDggMjEuMzY3OEwxMC4xNzM2IDE4LjAxMjRMMTEuNTIxOSAxNi40MDAzTDEzLjk5MjggMTguNDU5TDE5LjYyNjkgMTIuMjExMUwyMS4xOTA5IDEzLjYxNkwxNC4yMDA4IDIxLjM2NzhaTTI0LjYyNDEgOS4zNTEyN0wyNC44MDcxIDMuMDcyOTdMMTguODgxIDUuMTg2NjJMMTUuMzMxNCAtMi4zMzA4MmUtMDVMMTEuNzgyMSA1LjE4NjYyTDUuODU2MDEgMy4wNzI5N0w2LjAzOTA2IDkuMzUxMjdMMCAxMS4xMTc3TDMuODQ1MjEgMTYuMDg5NUwwIDIxLjA2MTJMNi4wMzkwNiAyMi44Mjc3TDUuODU2MDEgMjkuMTA2TDExLjc4MjEgMjYuOTkyM0wxNS4zMzE0IDMyLjE3OUwxOC44ODEgMjYuOTkyM0wyNC44MDcxIDI5LjEwNkwyNC42MjQxIDIyLjgyNzdMMzAuNjYzMSAyMS4wNjEyTDI2LjgxNzYgMTYuMDg5NUwzMC42NjMxIDExLjExNzdMMjQuNjI0MSA5LjM1MTI3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==)](https://digitalpublicgoods.net/r/altinn)

Altinn Studio is how Norwegian public agencies build, deploy and run digital services on Altinn 3. Service owners
build apps in Designer, from simple forms to processes with signing and payment, and switch to code where they need
to. The apps run on the Altinn 3 app runtime, on clusters of their own, and call the shared Altinn Platform services.

To build apps, start with [docs.altinn.studio](https://docs.altinn.studio) and its
[introductory course](https://docs.altinn.studio/altinn-studio/getting-started/app-dev-course/). This repository is
for developing Altinn Studio itself. [CONTRIBUTING.md](CONTRIBUTING.md) says how we work, the
[glossary](GLOSSARY.md) defines the terms we use, and [docs/](docs/README.md) holds the docs that span components.

## Repository map

### Building apps

| Path                                   | What it is                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [src/Designer](src/Designer)           | Designer, the web application where app developers build and deploy apps                                                                  |
| [src/gitea](src/gitea)                 | Our image of Gitea, the Git server that holds every app's repository                                                                      |
| [src/gitea-proxy](src/gitea-proxy)     | Limits what API keys and basic authentication can reach in Gitea                                                                          |
| [src/load-balancer](src/load-balancer) | The nginx proxy in front of the Studio services                                                                                           |
| [src/AI](src/AI)                       | Studio Assistant, which changes apps from instructions in natural language, and the augmenter agent, which makes PDFs from uploaded files |
| [src/cli](src/cli)                     | `studioctl`, for running and testing apps on a developer's machine                                                                        |

### Running apps

| Path                       | What it is                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| [src/App](src/App)         | The app runtime: the backend libraries, the frontend, the app template and supporting libraries |
| [src/Runtime](src/Runtime) | The services beside the apps, such as the workflow engine, pdf3 and the operator, and localtest |

### Shared code, tests and tools

| Path                                               | What it is                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| [src/common](src/common)                           | Code shared across the repository, for .NET and TypeScript                |
| [src/test](src/test)                               | Load tests and the test apps that end-to-end tests run against            |
| [src/tools](src/tools)                             | Tools the team runs, such as the releaser and the deployment dashboard    |
| [src/ci](src/ci)                                   | The GitHub and Gitea Actions runners and what they need on the cluster    |
| [src/lhci-server](src/lhci-server)                 | The Lighthouse CI server that tracks frontend performance                 |
| [src/observability-proxy](src/observability-proxy) | Authenticates and rate-limits traffic to the Studio observability backend |

### Configuration and documentation

| Path               | What it is                                                                    |
| ------------------ | ----------------------------------------------------------------------------- |
| [infra](infra)     | The Kubernetes configuration that Flux applies to the clusters                |
| [charts](charts)   | Helm charts for Designer, Gitea, the load balancer and the Gitea runners      |
| [.github](.github) | Workflows and composite actions, and their conventions                        |
| [agents](agents)   | The Agents for working on this repository, and the skills in `agents/_skills` |
| [docs](docs)       | Docs that span components, ADRs and diagrams                                  |
| [scripts](scripts) | The spell check, and a Git hook that stops focused tests from being committed |

## License

Altinn Studio is licensed under the [MIT License](LICENSE).
