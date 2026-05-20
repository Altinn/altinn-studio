# Altinn Augmenter Agent

A generic, image-external configurable microservice that generates PDF (and optionally DOCX)
documents from uploaded application data, optionally enriched by an AI agent. The Docker image
ships only the runtime (.NET + Typst + Pandoc); all skills, prompts, templates, domain tables,
pipeline definition, and model/auth configuration are mounted in from `config/` and `.env`.

Agent calls go directly over HTTP to an OpenAI-compatible gateway (sandkasse by default).
No npm/node/CLI in the production image.

## Quick start (Docker)

```bash
cp .env.example .env             # fill in SANDKASSE_API_KEY
docker compose up --build
```

The service starts on `http://localhost:8072`.

## Quick start (local .NET, with Claude CLI)

For development, you can swap the HTTP gateway for the locally installed `claude` CLI:

```bash
dotnet run --project src/Altinn.Augmenter.Agent
```

`appsettings.Development.json` sets `Agent:Provider=claude-cli` so this works out of the box
when `claude` is on `PATH` and authenticated.

## Mounted config layout

```
config/
├── pipeline.yaml              # which steps run, in what order
├── skills/
│   └── checklist/skill.md     # + @guide.md, @other.md references
├── templates/
│   ├── request-info.typ       # Typst (PDF)
│   └── checklist.typ
└── domain/
    ├── kommuner.json          # kommunenummer → navn + klage-epost
    ├── bevillingstyper.json   # input → normalized type + lovhenvisninger
    ├── alkoholgrupper.json    # varegruppe → standardized label
    └── sjekkliste.json        # checklist sections + items
```

## Reload after a change — what command?

