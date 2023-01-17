# Altinn Studio

Altinn Studio is the next generation Altinn application development solution.
Together with **Altinn Apps** and **Altinn Platform**, this is a complete application development and hosting platform (Altinn 3).

Altinn Studio is available at <https://altinn.studio>.

Read the [Altinn Studio documentation](https://docs.altinn.studio/) to [get started](https://docs.altinn.studio/app/getting-started/).
We've also created a [into course for app development](https://docs.altinn.studio/app/app-dev-course/) that you can follow at your own pace.

![Altinn 3 concept](https://docs.altinn.studio/community/about/concept3.svg "Altinn 3 - Concept")

## Build status

[![Designer build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio/designer-master?label=studio/designer)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=18)
[![Repos build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio/repositories-master?label=studio/repos)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=28)

## Developing apps?

If you just want to quickly perform tests of your app on your development machine you can follow the instructions on how to [run apps locally](docs/LOCALAPP.md).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
See deployment for notes on how to deploy the project on a live system.

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
docker-compose up -d --build studio_designer
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

Navigate to the designer backend folder `cd backend/src/Designer`. The first time running, or after any package changes, get the latest packages.

- On MacOS you need one extra step before running .NET:

  Change location where the application stores the DataProtectionKeys

  ```bash
  export ALTINN_KEYS_DIRECTORY=/Users/<yourname>/studio/keys
  ```

Build and prepare for running the application.

```bash
cd backend/src/Designer
dotnet build
yarn run gulp # run this when there are changes in frontend that you want to serve from backend
```

An optional step if you want to run also frontend from the backend. At the time being this is still a thing.

```bash
cd backend/src/Designer
yarn --immutable
yarn run gulp-install-deps
```

There are multiple ways to start the frontend applications

```bash
cd backend/src/Designer
yarn run develop-designer-frontend # Run the front end watching dashboard
```

If you are not going to edit the designer react app (frontend) you can use

```bash
cd backend/src/Designer
yarn --immutable
yarn run gulp # run this when there are changes in frontend that you want to serve from backend
dotnet run
```

Which will build the Designer .NET backend and the designer react app, but not listen to changes to the react app.

If you want to work on creating apps locally, [app-template-dotnet](https://github.com/Altinn/app-template-dotnet) repo should be cloned. If the templates repo is cloned in the same folder as altinn-studio, no changes needs to be done, otherwise it should be referenced in appsettings.Development.json.
```
{
   "GeneralSettings": {
    "TemplateLocation": "Path to src folder of app-template-dotnet repo",
    "DeploymentLocation": "Path to src/deployment folder of app-template-dotnet repo",
    "AppLocation": "Path to src/App folder of app-template-dotnet repo"
  }
}
```

Alternative to cloning app-templates-dotnet repo is to use following script to download template dependencies:

```sh
wget -O - https://api.github.com/repos/Altinn/app-template-dotnet/releases/latest | jq '.assets[]|select(.name | startswith("app-template-dotnet-") and endswith(".zip"))' | jq '.browser_download_url' | xargs wget -O apptemplate.zip && unzip apptemplate.zip && rm apptemplate.zip 
```


#### Building the React apps

If you need to rebuild other react apps, for instance `dashboard` or `app-development`, this can be done by navigating
to `frontend` and then run the following build script, which will build app frontend apps.

```bash
yarn --cwd "frontend" run build
```

Some React projects also have various other predefined scripts, which can be viewed in the `package.json` file
which is located in the root folder of each react project, example `frontend/dashboard`.

## Running the tests

### Lint checks

```bash
yarn --cwd "frontend" --immutable
yarn --cwd "frontend" run lint
```

### Unit tests

```
yarn --cwd "frontend" --immutable
yarn --cwd "frontend" run test
```

## Running the tests

### End to end tests

[Integration tests](https://github.com/Altinn/altinn-studio/tree/master/src/test/cypress) for local studio.

## Deployment

The current build is deployed in Kubernetes on Azure. Automated CI/CD using Azure DevOps pipelines.

## Built With

- [React](https://reactjs.org/)/[Redux](https://redux.js.org/) - The front-end framework
- [.NET Core](https://docs.microsoft.com/en-us/dotnet/core/)/[C#](https://docs.microsoft.com/en-us/dotnet/csharp/) - The back-end framework
- [yarn](https://yarnpkg.com/) - Package management
- [Docker](https://www.docker.com/) - Container platform
- [Kubernetes](https://kubernetes.io/) - Container orchestration

## Contributing

Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/altinn-studio/issues/new).

See also the [list of contributors](https://github.com/Altinn/altinn-studio/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.

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
