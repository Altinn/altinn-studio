# Altinn Studio

[![DPG Badge](https://img.shields.io/badge/Verified-DPG%20-3333AB?logo=data:image/svg%2bxml;base64,PHN2ZyB3aWR0aD0iMzEiIGhlaWdodD0iMzMiIHZpZXdCb3g9IjAgMCAzMSAzMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0LjIwMDggMjEuMzY3OEwxMC4xNzM2IDE4LjAxMjRMMTEuNTIxOSAxNi40MDAzTDEzLjk5MjggMTguNDU5TDE5LjYyNjkgMTIuMjExMUwyMS4xOTA5IDEzLjYxNkwxNC4yMDA4IDIxLjM2NzhaTTI0LjYyNDEgOS4zNTEyN0wyNC44MDcxIDMuMDcyOTdMMTguODgxIDUuMTg2NjJMMTUuMzMxNCAtMi4zMzA4MmUtMDVMMTEuNzgyMSA1LjE4NjYyTDUuODU2MDEgMy4wNzI5N0w2LjAzOTA2IDkuMzUxMjdMMCAxMS4xMTc3TDMuODQ1MjEgMTYuMDg5NUwwIDIxLjA2MTJMNi4wMzkwNiAyMi44Mjc3TDUuODU2MDEgMjkuMTA2TDExLjc4MjEgMjYuOTkyM0wxNS4zMzE0IDMyLjE3OUwxOC44ODEgMjYuOTkyM0wyNC44MDcxIDI5LjEwNkwyNC42MjQxIDIyLjgyNzdMMzAuNjYzMSAyMS4wNjEyTDI2LjgxNzYgMTYuMDg5NUwzMC42NjMxIDExLjExNzdMMjQuNjI0MSA5LjM1MTI3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==)](https://digitalpublicgoods.net/r/altinn)

Altinn Studio is the next generation Altinn application development solution. Together with **Altinn Apps** and
**Altinn Platform**, this is a complete application development and hosting platform (Altinn 3).

Read the [Altinn Studio documentation][1] to [get started][2].
We've also created an [introductory course for app development][3] that you can follow at your own pace.

> **Note** Developing apps?
> If you just want to quickly perform tests of your app on your development machine you can follow the instructions on
> how to [run apps locally][4]. This repository is mainly the Designer-tool which is used to build and
> deploy apps.

## Getting Started with developing Altinn Studio

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
See deployment for notes on how to deploy the project on a live system.

### Prerequisites

1. Newest [.NET 9 SDK][5]
2. [Node.js][6] (Latest LTS version)
3. Newest [Git][7]
4. A code editor - we like [Visual Studio Code][8]
   - Also install [recommended extensions][9] (e.g. [C# Dev Kit][10])
5. Newest [Docker Desktop][11]
   - Requires a license in most cases. Alternative options can be found [here][12]
6. If you are running Docker Desktop in Hyper-V mode you need to make sure your C drive is shared with Docker, Docker
   Settings -> Shared Drives The File sharing tab is only available in Hyper-V mode, because in WSL 2 mode and Windows
   container mode all files are automatically shared by Windows.

### Hosts file

Add the following entries to your hosts file (`/etc/hosts` on Linux/MacOS, `C:\Windows\System32\drivers\etc\hosts` on Windows):

```plaintext
127.0.0.1 studio.localhost
127.0.0.1 host.docker.internal
```

### Running the solution locally

Clone the [Altinn Studio repo][13] and navigate to the folder.

```bash
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio
```

The fastest way to get things running from scratch is to use our setup-script. This script will start docker and
ensure that the setup is up to date. As we add more features this script will be updated. It can be run as follows:

```bash
yarn && yarn setup
```

More about that script and development in general, [can be found here](development/README.md).

#### Docker Compose

The development environment consist of several services defined in [compose.yaml](compose.yaml).

- `studio-loadbalancer` which is a simple nginx-container using `nginx:alpine` directly, just used for development.
- `studio-designer` which is the actual build artifact with the .NET backend and the react-apps.
- `studio-repos` which is [gitea][14] with some custom config. More [here](src/gitea/README.md).
- `studio-db` which is a postgres database used by both `studio-designer` and `studio-repos`.
- `database_migrations` which is a one-time task container designed to perform and complete database migrations before exiting.
- `pgadmin` which is a administration and development platform for PostgreSQL.
- `redis` which is a redis cache used by designer.
- `redis-commander` which is a ui for redis cache.

Run all parts of the solution in containers (Make sure docker is running), with docker compose as follows:

```bash
docker compose up -d --build
```

The solution is now available locally at [studio.localhost][15].

When logging in, use the default username `localgiteaadmin`. You can find the randomly generated password in the `.env` file, under the `GITEA_ADMIN_PASS` variable.

If you make changes and want to rebuild a specific project using docker compose, this can be done from `src/Designer` using

```bash
docker compose up -d --build <container>
```

Example

```bash
docker compose up -d --build studio_designer
```

If using `yarn setup`, the `.env`-file is generated and put at root. Otherwise, you will need to place it there yourself.

#### Development variables

When starting `docker compose` the solution should be running as it would in production. But you probably want to
develop parts of the solution without rebuilding containers. The load balancer is configured to route traffic to your local
dev servers instead of the Docker containers when the corresponding variable is set to `1`. This is done by editing the
`.env`-file in the same folder as compose.yaml. After changing these variables, rebuild the load balancer from `src/Designer`:

```bash
docker compose up -d --build studio_loadbalancer
```

The available variables are:

```dotenv
DEVELOP_APP_DEVELOPMENT=0
DEVELOP_RESOURCE_ADMIN=0
DEVELOP_BACKEND=0
DEVELOP_DASHBOARD=0
DEVELOP_PREVIEW=0
DEVELOP_ADMIN=0
DEVELOP_STUDIO_ROOT=0
```

## Developing Backend

Navigate to the designer backend folder `cd src/Designer/backend/src/Designer`. The first time running, or after any package changes,
get the latest packages.

The backend uses the OIDC login flow with Gitea as the identity provider. The client ID and client secret are required in the configuration.

When running the backend locally, the .env file will be used to fetch the client ID and secret if they are not already set in the configuration.

If `yarn setup` is run, an OAuth2 application will be created in Gitea, and the CLIENT_ID and CLIENT_SECRET values will be set in the .env file. Alternatively, you can set up the OAuth2 application yourself in Gitea and manually set the client ID and client secret values in the configuration.

## Developing Frontend

Start the vite dev server for the respective app you want to develop:

```bash
yarn run start-app-development
yarn run start-dashboard
```

If you need to rebuild other React apps, for instance `dashboard` or `app-development`, this can be done by navigating
to `frontend` and then running the following build script, which will build app frontend apps.

```bash
yarn run build
```

Some React projects also have various other predefined scripts, which can be viewed in the `package.json` file
which is located in the root folder of each react project, example `frontend/dashboard`.

More about developing frontend [can be found here](frontend/README.md).

## End-to-end tests

Altinn Studio has two sets of automated end-to-end tests; regression tests and usecase tests. [The regression tests][16] are created with Playwright and run on every pull request. [The usecase tests][17] are created with Cypress and run periodically.

For more information about testing, please refer to the following resources: [Playwright](frontend/testing/playwright/README.md) and [Cypress](frontend/testing/cypress/README.md).

## Deployment

The current build is deployed in Kubernetes on Azure. Automated CI/CD using Azure DevOps pipelines.

## Built With

- [React][18] - The front-end framework
- [.NET Core][19]/[C#][20] - The back-end framework
- [yarn][21] - Package management
- [Docker][22] - Container platform
- [Kubernetes][23] - Container orchestration

## Status for container scans

[![Designer scan](https://github.com/altinn/altinn-studio/actions/workflows/designer-scan.yml/badge.svg)](https://github.com/Altinn/altinn-studio/actions/workflows/designer-scan.yml)
[![Repositories scan](https://github.com/altinn/altinn-studio/actions/workflows/repositories-scan.yml/badge.svg)](https://github.com/Altinn/altinn-studio/actions/workflows/repositories-scan.yml)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue][24].

See also the [list of contributors][25] who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.

[1]: https://docs.altinn.studio/
[2]: https://docs.altinn.studio/altinn-studio/getting-started/
[3]: https://docs.altinn.studio/altinn-studio/getting-started/app-dev-course/
[4]: https://github.com/Altinn/app-localtest
[5]: https://dotnet.microsoft.com/download/dotnet/9.0
[6]: https://nodejs.org
[7]: https://git-scm.com/downloads
[8]: https://code.visualstudio.com/Download
[9]: https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions
[10]: https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csdevkit
[11]: https://www.docker.com/products/docker-desktop
[12]: https://docs.altinn.studio/community/contributing/handbook/docker/without-docker-desktop/
[13]: https://github.com/Altinn/altinn-studio
[14]: https://gitea.io/
[15]: http://studio.localhost
[16]: https://github.com/Altinn/altinn-studio/tree/main/frontend/testing/playwright
[17]: https://github.com/Altinn/altinn-studio/tree/main/frontend/testing/cypress
[18]: https://reactjs.org/
[19]: https://docs.microsoft.com/en-us/dotnet/core/
[20]: https://docs.microsoft.com/en-us/dotnet/csharp/
[21]: https://yarnpkg.com/
[22]: https://www.docker.com/
[23]: https://kubernetes.io/
[24]: https://github.com/Altinn/altinn-studio/issues/new/choose
[25]: https://github.com/Altinn/altinn-studio/graphs/contributors
