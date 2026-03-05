---
name: docker
description: Manage the workflow engine's Docker Compose stack. Use when starting, stopping, rebuilding containers, or resetting the database.
---

## Profiles

| Profile | Services |
|---|---|
| `app` | workflow-engine + postgres |
| `dashboard` | dashboard |
| `full` | everything (engine + postgres + dashboard + monitoring + mocks) |

## Common commands

**Start a profile:**
```bash
docker compose --profile <profile> up -d
```

**Rebuild and deploy the engine:**
```bash
docker compose build workflow-engine && docker compose --profile app up -d --no-deps workflow-engine
```

**Rebuild and deploy the dashboard:**
```bash
docker compose build dashboard && docker compose --profile dashboard up -d --no-deps dashboard
```

**Stop everything:**
```bash
docker compose --profile full down
```

**View container status:**
```bash
docker compose ps
```

**View logs for a specific service:**
```bash
docker compose logs -f <service-name>
```

## Container reference

| Container | Port(s) | Purpose |
|---|---|---|
| `workflow-engine` | 8080, 8081 | API |
| `dashboard` | 8090 | Monitoring UI |
| `postgres` | 5432 | Database |
| `pgadmin` | 5050 | PostgreSQL admin UI |
| `lgtm` | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `blackbox-exporter` | — | Prometheus blackbox exporter |
| `postgres-exporter` | 9187 | Prometheus PostgreSQL exporter |
| `wiremock` | 6060 | Mock app callbacks |

## Database reset

Truncate all workflow data (requires running postgres container):
```bash
docker compose exec postgres psql -U postgres -d workflow_engine -c 'TRUNCATE "Workflows", "Steps" CASCADE;'
```

## Notes

- Dashboard `wwwroot/` is bind-mounted — frontend file edits are live without rebuild (just browser refresh, or automatic via hot-reload).
- The engine can also be run on the host with `dotnet run --project src/WorkflowEngine.Api` (requires postgres container).
