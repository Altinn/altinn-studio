# Altinn 3

**Altinn Studio** is the next generation Altinn application development solution.
Together with **Altinn Apps** and **Altinn Platform** (also part of this repo), this is a complete application development and hosting platform.

Altinn Studio is available at <https://altinn.studio>.

Read [the Altinn Studio documentation](https://docs.altinn.studio/) to get started.

![Altinn 3 concept](https://docs.altinn.studio/community/about/concept3.svg 'Altinn 3 - Concept')

## Build status

### Apps

[![KubernetesWrapper build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-apps/altinn-kuberneteswrapper-build-master?label=apps/kuberneteswrapper)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=88)
[![Front-end build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-apps/altinn-app-frontend-cdn-build-master?label=apps/frontend)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=74)

### Studio

[![Designer build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio/designer-master?label=studio/designer)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=18)
[![Repos build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-studio/repositories-master?label=studio/repos)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=28)

### Platform

[![Authentication build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/authentication-master?label=platform/authentication)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=41)
[![Authorization build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/authorization-master?label=platform/authorization)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=43)
[![Events build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/events-master?label=platform/events)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=136)
[![PDF build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/pdf-master?label=platform/pdf)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=66)
[![Profile build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/profile-master?label=platform/profile)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=38)
[![Receipt build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/receipt-master?label=platform/receipt)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=58)
[![Register build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/register-master?label=platform/register)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=35)
[![Storage build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/storage-master?label=platform/storage)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=30)

## Developing apps?

If you just want to quickly perform tests of your app on your development machine you can follow the instructions on how to [run apps locally](LOCALAPP.md).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
See deployment for notes on how to deploy the project on a live system.

### Installing

Clone the [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder.

```bash
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio
```

#### Develop Altinn Studio

To run Altinn Studio locally, follow the [Altinn Studio instructions](/src/studio/README.md).

#### Develop or run Apps

First make sure to [follow the prerequisites for Altinn Studio](/src/studio/README.md#prerequisites).
_If you only need to develop and debug App-Frontend, you can follow the description in **step #5** (only) and deploy the app to any test environment. The App-Frontend will be loaded from your local webpack-dev-server._

It's possible to run an app locally in order to test and debug it. It needs a local version of the platform services to work.
_NOTE: Currently, it is not possible to run Apps and Altinn Studio (designer) in parallel. To run Apps, make sure that none of the containers for Altinn Studio are running, f.ex. by navigating to the root of the altinn-studio repo, and running the command_

```bash
docker-compose down
```

##### Setting up local platform services for test

1. Navigate to the `development` folder in the altinn-studio repo

   ```bash
   cd src/development
   ```

2. Start the loadbalancer container that routes between the local platform services and the app

   ```bash
   docker-compose up -d --build
   ```

3. Set path to app folder in local platform services. There are two ways to do this:

   1. Edit the appsettings.json file:
      - Open `appSettings.json` in the `LocalTest` folder in an editor, for example in Visual Studio Code
      - Change the setting `"AppRepsitoryBasePath"` to the full path to your app on the disk. Save the file.
   2. Define a value using [user-secrets](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-6.0&tabs=windows#set-a-secret). User secrets is a set of developer specific settings that will overwrite values from the `appSettings.json` file when the application is started in developer "mode".
      ```bash
      dotnet user-secrets set "LocalPlatformSettings:AppRepositoryBasePath" "C:\Repos"
      ```

4. Start the local platform services (make sure you are in the LocalTest folder)

   ```bash
   dotnet run
   ```

5. Navigate to the app folder (specified in the step above)

   ```bash
   cd /<path to app on disk>
   ```

   - If you need to debug (or run locally) the app front-end:

     - Open the file `views/Home/Index.cshtml` in your app repo and change the lines (don't commit these changes)

     ```html
     <link
       rel="stylesheet"
       type="text/css"
       href="https://altinncdn.no/toolkits/altinn-app-frontend/3/altinn-app-frontend.css"
     />
     ...
     <script src="https://altinncdn.no/toolkits/altinn-app-frontend/2/altinn-app-frontend.js"></script>
     ```

     to

     ```html
     <link
       rel="stylesheet"
       type="text/css"
       href="http://localhost:8080/altinn-app-frontend.css"
     />
     ....
     <script src="http://localhost:8080/altinn-app-frontend.js"></script>
     ```

     - Build and run the runtime front-end project locally (`altinn-studio/src/Altinn.Apps/AppFrontend/react`):

     ```bash
     yarn --immutable # only needed first time, or when dependencies are updated
     cd altinn-app-frontend
     yarn start
     ```

6. Start the app locally

```bash
dotnet run -p App.csproj
```

The app and local platform services are now running locally.
If you have configured your hosts as [described in the prerequisites](/src/studio/README.md#prerequisites), the app can be accessed on altinn3local.no.

Log in with a test user, using your app name and org name. This will redirect you to the app.

#### Building other react apps

If you need to rebuild other react apps, for instance Dashboard or ServiceDevelopment, this can be done by navigating to their respective folders, example `src/studio/stc/designer/frontend/dashboard` and then run the following build script

```bash
yarn run build
```

Some of the react projects also have various other predefined yarn tasks, which can be viewed in the `package.json` file which is located in the root folder of each react project, example `src/studio/stc/designer/frontend/dashboard/package.json`

#### Platform Receipt

The platform receipt component can run locally, both in docker and manually.

##### Manual

- Open a terminal in `src/Altinn.Platform/Altinn.Platform.Receipt`
- run `yarn --immutable`
- run `yarn run gulp-install-deps`
- run `yarn run gulp` (if running for the first time, otherwise this can be skipped)
- run `yarn run gulp-develop`

This will build and run receipt back end, and build and copy the receipt frontend to the `wwwroot` folder.
The application should now be available at `localhost:5060/receipt/{instanceOwnerId}/{instanceId}`
The script wil also listen to changes in the receipt react app, rebuild and copy the new react app to the `wwwroot` folder.

##### Docker

- Open a terminal in `src/Altinn.Platform/Altinn.Platform.Receipt`
- run `docker-compose up`
- The application should now be available at `localhost:5060/receipt/{instanceOwnerId}/{instanceId}`

## Running the tests

### End to end tests

[Integration tests](https://github.com/Altinn/altinn-studio/tree/master/src/test/cypress) for local studio.

### Frontend lint and unit tests

See readme in [studio](/src/studio/README.md#running-the-tests) and [Altinn.Apps AppFrontend](/src/Altinn.Apps/AppFrontend/react/README.md#running-the-tests) projects for details on how to run these tests.

## Deployment

The current build is deployed in Kubernetes on Azure.

Automated build/deploy process is being developed.

## Built With

- [React](https://reactjs.org/)/[Redux](https://redux.js.org/) - The front-end framework
- [.NET Core](https://docs.microsoft.com/en-us/dotnet/core/)/[C#](https://docs.microsoft.com/en-us/dotnet/csharp/) - The back-end framework
- [yarn](https://yarnpkg.com/) - Package management
- [Docker](https://www.docker.com/) - Container platform
- [Kubernetes](https://kubernetes.io/) - Container orchestration

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/altinn-studio/issues/new).

See also the [list of contributors](https://github.com/Altinn/altinn-studio/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.
