# About configuring Gitea

## Usefull commands

Reload config:

```bash
docker rm --force studio-repositories
docker rmi --force repositories:latest
docker compose -f ../docker-compose.yml up -d
```
