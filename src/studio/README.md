# Altinn Studio

[![Altinn Studio build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio-build-designer-image-v2-master?label=Altinn%20Studio)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=18)

Altinn Studio is the next generation Altinn application development solution. Together with Altinn Apps and Altinn
Platform, it makes a complete application development and hosting platform.

Altinn Studio is available at <https://altinn.studio>.

Use the [Altinn Studio documentation][1] to get started.

## Getting Started

These instructions will get you a copy of Altinn Studio up and running on your local machine for development and testing
purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

1. Newest [.NET 6 SDK][2]
2. [Node.js][3] (version 16.\*)
3. Newest [Git][4]
4. A code editor - we like [Visual Studio Code][5]
   - Also install [recommended extensions][6] (f.ex. [C#][7])
5. [Docker Desktop][8]
6. If you are running Docker Desktop in Hyper-V mode you need to make sure your C drive is shared with Docker, Docker
   Settings -> Shared Drives The File sharing tab is only available in Hyper-V mode, because in WSL 2 mode and Windows
   container mode all files are automatically shared by Windows.
7. World Wide Web Publishing Service must be disabled, Services -> "World Wide Web Publishing Service" rigth click and
   choose "stop"

_NOTE: If you want to use Safari on MacOS add `127.0.0.1 studio.localhost` to `/private/etc/hosts`_

### Installing

Clone [Altinn Studio repo][9]

```bash
git clone https://github.com/Altinn/altinn-studio
```

Run all parts of the solution in containers (Make sure docker is running)

```bash
docker-compose up -d --build
```

The solution is now available locally at [studio.localhost](http://studio.localhost). (Just create a new user for testing. No email
verification required)

If you make changes and want to rebuild a specific project using docker-compose this can be done using

```bash
docker-compose up -d --build <container>
```

Example

```bash
docker-compose up -d --build altinn_designer
```

### Running and developing solutions locally

When starting `docker-compose` the solution should be running as it would in production. But you probably want to change
parts of the solution. The loadbalancer is configured to route the traffic to the right place according to your
particular usecase. This is done by placing a `.env`-file in the same folder as docker-compose.yml. The content is as
follows:

```text
DEVELOP_BACKEND=0
DEVELOP_DASHBOARD=0
DEVELOP_APP_DEVELOPMENT=0
```

#### Developing Backend

Navigate to the designer backend folder `cd src/studio/src/designer/backend`. The first time running, or after any package changes, get the latest packages.

- On MacOS you need one extra step before running .NET:

  Change location where the application stores the DataProtectionKeys
   ```bash
   export ALTINN_KEYS_DIRECTORY=/Users/<yourname>/studio/keys
   ```

Build and prepare for running the application.

```bash
dotnet build
yarn run gulp # run this when there are changes in frontend that you want to serve from backend
```

An optional step if you want to run also frontend from the backend. At the time being this is still a thing.

```bash
cd src/studio/src/designer/backend
yarn --immutable
yarn run gulp-install-deps
```

There are multiple ways to start the frontend applications

```bash
yarn run develop-designer-frontend # Run the front end watching dashboard
```

If you are not going to edit the designer react app (frontend) you can use

```bash
cd src/studio/src/designer/backend
yarn --immutable
yarn run gulp # run this when there are changes in frontend that you want to serve from backend
dotnet run
```

Which will build the Designer .NET backend and the designer react app, but not listen to changes to the react app.

#### Building the React apps

If you need to rebuild other react apps, for instance `dashboard` or `app-development`, this can be done by navigating
to `src/studio/src/designer/frontend` and then run the following build script, which will build app frontend apps.

```bash
yarn run build
```

Some React projects also have various other predefined scripts, which can be viewed in the `package.json` file
which is located in the root folder of each react project, example `src/studio/src/designer/frontend/dashboard`.

## Running the tests

### Lint checks

1. Navigate to the folder `src/studio/src/designer/frontend`.
2. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
3. Execute `yarn run lint`.

### Unit tests

1. Navigate to the folder `src/studio/src/designer/frontend`.
2. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
3. Execute `yarn run test`.

## Deployment

The current build is deployed in Kubernetes on Azure. Automated CI/CD using Azure DevOps pipelines.

## Built With

- [React][11]/[Redux][12] - The front-end framework
- [.NET Core][13]/[C#][14] - The back-end framework
- [yarn][15] - Package management
- [Docker][16] - Container platform
- [Kubernetes][17] - Container orchestration

## Contributing

Please read [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting
pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue][18].

See also the list of [contributors][19] who participated in
this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](../../LICENSE.md) file for details.

[1]: https://docs.altinn.studio/
[2]: https://dotnet.microsoft.com/download/dotnet/6.0
[3]: https://nodejs.org
[4]: https://git-scm.com/downloads
[5]: https://code.visualstudio.com/Download
[6]: https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions
[7]: https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp
[8]: https://www.docker.com/products/docker-desktop
[9]: https://github.com/Altinn/altinn-studio
[10]: http://studio.localhost
[11]: https://reactjs.org/
[12]: https://redux.js.org/
[13]: https://docs.microsoft.com/en-us/dotnet/core/
[14]: https://docs.microsoft.com/en-us/dotnet/csharp/
[15]: https://yarnpkg.com/
[16]: https://www.docker.com/
[17]: https://kubernetes.io/
[18]: https://github.com/Altinn/altinn-studio/issues/new
[19]: https://github.com/Altinn/altinn-studio/graphs/contributors
