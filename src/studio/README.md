# Altinn Studio

[![Altinn Studio build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio-build-designer-image-v2-master?label=Altinn%20Studio)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=18)

Altinn Studio is the next generation Altinn application development solution. Together with Altinn Apps and Altinn Platform, it makes a complete application development and hosting platform.

Altinn Studio is available at <https://altinn.studio>.

Use the [Altinn Studio documentation](https://docs.altinn.studio/) to get started.

## Getting Started

These instructions will get you a copy of Altinn Studio up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

1. Latest [.NET 5.0 SDK](https://dotnet.microsoft.com/download/dotnet/5.0)
2. [Node.js](https://nodejs.org) (Version 14.*)
3. Newest [Git](https://git-scm.com/downloads)
4. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp) and [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome))
5. [Docker Desktop](https://www.docker.com/products/docker-desktop)
6. Update hosts file (C:/Windows/System32/drivers/etc/hosts) by adding the following values as an local administrator:

   ```txt
   localhost altinn3.no
   127.0.0.1 altinn3.no
   127.0.0.1 altinn3local.no
   ```

   _On MacOS add the same values to values `/private/etc/hosts` with `sudo nano /private/etc/hosts` in treminal._

7. If you are running Docker Desktop in Hyper-V mode you need to make sure your C drive is shared with Docker, Docker Settings -> Shared Drives
   The File sharing tab is only available in Hyper-V mode, because in WSL 2 mode and Windows container mode all files are automatically shared by Windows.

   On MacOS: Change docker-compose.yml (both)

    ```yaml
    volumes:
      - "C:/AltinnCore/Repos:/AltinnCore/Repos"
    ```

    to:

    ```yaml
    volumes:
      - "/Users/<yourname>/AltinnCore/Repos:/AltinnCore/Repos"
    ```

8. World Wide Web Publishing Service must be disabled, Services -> "World Wide Web Publishing Service" rigth click and choose "stop"

### Installing

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the `studio` folder.

```bash
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio/src/studio
```

Run all parts of the solution in containers (Make sure docker is running)

```bash
docker-compose up -d --build
```

The solution is now available locally at [altinn3.no](http://altinn3.no)

If you make changes and want to rebuild a specific project using docker-compose this can be done using

```bash
docker-compose up -d --build <container>
```

Example

```bash
docker-compose up -d --build altinn_designer
```

### Running solutions locally

#### Designer

The Designer component can be run locally when developing/debugging. The rest of the solution (`repository` and `load-balancer`) will still have to be running in containers. Follow the install steps above if this has not already been done.

Stop the container running Designer.

```bash
docker stop altinn-designer
```

Navigate to the designer backend folder. The first time running, or after any package changes, get the latest packages.

```bash
cd src/studio/src/designer/backend
npm ci
npm run gulp-install-deps
```

On MacOS you need two extra steps:

  1. change the RepositoryLocation in src/studio/src/designer/backend/appsettings.json to

      ```json
      "ServiceRepositorySettings": {
        "RepositoryLocation": "/Users/<yourname>/AltinnCore/Repos/"
      }
      ```

  2. Change location where the application stores the DataProtectionKeys

      ```bash
      export ALTINN_KEYS_DIRECTORY=/Users/<yourname>/studio/keys
      ```

Build and run the code.

```bash
dotnet build
npm run gulp # first time only
npm run gulp-develop
```

If you are not going to edit the designer react app (frontend) you can use

```bash
cd src/studio/src/designer/backend
npm ci
npm run gulp # first time only
dotnet run
```

Which will build the Designer .net backend and the designer react app, but not listen to changes to the react app.

#### Building other react apps

If you need to rebuild other react apps, for instance `dashboard` or `app-development`, this can be done by navigating to their respective folders, example `src/studio/src/designer/frontend/dashboard` and then run the following build script

```bash
npm run build
```

Some of the react projects also have various other predefined npm tasks, which can be viewed in the `package.json` file which is located in the root folder of each react project, example  `src/studio/src/designer/frontend/dashboard`.

## Running the tests

### End to end tests

Automated end to end tests are currently being developed.

### Coding style tests

Coding style tests are available for the React front end application, using _tslint_.

Navigate to the React front end applications and run linting.

```bash
cd src/studio/src/designer/frontend
npm run lint
```

## Deployment

The current build is deployed in Kubernetes on Azure. Automated CI/CD using Azure DevOps pipelines.

## Built With

- [React](https://reactjs.org/)/[Redux](https://redux.js.org/) - The front-end framework
- [.NET Core](https://docs.microsoft.com/en-us/dotnet/core/)/[C#](https://docs.microsoft.com/en-us/dotnet/csharp/) - The back-end framework
- [npm](https://www.npmjs.com/) - Package management
- [Docker](https://www.docker.com/) - Container platform
- [Kubernetes](https://kubernetes.io/) - Container orchestration

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/altinn-studio/issues/new).

See also the list of [contributors](https://github.com/Altinn/altinn-studio/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.
