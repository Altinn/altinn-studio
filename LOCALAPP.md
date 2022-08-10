## Local testing of apps

These are some of the required steps, tips and tricks when it comes to running an app on a machine. The primary goal is to be able to iterate over changes and verifying them without needing to deploy the app to the test environment.

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Changing test data](#changing-test-data)

### Prerequisites

1. Newest [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet/6.0)
2. Newest [Git](https://git-scm.com/downloads)
3. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp))
4. [Docker Desktop](https://www.docker.com/products/docker-desktop) (Linux users can also use native Docker)
5. Update hosts file (`C:/Windows/System32/drivers/etc/hosts`) by adding the following values. On MacOS add the same values to `/private/etc/hosts` using cmd `sudo nano /private/etc/hosts`. On Linux, edit `/etc/hosts`.
   ```txt
   127.0.0.1 altinn3local.no
   ```

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
2. Build and and run the containers in the background. This mode supports running one app at a
   time. If you need to run multiple apps at once, remove `--profile localtest` from the command and follow the
   instructions below to run LocalTest locally outside Docker.
   ```shell
   docker compose --profile localtest up -d --build
   ```
   Note: Using profiles requires docker-compose version [1.28.0](https://docs.docker.com/compose/release-notes/#1280)
   or later. If your version does not support profiles and you prefer to run localtest in Docker, make sure to follow
   [the instructions to install more a recent version](https://docs.docker.com/engine/install/) or comment out
   the profile restriction in `docker-compose.yml`.
3. Start your app
   ```shell
   cd /path/to/your/App
   dotnet run
   ```

The app and local platform services are now running locally. The app can be accessed on <http://altinn3local.no>.

Log in with a test user, using your app name and org name. This will redirect you to the app.

### Multiple apps at the same time (running LocalTest locally)
The setup described above (LocalTest running in Docker) currently only supports one app at a time. If you find
yourself needing to run multiple apps at the same time, or if you need to debug or develop LocalTest, a local setup is
preferred.

:information_source: If you're already running LocalTest in Docker, be sure to stop the container or make sure you
omit `--profile localtest` when running `docker compose`.

**Configuration of LocalTest**
The LocalTest application acts as an emulator of the Altinn 3 platform services. It provides things like authentication,
authorization and storage. Everything your apps will need to run locally.

Settings (under `LocalPlatformSettings`):
- `LocalAppMode` - (default `file`) If set to `http`, LocalTest will find the active app configuration and policy.xml
  using apis exposed on `LocalAppUrl`. (note that this is a new setting needs to be added manually under
  `LocalPlatformSettings`, it might also require updates to altinn dependencies for your apps in order to support
  this functionality)
- `LocalAppUrl` - If `LocalAppMode` == `"http"`, this URL will be used instead of `AppRepositoryBasePath` to find apps
  and their files. Typically the value will be `"http://localhost:5005"`
- `LocalTestingStorageBasePath` - The folder to which LocalTest will store instances and data being created
  during testing.
- `AppRepositoryBasePath` - The folder where LocalTest will look for apps and their files
  if `LocalAppMode` == `"file"`. This is typically the parent directory where you checkout all your apps.
- `LocalTestingStaticTestDataPath` - Test user data like profile, register and
  roles. (`<path to altinn-studio repo>/src/development/TestData/`)

The recommended way of changing settings for LocalTest is through
[user-secrets](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-6.0&tabs=windows#set-a-secret).
User secrets is a set of developer specific settings that will overwrite values from the `appsettings.json` file when
the application is started in developer "mode". The alternative is to edit the `appsettings.json` file directly. Just be
careful not to commit developer specific changes back to the repository.

- Define a user secret with the following command:  (make sure you are in the LocalTest folder)
   ```bash
   dotnet user-secrets set "LocalPlatformSettings:AppRepositoryBasePath" "C:\Repos"
   ```
   Run the command for each setting you want to change.
- Alternatively edit the appsettings.json file directly:
   - Open `appsettings.json` in the `LocalTest` folder in an editor, for example in Visual Studio Code
   - Change the setting `"AppRepsitoryBasePath"` to the full path to your app on the disk.
   - Change other settings as needed.
   - Save the file.

Finally, start the local platform services (make sure you are in the LocalTest folder)
```shell
dotnet run
```

### Changing test data

In some cases your application might differ from the default setup and require custom changes to the test data available.
This section contains the most common changes.

#### Adjust authentication level of logged in test user
This would be required if your app requires a higher than default authentication level. You can also use this to give the user a lower authentication level if you want to test the app behaviour for those.
1. Open the `src/development/LocalTest/Controllers/HomeController.cs` in your preffered text editor or IDE.
2. Find the function `LogInTestUser`
3. Modify this line `claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));`,
by exchanging `"2"` for a string containing your required authentication level.
4. Save and close the file
5. Restart LocalTest

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
5. Restart LocalTest
