# Altinn Studio

[![DPG Badge](https://img.shields.io/badge/Verified-DPG%20-3333AB?logo=data:image/svg%2bxml;base64,PHN2ZyB3aWR0aD0iMzEiIGhlaWdodD0iMzMiIHZpZXdCb3g9IjAgMCAzMSAzMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0LjIwMDggMjEuMzY3OEwxMC4xNzM2IDE4LjAxMjRMMTEuNTIxOSAxNi40MDAzTDEzLjk5MjggMTguNDU5TDE5LjYyNjkgMTIuMjExMUwyMS4xOTA5IDEzLjYxNkwxNC4yMDA4IDIxLjM2NzhaTTI0LjYyNDEgOS4zNTEyN0wyNC44MDcxIDMuMDcyOTdMMTguODgxIDUuMTg2NjJMMTUuMzMxNCAtMi4zMzA4MmUtMDVMMTEuNzgyMSA1LjE4NjYyTDUuODU2MDEgMy4wNzI5N0w2LjAzOTA2IDkuMzUxMjdMMCAxMS4xMTc3TDMuODQ1MjEgMTYuMDg5NUwwIDIxLjA2MTJMNi4wMzkwNiAyMi44Mjc3TDUuODU2MDEgMjkuMTA2TDExLjc4MjEgMjYuOTkyM0wxNS4zMzE0IDMyLjE3OUwxOC44ODEgMjYuOTkyM0wyNC44MDcxIDI5LjEwNkwyNC42MjQxIDIyLjgyNzdMMzAuNjYzMSAyMS4wNjEyTDI2LjgxNzYgMTYuMDg5NUwzMC42NjMxIDExLjExNzdMMjQuNjI0MSA5LjM1MTI3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==)](https://digitalpublicgoods.net/r/altinn)

Altinn Studio is how Norwegian public agencies build, deploy and run digital services on Altinn 3. Service owners
build apps in Designer, from simple forms to processes with signing and payment, and switch to code where they need
to.

To build apps, start with [docs.altinn.studio](https://docs.altinn.studio) and its
[introductory course](https://docs.altinn.studio/altinn-studio/getting-started/app-dev-course/). This repository is
for developing Altinn Studio itself. [CONTRIBUTING.md](CONTRIBUTING.md) says how we work, the
[glossary](GLOSSARY.md) defines the terms we use, and [docs/](docs/README.md) holds the docs that span components.

## How it fits together

Altinn Studio has three parts:

- **Core** is the control plane, which reaches out to the other two parts. Service owners build, configure and
  deploy their apps in [Designer](src/Designer), with help from the [Studio Assistant](src/AI), and the apps'
  repositories are in [Gitea](src/gitea).
- **Runtime** is a service owner's own runtime, where its [apps](src/App) run. It is mostly data plane, such as the
  apps and the [workflow engine](src/Runtime/workflow-engine-app), with the control plane services that belong to one
  service owner, such as the [gateway](src/Runtime/gateway) and the [operator](src/Runtime/operator).
- **Platform** is the shared data plane that apps call, such as Storage, Authorization, Receipt and
  [pdf3](src/Runtime/pdf3). Most of it lives in [other repositories](docs/repositories.md#platform).

The [architecture diagram](docs/diagrams/architecture.svg) shows what runs in each part, and how a deployment and a
user's request travel between them.

App developers run apps on their own machines with [studioctl](src/cli), which runs
[localtest](src/Runtime/localtest) in place of Runtime and Platform. The code is in [src/](src), the cluster
configuration in [infra/](infra) and [charts/](charts), and the workflows in [.github/](.github/README.md).

## License

Altinn Studio is licensed under the [MIT License](LICENSE).
