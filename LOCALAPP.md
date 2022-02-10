## Local testing of apps with localtest running in docker

These are some of the required steps, tips and tricks when it comes to running an app on a machine. The primary goal is to be able to iterate over changes and verifying them without needing to deploy the app to the test environment.

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Changing test data](#changing-test-data)

### Prerequisites

1. Apps that use versions of the Nuget packages more recent than 4.26.0 of `Altinn.App.Common`, `Altinn.App.PlatformServices` and `Altinn.App.Api` (mid february 2022)
2. Newest [.NET 5 SDK](https://dotnet.microsoft.com/download/dotnet/5.0) for running the app locally
3. Newest [Git](https://git-scm.com/downloads) for cloing altinn-studio and your app
4. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp))
5. [Docker Desktop](https://www.docker.com/products/docker-desktop) or another container solution that supports docker-compose v2 (some linux installation guides gives version 1 that does not work)

### Setup

0. Clone the altinn-studio repository to a local folder
   ```shell
   git clone https://github.com/Altinn/altinn-studio
   cd altinn-studio
   ```
1. Navigate to the `development` folder in the altinn-studio repo
   ```shell
   cd src/development
   ```
2. Configuration of LocalTest
    Take a copy of `.env.template` and call it `.env` and uncomment the configurations you want to change
    Typically wou would uncomment the line that says `TEST_DOMAIN:local.altinn.cloud` to avoid the need to add
    `127.0.0.1 altinn3local.no` to your `etc/hosts` file.
3. Setting up loadbalancer
     Start the loadbalancer container that routes between the local platform services and the app
     ```shell
     docker-compose --profile localtest up --build
     ```
4. Open a new terminal in the directory where you have a copy of your app.
5. Start the app locally
   ```shell
   dotnet run --project App.csproj
   ```

The app and local platform services are now running locally. The app can be accessed on <http://local.altinn.cloud>.

Log in with a test user, using your app name and org name. This will redirect you to the app.

### Changing test data

In some cases your application might differ from the default setup and require custom changes to the test data available.
This section contains the most common changes.


#### Add a missing role for a test user
This would be required if your app requires a role which none of the test users have.
1. Identify the role list you need to modify by noting the userId of the user representing an entity, and the partyId of the entity you want to represent
2. Find the correct `roles.json` file in `C:\Repos\altinn-studio\src\development\TestData\authorization\roles` by navigating to `User_{userID}\party_{partyId}\roles.json`
3. Add a new entry in the list for the role you require

  ```
  {
    "Type": "altinn",
    "value": "[Insert role code here]"
  }
  ```
4. Save and close the file
5. Restart the common services in docker
  ```shell
  docker-compose --profile localtest up --build
  ```