| You changed... | Run |
|---|---|
| any file under `config/` | `docker compose restart augmenter-agent` |
| `.env` | `docker compose up -d` (add `--force-recreate` if it doesn't pick up) |
| `dockerfile` or anything under `src/` | `docker compose up -d --build` |

`docker compose restart` only restarts the process inside the existing container; it
does **not** re-read `.env`. Env vars are baked in at container creation time.

## Models, providers, and `.env`

The production provider is `sandkasse-http`: a direct HTTP client that calls an
OpenAI-compatible chat-completions endpoint. Configuration is via env vars:

```env
SANDKASSE_API_KEY=<your-key>
Agent__Provider=sandkasse-http
Agent__BaseUrl=https://gw.sandkasse.ai/v1
Agent__Model=telenor:gemma4
Agent__MaxTokens=4096
Agent__Temperature=0
```

`docker-compose.yaml` already wires `SANDKASSE_API_KEY` from `.env` into `Agent__ApiKey`,
so you only need to set the key.

For local development without a sandkasse key, use `Agent:Provider=claude-cli` (the dev
default). The `claude` CLI must be on `PATH` and authenticated.

`.env` is `.gitignored`. Copy `.env.example` and never commit a real key.

## Adding a new step (no rebuild)

1. Pick a step type: `mapping-pdf` (no AI) or `agent-pdf` (AI).
2. Add an entry to `config/pipeline.yaml`:

    ```yaml
    - name: my-new-step
      type: agent-pdf
      mapper: <key>            # IDataMapper registered in Program.cs
      skillFolder: my-skill    # config/skills/my-skill/skill.md
      template: my.typ         # config/templates/my.typ
      docxTemplate: my.md      # optional — also emits .docx
      output: my.pdf
      expectedJsonKey: foo
      consumeContext: [some-other-step-output]
      publishTo: my-step-result
    ```

3. Drop the skill folder, Typst template, and (if used) Markdown template under `config/`.
4. Restart the container.

For a brand-new domain whose data shape differs from bevillinger, register an `IDataMapper`
under a new key in `Program.cs` (only step type that requires C# code).

## Adding a new kommune (no rebuild)

Edit `config/domain/kommuner.json`:

```json
"1234": { "navn": "Mykommune", "klageEpost": "post@mykommune.no" }
```

Same pattern for `bevillingstyper.json`, `alkoholgrupper.json`, `sjekkliste.json`.

## API

### `GET /health`
Returns `200 OK` with `{ "status": "ok" }`.

### `POST /generate`
Synchronous. Returns JSON with all generated files (PDF and DOCX).

**Request:** `multipart/form-data`, field `file` repeated for each application JSON.

**Response:** `200 OK`
```json
{
  "pdfs": [
    { "name": "request-info.pdf", "data": "<base64>" },
    { "name": "checklist.pdf",    "data": "<base64>" }
  ]
}
```

### `POST /generate-async`
Asynchronous. Adds field `callback-url`; service POSTs each produced file to the URL.

## Architecture

```
multipart upload
       │
       ▼
┌──────────────────────────┐
│  PdfPipeline             │  reads pipeline.yaml at startup
│  ┌────────────────────┐  │
│  │ MappingPdfStep     │  │  no AI: mapper → Typst → PDF (+ optional DOCX)
│  ├────────────────────┤  │
│  │ AgentPdfStep       │  │  mapper → IPromptBuilder → IAgentService
│  │                    │  │       → IResponseParser → Typst PDF + Pandoc DOCX
│  │                    │  │       → optional PipelineContext.Set(publishTo, json)
│  └────────────────────┘  │
└──────────────────────────┘
       │                      IAgentService implementations:
       │                       - SandkasseHttpAgentService (default, production)
       │                       - ClaudeCliAgentService (local dev)
       ▼
   GeneratedPdf[]  (name + bytes)
```

Domain logic that previously lived in C# constants now lives in `config/domain/` JSON.
The image is generic; the same binary serves bevillingssøknader today and any future
saksbehandlings-type once its config folder is mounted.

## Configuration reference

| Section | Key | Default | Description |
|---------|-----|---------|-------------|
| `Agent` | `Provider` | `sandkasse-http` | `sandkasse-http` (HTTP gateway) or `claude-cli` (local dev) |
| `Agent` | `BaseUrl` | (none) | OpenAI-compatible base URL, including `/v1`. Required for `sandkasse-http` |
| `Agent` | `ApiKey` | (none) | Gateway API key. Required for `sandkasse-http` |
| `Agent` | `Model` | (none) | Model identifier passed in the chat request |
| `Agent` | `MaxTokens` | 4096 | Max completion tokens |
| `Agent` | `Temperature` | 0 | Sampling temperature |
| `Agent` | `TimeoutSeconds` | 300 | Per-request timeout |
| `Agent` | `CliPath` | `claude` | Path to Claude CLI (only used by `claude-cli` provider) |
| `ContentPaths` | `SkillsRoot` | `/etc/augmenter/skills` | Local dev auto-discovers `config/skills/` |
| `ContentPaths` | `TemplatesRoot` | `/etc/augmenter/templates` | Local dev auto-discovers `config/templates/` |
| `ContentPaths` | `DomainRoot` | `/etc/augmenter/domain` | Local dev auto-discovers `config/domain/` |
| `Callback` | `AllowedPatterns` | `[]` | Allowlist (wildcards supported) for `/generate-async` callbacks |
| `Upload` | `MaxFileBytes` / `MaxTotalBytes` | 10 MB / 50 MB | Per-file and per-request size limits |
| `PdfGeneration` | `ProcessTimeoutSeconds` | 60 | Typst process timeout |
| `Typst` | `Path` | `typst` | Typst binary path |
| `Pandoc` | `Path` | `pandoc` | Pandoc binary path |

## Tests

```
dotnet test
```

Integration tests use a stub agent (`EmptyAgentService`) so they don't need a real gateway.
Tests that require Typst skip automatically if it's not on `PATH`.

## R&D experiments

`training/experiments/exp-direct-tools/` documents the v0.4 work that replaced Pi:
direct HTTP, tool-calling, streaming, markdown-rule authorship. See its
`SYNTHESIS.md` for findings.
