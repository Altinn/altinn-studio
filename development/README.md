# Development

## Setup script

Run the setup script in this folder with node. This script should be immutable, so that it can be run multiple times
without breaking anything. This is great for introducing new environment variables and so on. It will not overwrite
any changes you do to the `.env`-file, and it's wise to run this after you for instance change something, then it
will for instance update passwords and ownership in gitea for that user.

```bash
node ./setup.js
```

## Your local environment variables

These are created by the script. And are found at the root in the `.env`-file.

```dotenv
CYPRESS_TEST_APP=autodeploy-v3
DEVELOP_APP_DEVELOPMENT=0
DEVELOP_BACKEND=0
DEVELOP_DASHBOARD=0
DEVELOP_PREVIEW=0
GITEA_ADMIN_PASS=apassword
GITEA_ADMIN_USER=angiteaadminuser
GITEA_ORG_USER=ttd
POSTGRES_PASSWORD=a_passworrd
```

## Some useful commands

Commands are ment to run relativ from this file.

### Doing commands against the running gitea-instance

```bash
docker exec -it studio-repositories gitea admin user create --username testuser --password yoursecurepasshere --email testuser@digdir.no --admin
```

### Reloading the loadbalancer

Need to do this to get a new config loaded, for instance when changing which apps to run.

```bash
docker rm --force studio-loadbalancer
docker compose -f ../docker-compose.yml up -d
```
