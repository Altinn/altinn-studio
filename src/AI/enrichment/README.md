# Altinn.App.Ai.Enrichment

AI enrichment (**KI Beriking**) as a first-party capability for standard Altinn apps:
per-item LLM evaluation with deterministic tools, deterministic JSON mapping, and
optional Typst PDF rendering — configured entirely from the app's `App/agents/` folder
and exposed as the `ai` process service task.

The app itself stays thin: a NuGet reference, one DI registration, an `App/agents/`
folder, a `<bpmn:serviceTask>` in process.bpmn and a policy action. No custom C# in
the app.

Status and phase breakdown: see [PLAN.md](PLAN.md). Phase 1 (the engine library) and
phase 2 (the `ai` `IServiceTask`) are done; phase 3 is the demo app.

## Using it in an app

Everything an app needs, in full:

**1. Program.cs** — the only line of custom code:

```csharp
void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    services.AddAiEnrichment(config);
}
```

**2. process.bpmn** — a service task between the data task and the next step:

```xml
<bpmn:serviceTask id="Task_AiEnrichment" name="KI Beriking">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>ai</altinn:taskType>
    </altinn:taskExtension>
  </bpmn:extensionElements>
  <bpmn:incoming>Flow_2</bpmn:incoming>
  <bpmn:outgoing>Flow_3</bpmn:outgoing>
</bpmn:serviceTask>
```

**3. App/agents/Task_AiEnrichment/** — the agent folder (name = task id, or map it via
`AiEnrichment:Tasks:<taskId>:Agent`).

**4. policy.xml** — the process engine authorizes `process/next` through an action named
exactly like the task type; grant `ai` to the same roles that have `write`.

**5. applicationmetadata.json** — data types for the outputs (no `appLogic`):

```json
{ "id": "ai-enrichment-json", "allowedContentTypes": ["application/json"] },
{ "id": "ai-enrichment-pdf",  "allowedContentTypes": ["application/pdf"] }
```

**6. appsettings.json / secrets**:

```json
"AiEnrichment": {
  "Agent": {
    "BaseUrl": "https://<gateway-host>/v1",
    "Model": "<provider:model-name>",
    "ApiKeySecretName": "<key-vault-secret-name>"
  }
}
```

`ApiKeySecretName` resolves through the app's `ISecretsClient` (Key Vault in
TT02/prod, `secrets.json` locally); a directly configured `ApiKey` wins for local dev.

When the process enters the task, the service task serializes the instance's form data
(the single data type with `appLogic`, or `AiEnrichment:Tasks:<taskId>:InputDataType`
when there are several), runs the agent, and stores every published JSON entry on
`ai-enrichment-json` and every rendered PDF on `ai-enrichment-pdf`. On failure the process
halts on the task and the next `process/next` retries. Steps with a `template` need the
`typst` binary in the app image; JSON-only agents run in a stock image.

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

## Consuming the library from an app repo

App repos live outside this repository, so they consume the library as a NuGet package:

```bash
dotnet pack src/Altinn.App.Ai.Enrichment -c Release -o artifacts
```

In the app repo, drop the `.nupkg` in a `packages/` folder, point a `nuget.config` at it:

```xml
<configuration>
  <packageSources>
    <add key="local" value="packages" />
  </packageSources>
</configuration>
```

then `dotnet add App package Altinn.App.Ai.Enrichment --prerelease`. Replace the local
feed with a published package when/if the library moves to a real feed.

## Running tests

```bash
dotnet test
```

Typst-dependent tests skip silently when the `typst` binary is not found (PATH or
winget install location).
