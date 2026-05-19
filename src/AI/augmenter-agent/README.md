# Altinn Augmenter Agent

A generic, image-external configurable microservice that generates PDF (and optionally DOCX)
documents from uploaded application data, optionally enriched by an AI agent. The Docker image
ships only the runtime (Typst + Pandoc + Pi CLI); all skills, prompts, templates, domain tables,
pipeline definition, and model/auth configuration are mounted in from `config/` and `.env`.

## Quick start (Docker)

```bash
cp .env.example .env             # fill in ANTHROPIC_API_KEY
docker compose up --build
```

The service starts on `http://localhost:8072`.

## Quick start (local .NET, with Claude CLI)

For development, you can swap Pi for the locally installed `claude` CLI:

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
├── domain/
│   ├── kommuner.json          # kommunenummer → navn + klage-epost
│   ├── bevillingstyper.json   # input → normalized type + lovhenvisninger
│   ├── alkoholgrupper.json    # varegruppe → standardized label
│   └── sjekkliste.json        # checklist sections + items
└── pi/
    └── models.json            # Pi providers (LM Studio, Ollama, vLLM, proxies)
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

Pi-CLI is provider-agnostic — it can route to Anthropic, OpenAI, Google, Groq,
or any OpenAI/Anthropic-compatible local server (LM Studio, Ollama, vLLM, ...).
Two files cooperate:

- **`.env`** holds secrets and selects which model to call (`Agent__Model=<provider>/<id>`).
- **`config/pi/models.json`** defines endpoints for **non-built-in** providers.
  Built-in providers (anthropic, openai, google, groq) work via env vars alone
  and don't need an entry here.

`apiKey` in `models.json` can reference an env var by name (e.g. `"OPENAI_API_KEY"`),
so the secret stays in `.env` while the endpoint lives in a checked-in `models.json`.

```env
Agent__Provider=pi
Agent__Model=lmstudio/qwen2.5-coder:7b   # matches an entry in config/pi/models.json
LMSTUDIO_API_KEY=lmstudio                 # any string; many local servers don't validate
```

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
┌──────────────────────┐
│  PdfPipeline         │  reads pipeline.yaml at startup
│  ┌────────────────┐  │
│  │ MappingPdfStep │  │  no AI: mapper → Typst → PDF (+ optional DOCX)
│  ├────────────────┤  │
│  │ AgentPdfStep   │  │  mapper → IPromptBuilder → IAgentService (Pi or Claude CLI)
│  │                │  │       → IResponseParser → Typst PDF + Pandoc DOCX
│  │                │  │       → optional PipelineContext.Set(publishTo, json)
│  └────────────────┘  │
└──────────────────────┘
       │
       ▼
   GeneratedPdf[]  (name + bytes)
```

Domain logic that previously lived in C# constants now lives in `config/domain/` JSON.
The image is generic; the same binary serves bevillingssøknader today and any future
saksbehandlings-type once its config folder is mounted.

## Configuration reference

| Section | Key | Default | Description |
|---------|-----|---------|-------------|
| `Agent` | `Provider` | `pi` | `pi` (container) or `claude-cli` (local dev) |
| `Agent` | `CliPath` | provider name | Path to CLI binary if not on `PATH` |
| `Agent` | `Model` | (CLI default) | Model name passed to `--model` |
| `Agent` | `TimeoutSeconds` | 600 | Max wait for agent process |
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

Tests that require Typst skip automatically if it's not on `PATH`. Integration tests that
exercise the full pipeline depend on a working agent CLI; in a CI environment without
valid credentials they should be filtered out or pointed at a mock provider.
