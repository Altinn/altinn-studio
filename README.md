[![Build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio-CI)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=1)

# Altinn studio

A _very_ early test version of Altinn Studio is available at https://altinn.studio.

Use the [documentation](https://docs.altinn.studio/) to get started using Altinn Studio (currently available only in Norwegian).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

1. [.NET Core 2.1 SDK](https://www.microsoft.com/net/download/dotnet-core/sdk-2.1.300)
2. [Node.js](https://nodejs.org) (version 8 or newer. **Note**: version 10.* does not currently work for this project)
3. Newest [Git](https://git-scm.com/downloads)
4. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp) and [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome))
5. [Docker CE](https://www.docker.com/get-docker)
6. Add `localhost altinn3.no` and `127.0.0.1 altinn3.no` in the hosts file (C:/Windows/System32/drivers/etc/hosts)
7. Make sure your C drive is shared with docker, Docker Settings -> Shared Drives
8. World Wide Web Publishing Service must be disabled, Services -> "World Wide Web Publishing Service" rigth click and choose "stop"

### Installing

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder.

```cmd
git clone https://github.com/Altinn/altinn-studio
cd Altinn-studio
```

Run all parts of the solution in containers (Make sure docker is running)

```cmd
docker-compose up -d --build
```

The solution is now available locally at [altinn3.no](http://altinn3.no)

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
npm install
npm run gulp-install-deps
```

Build and run the code.

```cmd
dotnet build
npm run gulp-develop
```

**Runtime**

Stop the container running Runtime.

```cmd
docker stop altinn-runtime
```

Navigate to the Runtime folder. Build and run the code.

```cmd
cd src/AltinnCore/Runtime
dotnet build
dotnet run
```

## Running the tests

### End to end tests

Automated end to end tests are currently being developed.

### Coding style tests

Coding style tests are available for the React front end application, using _tslint_.

Navigate to the React front end application and run linting.

```cmd
cd src/react-apps/ux-editor
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
