# Altinn Studio

[![Altinn Studio build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio-build-designer-image-v2-master?label=Altinn%20Studio)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=18)
[![Altinn Apps build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio-build-runtime-image?label=Altinn%20Apps)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=6)

An early test version of Altinn Studio is available at https://altinn.studio.

Use the [documentation](https://docs.altinn.studio/) to get started using Altinn Studio.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

1. [.NET Core 3.0 SDK](https://dotnet.microsoft.com/download/dotnet-core/3.0)
2. [Node.js](https://nodejs.org) (Version 10.*)
3. Newest [Git](https://git-scm.com/downloads)
4. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp) and [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome))
5. [Docker Desktop](https://www.docker.com/products/docker-desktop)
6. Add `localhost altinn3.no` and `127.0.0.1 altinn3.no` in the hosts file (C:/Windows/System32/drivers/etc/hosts) <br />
   On MacOS: Add `localhost altinn3.no` and `127.0.0.1 altinn3.no` to /private/etc/hosts.
    ```cmd
    sudo nano /private/etc/hosts
    ```
7. Make sure your C drive is shared with docker, Docker Settings -> Shared Drives <br />
   On MacOS: Change docker-compose.yml (both)
    ```cmd
      volumes:
        - "C:/AltinnCore/Repos:/AltinnCore/Repos"
    ```
    to:
    ```cmd
      volumes:
        - "/Users/<yourname>/AltinnCore/Repos:/AltinnCore/Repos"
    ```
8. World Wide Web Publishing Service must be disabled, Services -> "World Wide Web Publishing Service" rigth click and choose "stop"

### Installing

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder.

```cmd
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio
```

Run all parts of the solution in containers (Make sure docker is running)

```cmd
docker-compose up -d --build
```

The solution is now available locally at [altinn3.no](http://altinn3.no)

If you make changes and want to rebuild a specific project using docker-compose this can be done using

```cmd
docker-compose up -d --build <container>
```

Example
```cmd
docker-compose up -d --build altinn_designer
```

#### Running Designer and/or Runtime component locally

The Designer and Runtime components can be run locally when developing/debugging. The rest of the solution (Repository and LoadBalancer) will still have to be running in containers.
Follow the install steps above if this has not already been done.

**Designer**

Stop the container running Designer

```cmd
docker stop altinn-designer
```

Navigate to the Designer folder. The first time running, or after any package changes, get the latest packages.

```cmd
cd src/AltinnCore/Designer
npm ci
npm run gulp-install-deps
```

Build and run the code.

```cmd
dotnet build
npm run gulp # first time only
npm run gulp-develop
```

If you are not going to edit the designer react app you can use

```cmd
cd src\AltinnCore\Designer
npm ci
npm run gulp
dotnet run
```

Which will build the Designer .net backend and the designer react app, but not listen to changes to the react app.

**Runtime (deprecated documentation, new documentation will be available soon)**

Stop the container running Runtime.

```cmd
docker stop altinn-runtime
```

Navigate to the Runtime folder. Build and run the code.

**Important:** First you must have executed the Designer commands in order to successfully execute both the following command sequences on the Runtime component.

```cmd
cd src/AltinnCore/Runtime
npm ci
npm run gulp # first time only
npm run gulp-develop
```

If you are not going to edit the runtime react app you can use

```cmd
cd src/AltinnCore/Runtime
npm ci
npm run gulp
dotnet run
```

Which will build the runtime .net backend and runtime react app, but not listen for changes to our react app.

## Building other react apps
If you need to rebuild other react apps, for instance Dashboard or ServiceDevelopment, this can be done by navigating to their respective folders, example `src/react-apps/applications/dashboard` and then run the following build script

```cmd
npm run build
```
Some of the react projects also have various other predefined npm tasks, which can be viewed in the `package.json` file which is located in the root folder of each react project, example `src/react-apps/applications/dashboard/package.json`

## Platform Receipt
The platform receipt component can run locally, both in docker and manually.

### Manual
- Open a terminal in `src/Altinn.Platform/Altinn.Platform.Receipt`
- run `npm install`
- run `npm run gulp` (if running for the first time, otherwise this can be skipped)
- run `npm run gulp-install-deps`
- run `npm run gulp-develop`

This will build and run receipt back end, and build and copy the receipt frontend to the `wwwroot` folder.
The application should now be available at `localhost:5060/receipt/{instanceOwnerId}/{instanceId}`
The script wil also listen to changes in the receipt react app, rebuild and copy the new react app to the `wwwroot` folder.

### Docker
- Open a terminal in `src/Altinn.Platform/Altinn.Platform.Receipt`
- run `docker compose up`
- The application should now be available at `localhost:5060/receipt/{instanceOwnerId}/{instanceId}`

## Running the tests

### End to end tests

Automated end to end tests are currently being developed.

### Coding style tests

Coding style tests are available for the React front end application, using _tslint_.

Navigate to the React front end application and run linting.

```cmd
cd src/react-apps/applications/ux-editor
npm run lint
```

## Deployment

The current build is deployed in Kubernetes on Azure.

Automated build/deploy process is being developed.

## Built With

- [React](https://reactjs.org/)/[Redux](https://redux.js.org/) - The front-end framework
- [.NET Core](https://docs.microsoft.com/en-us/dotnet/core/)/[C#](https://docs.microsoft.com/en-us/dotnet/csharp/) - The back-end framework
- [npm](https://www.npmjs.com/) - Package management
- [Docker](https://www.docker.com/) - Container platform
- [Kubernetes](https://kubernetes.io/) - Container orchestration

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/altinn-studio/issues/new).

See also the list of [contributors](https://github.com/Altinn/altinn-studio/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.
