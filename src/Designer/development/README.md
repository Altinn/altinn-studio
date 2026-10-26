# Running Designer locally

The local stack runs Designer in containers with Gitea, PostgreSQL, Redis and mock services for the systems Designer
calls, behind a load balancer at <http://studio.localhost>. [compose.yaml](../compose.yaml) defines it.

## Before you start

- Docker or Podman with Compose, and Node.js with Yarn. To work on the backend, the .NET SDK that
  [global.json](../backend/global.json) names.
- `studio.localhost` and `host.docker.internal` resolve to `127.0.0.1`. Add them to your hosts file if they don't:

  ```plaintext
  127.0.0.1 studio.localhost
  127.0.0.1 host.docker.internal
  ```

## Start the stack

From the repository root:

```bash
yarn && yarn setup
```

[setup.js](setup.js) writes `src/Designer/.env` with generated passwords, sets up Gitea with an admin user, the `ttd`
organization and an OAuth client for Designer, and starts the stack. It keeps what you have changed in `.env`, so run
it again after you change something. Log in as `localgiteaadmin` with the password in `GITEA_ADMIN_PASS`.

To rebuild one service after a change, run this from `src/Designer`:

```bash
docker compose up -d --build studio_designer
```

## Work on one part

To run a part of Designer from your own dev server, set its `DEVELOP_*` variable in `.env` to `1` and rebuild the load
balancer with `docker compose up -d --build studio_loadbalancer`. The load balancer then sends that part's traffic to
your dev server instead of the container. [ensure-dot-env.js](utils/ensure-dot-env.js) lists the variables.

- Start the backend from `src/Designer/backend` with `dotnet run --project src/Designer`. In Development it reads
  its login client from `.env`.
- Start a frontend app from `src/Designer/frontend` with its script in [package.json](../frontend/package.json), such
  as `yarn start-dashboard`.

## Useful commands

Create another Gitea user:

```bash
docker exec -it studio-repositories gitea admin user create --username testuser --password <password> --email testuser@digdir.no --admin
```

The deploy page needs an app in the `ttd` organization, as in the real environments. Setup adds your user to `ttd`.
