# Altinn Augmenter Agent

A generic, image-external configurable microservice that generates PDF (and
optionally DOCX) documents from uploaded application data, optionally
enriched by per-item LLM evaluation. The Docker image ships only the runtime
(.NET + Typst + Pandoc); all templates, mapper specs, registries, rules,
prompts, tool definitions, and the pipeline itself are mounted in from
`config/` and `.env`.

LLM calls go directly over HTTP to an OpenAI-compatible chat-completions
endpoint (sandkasse by default). No CLI, no SDK, no agent framework.

## Quick start

```bash
cp .env.example .env             # fill in SANDKASSE_API_KEY
docker compose up --build
```

The service starts on `http://localhost:8072`. POST a sample application:

```bash
curl -X POST http://localhost:8072/generate \
  -F "file=@examples/applications/julebord-kristiansand.json;type=application/json" \
  -o response.json
```

Local .NET run (uses the same `config/` folder via path fallback):

```bash
dotnet run --project src/Altinn.Augmenter.Agent
```

## How the image relates to the config

The image is **public and generic**. The config folder is **tenant-specific**
and may live in a private repo. The full contract for what `config/` must
contain is documented in [`config/README.md`](config/README.md); the same
file is the failure message the image throws at startup if the mount is
incomplete.

In short:

```
config/
├── pipeline.yaml          # which steps run, in what order
├── templates/             # Typst + optional DOCX templates
├── mappings/              # JsonPathMapper specs (one .json per mapper)
├── registries/            # typed key→value tables + output schema
├── rules/                 # per-item markdown rules for agent-pdf-orchestrated
├── orchestrator/          # system-prompt.md
└── tools/                 # OpenAI tool definitions for the 8 built-in tools
```

`docker-compose.yaml` mounts `./config:/etc/augmenter:ro`. Point that bind
mount at your private repo (or use `docker-compose.override.yaml` — see
[DEPLOYMENT.md](DEPLOYMENT.md)) to deploy a different tenant.

## Step types

| Type | Use when | Pipeline contract |
|---|---|---|
| `mapping-pdf` | Pure deterministic transformation; no LLM | mapper → Typst → PDF |
| `agent-pdf-orchestrated` | Per-item LLM evaluation with deterministic tools; current production path for checklist generation | mapper (envelope) + orchestrator (per-item verdicts) → merged JSON → Typst PDF |

The orchestrated path is what makes long checklists feasible on gateway
infrastructure that drops slow SSE streams: each LLM call evaluates one
item, parallelism is throttled, and 8 deterministic tools (FNR age,
date/time math, registry lookups, JSON-path access, text matching) keep
the model out of mechanical work. See
`training/experiments/exp-direct-tools/SYNTHESIS.md` for the R&D that
led to it.

## API

### `GET /health`
Returns `200 OK` with `{ "status": "ok" }`.

### `POST /generate`
Synchronous. Multipart upload; field `file` repeated per application JSON.
Returns `{ "pdfs": [{ "name": "...", "data": "<base64>" }, ...] }`.

### `POST /generate-async`
Asynchronous. Adds field `callback-url`; the service POSTs each produced
file to that URL. URL must match `Callback:AllowedPatterns`.

## Configuration

Environment-bound options (typical `.env` for sandkasse):

```env
SANDKASSE_API_KEY=<your-key>
Agent__BaseUrl=https://gw.sandkasse.ai/v1
Agent__Model=telenor:gemma4
Agent__MaxTokens=8192
Agent__Temperature=0
Agent__TimeoutSeconds=120
```

`docker-compose.yaml` already wires `SANDKASSE_API_KEY` into
`Agent__ApiKey`, so just the key needs to be set.

`.env` is `.gitignored`. Copy `.env.example` and never commit a real key.

