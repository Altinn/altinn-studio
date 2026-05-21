# Augmenter-agent config contract

This folder is the **tenant config**: the only thing that distinguishes one
deployment of the (public, generic) augmenter-agent image from another. The
image is mounted at `/etc/augmenter`; you can mount any folder that satisfies
the contract below.

```yaml
# docker-compose.yaml (or override)
volumes:
  - /path/to/your/private-config:/etc/augmenter:ro
```

The image runs `ConfigValidator.Validate` at startup and refuses to boot if
the mount is incomplete — the error message lists every violation. Use that
message as your ground-truth checklist; the rest of this file explains *why*
each piece exists.

---

## Folder layout

```
<config-root>/
├── pipeline.yaml          # required — the only file at the root
├── templates/             # required — Typst (.typ) + optional DOCX (.md) templates
├── mappings/              # required — <name>.json JsonPathMapper specs
├── registries/            # required if any step uses agent-pdf-orchestrated OR a mapper references a registry
├── rules/                 # required if any step uses agent-pdf-orchestrated
├── orchestrator/          # required if any step uses agent-pdf-orchestrated
│   └── system-prompt.md   #   must exist inside orchestrator/
└── tools/                 # required if any step uses agent-pdf-orchestrated
```

No other folders or files are read by the image. The image carries no domain
defaults; if a piece is missing, the affected step fails clearly at startup.

---

## `pipeline.yaml`

Ordered list of steps. Each step produces one or more output files; later
steps see the prior steps' published JSON via `publishTo`.

Two step types are supported.

### `mapping-pdf`
Deterministic only — no LLM, no tool calls. A `JsonPathMapper` projects the
uploaded application data into the shape the Typst template expects.

```yaml
- name: request-info
  type: mapping-pdf
  mapper: request-info      # → mappings/request-info.json
  template: request-info.typ # → templates/request-info.typ
  output: request-info.pdf
  docxTemplate: request-info.md   # optional
  publishTo: requestInfo          # optional — exposes mapped JSON to later steps
```

### `agent-pdf-orchestrated`
Per-item LLM loop. The mapper builds the envelope (meta, søker, …); the
orchestrator fills the checklist by running one short LLM call per markdown
rule, with deterministic tools the model can call.

```yaml
- name: checklist-agent
  type: agent-pdf-orchestrated
  mapper: checklist             # → mappings/checklist.json
  template: checklist.typ       # → templates/checklist.typ
  output: checklist.pdf
  rulesFolder: .                # subfolder under rules/ ("." = rules/ itself)
  schemaFile: sjekkliste.json   # optional, this is the default
  maxToolIterations: 5          # optional, default 5
  concurrency: 5                # optional, default 5
  traceDir: my-traces           # optional — relative paths land under TEMP
```

---

## `templates/`

Typst source files. Receive the merged JSON as the document context.
`docxTemplate` (Pandoc Markdown) is optional and rendered alongside the PDF.

The template files are referenced by filename in `pipeline.yaml`. The image
ships no defaults; whatever the active pipeline references must exist here.

---

## `mappings/`

One `<name>.json` per mapper. The filename stem is the key referenced by
`mapper:` in `pipeline.yaml`. Mappers are auto-discovered at startup — adding
a new one is a config drop-in, no code change.

The spec is the JsonPathMapper DSL — 17 primitives (`const`, `path`, `chain`,
`coalesce`, `switch`, `concat`, `boolean`, `int`, `registry_field`,
`rule_match`, `mapping`, `object_if_present`, `list_concat`, `list_map`,
`list_pluck`, `list_const`, `today`). See the existing
`mappings/request-info.json` and `mappings/checklist.json` for examples and
`src/Altinn.Augmenter.Agent/Pipelines/Generic/Mapping/JsonPathMapper.cs` for
the authoritative primitive list.

---

## `registries/`

Typed key→value tables used by mappers and the `lookup` tool, plus the
checklist output schema. Three registry shapes are recognized — the image
detects which one a file uses by structure:

| Shape | Top-level keys | Used for |
|---|---|---|
| `LookupRegistry`     | `default`, `entries`             | Direct key→record lookup (e.g. kommunenummer → navn + epost) |
| `MappingRegistry`    | `default`, `references`, `mapping` | Normalize free-form input to a canonical value |
| `RuleBasedRegistry`  | `default`, `rules`               | First-match rule chain over an input string |
| `OutputSchema`       | `defaultStatus`, `sections`      | Defines sections + items for `agent-pdf-orchestrated` |

`agent-pdf-orchestrated` steps use `sjekkliste.json` (or whatever
`schemaFile:` overrides it to) as the output schema. Mappers reference
registries by filename; the `lookup` tool exposes them to the LLM.

---

## `rules/`

One `<section>.<item>.md` per checklist item. Each file is the human-readable
rule the LLM applies to a single item. The orchestrator runs one LLM call per
file, in parallel up to the step's `concurrency`.

The filename is the item key the orchestrator emits in the verdict map, so
the schema in `registries/sjekkliste.json` must list those same keys (under
the section it belongs to).

The orchestrator only reads `*.md`. Other files are ignored.

---

## `orchestrator/system-prompt.md`

Single file. The system message prepended to every per-item LLM call. Keep
it short and concrete; the per-item markdown rules carry the specifics.

---

## `tools/`

One `<tool_name>.json` per tool. The image has 8 built-in tool
*implementations*; this folder supplies their public-facing description and
JSON-schema (so the model sees them as proper OpenAI tools and the image
ships no domain vocabulary).

Required filenames (one per built-in tool):

```
tools/
├── age_from_id.json
├── count_attachments.json
├── days_between.json
├── lookup.json
├── path_value.json
├── text_contains_any.json
├── text_matches_any.json
└── time_within_window.json
```

Each file is OpenAI tool-definition JSON:

```json
{
  "type": "function",
  "function": {
    "name": "age_from_id",
    "description": "Compute age in years on a reference date from a national ID.",
    "parameters": { "type": "object", "properties": { ... }, "required": [...] }
  }
}
```

The `name` field must match a built-in tool name. Missing files cause that
tool to be unavailable; the model loses one capability but the orchestrator
keeps running.

---

## What goes in the **image** vs the **config**

Knowing the split is the whole point of separating concerns:

| Image (public, generic) | Config (private, tenant-specific) |
|---|---|
| Tool *implementations* (`AgeFromIdTool`, `LookupTool`, …) | Tool *names + descriptions + parameter schemas* |
| Pipeline step *types* (`mapping-pdf`, `agent-pdf-orchestrated`) | Which steps run, in what order |
| JsonPathMapper *primitives* (`path`, `chain`, `coalesce`, …) | The specs that compose them |
| Typst + Pandoc binaries | The template files |
| Orchestrator wiring (per-item loop, throttling, retries) | The system prompt + the per-item rules |
| `IChatService` (OpenAI-compatible HTTP client) | The endpoint URL, model name, API key (via env) |

If your change is "we want to start vetting a new case-type", it is a config
change only — clone this folder, edit, and mount. The image does not move.

If your change is "the JsonPathMapper needs a new primitive", or "the
orchestrator should call multiple models", that's an image change — open a
PR against the augmenter-agent repository.
