# Altinn Studio

Altinn Studio is the next generation Altinn application development solution. Together with **Altinn Apps** and
**Altinn Platform**, this is a complete application development and hosting platform (Altinn 3).

Read the [Altinn Studio documentation][1] to [get started][2].
We've also created a [introductory course for app development][3] that you can follow at your own pace.

> **Note** Developing apps?
> If you just want to quickly perform tests of your app on your development machine you can follow the instructions on
> how to [run apps locally][4]. This repository is mainly the Designer-tool which is used to build and
> deploy apps.

## Getting Started with developing Altinn Studio

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
See deployment for notes on how to deploy the project on a live system.

### Prerequisites

1. Newest [.NET 9 SDK][5]
2. [Node.js][6] (Latest LTS version, v20.\*)
3. Newest [Git][7]
4. A code editor - we like [Visual Studio Code][8]
   - Also install [recommended extensions][9] (e.g. [C# Dev Kit][10])
5. Newest [Docker Desktop][11]
   - Requires a license in most cases. Alternative options can be found [here][12]
6. If you are running Docker Desktop in Hyper-V mode you need to make sure your C drive is shared with Docker, Docker
   Settings -> Shared Drives The File sharing tab is only available in Hyper-V mode, because in WSL 2 mode and Windows
   container mode all files are automatically shared by Windows.

_NOTE: If you want to use Safari on MacOS add `127.0.0.1 studio.localhost` to `/private/etc/hosts`_

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
- `studio-repos` which is [gitea][14] with some custom config. More [here](gitea/README.md).
- `studio-db` which is a postgres database used by both `studio-designer` and `studio-repos`.
- `database_migrations` which is a one-time task container designed to perform and complete database migrations before exiting.
- `pgadmin` which is a administration and development platform for PostgreSQL.
- `redis` which is a redis cache used by designer.
- `redis-commander` which is a ui for redis cache.

Run all parts of the solution in containers (Make sure docker is running), with docker compose as follows:

```bash
docker-compose up -d --build
```

The solution is now available locally at [studio.localhost][15]. (Just create a new user for testing. No email
verification required). If you make changes and want to rebuild a specific project using docker-compose this can be done using

```bash
docker-compose up -d --build <container>
```

Example

```bash
docker-compose up -d --build studio_designer
```

If using the script, the `.env`-file is generated and put at root, otherwise you will need to place it there yourself.
When starting `docker-compose` the solution should be running as it would in production. But you probably want to change
parts of the solution. The load balancer is configured to route the traffic to the right place according to your
particular use case. This is done by placing a `.env`-file in the same folder as compose.yaml. The load balancer
is configured with the following variables.

```dotenv
DEVELOP_BACKEND=0
DEVELOP_DASHBOARD=0
DEVELOP_APP_DEVELOPMENT=0
DEVELOP_STUDIO_ROOT=0
```

## Developing Backend

Navigate to the designer backend folder `cd backend/src/Designer`. The first time running, or after any package changes,
get the latest packages.

The backend uses the OIDC login flow with Gitea as the identity provider. The client ID and client secret are required in the configuration.

When running the backend locally, the .env file will be used to fetch the client ID and secret if they are not already set in the configuration.

If the setup script is run, an OAuth2 application will be created in Gitea, and the CLIENT_ID and CLIENT_SECRET values will be set in the .env file. Alternatively, you can set up the OAuth2 application yourself in Gitea and manually set the client ID and client secret values in the configuration.

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

More about developing frontend [can be found here](src/Designer/frontend/README.md).

## End-to-end tests

Altinn Studio has two sets of automated end-to-end tests; regression tests and usecase tests. [The regression tests][17] are created with Playwright and run on every pull request. [The usecase tests][18] are created with Cypress and run periodically.

For more information about testing, please refer to the following resources: [Playwright](src/Designer/frontend/testing/playwright/README.md) and [Cypress](src/Designer/frontend/testing/cypress/README.md).

## Deployment

The current build is deployed in Kubernetes on Azure. Automated CI/CD using Azure DevOps pipelines.

## Built With

- [React][19] - The front-end framework
- [.NET Core][20]/[C#][21] - The back-end framework
- [yarn][22] - Package management
- [Docker][23] - Container platform
- [Kubernetes][24] - Container orchestration

## Status for container scans

[![Designer scan](https://github.com/altinn/altinn-studio/actions/workflows/designer-scan.yml/badge.svg)](https://github.com/Altinn/altinn-studio/actions/workflows/designer-scan.yml)
[![Repositories scan](https://github.com/altinn/altinn-studio/actions/workflows/repositories-scan.yml/badge.svg)](https://github.com/Altinn/altinn-studio/actions/workflows/repositories-scan.yml)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue][25].

See also the [list of contributors][26] who participated in this project.

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
[16]: https://github.com/Altinn/app-template-dotnet
[17]: https://github.com/Altinn/altinn-studio/tree/main/frontend/testing/playwright
[18]: https://github.com/Altinn/altinn-studio/tree/main/frontend/testing/cypress
[19]: https://reactjs.org/
[20]: https://docs.microsoft.com/en-us/dotnet/core/
[21]: https://docs.microsoft.com/en-us/dotnet/csharp/
[22]: https://yarnpkg.com/
[23]: https://www.docker.com/
[24]: https://kubernetes.io/
[25]: https://github.com/Altinn/altinn-studio/issues/new/choose
[26]: https://github.com/Altinn/altinn-studio/graphs/contributors