| Section | Key | Default | Description |
|---|---|---|---|
| `Agent` | `BaseUrl` | (required) | OpenAI-compatible base URL, including `/v1` |
| `Agent` | `ApiKey` | (required) | Gateway API key |
| `Agent` | `Model` | (required) | Model identifier passed in the chat request |
| `Agent` | `MaxTokens` | 4096 | Max completion tokens |
| `Agent` | `Temperature` | 0 | Sampling temperature |
| `Agent` | `TimeoutSeconds` | 300 | Per-request HTTP timeout |
| `ContentPaths` | `TemplatesRoot` | `/etc/augmenter/templates` | Local dev auto-discovers `config/templates/` |
| `ContentPaths` | `MappingsRoot` | `/etc/augmenter/mappings` | Local dev auto-discovers `config/mappings/` |
| `ContentPaths` | `RegistriesRoot` | `/etc/augmenter/registries` | Local dev auto-discovers `config/registries/` |
| `ContentPaths` | `RulesRoot` | `/etc/augmenter/rules` | Local dev auto-discovers `config/rules/` |
| `ContentPaths` | `OrchestratorRoot` | `/etc/augmenter/orchestrator` | Local dev auto-discovers `config/orchestrator/` |
| `ContentPaths` | `ToolsRoot` | `/etc/augmenter/tools` | Local dev auto-discovers `config/tools/` |
| `Callback` | `AllowedPatterns` | `[]` | Wildcard allowlist for `/generate-async` callbacks |
| `Upload` | `MaxFileBytes` / `MaxTotalBytes` | 10 MB / 50 MB | Per-file and per-request size limits |
| `PdfGeneration` | `ProcessTimeoutSeconds` | 60 | Typst process timeout |
| `Typst` | `Path` | `typst` | Typst binary path |
| `Pandoc` | `Path` | `pandoc` | Pandoc binary path |

## Reload after a change — what command?

| You changed... | Run |
|---|---|
| any file under `config/` | `docker compose restart augmenter-agent` |
| `.env` | `docker compose up -d` (add `--force-recreate` if needed) |
| `dockerfile` or anything under `src/` | `docker compose up -d --build` |

`docker compose restart` only restarts the process inside the existing
container; it does not re-read `.env`. Env vars are baked in at container
creation time.

## Architecture

```
multipart upload
       │
       ▼
┌──────────────────────────────────┐
│  PdfPipeline                     │  reads pipeline.yaml at startup,
│                                  │  validates the whole config tree
│  ┌────────────────────────────┐  │
│  │ MappingPdfStep             │  │  no LLM: mapper → Typst → PDF (+ DOCX)
│  ├────────────────────────────┤  │
│  │ AgentPdfOrchestratedStep   │  │  per-item LLM loops:
│  │                            │  │    mapper (envelope) → orchestrator
│  │                            │  │    (one short LLM call per markdown
│  │                            │  │    rule, throttled, with tool-calling)
│  │                            │  │    → ChecklistAggregator → Typst
│  └────────────────────────────┘  │
└──────────────────────────────────┘
       │
       │  Services:
       │    IChatService    → SandkasseChatService (OpenAI chat-completions)
       │    IToolRegistry   → 8 deterministic tools (FNR age, dates, lookups, …)
       │    IRulesLoader    → globs RulesRoot/<step.rulesFolder>/*.md
       │    RegistryProvider → typed Load<T>(name) over RegistriesRoot
       ▼
   GeneratedPdf[]  (name + bytes)
```

The image holds no domain vocabulary — every Norwegian word in the
generated PDFs comes from the mounted config (templates, mapping specs,
rule markdown, registry entries). Adding a new case-type is a config
change; adding a new mapper primitive or step type is an image change.

## Tests

```bash
dotnet test                          # all unit + integration tests (LLM stubbed)
dotnet test --filter "Category=Sandkasse"   # live LLM tests (skip if key unset)
```

Integration tests use `CannedChatService` to stub the LLM so they verify
plumbing without depending on a live `SANDKASSE_API_KEY`. Tests tagged
`[Trait("Category", "Sandkasse")]` hit the real gateway and skip silently
when the env var is missing.

## R&D experiments

`training/experiments/exp-direct-tools/` documents the work that proved
per-item evaluation feasible. Its `SYNTHESIS.md` covers the gateway
timeout issue, the model-capacity findings, and the markdown-rule
authorship loop that informed today's `agent-pdf-orchestrated` path.
