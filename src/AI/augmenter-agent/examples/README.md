# End-to-end test data

Sample application JSON files you can POST against a running augmenter-agent.
These are **not** mounted into the container — they're inputs you send over HTTP.

The container itself uses `../config/` (mounted at `/etc/augmenter/`) for skills,
templates, and domain data. If you want to test against a *different* config set,
copy `config/` to e.g. `examples/alt-config/`, edit, then mount it instead:

```yaml
# docker-compose.override.yaml
services:
  augmenter-agent:
    volumes:
      - ./examples/alt-config:/etc/augmenter:ro
```

## Sample applications

| File | Notes |
|---|---|
| `applications/julebord-kristiansand.json` | Full enkeltbevilling, gruppe 3 alkohol, organized julebord in Kristiansand. Realistic shape — exercises every mapper field. |
| `applications/minimal-arrangement.json` | Minimum valid input. Use this when iterating on templates or mappers — fast pipeline run with few fields. |

## Run end-to-end

### PowerShell (Windows)

```powershell
# Synchronous: returns base64-encoded PDFs in JSON
curl -X POST http://localhost:8072/generate `
  -F "file=@examples/applications/julebord-kristiansand.json;type=application/json" `
  -o response.json

# Extract one file to disk (PowerShell):
$r = Get-Content response.json | ConvertFrom-Json
[IO.File]::WriteAllBytes("checklist.pdf", [Convert]::FromBase64String(($r.pdfs | Where-Object name -eq "checklist.pdf").data))
```

### Bash

```bash
curl -X POST http://localhost:8072/generate \
  -F "file=@examples/applications/julebord-kristiansand.json;type=application/json" \
  | jq -r '.pdfs[] | "\(.name) \(.data)"' \
  | while read name data; do echo "$data" | base64 -d > "$name"; done
```

### Asynchronous (callback)

```bash
# Start a simple callback receiver in another terminal:
nc -l 9000

# POST with a callback URL:
curl -X POST http://localhost:8072/generate-async \
  -F "file=@examples/applications/minimal-arrangement.json;type=application/json" \
  -F "callback-url=http://host.docker.internal:9000/done"
```

## Smoke-test the agent skills directly

The container exposes debug endpoints that bypass the full pipeline:

```
GET http://localhost:8072/agent-test            # ping the agent ("PONG")
GET http://localhost:8072/agent-test/checklist  # run checklist skill on a hardcoded sample
```

## When you change something — what command?

| Changed | Command |
|---|---|
| any file under `config/` (skills, templates, domain, pipeline.yaml, models.json) | `docker compose restart augmenter-agent` |
| `.env` (API keys, `Agent__Model`, `Agent__Provider`) | `docker compose up -d` — add `--force-recreate` if not picked up |
| `dockerfile` or `src/` | `docker compose up -d --build` |

`docker compose restart` reuses the existing container, so env vars stay baked in
from creation. Only `up` can recreate the container with a fresh `.env`.
