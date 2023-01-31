# About configuring Gitea

The routine for upgrading and configuring Gitea can be found [here](https://github.com/Altinn/altinnpedia/blob/main/content/altinn-3/ops/patching/containers/_index.md#gitea)
in norwegian. But in short, don't upgrade to the first patch version `x.x.0`, wait untill the major version is stable.

## Usefull commands

Reload config:

```bash
docker rm --force studio-repositories
docker rmi --force repositories:latest
docker compose -f ../docker-compose.yml up -d
```
