# Development

## Setup script

Run the setup script in this folder with node. This script should be immutable, so that it can be run multiple times
without breaking anything. This is great for introducing new environment variables and so on. It will not overwrite
any changes you do to the `.env`-file, and it's wise to run this after you change something.
Then, for instance, it will update passwords and ownership in Gitea for that user.

```bash
node ./setup.js
```

## Your local environment variables

These are created by the script and are found at the root in the `.env`-file.

```dotenv
CYPRESS_TEST_APP=<cypress-test-app>
DEVELOP_APP_DEVELOPMENT=0
DEVELOP_RESOURCE_ADMIN=0
DEVELOP_ADMIN_FRONTEND=0
DEVELOP_BACKEND=1
DEVELOP_DASHBOARD=0
DEVELOP_PREVIEW=0
DEVELOP_STUDIO_ROOT=0
GITEA_ADMIN_PASS=<gitea-admin-password>
GITEA_ADMIN_USER=<gitea-admin-user>
GITEA_CYPRESS_USER=<gitea-cypress-user>
GITEA_CYPRESS_PASS=<gitea-cypress-user-password>
GITEA_ORG_USER=ttd
POSTGRES_PASSWORD=<postgres-password>
CLIENT_ID=<client-id>
CLIENT_SECRET=<client-secret>
COMMIT=<commit-id>
```

## Some useful commands

Commands are meant to run relative to this file.

### Executing commands against the running Gitea instance

```bash
docker exec -it studio-repos gitea admin user create --username testuser --password yoursecurepasshere --email testuser@digdir.no --admin
```

### Reloading the loadbalancer

Need to do this to get a new config loaded, for instance when changing which apps to run.

```bash
docker rm --force studio-loadbalancer
docker compose -f ../compose.yaml up -d
```

### Beautify the nginx config in the load balancer

To format the nginx file if needed.

```bash
npx nginxbeautifier -i ./load-balancer/nginx.conf.conf
```

### To work with the deploy-page

You need to have an app in the `ttd`-organization, just as in the environments. This
organization is created by default and the default user is added to it. So, if you're
using the script, this should already be there.
If not you will need to add yourself to this organization in Gitea.
