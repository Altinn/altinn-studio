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

## Observability (Langfuse)

Off by default. When enabled, each execution of the `ai` task becomes one Langfuse
**trace**, and everything the run did hangs under it:

```
session = instance id ......... one submission, including engine retries and replays
 └─ trace  ai-enrichment:<taskId>
     └─ chain  step:<step name>
         └─ span  rule:<rule key>            (one per item, evaluated concurrently)
             ├─ generation  llm:<model> #1   input, output, tokens, finish reason
             ├─ tool        tool:<name>      arguments and result
             └─ generation  llm:<model> #2
```

A generation carries `tool_names` in its metadata, so whether a given response caused
a tool call is visible without expanding the tree. `rule_key`, `step_name`,
`iteration` and `tool_name` are flat metadata keys, so a question like "every
`frist.klagefrist` that came back `ikke_vurdert` this month" is one filter rather
than a text search through prompts.

```json
"AiEnrichment": {
  "Langfuse": {
    "Enabled": true,
    "Host": "https://langfuse.digdir.cloud",
    "PublicKey": "pk-lf-...",
    "SecretKeySecretName": "<key-vault-secret-name>",
    "Environment": "tt02"
  }
}
```

`SecretKey` can be set directly for local development and wins over
`SecretKeySecretName`, exactly like the gateway API key. Keys are project-scoped, so
each app points at its own Langfuse project.

Notes worth knowing before you turn it on:

- **Traces contain the full submission.** `PayloadCapture` is `Full` and that is the
  only mode implemented — prompts, application data, model output and tool results all
  reach Langfuse. Point it at an instance you are allowed to send that to.
- **Spans go only to Langfuse.** The library runs its own `TracerProvider` listening to
  one `ActivitySource`, so enrichment spans never reach the app's Application Insights
  exporter and app spans never reach Langfuse.
- **Credentials are checked at start-up.** A rejected key disables tracing with one
  clear log line rather than silently exporting into the void; an unreachable Langfuse
  only warns, since it may be back before the first submission.
- **Token counts need `AiEnrichment:Agent:StreamIncludeUsage`** (default on). Without it
  a streaming gateway returns no usage block and every generation shows zero tokens.
- **Cost needs a model price in Langfuse.** Token counts arrive regardless, but
  `totalCost` stays zero until the model is registered in the project.

### Scoring a run afterwards

Tracing captures what the model did; a score records whether it was right. The two
are joined by the instance id, which is the Langfuse session id — so a spreadsheet of
instance ids and verdicts is enough to find the runs and judge them, with no extra
identifier to keep track of.

`ILangfuseScoreClient` is registered alongside the tracer and works whether or not
export is enabled:

```csharp
var traceIds = await scores.FindTraceIdsBySession(instance.Id);
await scores.CreateScore(new LangfuseScore
{
    Id = $"review-{instanceGuid}",      // same id later overwrites, never duplicates
    TraceId = traceIds[0],
    Name = "saksbehandler_vurdering",
    Value = 1,
    DataType = "BOOLEAN",
});
```

For bulk imports there is a CLI:

```bash
export LANGFUSE_BASE_URL=... LANGFUSE_PUBLIC_KEY=... LANGFUSE_SECRET_KEY=...
dotnet run --project tools/Altinn.App.Ai.Enrichment.ScoreImport -- vurderinger.csv
```

The file needs a header and two or three columns — `instanceId`, `value` and an
optional `comment`. Values may be numbers or the words a caseworker actually types
(`ja`/`nei`, `true`/`false`, `korrekt`/`feil`), and both comma- and semicolon-separated
exports work. Re-running a corrected file replaces the earlier verdicts rather than
adding a second set.

Runs also stamp their Langfuse trace id onto the output data elements
(`langfuseTraceId` metadata), which closes the loop the other way: from a stored
result back to the run that produced it.

## Running tests

```bash
dotnet test
```

Typst-dependent tests skip silently when the `typst` binary is not found (PATH or
winget install location).
