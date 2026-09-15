# Azure Devops Mock

This is a very simplistic mock to deal with release and deploys in the local development
environment. The Altinn Studio Backend will interact with this and get some fake statuses
back from this service, giving us some realistic scenarios.

The mock also serves the local Maskinporten scope endpoints used by the app settings
Maskinporten tab in compose-based development.

## Webhooks

In the environments there will be webhooks that Azure will send directly on the altinn studio
deployment. The endpoints which are called are these two:

- http://studio.localhost/designer/api/check-release-build-status
- http://studio.localhost/designer/api/check-deployment-build-status

Webhooks are defined [here](../../backend/src/Designer/Controllers/PipelinesController.cs)

## Release

### Build statuses

All build statuses are here:
https://learn.microsoft.com/en-us/rest/api/azure/devops/build/builds/get?view=azure-devops-rest-5.1#buildstatus

## Maskinporten scopes

The following endpoints return deterministic scope data for local development:

- http://studio-azure-mock:6161/api/v1/scopes/all?accessible_for_all=true&integration_type=maskinporten&inactive=false
- http://studio-azure-mock:6161/api/v1/scopes/access/all?integration_type=maskinporten&inactive=false

`studio_designer` points `MaskinPortenHttpClientSettings:BaseUrl` to this service in
`compose.yaml`.

## Workflow engine and instances from the studioctl environment

The admin app's workflow views (health column, drill-down, "instances with problems", retry and
write-off) reach the runtime gateway through the app cluster address, which in compose is this
mock. The mock plays the gateway's part and forwards those routes to the workflow engine that
`studioctl env up` runs on the host, through the localtest ingress
(`host.docker.internal:8000`, `Host: workflow-engine.local.altinn.cloud`). Nothing to enable:
when no studioctl environment is running, the admin app shows the engine as unavailable, exactly
as in an environment without one.

The instance list and details come from random data by default, so the health column reads
"no data" for every row. To see the instances the local environment actually holds, and their
workflows behind them, start the compose stack with:

```bash
INSTANCES_FROM_LOCALTEST=true docker compose up -d studio_azure_mock
```

The admin app lists an app once it has been deployed in local Studio (a mock deploy), so deploy
the app there under the same org and name you run it with through `studioctl`, then open it
under an environment. Set `LOCALTEST_URL` if the studioctl ingress is not on port 8000.

The admin views read the engine's collections health view, which a released engine image does
not have yet. Run the environment with an engine built from your working tree, either
`STUDIOCTL_INTERNAL_DEV=true studioctl env up` (builds the engine image from the checkout) or
`studioctl env up --dev-workflow-engine` with `dotnet run` in `src/Runtime/workflow-engine-app`
(a host process on port 9090; the same routing applies).

### Restart / rebuild this docker service

```bash
docker rm --force studio-azure-mock
docker image prune -a --force
docker compose -f ../../compose.yaml up -d
```

```bash
docker stop studio-azure-mock
```
