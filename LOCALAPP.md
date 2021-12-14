## Local testing of apps

These are some of the required steps, tips and tricks when it comes to running an app on a machine. The primary goal is to be able to iterate over changes and verifying them without needing to deploy the app to the test environment.

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Changing test data](#changing-test-data)

### Prerequisites

1. Latest [.NET 5.0 SDK](https://dotnet.microsoft.com/download/dotnet/5.0)
2. Newest [Git](https://git-scm.com/downloads)
3. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp) and [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome))
4. For Windows/MacOS [Docker Desktop](https://www.docker.com/products/docker-desktop)
5. Update hosts file (C:/Windows/System32/drivers/etc/hosts) by adding the following values. On MacOS add the same values to values /private/etc/hosts using cmd `sudo nano /private/etc/hosts`.
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
2. Setting up loadbalancer   
     This is unfortunately different based on type of operating system you have on your machine.
   - **Windows:**  
     Start the loadbalancer container that routes between the local platform services and the app
     ```shell
     docker-compose up -d --build
     ```
   - **Linux:**  
     Install NGINX
     ```shell
     sudo apt-get update
     sudo apt-get install nginx
     sudo service nginx start
     ```
     Edit the NGINX configuration
     ```shell
     cd /etc/nginx
     sudo nano nginx.conf
     ```
     Modify the default to this:
     ```nginx
     worker_processes 1;
     events { worker_connections 1024; }

     http { 
       client_max_body_size 50M;
       sendfile on;
       
       upstream localtest {
         server 127.0.0.1:5101;
       }
       upstream app {
         server 127.0.0.1:5005;
       }
       
       server {
         listen 80;
         server_name altinn3local.no localhost;
         proxy_redirect      off;
         proxy_set_header    Host $host;
         proxy_set_header    X-Real-IP $remote_addr;
         proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;

         location = / {
           proxy_pass        http://localtest/Home/;
         }
         location / {
           proxy_pass        http://app/;
         }
         location /Home/ {
           proxy_pass        http://localtest/Home/;
         }
         location /localtestresources/ {
           proxy_pass        http://localtest/localtestresources/;
         }
       }
     }
     ```
     Save and go back to src/develpment folder in altinn-studio  
     Reload NGINX configuration
     ```shell
     sudo nginx -s reload
     ```
3. Configuration of LocalTest   
    The LocalTest application acts as an emulator of the Altinn 3 platform services. It provides things like authentication, authorization and storage. Everything your apps will need to run locally.   

    Settings (under `LocalPlatformSettings`):
    - `LocalTestingStorageBasePath` - The folder to which LocalTest will store instances and data being created during testing.
    - `LocalTestingStaticTestDataPath` - Test user data like profile, register and roles. (`<path to altinn-studio repo>/src/development/TestData/`)
    - `LocalAppMode` - (default `file`) If set to `http`, LocalTest will find the active app configuration and policy.xml using apis exposed on `LocalAppUrl`. (note that this is a new setting needs to be added manually under `LocalPlatformSettings`, it might also require updates to altinn dependencies for your apps in order to support this functionality)
    - `AppRepositoryBasePath` - The folder where LocalTest will look for apps and their files if `LocalAppMode` == `"file"`. This is typically the parent directory where you checkout all your apps.
    - `LocalAppUrl` - If `LocalAppMode` == `"http"`, this URL will be used instead of `AppRepositoryBasePath` to find apps and their files. Typically the value will be `"http://localhost:5005"`

    The recommended way of changing settings for LocalTest is through [user-secrets](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-6.0&tabs=windows#set-a-secret). User secrets is a set of developer specific settings that will overwrite values from the `appsettings.json` file when the application is started in developer "mode". The alternative is to edit the `appsettings.json` file directly. Just be careful not to commit developer specific changes back to the repository.
   1. Define a user secret with the following command:  (make sure you are in the LocalTest folder)
      ```bash
      dotnet user-secrets set "LocalPlatformSettings:AppRepositoryBasePath" "C:\Repos"
      ```
      Run the command for each setting you want to change.
   2. Alternatively edit the appsettings.json file directly:
      - Open `appsettings.json` in the `LocalTest` folder in an editor, for example in Visual Studio Code
      - Change the setting `"AppRepsitoryBasePath"` to the full path to your app on the disk. 
      - Change other settings as needed.
      - Save the file.
5. Start the local platform services (make sure you are in the LocalTest folder)
   ```shell
   dotnet run
   ```
6. Navigate to the app folder (specified in the step above)
   ```shell
   cd \.\<path to app on disk>
   ```
7. Start the app locally
   ```shell
   dotnet run -p App.csproj
   ```

The app and local platform services are now running locally. The app can be accessed on <http://altinn3local.no>.

Log in with a test user, using your app name and org name. This will redirect you to the app.

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

