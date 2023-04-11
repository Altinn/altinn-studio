# Azure Devops Mock

This is a very simplistic mock to deal with release and deploys in the local development
environment. The Altinn Studio Backend will interact with this and get some fake statuses
back from this service, giving us some realistic scenarios.

## Webhooks

In the environments there will be webhooks that Azure will send directly on the altinn studio
deployment. The endpoints which are called are theese two:

- http://studio.localhost/designer/api/check-release-build-status
- http://studio.localhost/designer/api/check-deployment-build-status

Webhooks are defined [here](../../backend/src/Designer/Controllers/PipelinesController.cs)

## Release

### Build statuses

All build statuses are here:
https://learn.microsoft.com/en-us/rest/api/azure/devops/build/builds/get?view=azure-devops-rest-5.1#buildstatus

### Restart / rebuild this docker service

```bash
docker rm --force studio-azure-mock
docker image prune -a --force
docker compose -f ../../docker-compose.yml up -d
```

```bash
docker stop studio-azure-mock
```
