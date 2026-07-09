# Altinn.App.Ai.Enrichment

AI enrichment (**KI Beriking**) as a first-party capability for standard Altinn apps:
per-item LLM evaluation with deterministic tools, deterministic JSON mapping, and
optional Typst PDF rendering — configured entirely from the app's `App/agents/` folder
and exposed as the `kiBeriking` process service task.

The app itself stays thin: a NuGet reference, one DI registration, an `App/agents/`
folder, a `<bpmn:serviceTask>` in process.bpmn and a policy action. No custom C# in
the app.

Status and phase breakdown: see [PLAN.md](PLAN.md). Phase 1 (the engine library) is done;
the `kiBeriking` `IServiceTask` integration is phase 2.

## Layout

```
src/Altinn.App.Ai.Enrichment/     the library (net8.0, references Altinn.App.Core)
├── Agents/          agent folder model, agent.yaml loading, validation, runtime factory
├── Chat/            OpenAI-compatible chat-completions client (tool calling, retry, SSE)
├── Orchestration/   per-item LLM loop, rules loading, verdict aggregation
├── Tools/           10 built-in deterministic tools + registry joining impls with defs
├── Mapping/         JsonPathMapper + per-agent mapper resolution
├── Registries/      typed key→value registries loaded from the agent folder
├── Pipeline/        step contract, pipeline context, the two step types
├── Rendering/       Typst PDF renderer (requires typst binary in the image)
└── DependencyInjection/  AddAiEnrichmentCore()
test/Altinn.App.Ai.Enrichment.Tests/   unit tests + the generic demo fixture agent
```

## The agent folder contract

One folder per enrichment step under `App/agents/`:

```
App/agents/<agent-name>/
├── agent.yaml           steps: mapping-pdf | agent-pdf-orchestrated
├── system-prompt.md     orchestrator system prompt
├── rules/               per-item markdown rules (<section>.<item>.md)
├── tools/               OpenAI tool definitions (<tool_name>.json)
├── registries/          lookup tables + output schema
├── mappings/            JsonPathMapper specs (<mapper>.json)
└── templates/           Typst templates (only when rendering PDF)
```

Load and run one agent:

```csharp
var runtime = agentRuntimeFactory.Create("App/agents/min-agent");
var result = await runtime.ExecuteAsync(applicationJson, ct);
// result.Files    → PDFs to store as data elements
// result.Context  → published enrichment JSON, keyed by publishTo/step name
```

Validation is fail-fast: `AgentRuntimeFactory.Create` throws one exception listing
every contract violation in the folder.

## Notable changes from the v0.4 augmenter microservice

The engine is a port of the `augmenter-agent` microservice (branch
`feat/augmenter-agent-v0.4-direct-tools`), with the service host replaced by app-lib:

- Multipart upload → instance form data (`EnrichmentData.Parse` still unwraps the
  legacy `{"FlatData": ...}` envelope).
- Global `/etc/augmenter` config roots → per-agent folders; `pipeline.yaml` → `agent.yaml`.
- Step failures now propagate (the process engine's retry semantics take over) instead
  of being logged and swallowed.
- `template` is optional for `agent-pdf-orchestrated` — JSON-only enrichment works in a
  stock app image without typst.
- The aggregator root key is schema-driven (`rootKey`, default `sjekkliste`).
- DOCX/Pandoc output dropped.

## Running tests

```bash
dotnet test
```

Typst-dependent tests skip silently when the `typst` binary is not found (PATH or
winget install location).
