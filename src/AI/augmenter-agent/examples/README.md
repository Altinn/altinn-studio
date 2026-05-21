# Examples

Reference material you POST against a running augmenter-agent — these are
**inputs**, not mounted config. The container itself uses `../config/` (or
whatever folder is bind-mounted at `/etc/augmenter/`).

## `applications/`

Sample application JSONs you can use as `-F "file=@..."` payloads.

| File | Notes |
|---|---|
| `applications/julebord-kristiansand.json` | Full enkeltbevilling, alkoholgruppe 3, organized julebord in Kristiansand. Realistic shape — exercises every mapper field. |
| `applications/minimal-arrangement.json`   | Minimum valid input. Fast pipeline run, useful when iterating on templates or mappers. |

## `alt-config/`

A second, complete config folder demonstrating that the image is
multi-tenant: same Docker image, different `config/` mount, different
domain. See `alt-config/README.md` for what the example illustrates and
how to run the image against it.

```yaml
# docker-compose.override.yaml — swap the active config
services:
  augmenter-agent:
    volumes:
      - ./examples/alt-config:/etc/augmenter:ro
```

The integration test `AltConfigSwapTests.cs` runs the live pipeline
against this folder so regressions in the "image stays generic" property
fail at CI time.

## Run end-to-end

### PowerShell (Windows)

```powershell
curl -X POST http://localhost:8072/generate `
  -F "file=@examples/applications/julebord-kristiansand.json;type=application/json" `
  -o response.json

# Extract one file to disk:
$r = Get-Content response.json | ConvertFrom-Json
[IO.File]::WriteAllBytes(
  "checklist.pdf",
  [Convert]::FromBase64String(
    ($r.pdfs | Where-Object name -eq "checklist.pdf").data))
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
# Receiver in another terminal:
nc -l 9000

# Submit:
curl -X POST http://localhost:8072/generate-async \
  -F "file=@examples/applications/minimal-arrangement.json;type=application/json" \
  -F "callback-url=http://host.docker.internal:9000/done"
```

## After a config change — what command?

| Changed | Command |
|---|---|
| any file under `config/` (pipeline.yaml, templates, registries, …) | `docker compose restart augmenter-agent` |
| `.env` (API keys, `Agent__*`) | `docker compose up -d --force-recreate` |
| `dockerfile` or `src/` | `docker compose up -d --build` |

`docker compose restart` reuses the existing container, so env vars stay
baked in from creation. Only `up` can recreate it with a fresh `.env`.
