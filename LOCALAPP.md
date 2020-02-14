## Local testing of apps

It is possible to test and debug applications created in Altinn Studio on local development machine.

Currently we have not been able to provide a 100% common setup between Windows and Linux.



### Prerequisites

1. Latest [.NET Core 3.1 SDK](https://dotnet.microsoft.com/download/dotnet-core/3.1)
2. Newest [Git](https://git-scm.com/downloads)
3. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/Download)
    - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) (f.ex. [C#](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp) and [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome))
4. For Windows/MAC [Docker Desktop](https://www.docker.com/products/docker-desktop)
5. Update hosts file (C:/Windows/System32/drivers/etc/hosts) by adding the following values. On MacOS add the same values to values /private/etc/hosts using cmd `sudo nano /private/etc/hosts`.

```cmd
127.0.0.1 altinn3local.no
```

### Setup

Clone the Altinn Studio repository

```bash
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio
```
Navigate to the development folder in the altinn-studio repo

1. Navigate to the `development` folder in the altinn-studio repo

```cmd
cd src/development
```

2a. Setting up loadbalancer Windows

Start the loadbalancer container that routes between the local platform services and the app

```cmd
docker-compose up -d --build
```

2b. Setting up loadbalancer Linux

Install NGINX

```bash

sudo apt-get update
sudo apt-get install nginx
sudo service nginx start

```

Edit the NGINX configuration

```bash

cd /etc/nginx
sudo nano nginx.conf

```

Modify the default to this.

```
worker_processes 1;

events { worker_connections 1024; }

http {

    client_max_body_size 50M;

    sendfile on;

	upstream localtest {
        server host.docker.internal:5101;
    }

    upstream app {
        server host.docker.internal:5005;
    }

    server {
		listen 80;
        server_name altinn3local.no localhost;

        proxy_redirect      off;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;


		location = / {
        proxy_pass          http://localtest/Home/;
		}

		location / {
        proxy_pass          http://app/;
		}

		location /Home/ {
			  proxy_pass		      http://localtest/Home/;
		}

    		location /localtestresources/ {
			  proxy_pass		      http://localtest/localtestresources/;
		}

	}
}

```

Save and go back to src/develpment folder in altinn-studio


Reload NGINX configuration

```bash
sudo nginx -s reload
```


3. Set path to app folder in local platform services:
 - Open `appSettings.json` in the `LocalTest` folder, f.ex. in Visual Studio Code


```cmd
cd LocalTest
code appSettings.json
```

 - Change the setting `"AppRepsitoryBasePath"` to the full path to your app on the disk. Save the file.

4. Start the local platform services (make sure you are in the LocalTest folder)

```cmd
dotnet run
```

5. Navigate to the app folder (specified in the step above)

```cmd
cd \.\<path to app on disk>
```
6. Start the app locally

```cmd
dotnet run -p App.csproj
```

The app and local platform services are now running locally. The app can be accessed on altinn3local.no.

Log in with a test user, using your app name and org name. This will redirect you to the app.
